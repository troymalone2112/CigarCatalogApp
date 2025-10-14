-- RevenueCat Webhook Handler Setup
-- This creates a webhook endpoint that RevenueCat can call to sync subscription status

-- Create webhook function that RevenueCat will call
CREATE OR REPLACE FUNCTION handle_revenuecat_webhook(
  event_type TEXT,
  app_user_id TEXT,
  original_app_user_id TEXT,
  product_id TEXT,
  period_type TEXT,
  purchased_at_ms BIGINT,
  expiration_at_ms BIGINT,
  store TEXT,
  is_trial_period BOOLEAN,
  auto_renew_status BOOLEAN,
  original_transaction_id TEXT,
  transaction_id TEXT,
  environment TEXT
)
RETURNS JSON AS $$
DECLARE
  user_uuid UUID;
  subscription_plan TEXT;
  subscription_status TEXT;
  current_period_end TIMESTAMP WITH TIME ZONE;
  result JSON;
BEGIN
  -- Log the webhook event
  RAISE LOG 'RevenueCat webhook received: % for user %', event_type, app_user_id;
  
  -- Find the user by their ID (app_user_id should match our user.id)
  BEGIN
    user_uuid := app_user_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Invalid user ID format: %', app_user_id;
    RETURN json_build_object('success', false, 'error', 'Invalid user ID format');
  END;
  
  -- Verify user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_uuid) THEN
    RAISE LOG 'User not found: %', app_user_id;
    RETURN json_build_object('success', false, 'error', 'User not found');
  END;
  
  -- Determine subscription plan based on product_id
  CASE 
    WHEN product_id LIKE '%monthly%' OR product_id = '$rc_monthly' THEN
      subscription_plan := 'premium_monthly';
    WHEN product_id LIKE '%annual%' OR product_id = '$rc_annual' OR product_id LIKE '%yearly%' THEN
      subscription_plan := 'premium_yearly';
    ELSE
      subscription_plan := 'premium_monthly'; -- Default fallback
  END CASE;
  
  -- Determine subscription status based on event type
  CASE event_type
    WHEN 'INITIAL_PURCHASE' THEN
      subscription_status := 'active';
    WHEN 'RENEWAL' THEN
      subscription_status := 'active';
    WHEN 'CANCELLATION' THEN
      subscription_status := 'cancelled'; -- Still active until expiration
    WHEN 'EXPIRATION' THEN
      subscription_status := 'expired';
    WHEN 'BILLING_ISSUE' THEN
      subscription_status := 'past_due';
    ELSE
      subscription_status := 'active';
  END CASE;
  
  -- Convert expiration timestamp to PostgreSQL timestamp
  current_period_end := to_timestamp(expiration_at_ms / 1000.0);
  
  -- Update or insert subscription record
  INSERT INTO user_subscriptions (
    user_id,
    plan_id,
    status,
    is_premium,
    current_period_start,
    current_period_end,
    auto_renew,
    revenuecat_user_id,
    last_sync_date,
    trial_end_date,
    created_at,
    updated_at
  ) VALUES (
    user_uuid,
    subscription_plan,
    subscription_status,
    (subscription_status IN ('active', 'cancelled') AND current_period_end > NOW()),
    to_timestamp(purchased_at_ms / 1000.0),
    current_period_end,
    auto_renew_status,
    app_user_id,
    NOW(),
    CASE 
      WHEN is_trial_period THEN current_period_end 
      ELSE NOW() + INTERVAL '3 days' -- Default trial if not specified
    END,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    status = EXCLUDED.status,
    is_premium = EXCLUDED.is_premium,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    auto_renew = EXCLUDED.auto_renew,
    revenuecat_user_id = EXCLUDED.revenuecat_user_id,
    last_sync_date = EXCLUDED.last_sync_date,
    updated_at = NOW();
  
  -- Update user profile with premium status
  UPDATE profiles 
  SET 
    is_premium = (subscription_status IN ('active', 'cancelled') AND current_period_end > NOW()),
    updated_at = NOW()
  WHERE id = user_uuid;
  
  RAISE LOG 'Updated subscription for user %: plan=%, status=%, premium=%', 
    app_user_id, subscription_plan, subscription_status, 
    (subscription_status IN ('active', 'cancelled') AND current_period_end > NOW());
  
  RETURN json_build_object(
    'success', true,
    'user_id', app_user_id,
    'plan', subscription_plan,
    'status', subscription_status,
    'premium', (subscription_status IN ('active', 'cancelled') AND current_period_end > NOW())
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Webhook error for user %: %', app_user_id, SQLERRM;
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION handle_revenuecat_webhook TO authenticated;

-- Create a simpler webhook endpoint that RevenueCat can call
-- This will be accessible via Supabase Edge Functions or your API
CREATE OR REPLACE FUNCTION public.revenuecat_webhook_handler(request_body JSONB)
RETURNS JSON AS $$
DECLARE
  event_data JSONB;
  result JSON;
BEGIN
  -- Parse the RevenueCat webhook payload
  -- RevenueCat sends data in this format:
  -- {
  --   "api_version": "1.0",
  --   "event": {
  --     "type": "INITIAL_PURCHASE",
  --     "app_user_id": "user_123",
  --     "original_app_user_id": "user_123",
  --     "product_id": "premium_monthly",
  --     "period_type": "NORMAL",
  --     "purchased_at_ms": 1234567890000,
  --     "expiration_at_ms": 1234567890000,
  --     "store": "APP_STORE",
  --     "is_trial_period": false,
  --     "auto_renew_status": true,
  --     "original_transaction_id": "1000000123456789",
  --     "transaction_id": "1000000123456789",
  --     "environment": "SANDBOX"
  --   }
  -- }
  
  -- Extract event data
  event_data := request_body->'event';
  
  -- Call the main webhook handler
  SELECT handle_revenuecat_webhook(
    (event_data->>'type'),
    (event_data->>'app_user_id'),
    (event_data->>'original_app_user_id'),
    (event_data->>'product_id'),
    (event_data->>'period_type'),
    (event_data->>'purchased_at_ms')::BIGINT,
    (event_data->>'expiration_at_ms')::BIGINT,
    (event_data->>'store'),
    (event_data->>'is_trial_period')::BOOLEAN,
    (event_data->>'auto_renew_status')::BOOLEAN,
    (event_data->>'original_transaction_id'),
    (event_data->>'transaction_id'),
    (event_data->>'environment')
  ) INTO result;
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Webhook handler error: %', SQLERRM;
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.revenuecat_webhook_handler TO authenticated;

-- Create an index for faster webhook processing
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_revenuecat_user_id 
ON user_subscriptions(revenuecat_user_id);

-- Create an index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_profiles_premium_status 
ON profiles(is_premium) WHERE is_premium = true;

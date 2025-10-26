-- Create the missing handle_revenuecat_webhook function
-- This function is called by the webhook but doesn't exist in the database

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
  subscription_plan_id UUID;
  subscription_status TEXT;
  current_period_end TIMESTAMP WITH TIME ZONE;
  result JSON;
BEGIN
  -- Log the webhook event
  RAISE LOG 'RevenueCat webhook received: % for user %', event_type, app_user_id;
  
  -- Convert app_user_id to UUID
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
  END IF;
  
  -- Determine subscription plan based on product_id
  CASE 
    WHEN product_id LIKE '%monthly%' OR product_id = '$rc_monthly' OR product_id LIKE '%month%' THEN
      SELECT id INTO subscription_plan_id FROM subscription_plans WHERE name = 'Premium Monthly' LIMIT 1;
    WHEN product_id LIKE '%annual%' OR product_id = '$rc_annual' OR product_id LIKE '%yearly%' OR product_id LIKE '%year%' THEN
      SELECT id INTO subscription_plan_id FROM subscription_plans WHERE name = 'Premium Yearly' LIMIT 1;
    ELSE
      -- Default to monthly if we can't determine
      SELECT id INTO subscription_plan_id FROM subscription_plans WHERE name = 'Premium Monthly' LIMIT 1;
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
  
  -- Update or insert subscription record with ALL RevenueCat data
  INSERT INTO user_subscriptions (
    user_id,
    plan_id,
    status,
    subscription_start_date,
    subscription_end_date,
    auto_renew,
    revenuecat_user_id,
    is_premium,
    updated_at
  ) VALUES (
    user_uuid,
    subscription_plan_id,
    subscription_status,
    to_timestamp(purchased_at_ms / 1000.0),
    current_period_end,
    COALESCE(auto_renew_status, true), -- Default to true if not provided
    app_user_id, -- Store the RevenueCat user ID
    (subscription_status = 'active' AND current_period_end > NOW()), -- Set is_premium based on status and expiration
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    status = EXCLUDED.status,
    subscription_start_date = EXCLUDED.subscription_start_date,
    subscription_end_date = EXCLUDED.subscription_end_date,
    auto_renew = EXCLUDED.auto_renew,
    revenuecat_user_id = EXCLUDED.revenuecat_user_id,
    is_premium = EXCLUDED.is_premium,
    updated_at = NOW();

  -- Log update summary
  RAISE LOG 'Updated subscription for user %: plan=%, status=%, premium=%, revenuecat_id=%', 
    app_user_id, 
    (SELECT name FROM subscription_plans WHERE id = subscription_plan_id), 
    subscription_status, 
    (subscription_status = 'active' AND current_period_end > NOW()),
    app_user_id;
  
  RETURN json_build_object(
    'success', true,
    'user_id', app_user_id,
    'plan_id', subscription_plan_id,
    'status', subscription_status,
    'is_premium', (subscription_status = 'active' AND current_period_end > NOW()),
    'revenuecat_user_id', app_user_id,
    'subscription_end_date', current_period_end
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Webhook error for user %: %', app_user_id, SQLERRM;
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION handle_revenuecat_webhook TO authenticated;

-- Test the function exists
SELECT 'handle_revenuecat_webhook function created successfully' as status;

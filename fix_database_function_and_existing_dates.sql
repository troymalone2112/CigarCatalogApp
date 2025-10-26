-- Fix Database Function and Existing Subscription Dates
-- This script fixes both the database function and existing bad subscription dates

-- 1. Update the database function to handle RevenueCat user ID and date correction
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
  purchased_at TIMESTAMP WITH TIME ZONE;
  expiration_at TIMESTAMP WITH TIME ZONE;
  time_diff_minutes INTEGER;
  expected_days INTEGER;
  corrected_expiration TIMESTAMP WITH TIME ZONE;
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
  END IF;
  
  -- Convert timestamps
  purchased_at := to_timestamp(purchased_at_ms / 1000.0);
  expiration_at := to_timestamp(expiration_at_ms / 1000.0);
  
  -- Calculate time difference in minutes
  time_diff_minutes := EXTRACT(EPOCH FROM (expiration_at - purchased_at)) / 60;
  
  -- Determine expected duration based on product_id
  CASE 
    WHEN product_id LIKE '%monthly%' OR product_id = '$rc_monthly' THEN
      subscription_plan := 'premium_monthly';
      expected_days := 30;
    WHEN product_id LIKE '%annual%' OR product_id = '$rc_annual' OR product_id LIKE '%yearly%' THEN
      subscription_plan := 'premium_yearly';
      expected_days := 365;
    ELSE
      subscription_plan := 'premium_monthly'; -- Default fallback
      expected_days := 30;
  END CASE;
  
  -- FIXED: Check if dates are problematic and correct them
  IF expected_days > 0 AND time_diff_minutes < (expected_days * 24 * 60 - (24 * 60)) THEN
    RAISE LOG 'Detected problematic subscription dates for user %. Original expiration: %. Recalculating.', app_user_id, expiration_at;
    corrected_expiration := purchased_at + (expected_days || ' days')::INTERVAL;
    expiration_at := corrected_expiration;
    RAISE LOG 'Corrected expiration date to: % (based on % days)', expiration_at, expected_days;
  END IF;
  
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
  
  -- Update or insert subscription record with RevenueCat user ID
  INSERT INTO user_subscriptions (
    user_id,
    plan_id,
    status,
    subscription_start_date,
    subscription_end_date,
    auto_renew,
    updated_at,
    revenuecat_user_id,
    is_premium
  ) VALUES (
    user_uuid,
    (SELECT id FROM subscription_plans WHERE name = CASE WHEN subscription_plan = 'premium_yearly' THEN 'Premium Yearly' ELSE 'Premium Monthly' END LIMIT 1),
    subscription_status,
    purchased_at,
    expiration_at,
    auto_renew_status,
    NOW(),
    app_user_id, -- FIXED: Store RevenueCat user ID
    (subscription_status IN ('active', 'cancelled') AND expiration_at > NOW())
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    status = EXCLUDED.status,
    subscription_start_date = EXCLUDED.subscription_start_date,
    subscription_end_date = EXCLUDED.subscription_end_date,
    auto_renew = EXCLUDED.auto_renew,
    updated_at = NOW(),
    revenuecat_user_id = EXCLUDED.revenuecat_user_id, -- FIXED: Update RevenueCat user ID
    is_premium = EXCLUDED.is_premium;

  -- Log update summary
  RAISE LOG 'Updated subscription for user %: plan=%, status=%, premium=%', 
    user_uuid, subscription_plan, subscription_status, (SELECT is_premium FROM user_subscriptions WHERE user_id = user_uuid);
  
  RETURN json_build_object('success', true, 'user_id', user_uuid, 'status', subscription_status, 'corrected_dates', time_diff_minutes < (expected_days * 24 * 60 - (24 * 60)));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix existing subscriptions with incorrect dates
DO $$
DECLARE
  user_sub RECORD;
  plan_name TEXT;
  new_end_date TIMESTAMP WITH TIME ZONE;
  plan_duration INTERVAL;
  corrected_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting fix for existing subscription dates...';

  FOR user_sub IN
    SELECT
      us.user_id,
      us.subscription_start_date,
      us.subscription_end_date,
      us.status,
      sp.name AS plan_name,
      us.revenuecat_user_id
    FROM
      public.user_subscriptions us
    JOIN
      public.subscription_plans sp ON us.plan_id = sp.id
    WHERE
      us.status IN ('active', 'cancelled') -- Only consider active/cancelled subscriptions
      AND us.subscription_end_date IS NOT NULL
      AND us.subscription_start_date IS NOT NULL
      -- Identify potentially problematic subscriptions (e.g., very short duration)
      AND (us.subscription_end_date - us.subscription_start_date) < INTERVAL '29 days'
  LOOP
    plan_name := user_sub.plan_name;
    
    -- Determine the correct duration based on the plan name
    IF plan_name ILIKE '%monthly%' THEN
      plan_duration := INTERVAL '1 month';
    ELSIF plan_name ILIKE '%yearly%' OR plan_name ILIKE '%annual%' THEN
      plan_duration := INTERVAL '1 year';
    ELSE
      -- Default to 1 month if plan name is ambiguous
      plan_duration := INTERVAL '1 month';
    END IF;

    -- Calculate the new end date
    new_end_date := user_sub.subscription_start_date + plan_duration;

    -- Only update if the new end date is significantly different and longer
    IF new_end_date > user_sub.subscription_end_date + INTERVAL '1 day' THEN -- Allow for minor discrepancies
      UPDATE public.user_subscriptions
      SET
        subscription_end_date = new_end_date,
        updated_at = NOW(),
        -- Ensure is_premium is true if it's an active subscription
        is_premium = CASE WHEN user_sub.status IN ('active', 'cancelled') THEN TRUE ELSE FALSE END
      WHERE
        user_id = user_sub.user_id;

      corrected_count := corrected_count + 1;
      RAISE NOTICE 'Fixed subscription for user % (plan: %): Old end date %, New end date %',
                    user_sub.user_id, plan_name, user_sub.subscription_end_date, new_end_date;
    ELSE
      RAISE NOTICE 'Subscription for user % (plan: %) already has a reasonable end date %; no fix applied.',
                    user_sub.user_id, plan_name, user_sub.subscription_end_date;
    END IF;
  END LOOP;

  RAISE NOTICE 'Finished fixing existing subscription dates. Corrected % subscriptions.', corrected_count;
END $$;

-- 3. Create webhook events table for debugging (if it doesn't exist)
CREATE TABLE IF NOT EXISTS revenuecat_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_data JSONB NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_revenuecat_webhook TO authenticated;
GRANT INSERT ON TABLE public.revenuecat_webhook_events TO authenticated;

-- 5. Create index for faster webhook processing
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_revenuecat_user_id 
ON user_subscriptions(revenuecat_user_id);

-- 6. Verify the fixes
DO $$
DECLARE
  bad_subscriptions INTEGER;
  total_subscriptions INTEGER;
BEGIN
  SELECT COUNT(*) INTO bad_subscriptions
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.status IN ('active', 'cancelled')
    AND us.subscription_end_date IS NOT NULL
    AND us.subscription_start_date IS NOT NULL
    AND (us.subscription_end_date - us.subscription_start_date) < INTERVAL '29 days';
    
  SELECT COUNT(*) INTO total_subscriptions
  FROM user_subscriptions
  WHERE status IN ('active', 'cancelled');
  
  RAISE NOTICE 'Verification complete:';
  RAISE NOTICE '- Total active/cancelled subscriptions: %', total_subscriptions;
  RAISE NOTICE '- Subscriptions with problematic dates: %', bad_subscriptions;
  
  IF bad_subscriptions = 0 THEN
    RAISE NOTICE '✅ All subscription dates are now correct!';
  ELSE
    RAISE NOTICE '⚠️ % subscriptions still have problematic dates', bad_subscriptions;
  END IF;
END $$;

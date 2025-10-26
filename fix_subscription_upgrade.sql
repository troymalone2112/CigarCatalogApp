-- Fix subscription upgrade flow
-- This fixes the issue where users who upgrade to premium still see trial status

-- First, let's check the current subscription status for debugging
SELECT 
  us.user_id,
  us.status,
  us.is_premium,
  us.trial_start_date,
  us.trial_end_date,
  us.subscription_start_date,
  us.subscription_end_date,
  us.last_sync_date,
  p.full_name
FROM user_subscriptions us
LEFT JOIN profiles p ON us.user_id = p.id
ORDER BY us.updated_at DESC
LIMIT 10;

-- Update the update_subscription_from_revenuecat function to properly handle premium upgrades
CREATE OR REPLACE FUNCTION update_subscription_from_revenuecat(
  user_uuid UUID,
  is_premium BOOLEAN,
  revenuecat_user_id TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  existing_record user_subscriptions%ROWTYPE;
  premium_plan_id UUID;
BEGIN
  -- Get the premium plan ID
  SELECT id INTO premium_plan_id 
  FROM subscription_plans 
  WHERE name = 'Premium Monthly' 
  LIMIT 1;
  
  -- Check if user already has a subscription record
  SELECT * INTO existing_record
  FROM user_subscriptions
  WHERE user_id = user_uuid;
  
  IF FOUND THEN
    -- Update existing record
    IF is_premium THEN
      -- User upgraded to premium - update status and dates
      UPDATE user_subscriptions 
      SET 
        status = 'active',
        plan_id = premium_plan_id,
        is_premium = true,
        subscription_start_date = NOW(),
        subscription_end_date = NOW() + INTERVAL '1 month', -- Default to 1 month, will be updated by RevenueCat webhook
        revenuecat_user_id = COALESCE(revenuecat_user_id, user_subscriptions.revenuecat_user_id),
        last_sync_date = NOW(),
        updated_at = NOW()
      WHERE user_id = user_uuid;
      
      RAISE NOTICE 'Updated user % to premium status', user_uuid;
    ELSE
      -- User is not premium - just update the sync info
      UPDATE user_subscriptions 
      SET 
        is_premium = false,
        revenuecat_user_id = COALESCE(revenuecat_user_id, user_subscriptions.revenuecat_user_id),
        last_sync_date = NOW(),
        updated_at = NOW()
      WHERE user_id = user_uuid;
      
      RAISE NOTICE 'Updated user % sync info (not premium)', user_uuid;
    END IF;
  ELSE
    -- Create new record (shouldn't happen for existing users, but just in case)
    INSERT INTO user_subscriptions (
      user_id, 
      plan_id,
      status,
      is_premium, 
      revenuecat_user_id, 
      trial_start_date,
      trial_end_date,
      subscription_start_date,
      subscription_end_date,
      last_sync_date
    )
    VALUES (
      user_uuid, 
      premium_plan_id,
      CASE WHEN is_premium THEN 'active' ELSE 'trial' END,
      is_premium, 
      revenuecat_user_id,
      NOW(),
      NOW() + INTERVAL '3 days',
      CASE WHEN is_premium THEN NOW() ELSE NULL END,
      CASE WHEN is_premium THEN NOW() + INTERVAL '1 month' ELSE NULL END,
      NOW()
    );
    
    RAISE NOTICE 'Created new subscription record for user %', user_uuid;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function with a sample user (replace with actual user ID for testing)
-- SELECT update_subscription_from_revenuecat('your-user-id-here', true, 'test-revenuecat-id');

-- Check the results after the fix
SELECT 
  us.user_id,
  us.status,
  us.is_premium,
  us.trial_start_date,
  us.trial_end_date,
  us.subscription_start_date,
  us.subscription_end_date,
  us.last_sync_date,
  p.full_name
FROM user_subscriptions us
LEFT JOIN profiles p ON us.user_id = p.id
ORDER BY us.updated_at DESC
LIMIT 10;


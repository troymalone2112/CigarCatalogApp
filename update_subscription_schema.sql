-- Update subscription schema for simplified RevenueCat integration
-- This replaces the complex subscription tracking with simple status tracking

-- Update subscription_plans with correct pricing
UPDATE subscription_plans 
SET price_monthly = 9.99, price_yearly = 109.99 
WHERE name IN ('Premium Monthly', 'Premium Yearly');

-- Add RevenueCat fields to user_subscriptions
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS revenuecat_user_id TEXT,
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '3 days'),
ADD COLUMN IF NOT EXISTS last_sync_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing records to have trial dates if they don't exist
UPDATE user_subscriptions 
SET 
  trial_start_date = COALESCE(trial_start_date, NOW()),
  trial_end_date = COALESCE(trial_end_date, NOW() + INTERVAL '3 days')
WHERE trial_start_date IS NULL OR trial_end_date IS NULL;

-- Create simplified subscription status function
CREATE OR REPLACE FUNCTION get_user_subscription_status(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
  subscription_record user_subscriptions%ROWTYPE;
  days_left INTEGER;
  hours_left NUMERIC;
  result JSON;
BEGIN
  SELECT * INTO subscription_record
  FROM user_subscriptions
  WHERE user_id = user_uuid;

  -- No subscription record found - new user gets trial
  IF NOT FOUND THEN
    -- Create a trial subscription for this user with 3 full days
    INSERT INTO user_subscriptions (
      user_id, 
      is_premium, 
      trial_start_date, 
      trial_end_date,
      last_sync_date
    )
    VALUES (
      user_uuid,
      false,
      NOW(),
      NOW() + INTERVAL '3 days',
      NOW()
    );
    
    result := json_build_object(
      'hasAccess', true,
      'isTrialActive', true,
      'isPremium', false,
      'daysRemaining', 3,
      'status', 'trial',
      'hasEverSubscribed', false
    );
    RETURN result;
  END IF;

  -- Check if user is premium (from RevenueCat sync)
  IF subscription_record.is_premium = true THEN
    result := json_build_object(
      'hasAccess', true,
      'isTrialActive', false,
      'isPremium', true,
      'daysRemaining', 999, -- Premium users don't have expiration in trial context
      'status', 'premium',
      'hasEverSubscribed', true
    );
    RETURN result;
  END IF;

  -- Check trial status
  -- Calculate days remaining by converting the interval to total hours, then to days
  IF subscription_record.trial_end_date > NOW() THEN
    -- Calculate total hours remaining for more precision
    hours_left := EXTRACT(EPOCH FROM (subscription_record.trial_end_date - NOW())) / 3600;
    
    -- Round up if more than 0 hours remain
    -- This ensures "1 day" is shown even if only 1 hour remains
    IF hours_left > 0 THEN
      days_left := CEIL(hours_left / 24)::INTEGER;
    ELSE
      days_left := 0;
    END IF;
    
    result := json_build_object(
      'hasAccess', true,
      'isTrialActive', true,
      'isPremium', false,
      'daysRemaining', days_left,
      'status', 'trial',
      'hasEverSubscribed', false
    );
    RETURN result;
  END IF;

  -- Trial expired, no premium
  result := json_build_object(
    'hasAccess', false,
    'isTrialActive', false,
    'isPremium', false,
    'daysRemaining', 0,
    'status', 'expired',
    'hasEverSubscribed', false
  );
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update subscription status from RevenueCat
CREATE OR REPLACE FUNCTION update_subscription_from_revenuecat(
  user_uuid UUID,
  is_premium BOOLEAN,
  revenuecat_user_id TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_subscriptions (
    user_id, 
    is_premium, 
    revenuecat_user_id, 
    trial_start_date,
    trial_end_date,
    last_sync_date
  )
  VALUES (
    user_uuid, 
    is_premium, 
    revenuecat_user_id,
    NOW(),
    NOW() + INTERVAL '3 days',
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    is_premium = EXCLUDED.is_premium,
    revenuecat_user_id = COALESCE(EXCLUDED.revenuecat_user_id, user_subscriptions.revenuecat_user_id),
    last_sync_date = NOW()
    -- DO NOT update trial dates on sync - they should remain from initial creation
  ;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

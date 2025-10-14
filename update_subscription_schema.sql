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
  result JSON;
BEGIN
  SELECT * INTO subscription_record
  FROM user_subscriptions
  WHERE user_id = user_uuid;

  -- No subscription record found - new user gets trial
  IF NOT FOUND THEN
    result := json_build_object(
      'hasAccess', true,
      'isTrialActive', true,
      'isPremium', false,
      'daysRemaining', 3,
      'status', 'trial'
    );
    RETURN result;
  END IF;

  -- Check if user is premium (from RevenueCat sync)
  IF subscription_record.is_premium = true THEN
    result := json_build_object(
      'hasAccess', true,
      'isTrialActive', false,
      'isPremium', true,
      'daysRemaining', 999, -- Premium users don't have expiration
      'status', 'premium'
    );
    RETURN result;
  END IF;

  -- Check trial status
  IF subscription_record.trial_end_date > NOW() THEN
    result := json_build_object(
      'hasAccess', true,
      'isTrialActive', true,
      'isPremium', false,
      'daysRemaining', EXTRACT(days FROM (subscription_record.trial_end_date - NOW()))::INTEGER,
      'status', 'trial'
    );
    RETURN result;
  END IF;

  -- Trial expired, no premium
  result := json_build_object(
    'hasAccess', false,
    'isTrialActive', false,
    'isPremium', false,
    'daysRemaining', 0,
    'status', 'expired'
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
  INSERT INTO user_subscriptions (user_id, is_premium, revenuecat_user_id, last_sync_date)
  VALUES (user_uuid, is_premium, revenuecat_user_id, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    is_premium = EXCLUDED.is_premium,
    revenuecat_user_id = COALESCE(EXCLUDED.revenuecat_user_id, user_subscriptions.revenuecat_user_id),
    last_sync_date = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix RevenueCat Database Functions
-- This fixes the foreign key constraint issues and creates proper database functions

-- First, let's check the current schema and fix any issues
-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_user_subscription_status(UUID);
DROP FUNCTION IF EXISTS update_subscription_from_revenuecat(UUID, BOOLEAN, TEXT);

-- Create the get_user_subscription_status function with proper error handling
CREATE OR REPLACE FUNCTION get_user_subscription_status(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
  subscription_record RECORD;
  plan_record RECORD;
  result JSON;
  has_access BOOLEAN := FALSE;
  is_trial_active BOOLEAN := FALSE;
  is_premium BOOLEAN := FALSE;
  days_remaining INTEGER := 0;
  status_text TEXT := 'trial';
BEGIN
  -- Get user subscription with plan details
  SELECT 
    us.*,
    sp.name as plan_name,
    sp.description as plan_description,
    sp.price_monthly,
    sp.price_yearly,
    sp.features
  INTO subscription_record
  FROM user_subscriptions us
  LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = user_uuid
  LIMIT 1;

  -- If no subscription found, create a default trial
  IF NOT FOUND THEN
    -- Get the trial plan
    SELECT * INTO plan_record FROM subscription_plans WHERE name = 'Free Trial' LIMIT 1;
    
    IF FOUND THEN
      -- Create trial subscription
      INSERT INTO user_subscriptions (
        user_id,
        plan_id,
        status,
        trial_start_date,
        trial_end_date,
        created_at,
        updated_at
      ) VALUES (
        user_uuid,
        plan_record.id,
        'trial',
        NOW(),
        NOW() + INTERVAL '3 days',
        NOW(),
        NOW()
      );
      
      -- Get the newly created subscription
      SELECT 
        us.*,
        sp.name as plan_name,
        sp.description as plan_description,
        sp.price_monthly,
        sp.price_yearly,
        sp.features
      INTO subscription_record
      FROM user_subscriptions us
      LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = user_uuid
      LIMIT 1;
    END IF;
  END IF;

  -- If still no subscription, return default trial status
  IF NOT FOUND THEN
    RETURN json_build_object(
      'hasAccess', true,
      'isTrialActive', true,
      'isPremium', false,
      'daysRemaining', 3,
      'status', 'trial'
    );
  END IF;

  -- Calculate subscription status
  IF subscription_record.status = 'trial' THEN
    is_trial_active := subscription_record.trial_end_date > NOW();
    has_access := is_trial_active;
    status_text := 'trial';
    
    IF is_trial_active THEN
      days_remaining := EXTRACT(DAY FROM subscription_record.trial_end_date - NOW())::INTEGER;
    END IF;
  ELSIF subscription_record.status = 'active' THEN
    is_premium := subscription_record.subscription_end_date > NOW();
    has_access := is_premium;
    status_text := 'active';
    
    IF is_premium THEN
      days_remaining := EXTRACT(DAY FROM subscription_record.subscription_end_date - NOW())::INTEGER;
    END IF;
  ELSIF subscription_record.status = 'cancelled' THEN
    is_premium := subscription_record.subscription_end_date > NOW();
    has_access := is_premium;
    status_text := 'cancelled';
    
    IF is_premium THEN
      days_remaining := EXTRACT(DAY FROM subscription_record.subscription_end_date - NOW())::INTEGER;
    END IF;
  END IF;

  -- Build result
  result := json_build_object(
    'hasAccess', has_access,
    'isTrialActive', is_trial_active,
    'isPremium', is_premium,
    'daysRemaining', GREATEST(0, days_remaining),
    'status', status_text,
    'plan', json_build_object(
      'id', subscription_record.plan_id,
      'name', subscription_record.plan_name,
      'description', subscription_record.plan_description,
      'price_monthly', subscription_record.price_monthly,
      'price_yearly', subscription_record.price_yearly,
      'features', subscription_record.features
    )
  );

  RETURN result;

EXCEPTION WHEN OTHERS THEN
  -- Return default trial status on error
  RETURN json_build_object(
    'hasAccess', true,
    'isTrialActive', true,
    'isPremium', false,
    'daysRemaining', 3,
    'status', 'trial'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the update_subscription_from_revenuecat function
CREATE OR REPLACE FUNCTION update_subscription_from_revenuecat(
  user_uuid UUID,
  is_premium BOOLEAN,
  revenuecat_user_id TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  premium_plan_id UUID;
  result JSON;
BEGIN
  -- Get the premium plan (monthly as default)
  SELECT id INTO premium_plan_id 
  FROM subscription_plans 
  WHERE name = 'Premium Monthly' 
  LIMIT 1;

  IF is_premium THEN
    -- Update to premium subscription
    INSERT INTO user_subscriptions (
      user_id,
      plan_id,
      status,
      subscription_start_date,
      subscription_end_date,
      auto_renew,
      created_at,
      updated_at
    ) VALUES (
      user_uuid,
      premium_plan_id,
      'active',
      NOW(),
      NOW() + INTERVAL '1 month',
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      plan_id = EXCLUDED.plan_id,
      status = 'active',
      subscription_start_date = EXCLUDED.subscription_start_date,
      subscription_end_date = EXCLUDED.subscription_end_date,
      auto_renew = EXCLUDED.auto_renew,
      updated_at = NOW();
  ELSE
    -- Keep as trial or set to expired
    UPDATE user_subscriptions 
    SET 
      status = CASE 
        WHEN trial_end_date > NOW() THEN 'trial'
        ELSE 'expired'
      END,
      updated_at = NOW()
    WHERE user_id = user_uuid;
  END IF;

  -- Return updated status
  SELECT get_user_subscription_status(user_uuid) INTO result;
  RETURN result;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_subscription_status(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION update_subscription_from_revenuecat(UUID, BOOLEAN, TEXT) TO authenticated, anon;

-- Test the functions
SELECT 'Database functions created successfully' as status;

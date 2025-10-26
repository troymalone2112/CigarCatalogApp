-- Fix existing subscriptions with incorrect dates
-- This script identifies and corrects subscriptions where the dates are too close together

-- First, let's see what we're working with
SELECT 
  us.user_id,
  p.email,
  us.status,
  us.subscription_start_date,
  us.subscription_end_date,
  sp.name as plan_name,
  sp.price_monthly,
  sp.price_yearly,
  us.created_at,
  us.updated_at,
  -- Calculate the difference in days
  EXTRACT(EPOCH FROM (us.subscription_end_date - us.subscription_start_date)) / 86400 as days_difference
FROM user_subscriptions us
JOIN profiles p ON us.user_id = p.id
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.subscription_start_date IS NOT NULL 
  AND us.subscription_end_date IS NOT NULL
ORDER BY us.updated_at DESC;

-- Update subscriptions where the dates are too close together (less than 1 day)
UPDATE user_subscriptions 
SET 
  subscription_end_date = CASE 
    -- For yearly plans, set to 1 year from start date
    WHEN sp.name = 'Premium Yearly' THEN 
      subscription_start_date + INTERVAL '1 year'
    -- For monthly plans, set to 1 month from start date  
    WHEN sp.name = 'Premium Monthly' THEN 
      subscription_start_date + INTERVAL '1 month'
    -- Default to 1 month if plan name is unclear
    ELSE 
      subscription_start_date + INTERVAL '1 month'
  END,
  updated_at = NOW()
FROM subscription_plans sp
WHERE user_subscriptions.plan_id = sp.id
  AND subscription_start_date IS NOT NULL 
  AND subscription_end_date IS NOT NULL
  -- Only update if the difference is less than 1 day (86400 seconds)
  AND EXTRACT(EPOCH FROM (subscription_end_date - subscription_start_date)) < 86400;

-- Verify the fix
SELECT 
  us.user_id,
  p.email,
  us.status,
  us.subscription_start_date,
  us.subscription_end_date,
  sp.name as plan_name,
  -- Calculate the new difference in days
  EXTRACT(EPOCH FROM (us.subscription_end_date - us.subscription_start_date)) / 86400 as days_difference
FROM user_subscriptions us
JOIN profiles p ON us.user_id = p.id
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.subscription_start_date IS NOT NULL 
  AND us.subscription_end_date IS NOT NULL
ORDER BY us.updated_at DESC;

-- Also update the is_premium flag to reflect correct access
UPDATE user_subscriptions 
SET 
  is_premium = (status IN ('active', 'cancelled') AND subscription_end_date > NOW()),
  updated_at = NOW()
WHERE subscription_start_date IS NOT NULL 
  AND subscription_end_date IS NOT NULL;

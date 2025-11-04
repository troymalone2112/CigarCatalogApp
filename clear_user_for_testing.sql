-- Clear User Profile for Testing
-- This script helps you reset a user account to test the subscription flow

-- First, let's see what users exist
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.onboarding_completed,
  p.created_at,
  us.status,
  us.is_premium,
  us.trial_start_date,
  us.trial_end_date
FROM profiles p
LEFT JOIN user_subscriptions us ON p.id = us.user_id
ORDER BY p.created_at DESC
LIMIT 10;

-- To clear a specific user for testing, replace 'USER_ID_HERE' with the actual user ID
-- WARNING: This will delete all data for this user!

-- Step 1: Delete user subscription
DELETE FROM user_subscriptions WHERE user_id = 'USER_ID_HERE';

-- Step 2: Delete user profile
DELETE FROM profiles WHERE id = 'USER_ID_HERE';

-- Step 3: Delete from auth.users (if you have access)
-- DELETE FROM auth.users WHERE id = 'USER_ID_HERE';

-- Alternative: Reset user to trial state instead of deleting
-- This is safer as it preserves the user but resets their subscription
UPDATE user_subscriptions 
SET 
  status = 'trial',
  is_premium = false,
  trial_start_date = NOW(),
  trial_end_date = NOW() + INTERVAL '3 days',
  subscription_start_date = NULL,
  subscription_end_date = NULL,
  last_sync_date = NOW()
WHERE user_id = 'USER_ID_HERE';

-- Check the results
SELECT 
  p.id,
  p.full_name,
  p.email,
  us.status,
  us.is_premium,
  us.trial_start_date,
  us.trial_end_date
FROM profiles p
LEFT JOIN user_subscriptions us ON p.id = us.user_id
WHERE p.id = 'USER_ID_HERE';






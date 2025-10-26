-- Fix existing users' trial dates to use proper timezone calculation
-- This script updates existing trial subscriptions to have correct dates

-- First, let's see what we're working with
SELECT 
  us.user_id,
  p.email,
  p.full_name,
  us.trial_start_date,
  us.trial_end_date,
  us.status,
  (us.trial_end_date - us.trial_start_date) as trial_duration
FROM public.user_subscriptions us
JOIN public.profiles p ON us.user_id = p.id
WHERE us.status = 'trial'
ORDER BY us.created_at DESC
LIMIT 5;

-- Update existing trial subscriptions to have proper dates
-- We'll use the user's timezone if available, otherwise default to UTC
UPDATE public.user_subscriptions
SET
  trial_start_date = NOW() AT TIME ZONE 'UTC',
  trial_end_date = (
    CASE 
      WHEN p.raw_user_meta_data->>'timezone' IS NOT NULL 
      THEN (NOW() AT TIME ZONE (p.raw_user_meta_data->>'timezone') + INTERVAL '3 days') AT TIME ZONE 'UTC'
      ELSE (NOW() AT TIME ZONE 'UTC' + INTERVAL '3 days')
    END
  ),
  updated_at = NOW() AT TIME ZONE 'UTC'
FROM public.profiles p
WHERE user_subscriptions.user_id = p.id
AND user_subscriptions.status = 'trial';

-- Show the updated results
SELECT 
  us.user_id,
  p.email,
  p.full_name,
  us.trial_start_date,
  us.trial_end_date,
  us.status,
  (us.trial_end_date - us.trial_start_date) as trial_duration
FROM public.user_subscriptions us
JOIN public.profiles p ON us.user_id = p.id
WHERE us.status = 'trial'
ORDER BY us.created_at DESC
LIMIT 5;

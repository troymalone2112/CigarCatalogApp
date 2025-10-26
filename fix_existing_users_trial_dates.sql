-- Fix existing users with incorrect trial dates
-- Run this in Supabase SQL Editor

-- First, let's see what the current trial dates look like
SELECT 
  user_id,
  trial_start_date,
  trial_end_date,
  status,
  created_at,
  NOW() as current_time,
  (trial_end_date > NOW()) as is_trial_active
FROM public.user_subscriptions 
WHERE status = 'trial'
ORDER BY created_at DESC
LIMIT 10;

-- Update existing trial subscriptions to have correct dates
-- This will fix users who have incorrect trial start/end dates
UPDATE public.user_subscriptions 
SET 
  trial_start_date = created_at AT TIME ZONE 'UTC',
  trial_end_date = (created_at AT TIME ZONE 'UTC') + INTERVAL '3 days',
  updated_at = NOW()
WHERE status = 'trial' 
AND (trial_start_date IS NULL OR trial_end_date IS NULL OR trial_start_date > NOW());

-- Check the results after the update
SELECT 
  user_id,
  trial_start_date,
  trial_end_date,
  status,
  created_at,
  NOW() as current_time,
  (trial_end_date > NOW()) as is_trial_active
FROM public.user_subscriptions 
WHERE status = 'trial'
ORDER BY created_at DESC
LIMIT 10;

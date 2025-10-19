-- Fix Subscription RLS and Create Trial Subscriptions
-- This script fixes the RLS policies and creates trial subscriptions for existing users

-- First, let's check the current RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'user_subscriptions';

-- Fix RLS policies for user_subscriptions table
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON user_subscriptions;

-- Create proper RLS policies
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON user_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON user_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Also allow service role to manage subscriptions (for webhooks and admin functions)
CREATE POLICY "Service role can manage all subscriptions" ON user_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Now let's create trial subscriptions for existing users
-- First, get the trial plan ID
DO $$
DECLARE
  trial_plan_id UUID;
  user_record RECORD;
BEGIN
  -- Get the trial plan ID
  SELECT id INTO trial_plan_id 
  FROM subscription_plans 
  WHERE name = 'Free Trial' 
  LIMIT 1;
  
  IF trial_plan_id IS NULL THEN
    RAISE NOTICE 'No trial plan found, creating one...';
    INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, features) 
    VALUES ('Free Trial', '3-day full access trial', 0.00, 0.00, ARRAY[
      'Unlimited cigar recognition',
      'Personal humidor tracking', 
      'Smoking journal',
      'AI recommendations',
      'Cloud sync'
    ]) RETURNING id INTO trial_plan_id;
  END IF;
  
  RAISE NOTICE 'Trial plan ID: %', trial_plan_id;
  
  -- Create trial subscriptions for all existing users who don't have one
  FOR user_record IN 
    SELECT p.id, p.email, p.full_name
    FROM profiles p
    LEFT JOIN user_subscriptions us ON p.id = us.user_id
    WHERE us.user_id IS NULL
  LOOP
    RAISE NOTICE 'Creating trial subscription for user: % (%)', user_record.full_name, user_record.email;
    
    INSERT INTO user_subscriptions (
      user_id,
      plan_id,
      status,
      is_premium,
      trial_start_date,
      trial_end_date,
      auto_renew
    ) VALUES (
      user_record.id,
      trial_plan_id,
      'trial',
      false,
      NOW(),
      NOW() + INTERVAL '3 days',
      true
    );
    
    RAISE NOTICE 'Trial subscription created for user: %', user_record.id;
  END LOOP;
  
  RAISE NOTICE 'Trial subscription creation completed';
END $$;

-- Check the results
SELECT 
  p.full_name,
  p.email,
  us.status,
  us.is_premium,
  us.trial_start_date,
  us.trial_end_date,
  us.created_at
FROM profiles p
LEFT JOIN user_subscriptions us ON p.id = us.user_id
ORDER BY us.created_at DESC;

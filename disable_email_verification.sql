-- Disable email verification for immediate signup
-- Run this in Supabase SQL Editor

-- This will allow users to sign up and immediately use the app
-- without needing to verify their email first

-- Note: You'll also need to change this setting in the Supabase Dashboard
-- Go to Authentication > Settings > Email Auth
-- Turn OFF "Enable email confirmations"

-- For now, let's make sure our trigger works for unconfirmed users too
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  trial_plan_id UUID;
  profile_exists BOOLEAN := FALSE;
BEGIN
  -- Check if profile already exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = NEW.id) INTO profile_exists;
  
  -- Only insert profile if it doesn't exist
  -- This works regardless of email confirmation status
  IF NOT profile_exists THEN
    INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
    VALUES (
      NEW.id, 
      NEW.email, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
      NOW(),
      NOW()
    );
  END IF;

  -- Get the trial plan ID
  SELECT id INTO trial_plan_id 
  FROM public.subscription_plans 
  WHERE name = 'Free Trial' 
  AND is_active = true
  LIMIT 1;

  -- Create trial subscription immediately, even for unconfirmed users
  IF trial_plan_id IS NOT NULL THEN
    INSERT INTO public.user_subscriptions (
      user_id, 
      plan_id, 
      status,
      trial_start_date,
      trial_end_date,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      trial_plan_id,
      'trial',
      NOW(),
      NOW() + INTERVAL '3 days',
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies to work with unconfirmed users
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON profiles;

-- Create policies that work for both confirmed and unconfirmed users
CREATE POLICY "Enable read access for all users" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for users based on user_id" ON profiles
    FOR UPDATE USING (auth.uid() = id OR auth.role() = 'service_role');

-- Also update user_subscriptions policies to work with unconfirmed users
DROP POLICY IF EXISTS "Users can manage their own subscription" ON user_subscriptions;

CREATE POLICY "Users can view their own subscription" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can insert their own subscription" ON user_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can update their own subscription" ON user_subscriptions
    FOR UPDATE USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- Test message
DO $$
BEGIN
  RAISE NOTICE 'Email verification disabled in database. Remember to also disable it in Supabase Dashboard > Authentication > Settings > Email Auth';
END $$;















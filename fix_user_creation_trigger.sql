-- Fix user creation trigger to ensure email and full_name are properly saved
-- Run this in Supabase SQL Editor

-- First, let's check if the trigger exists
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create a robust function that handles user creation properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  trial_plan_id UUID;
  user_full_name TEXT;
  user_email TEXT;
BEGIN
  -- Extract user data safely
  user_email := COALESCE(NEW.email, '');
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User');
  
  -- Log the user creation for debugging
  RAISE NOTICE 'Creating profile for user: % with email: % and full_name: %', NEW.id, user_email, user_full_name;
  
  -- Insert profile with proper error handling
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    created_at, 
    updated_at,
    onboarding_completed
  ) VALUES (
    NEW.id, 
    user_email,
    user_full_name,
    NOW(),
    NOW(),
    FALSE
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = NOW();

  -- Get the trial plan ID
  SELECT id INTO trial_plan_id 
  FROM public.subscription_plans 
  WHERE name = 'Free Trial' 
  AND is_active = true
  LIMIT 1;

  -- Create trial subscription if plan exists
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

  -- Create default humidor for new user
  INSERT INTO public.humidors (
    id,
    user_id, 
    name, 
    description,
    capacity,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    NEW.id,
    'My First Humidor',
    'Your personal cigar collection',
    100,
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail user creation
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT ALL ON public.user_subscriptions TO anon, authenticated;
GRANT ALL ON public.subscription_plans TO anon, authenticated;
GRANT ALL ON public.humidors TO anon, authenticated;

-- Test the trigger by checking if it exists
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

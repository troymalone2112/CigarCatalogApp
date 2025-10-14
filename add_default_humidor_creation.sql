-- Add default humidor creation for new users
-- This ensures every new user gets a default humidor automatically

-- First, let's check the current trigger function
SELECT routine_definition FROM information_schema.routines 
WHERE routine_name = 'handle_new_user' AND routine_schema = 'public';

-- Drop and recreate the trigger function to include default humidor creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the updated function that creates profile, subscription, AND default humidor
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  trial_plan_id UUID;
  profile_exists BOOLEAN := FALSE;
BEGIN
  -- Check if profile already exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = NEW.id) INTO profile_exists;
  
  -- Only insert profile if it doesn't exist
  IF NOT profile_exists THEN
    INSERT INTO public.profiles (id, email, full_name, created_at, updated_at, onboarding_completed)
    VALUES (
      NEW.id, 
      NEW.email, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
      NOW(),
      NOW(),
      FALSE
    );
  END IF;

  -- Get the trial plan ID
  SELECT id INTO trial_plan_id 
  FROM public.subscription_plans 
  WHERE name = 'Free Trial' 
  AND is_active = true
  LIMIT 1;

  -- Create trial subscription if plan exists and subscription doesn't exist
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
    ON CONFLICT (user_id) DO NOTHING; -- Prevent duplicate subscriptions
  END IF;

  -- Create default humidor for new user
  INSERT INTO public.humidors (
    id,
    user_id, 
    name, 
    description,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    NEW.id,
    'My Humidor', 
    'Your personal cigar collection',
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, name) DO NOTHING; -- Prevent duplicate humidors

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
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON public.profiles TO anon, authenticated, service_role;
GRANT ALL ON public.user_subscriptions TO anon, authenticated, service_role;
GRANT ALL ON public.humidors TO anon, authenticated, service_role;
GRANT SELECT ON public.subscription_plans TO anon, authenticated, service_role;

-- Verify the trigger was created
SELECT trigger_name, event_manipulation, action_timing, action_statement 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';





-- Drop existing function and trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create new timezone-aware function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  trial_plan_id UUID;
  user_timezone TEXT;
  trial_start_utc TIMESTAMPTZ;
  trial_end_utc TIMESTAMPTZ;
BEGIN
  -- Extract timezone from user metadata, default to 'UTC' if not provided
  user_timezone := COALESCE(NEW.raw_user_meta_data->>'timezone', 'UTC');
  
  -- Trial starts NOW in UTC
  trial_start_utc := NOW() AT TIME ZONE 'UTC';
  
  -- Trial ends 3 days from NOW in user's timezone, converted to UTC
  trial_end_utc := (NOW() AT TIME ZONE user_timezone + INTERVAL '3 days') AT TIME ZONE 'UTC';
  
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at, onboarding_completed)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    trial_start_utc,
    trial_start_utc,
    FALSE
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = trial_start_utc;

  -- Get trial plan ID
  SELECT id INTO trial_plan_id 
  FROM public.subscription_plans 
  WHERE name = 'Free Trial' 
  AND is_active = true
  LIMIT 1;

  -- Create trial subscription
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
      trial_start_utc,
      trial_end_utc,
      trial_start_utc,
      trial_start_utc
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Create default humidor
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
    'Desktop Humidor',
    'Your personal cigar collection',
    150,
    trial_start_utc,
    trial_start_utc
  )
  ON CONFLICT (user_id, name) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

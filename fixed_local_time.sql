-- Drop existing function and trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create new function that properly handles local device time
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  trial_plan_id UUID;
  device_time TIMESTAMPTZ;
  trial_end_time TIMESTAMPTZ;
  user_timezone TEXT;
  local_datetime TEXT;
BEGIN
  -- Get user timezone and local datetime from metadata
  user_timezone := COALESCE(NEW.raw_user_meta_data->>'timezone', 'America/Denver');
  local_datetime := NEW.raw_user_meta_data->>'device_time';
  
  -- Convert local datetime to timestamp with timezone
  IF local_datetime IS NOT NULL AND local_datetime != '' THEN
    -- Parse the local datetime and convert to timestamp with timezone
    -- Format: "2025-10-24T19:22:49" + timezone = "2025-10-24T19:22:49 America/Denver"
    BEGIN
      device_time := (local_datetime || ' ' || user_timezone)::TIMESTAMPTZ;
    EXCEPTION
      WHEN OTHERS THEN
        -- If parsing fails, use current time
        device_time := NOW();
    END;
  ELSE
    -- Fallback to current time
    device_time := NOW();
  END IF;
  
  -- Calculate trial end (3 days from device time)
  trial_end_time := device_time + INTERVAL '3 days';
  
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at, onboarding_completed)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    device_time,
    device_time,
    FALSE
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = device_time;

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
      device_time,
      trial_end_time,
      device_time,
      device_time
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
    device_time,
    device_time
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

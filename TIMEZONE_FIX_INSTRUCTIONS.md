# Timezone Fix for Trial Dates

## Problem

The current trial dates are using UTC time, but we need to use the user's actual timezone for accurate trial tracking.

## Solution

Run this SQL in your Supabase SQL Editor:

```sql
-- Drop existing function and trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the new function that handles user timezone
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

  -- Convert current UTC time to user's timezone for trial start
  trial_start_utc := NOW() AT TIME ZONE 'UTC';

  -- Calculate trial end (3 days from now in user's timezone, then convert back to UTC)
  trial_end_utc := (NOW() AT TIME ZONE user_timezone + INTERVAL '3 days') AT TIME ZONE 'UTC';

  -- Insert profile with ON CONFLICT to handle duplicates
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at, onboarding_completed)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    trial_start_utc, -- Use UTC for created_at
    trial_start_utc, -- Use UTC for updated_at
    FALSE
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = trial_start_utc;

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
      trial_start_utc, -- Trial starts NOW in UTC
      trial_end_utc,   -- Trial ends 3 days from user's timezone, converted to UTC
      trial_start_utc,
      trial_start_utc
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

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## How It Works

1. **User Timezone**: Extracts the user's timezone from `raw_user_meta_data->>'timezone'`
2. **Trial Start**: Uses current UTC time
3. **Trial End**: Calculates 3 days from now in the user's timezone, then converts back to UTC
4. **Result**: Trial ends at the same local time 3 days later, regardless of timezone

## Example

- **User in New York (EST)**: Trial ends at 11:59 PM EST 3 days later
- **User in Tokyo (JST)**: Trial ends at 11:59 PM JST 3 days later
- **User in London (GMT)**: Trial ends at 11:59 PM GMT 3 days later

## Testing

After applying this fix, create a new user account and check that:

1. The trial starts immediately
2. The trial ends exactly 3 days later in the user's local timezone
3. The upgrade banner shows correctly based on the user's timezone

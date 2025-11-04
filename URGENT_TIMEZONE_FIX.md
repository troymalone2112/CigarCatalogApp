# URGENT: Timezone Fix for Trial Dates

## The Problem

Your trial dates are showing "tomorrow" because the database trigger is using UTC time instead of your local timezone.

## IMMEDIATE SOLUTION

**Copy and paste this SQL into your Supabase SQL Editor:**

```sql
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
```

## How to Apply This Fix

1. **Go to your Supabase Dashboard**
2. **Click on "SQL Editor"** in the left sidebar
3. **Copy and paste the SQL above**
4. **Click "Run"**
5. **Test by creating a new user account**

## What This Fix Does

- **Before**: Trial starts "tomorrow" (UTC midnight)
- **After**: Trial starts NOW in your timezone

## Test the Fix

After running the SQL:

1. Create a new user account in your app
2. Check that the trial starts immediately (not tomorrow)
3. Verify the trial ends exactly 3 days from now in your timezone

## If You're Still Having Issues

The problem might be that existing users still have the old trial dates. You can fix existing users by running this additional SQL:

```sql
-- Fix existing trial subscriptions
UPDATE public.user_subscriptions
SET
  trial_start_date = NOW() AT TIME ZONE 'UTC',
  trial_end_date = (NOW() AT TIME ZONE 'UTC' + INTERVAL '3 days'),
  updated_at = NOW() AT TIME ZONE 'UTC'
WHERE status = 'trial' AND trial_end_date < NOW() AT TIME ZONE 'UTC';
```

This will reset expired trials to start now and end in 3 days.

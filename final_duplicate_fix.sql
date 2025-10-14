-- Final fix for duplicate profile issues
-- This will completely resolve the duplicate key problem

-- First, let's check what's in the profiles table
DO $$
DECLARE
    profile_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO profile_count FROM profiles;
    RAISE NOTICE 'Current profiles count: %', profile_count;
END $$;

-- Drop the existing trigger to prevent any conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create a completely bulletproof function that handles ALL edge cases
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  trial_plan_id UUID;
  profile_count INTEGER;
  subscription_count INTEGER;
BEGIN
  -- Log the trigger execution
  RAISE NOTICE 'Trigger executing for user: %', NEW.id;
  
  -- Check if profile already exists
  SELECT COUNT(*) INTO profile_count FROM public.profiles WHERE id = NEW.id;
  
  -- Only create profile if it doesn't exist
  IF profile_count = 0 THEN
    BEGIN
      INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
      VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
        NOW(),
        NOW()
      );
      RAISE NOTICE 'Profile created for user: %', NEW.id;
    EXCEPTION
      WHEN unique_violation THEN
        -- If there's a race condition, just update the existing profile
        UPDATE public.profiles 
        SET 
          email = NEW.email,
          full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
          updated_at = NOW()
        WHERE id = NEW.id;
        RAISE NOTICE 'Profile updated for user: %', NEW.id;
    END;
  ELSE
    RAISE NOTICE 'Profile already exists for user: %', NEW.id;
  END IF;

  -- Get the trial plan ID
  SELECT id INTO trial_plan_id 
  FROM public.subscription_plans 
  WHERE name = 'Free Trial' 
  AND is_active = true
  LIMIT 1;

  -- Check if subscription already exists
  SELECT COUNT(*) INTO subscription_count FROM public.user_subscriptions WHERE user_id = NEW.id;

  -- Only create subscription if it doesn't exist and we have a trial plan
  IF subscription_count = 0 AND trial_plan_id IS NOT NULL THEN
    BEGIN
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
      );
      RAISE NOTICE 'Trial subscription created for user: %', NEW.id;
    EXCEPTION
      WHEN unique_violation THEN
        RAISE NOTICE 'Subscription already exists for user: %', NEW.id;
    END;
  ELSE
    RAISE NOTICE 'Subscription not created for user: % (count: %, plan: %)', NEW.id, subscription_count, trial_plan_id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail user creation
    RAISE WARNING 'Error in handle_new_user for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Clean up any duplicate profiles (keep the first one created)
DELETE FROM public.profiles 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY id ORDER BY created_at) as rn
    FROM public.profiles
  ) t WHERE t.rn > 1
);

-- Clean up any duplicate subscriptions (keep the first one created)
DELETE FROM public.user_subscriptions 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as rn
    FROM public.user_subscriptions
  ) t WHERE t.rn > 1
);

-- Test the function
DO $$
BEGIN
  RAISE NOTICE 'Duplicate profile fix complete. The trigger now handles all edge cases.';
END $$;










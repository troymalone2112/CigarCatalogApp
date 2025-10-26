-- Final fix for user registration
-- Run this in Supabase SQL Editor

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS create_trial_on_signup ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS create_trial_subscription();

-- Create a simpler, more robust function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  trial_plan_id UUID;
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User')
  );

  -- Get the trial plan ID
  SELECT id INTO trial_plan_id 
  FROM subscription_plans 
  WHERE name = 'Free Trial' 
  LIMIT 1;

  -- Create trial subscription
  IF trial_plan_id IS NOT NULL THEN
    INSERT INTO user_subscriptions (
      user_id, 
      plan_id, 
      status,
      trial_start_date,
      trial_end_date
    ) VALUES (
      NEW.id,
      trial_plan_id,
      'trial',
      NOW(),
      NOW() + INTERVAL '3 days'
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
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













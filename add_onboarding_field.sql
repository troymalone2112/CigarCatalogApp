-- Add onboarding_completed field to profiles table
-- This will allow us to track onboarding completion in the database

-- Add the onboarding_completed column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Update existing profiles to mark them as having completed onboarding
-- (since existing users have already been through the app)
UPDATE profiles SET onboarding_completed = TRUE WHERE onboarding_completed IS NULL;

-- Verify the change
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'onboarding_completed';







-- Delete the specific user from Supabase Auth
-- This will remove the user from the authentication system
-- WARNING: This will permanently delete the user and all their data

DELETE FROM auth.users
WHERE email = 'troy@gmail.com';

-- Verify the user was deleted
SELECT id, email, created_at
FROM auth.users
WHERE email = 'troy@gmail.com';










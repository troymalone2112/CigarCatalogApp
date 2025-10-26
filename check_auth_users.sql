-- Check if the user exists in Supabase Auth
-- Note: This query might not work depending on your Supabase permissions
-- But it's worth trying to see what users exist

SELECT id, email, created_at, email_confirmed_at
FROM auth.users
WHERE email = 'troy@gmail.com';

-- Also check all users to see what's in the auth system
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
ORDER BY created_at DESC;







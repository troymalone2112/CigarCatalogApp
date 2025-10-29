-- Delete ALL users from Supabase Auth
-- WARNING: This will permanently delete ALL users and ALL their data
-- Use with caution - this is a complete reset

-- First, let's see what users exist before deleting
SELECT 'BEFORE DELETE - Users that will be deleted:' as info;
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
ORDER BY created_at DESC;

-- Delete all users from auth.users
DELETE FROM auth.users;

-- Verify all users were deleted
SELECT 'AFTER DELETE - Remaining users:' as info;
SELECT id, email, created_at
FROM auth.users;

-- Also clean up any remaining data in application tables
-- (This is optional - the RLS policies should handle this automatically)
-- But let's be thorough for testing

DELETE FROM profiles;
DELETE FROM journal_entries;
DELETE FROM inventory;
DELETE FROM humidors;
DELETE FROM user_subscriptions;
DELETE FROM user_preferences;
DELETE FROM usage_tracking;

-- Show final state
SELECT 'CLEANUP COMPLETE - All users and data deleted' as status;










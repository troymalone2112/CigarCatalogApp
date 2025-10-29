-- Force clear all users from database
-- This script bypasses RLS policies to completely clean the database

-- First, let's see what we have
SELECT COUNT(*) as profile_count FROM profiles;
SELECT COUNT(*) as subscription_count FROM user_subscriptions;
SELECT COUNT(*) as inventory_count FROM user_inventory;
SELECT COUNT(*) as journal_count FROM journal_entries;
SELECT COUNT(*) as humidor_count FROM humidors;

-- Disable RLS temporarily for cleanup
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE humidors DISABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking DISABLE ROW LEVEL SECURITY;

-- Delete all user data
DELETE FROM user_subscriptions;
DELETE FROM user_inventory;
DELETE FROM journal_entries;
DELETE FROM humidors;
DELETE FROM usage_tracking;
DELETE FROM profiles;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE humidors ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Verify cleanup
SELECT COUNT(*) as profile_count FROM profiles;
SELECT COUNT(*) as subscription_count FROM user_subscriptions;
SELECT COUNT(*) as inventory_count FROM user_inventory;
SELECT COUNT(*) as journal_count FROM journal_entries;
SELECT COUNT(*) as humidor_count FROM humidors;

-- If all counts are 0, the database is clean
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM profiles) = 0 
    AND (SELECT COUNT(*) FROM user_subscriptions) = 0
    AND (SELECT COUNT(*) FROM user_inventory) = 0
    AND (SELECT COUNT(*) FROM journal_entries) = 0
    AND (SELECT COUNT(*) FROM humidors) = 0
    THEN '✅ Database is completely clean!'
    ELSE '⚠️ Some data still remains'
  END as cleanup_status;





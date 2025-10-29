-- Aggressive RLS Policy Fix Script
-- This script uses a more aggressive approach to ensure policies are properly optimized
-- Run this in your Supabase SQL editor

-- ==============================================
-- 1. DISABLE RLS TEMPORARILY TO FORCE RECREATION
-- ==============================================

-- Temporarily disable RLS on all tables to force policy recreation
ALTER TABLE IF EXISTS humidors DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS journal_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recommendations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS usage_tracking DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_subscriptions DISABLE ROW LEVEL SECURITY;

-- ==============================================
-- 2. DROP ALL EXISTING POLICIES
-- ==============================================

-- Drop all policies from all tables
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
        AND tablename IN (
            'humidors', 'inventory', 'journal_entries', 'profiles', 
            'recommendations', 'usage_tracking', 'user_inventory', 
            'user_preferences', 'user_subscriptions'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            policy_record.policyname, 
            policy_record.schemaname, 
            policy_record.tablename
        );
        RAISE NOTICE 'Dropped policy: %.%', policy_record.tablename, policy_record.policyname;
    END LOOP;
END $$;

-- ==============================================
-- 3. RECREATE ALL POLICIES WITH OPTIMIZATION
-- ==============================================

-- HUMIDORS TABLE
ALTER TABLE humidors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own humidors" ON humidors
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own humidors" ON humidors
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own humidors" ON humidors
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own humidors" ON humidors
  FOR DELETE USING ((select auth.uid()) = user_id);

-- INVENTORY TABLE
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own inventory" ON inventory
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own inventory" ON inventory
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own inventory" ON inventory
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own inventory" ON inventory
  FOR DELETE USING ((select auth.uid()) = user_id);

-- JOURNAL_ENTRIES TABLE
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own journal entries" ON journal_entries
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own journal entries" ON journal_entries
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own journal entries" ON journal_entries
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own journal entries" ON journal_entries
  FOR DELETE USING ((select auth.uid()) = user_id);

-- PROFILES TABLE (uses 'id' column, not 'user_id')
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING ((select auth.uid()) = id);

CREATE POLICY "Users can delete their own profile" ON profiles
  FOR DELETE USING ((select auth.uid()) = id);

-- RECOMMENDATIONS TABLE
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recommendations" ON recommendations
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own recommendations" ON recommendations
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- USAGE_TRACKING TABLE
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own usage tracking" ON usage_tracking
  FOR ALL USING ((select auth.uid()) = user_id);

-- USER_INVENTORY TABLE
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inventory" ON user_inventory
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own inventory" ON user_inventory
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own inventory" ON user_inventory
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own inventory" ON user_inventory
  FOR DELETE USING ((select auth.uid()) = user_id);

-- USER_PREFERENCES TABLE
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own preferences" ON user_preferences
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING ((select auth.uid()) = user_id);

-- USER_SUBSCRIPTIONS TABLE
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription" ON user_subscriptions
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own subscription" ON user_subscriptions
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own subscription" ON user_subscriptions
  FOR UPDATE USING ((select auth.uid()) = user_id);

-- Service role policy for admin operations
CREATE POLICY "Service role can manage all subscriptions" ON user_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- ==============================================
-- 4. VERIFICATION
-- ==============================================

-- Check the optimization status
SELECT 
  tablename,
  policyname,
  CASE 
    WHEN qual LIKE '%(select auth.uid())%' THEN '✅ OPTIMIZED'
    WHEN qual LIKE '%auth.uid()%' THEN '⚠️ NOT OPTIMIZED'
    ELSE 'ℹ️ OTHER'
  END as optimization_status
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Count optimized vs not optimized
SELECT 
  CASE 
    WHEN qual LIKE '%(select auth.uid())%' THEN 'OPTIMIZED'
    WHEN qual LIKE '%auth.uid()%' THEN 'NOT_OPTIMIZED'
    ELSE 'OTHER'
  END as status,
  COUNT(*) as count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY 
  CASE 
    WHEN qual LIKE '%(select auth.uid())%' THEN 'OPTIMIZED'
    WHEN qual LIKE '%auth.uid()%' THEN 'NOT_OPTIMIZED'
    ELSE 'OTHER'
  END
ORDER BY status;

-- ==============================================
-- COMPLETION MESSAGE
-- ==============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Aggressive RLS Policy Fix Complete!';
  RAISE NOTICE '📊 All policies have been recreated with optimization';
  RAISE NOTICE '🚀 Check the verification results above';
  RAISE NOTICE '💡 All policies should now show as OPTIMIZED';
  RAISE NOTICE '';
END $$;




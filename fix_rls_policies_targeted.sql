-- Targeted RLS Policy Fix Script
-- This script specifically fixes the policies that are still not optimized
-- Run this in your Supabase SQL editor

-- ==============================================
-- 1. FIX HUMIDORS TABLE POLICIES
-- ==============================================

-- Drop and recreate humidors policies with proper optimization
DROP POLICY IF EXISTS "Users can view their own humidors" ON humidors;
DROP POLICY IF EXISTS "Users can update their own humidors" ON humidors;
DROP POLICY IF EXISTS "Users can delete their own humidors" ON humidors;

CREATE POLICY "Users can view their own humidors" ON humidors
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own humidors" ON humidors
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own humidors" ON humidors
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ==============================================
-- 2. FIX INVENTORY TABLE POLICIES
-- ==============================================

-- Drop and recreate inventory policies with proper optimization
DROP POLICY IF EXISTS "Users can view their own inventory" ON inventory;
DROP POLICY IF EXISTS "Users can update their own inventory" ON inventory;
DROP POLICY IF EXISTS "Users can delete their own inventory" ON inventory;

CREATE POLICY "Users can view their own inventory" ON inventory
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own inventory" ON inventory
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own inventory" ON inventory
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ==============================================
-- 3. FIX JOURNAL_ENTRIES TABLE POLICIES
-- ==============================================

-- Drop and recreate journal_entries policies with proper optimization
DROP POLICY IF EXISTS "Users can view own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can update own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can delete own journal entries" ON journal_entries;

CREATE POLICY "Users can view own journal entries" ON journal_entries
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own journal entries" ON journal_entries
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own journal entries" ON journal_entries
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ==============================================
-- 4. FIX PROFILES TABLE POLICIES
-- ==============================================

-- Drop and recreate profiles policies with proper optimization
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING ((select auth.uid()) = id);

CREATE POLICY "Users can delete their own profile" ON profiles
  FOR DELETE USING ((select auth.uid()) = id);

-- ==============================================
-- 5. FIX RECOMMENDATIONS TABLE POLICIES
-- ==============================================

-- Drop and recreate recommendations policies with proper optimization
DROP POLICY IF EXISTS "Users can view own recommendations" ON recommendations;

CREATE POLICY "Users can view own recommendations" ON recommendations
  FOR SELECT USING ((select auth.uid()) = user_id);

-- ==============================================
-- 6. FIX USAGE_TRACKING TABLE POLICIES
-- ==============================================

-- Drop and recreate usage_tracking policies with proper optimization
DROP POLICY IF EXISTS "Users can manage their own usage tracking" ON usage_tracking;

CREATE POLICY "Users can manage their own usage tracking" ON usage_tracking
  FOR ALL USING ((select auth.uid()) = user_id);

-- ==============================================
-- 7. FIX USER_INVENTORY TABLE POLICIES
-- ==============================================

-- Drop and recreate user_inventory policies with proper optimization
DROP POLICY IF EXISTS "Users can view own inventory" ON user_inventory;
DROP POLICY IF EXISTS "Users can update own inventory" ON user_inventory;
DROP POLICY IF EXISTS "Users can delete own inventory" ON user_inventory;

CREATE POLICY "Users can view own inventory" ON user_inventory
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own inventory" ON user_inventory
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own inventory" ON user_inventory
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ==============================================
-- 8. FIX USER_PREFERENCES TABLE POLICIES
-- ==============================================

-- Drop and recreate user_preferences policies with proper optimization
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;

CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING ((select auth.uid()) = user_id);

-- ==============================================
-- 9. FIX USER_SUBSCRIPTIONS TABLE POLICIES
-- ==============================================

-- Drop and recreate user_subscriptions policies with proper optimization
DROP POLICY IF EXISTS "Users can view their own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON user_subscriptions;

CREATE POLICY "Users can view their own subscription" ON user_subscriptions
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own subscription" ON user_subscriptions
  FOR UPDATE USING ((select auth.uid()) = user_id);

-- ==============================================
-- 10. VERIFICATION
-- ==============================================

-- Check the optimization status again
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

-- ==============================================
-- COMPLETION MESSAGE
-- ==============================================

DO $$
BEGIN
  RAISE NOTICE '🎯 Targeted RLS Policy Fix Complete!';
  RAISE NOTICE '📊 All policies should now be properly optimized';
  RAISE NOTICE '🚀 Run the verification query above to confirm optimization';
END $$;

-- RLS Performance Optimization Script
-- This script optimizes RLS policies for better performance at scale
-- Run this in your Supabase SQL editor

-- ==============================================
-- 1. OPTIMIZE AUTH RLS INITIALIZATION PLANS
-- ==============================================

-- Fix profiles table RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON profiles;

-- Create optimized policies using (select auth.uid()) pattern
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own profile" ON profiles
  FOR DELETE USING ((select auth.uid()) = user_id);

-- Fix journal_entries table RLS policies
DROP POLICY IF EXISTS "Users can view own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can insert own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can update own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can delete own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can manage their own journal entries" ON journal_entries;

CREATE POLICY "Users can view own journal entries" ON journal_entries
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own journal entries" ON journal_entries
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own journal entries" ON journal_entries
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own journal entries" ON journal_entries
  FOR DELETE USING ((select auth.uid()) = user_id);

-- Fix user_inventory table RLS policies
DROP POLICY IF EXISTS "Users can view own inventory" ON user_inventory;
DROP POLICY IF EXISTS "Users can insert own inventory" ON user_inventory;
DROP POLICY IF EXISTS "Users can update own inventory" ON user_inventory;
DROP POLICY IF EXISTS "Users can delete own inventory" ON user_inventory;
DROP POLICY IF EXISTS "Users can manage their own inventory" ON user_inventory;

CREATE POLICY "Users can view own inventory" ON user_inventory
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own inventory" ON user_inventory
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own inventory" ON user_inventory
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own inventory" ON user_inventory
  FOR DELETE USING ((select auth.uid()) = user_id);

-- Fix humidors table RLS policies
DROP POLICY IF EXISTS "Users can view their own humidors" ON humidors;
DROP POLICY IF EXISTS "Users can insert their own humidors" ON humidors;
DROP POLICY IF EXISTS "Users can update their own humidors" ON humidors;
DROP POLICY IF EXISTS "Users can delete their own humidors" ON humidors;

CREATE POLICY "Users can view their own humidors" ON humidors
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own humidors" ON humidors
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own humidors" ON humidors
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own humidors" ON humidors
  FOR DELETE USING ((select auth.uid()) = user_id);

-- Fix inventory table RLS policies
DROP POLICY IF EXISTS "Users can view their own inventory" ON inventory;
DROP POLICY IF EXISTS "Users can insert their own inventory" ON inventory;
DROP POLICY IF EXISTS "Users can update their own inventory" ON inventory;
DROP POLICY IF EXISTS "Users can delete their own inventory" ON inventory;

CREATE POLICY "Users can view their own inventory" ON inventory
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own inventory" ON inventory
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own inventory" ON inventory
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own inventory" ON inventory
  FOR DELETE USING ((select auth.uid()) = user_id);

-- Fix user_subscriptions table RLS policies
DROP POLICY IF EXISTS "Users can view their own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON user_subscriptions;

CREATE POLICY "Users can view their own subscription" ON user_subscriptions
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own subscription" ON user_subscriptions
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own subscription" ON user_subscriptions
  FOR UPDATE USING ((select auth.uid()) = user_id);

-- Service role policy for admin operations
CREATE POLICY "Service role can manage all subscriptions" ON user_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Fix user_preferences table RLS policies
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can manage their own preferences" ON user_preferences;

CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own preferences" ON user_preferences
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING ((select auth.uid()) = user_id);

-- Fix recommendations table RLS policies
DROP POLICY IF EXISTS "Users can view own recommendations" ON recommendations;
DROP POLICY IF EXISTS "Users can insert own recommendations" ON recommendations;

CREATE POLICY "Users can view own recommendations" ON recommendations
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own recommendations" ON recommendations
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- Fix usage_tracking table RLS policies
DROP POLICY IF EXISTS "Users can manage their own usage tracking" ON usage_tracking;

CREATE POLICY "Users can manage their own usage tracking" ON usage_tracking
  FOR ALL USING ((select auth.uid()) = user_id);

-- Fix cigars table RLS policies (keep public read access but optimize)
DROP POLICY IF EXISTS "Anyone can view cigars" ON cigars;
DROP POLICY IF EXISTS "Authenticated users can view cigars" ON cigars;
DROP POLICY IF EXISTS "Authenticated users can insert cigars" ON cigars;

-- Keep cigars publicly readable for search functionality
CREATE POLICY "Anyone can view cigars" ON cigars
  FOR SELECT USING (true);

-- Only authenticated users can insert cigars
CREATE POLICY "Authenticated users can insert cigars" ON cigars
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Fix subscription_plans table RLS policies
DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON subscription_plans;
DROP POLICY IF EXISTS "Authenticated users can insert subscription plans" ON subscription_plans;
DROP POLICY IF EXISTS "Service role can manage subscription plans" ON subscription_plans;

-- Public read access for subscription plans
CREATE POLICY "Anyone can view active subscription plans" ON subscription_plans
  FOR SELECT USING (is_active = true);

-- Service role can manage subscription plans
CREATE POLICY "Service role can manage subscription plans" ON subscription_plans
  FOR ALL USING (auth.role() = 'service_role');

-- ==============================================
-- 2. REMOVE DUPLICATE POLICIES
-- ==============================================

-- Remove old generic policies that are now redundant
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for all users" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON profiles;

-- ==============================================
-- 3. VERIFY OPTIMIZATIONS
-- ==============================================

-- Check that policies are optimized
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ==============================================
-- 4. PERFORMANCE MONITORING
-- ==============================================

-- Create a function to monitor RLS performance
CREATE OR REPLACE FUNCTION check_rls_performance()
RETURNS TABLE (
  table_name text,
  policy_count bigint,
  has_auth_uid boolean,
  has_select_auth_uid boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::text,
    COUNT(p.policyname) as policy_count,
    EXISTS(
      SELECT 1 FROM pg_policies p2 
      WHERE p2.tablename = t.tablename 
      AND p2.qual LIKE '%auth.uid()%'
    ) as has_auth_uid,
    EXISTS(
      SELECT 1 FROM pg_policies p3 
      WHERE p3.tablename = t.tablename 
      AND p3.qual LIKE '%(select auth.uid())%'
    ) as has_select_auth_uid
  FROM pg_tables t
  LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = 'public'
  WHERE t.schemaname = 'public'
  AND t.tablename IN ('profiles', 'journal_entries', 'user_inventory', 'humidors', 'inventory', 'user_subscriptions', 'user_preferences', 'recommendations', 'usage_tracking', 'cigars', 'subscription_plans')
  GROUP BY t.tablename
  ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql;

-- Run the performance check
SELECT * FROM check_rls_performance();

-- ==============================================
-- 5. ADDITIONAL PERFORMANCE OPTIMIZATIONS
-- ==============================================

-- Add indexes to support RLS policies
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_user_inventory_user_id ON user_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_humidors_user_id ON humidors(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);

-- Update table statistics for better query planning
ANALYZE profiles;
ANALYZE journal_entries;
ANALYZE user_inventory;
ANALYZE humidors;
ANALYZE inventory;
ANALYZE user_subscriptions;
ANALYZE user_preferences;
ANALYZE recommendations;
ANALYZE usage_tracking;
ANALYZE cigars;
ANALYZE subscription_plans;

-- ==============================================
-- COMPLETION MESSAGE
-- ==============================================

DO $$
BEGIN
  RAISE NOTICE '✅ RLS Performance Optimization Complete!';
  RAISE NOTICE '📊 Optimized % policies across % tables', 
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public'),
    (SELECT COUNT(DISTINCT tablename) FROM pg_policies WHERE schemaname = 'public');
  RAISE NOTICE '🚀 Your database should now perform significantly better at scale!';
  RAISE NOTICE '💡 Run SELECT * FROM check_rls_performance(); to verify optimizations';
END $$;




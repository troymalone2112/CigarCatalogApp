-- RLS Performance Optimization Script (Safe Version)
-- This script first checks which tables exist and their column structure
-- Run this in your Supabase SQL editor

-- ==============================================
-- 1. DIAGNOSTIC: Check which tables exist and their structure
-- ==============================================

-- Check which tables exist in the public schema
SELECT 
  'EXISTING_TABLES' as check_type,
  table_name,
  'Table exists' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'profiles', 'journal_entries', 'user_inventory', 'humidors', 
  'inventory', 'user_subscriptions', 'user_preferences', 
  'recommendations', 'usage_tracking', 'cigars', 'subscription_plans'
)
ORDER BY table_name;

-- Check column structure for each existing table
DO $$
DECLARE
    current_table text;
    column_info text;
BEGIN
    FOR current_table IN 
        SELECT t.table_name 
        FROM information_schema.tables t
        WHERE t.table_schema = 'public' 
        AND t.table_name IN (
            'profiles', 'journal_entries', 'user_inventory', 'humidors', 
            'inventory', 'user_subscriptions', 'user_preferences', 
            'recommendations', 'usage_tracking', 'cigars', 'subscription_plans'
        )
        ORDER BY t.table_name
    LOOP
        RAISE NOTICE 'Table: %', current_table;
        
        -- Check if user_id column exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = current_table 
            AND column_name = 'user_id' 
            AND table_schema = 'public'
        ) THEN
            RAISE NOTICE '  ✓ user_id column exists';
        ELSE
            RAISE NOTICE '  ✗ user_id column does NOT exist';
        END IF;
        
        -- Check if id column exists (for profiles table)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = current_table 
            AND column_name = 'id' 
            AND table_schema = 'public'
        ) THEN
            RAISE NOTICE '  ✓ id column exists';
        ELSE
            RAISE NOTICE '  ✗ id column does NOT exist';
        END IF;
        
        -- Show all columns
        SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) 
        INTO column_info
        FROM information_schema.columns 
        WHERE table_name = current_table 
        AND table_schema = 'public';
        
        RAISE NOTICE '  Columns: %', column_info;
        RAISE NOTICE '';
    END LOOP;
END $$;

-- ==============================================
-- 2. SAFE RLS POLICY OPTIMIZATION
-- ==============================================

-- Only optimize tables that actually exist and have the right columns

-- PROFILES TABLE (uses 'id' column, not 'user_id')
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) THEN
        RAISE NOTICE 'Optimizing profiles table...';
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
        DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
        DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
        DROP POLICY IF EXISTS "Users can delete their own profile" ON profiles;
        DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
        DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
        DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
        DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
        DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
        DROP POLICY IF EXISTS "Users can update own profile." ON profiles;
        DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
        DROP POLICY IF EXISTS "Enable insert for all users" ON profiles;
        DROP POLICY IF EXISTS "Enable update for users based on user_id" ON profiles;
        
        -- Create optimized policies (profiles uses 'id' column)
        CREATE POLICY "Users can view own profile" ON profiles
          FOR SELECT USING ((select auth.uid()) = id);
        
        CREATE POLICY "Users can update own profile" ON profiles
          FOR UPDATE USING ((select auth.uid()) = id);
        
        CREATE POLICY "Users can insert own profile" ON profiles
          FOR INSERT WITH CHECK ((select auth.uid()) = id);
        
        CREATE POLICY "Users can delete their own profile" ON profiles
          FOR DELETE USING ((select auth.uid()) = id);
        
        RAISE NOTICE '✓ Profiles table optimized';
    ELSE
        RAISE NOTICE '⚠ Profiles table does not exist, skipping...';
    END IF;
END $$;

-- JOURNAL_ENTRIES TABLE
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'journal_entries'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'journal_entries' AND column_name = 'user_id' AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Optimizing journal_entries table...';
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view own journal entries" ON journal_entries;
        DROP POLICY IF EXISTS "Users can insert own journal entries" ON journal_entries;
        DROP POLICY IF EXISTS "Users can update own journal entries" ON journal_entries;
        DROP POLICY IF EXISTS "Users can delete own journal entries" ON journal_entries;
        DROP POLICY IF EXISTS "Users can manage their own journal entries" ON journal_entries;
        DROP POLICY IF EXISTS "Users can view their own journal entries" ON journal_entries;
        DROP POLICY IF EXISTS "Users can insert their own journal entries" ON journal_entries;
        DROP POLICY IF EXISTS "Users can update their own journal entries" ON journal_entries;
        DROP POLICY IF EXISTS "Users can delete their own journal entries" ON journal_entries;
        
        -- Create optimized policies
        CREATE POLICY "Users can view own journal entries" ON journal_entries
          FOR SELECT USING ((select auth.uid()) = user_id);
        
        CREATE POLICY "Users can insert own journal entries" ON journal_entries
          FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
        
        CREATE POLICY "Users can update own journal entries" ON journal_entries
          FOR UPDATE USING ((select auth.uid()) = user_id);
        
        CREATE POLICY "Users can delete own journal entries" ON journal_entries
          FOR DELETE USING ((select auth.uid()) = user_id);
        
        RAISE NOTICE '✓ Journal entries table optimized';
    ELSE
        RAISE NOTICE '⚠ Journal entries table does not exist or missing user_id column, skipping...';
    END IF;
END $$;

-- HUMIDORS TABLE
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'humidors'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'humidors' AND column_name = 'user_id' AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Optimizing humidors table...';
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view their own humidors" ON humidors;
        DROP POLICY IF EXISTS "Users can insert their own humidors" ON humidors;
        DROP POLICY IF EXISTS "Users can update their own humidors" ON humidors;
        DROP POLICY IF EXISTS "Users can delete their own humidors" ON humidors;
        
        -- Create optimized policies
        CREATE POLICY "Users can view their own humidors" ON humidors
          FOR SELECT USING ((select auth.uid()) = user_id);
        
        CREATE POLICY "Users can insert their own humidors" ON humidors
          FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
        
        CREATE POLICY "Users can update their own humidors" ON humidors
          FOR UPDATE USING ((select auth.uid()) = user_id);
        
        CREATE POLICY "Users can delete their own humidors" ON humidors
          FOR DELETE USING ((select auth.uid()) = user_id);
        
        RAISE NOTICE '✓ Humidors table optimized';
    ELSE
        RAISE NOTICE '⚠ Humidors table does not exist or missing user_id column, skipping...';
    END IF;
END $$;

-- INVENTORY TABLE
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'inventory'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory' AND column_name = 'user_id' AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Optimizing inventory table...';
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view their own inventory" ON inventory;
        DROP POLICY IF EXISTS "Users can insert their own inventory" ON inventory;
        DROP POLICY IF EXISTS "Users can update their own inventory" ON inventory;
        DROP POLICY IF EXISTS "Users can delete their own inventory" ON inventory;
        
        -- Create optimized policies
        CREATE POLICY "Users can view their own inventory" ON inventory
          FOR SELECT USING ((select auth.uid()) = user_id);
        
        CREATE POLICY "Users can insert their own inventory" ON inventory
          FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
        
        CREATE POLICY "Users can update their own inventory" ON inventory
          FOR UPDATE USING ((select auth.uid()) = user_id);
        
        CREATE POLICY "Users can delete their own inventory" ON inventory
          FOR DELETE USING ((select auth.uid()) = user_id);
        
        RAISE NOTICE '✓ Inventory table optimized';
    ELSE
        RAISE NOTICE '⚠ Inventory table does not exist or missing user_id column, skipping...';
    END IF;
END $$;

-- USER_INVENTORY TABLE (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_inventory'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_inventory' AND column_name = 'user_id' AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Optimizing user_inventory table...';
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view own inventory" ON user_inventory;
        DROP POLICY IF EXISTS "Users can insert own inventory" ON user_inventory;
        DROP POLICY IF EXISTS "Users can update own inventory" ON user_inventory;
        DROP POLICY IF EXISTS "Users can delete own inventory" ON user_inventory;
        DROP POLICY IF EXISTS "Users can manage their own inventory" ON user_inventory;
        
        -- Create optimized policies
        CREATE POLICY "Users can view own inventory" ON user_inventory
          FOR SELECT USING ((select auth.uid()) = user_id);
        
        CREATE POLICY "Users can insert own inventory" ON user_inventory
          FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
        
        CREATE POLICY "Users can update own inventory" ON user_inventory
          FOR UPDATE USING ((select auth.uid()) = user_id);
        
        CREATE POLICY "Users can delete own inventory" ON user_inventory
          FOR DELETE USING ((select auth.uid()) = user_id);
        
        RAISE NOTICE '✓ User inventory table optimized';
    ELSE
        RAISE NOTICE '⚠ User inventory table does not exist or missing user_id column, skipping...';
    END IF;
END $$;

-- USER_SUBSCRIPTIONS TABLE (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_subscriptions'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_subscriptions' AND column_name = 'user_id' AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Optimizing user_subscriptions table...';
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view their own subscription" ON user_subscriptions;
        DROP POLICY IF EXISTS "Users can insert their own subscription" ON user_subscriptions;
        DROP POLICY IF EXISTS "Users can update their own subscription" ON user_subscriptions;
        DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;
        DROP POLICY IF EXISTS "Users can insert own subscriptions" ON user_subscriptions;
        DROP POLICY IF EXISTS "Users can update own subscriptions" ON user_subscriptions;
        DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON user_subscriptions;
        
        -- Create optimized policies
        CREATE POLICY "Users can view their own subscription" ON user_subscriptions
          FOR SELECT USING ((select auth.uid()) = user_id);
        
        CREATE POLICY "Users can insert their own subscription" ON user_subscriptions
          FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
        
        CREATE POLICY "Users can update their own subscription" ON user_subscriptions
          FOR UPDATE USING ((select auth.uid()) = user_id);
        
        -- Service role policy for admin operations
        CREATE POLICY "Service role can manage all subscriptions" ON user_subscriptions
          FOR ALL USING (auth.role() = 'service_role');
        
        RAISE NOTICE '✓ User subscriptions table optimized';
    ELSE
        RAISE NOTICE '⚠ User subscriptions table does not exist or missing user_id column, skipping...';
    END IF;
END $$;

-- USER_PREFERENCES TABLE (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_preferences'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_preferences' AND column_name = 'user_id' AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Optimizing user_preferences table...';
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
        DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
        DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
        DROP POLICY IF EXISTS "Users can manage their own preferences" ON user_preferences;
        
        -- Create optimized policies
        CREATE POLICY "Users can view own preferences" ON user_preferences
          FOR SELECT USING ((select auth.uid()) = user_id);
        
        CREATE POLICY "Users can insert own preferences" ON user_preferences
          FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
        
        CREATE POLICY "Users can update own preferences" ON user_preferences
          FOR UPDATE USING ((select auth.uid()) = user_id);
        
        RAISE NOTICE '✓ User preferences table optimized';
    ELSE
        RAISE NOTICE '⚠ User preferences table does not exist or missing user_id column, skipping...';
    END IF;
END $$;

-- RECOMMENDATIONS TABLE (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'recommendations'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'recommendations' AND column_name = 'user_id' AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Optimizing recommendations table...';
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view own recommendations" ON recommendations;
        DROP POLICY IF EXISTS "Users can insert own recommendations" ON recommendations;
        
        -- Create optimized policies
        CREATE POLICY "Users can view own recommendations" ON recommendations
          FOR SELECT USING ((select auth.uid()) = user_id);
        
        CREATE POLICY "Users can insert own recommendations" ON recommendations
          FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
        
        RAISE NOTICE '✓ Recommendations table optimized';
    ELSE
        RAISE NOTICE '⚠ Recommendations table does not exist or missing user_id column, skipping...';
    END IF;
END $$;

-- USAGE_TRACKING TABLE (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'usage_tracking'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'usage_tracking' AND column_name = 'user_id' AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Optimizing usage_tracking table...';
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can manage their own usage tracking" ON usage_tracking;
        
        -- Create optimized policies
        CREATE POLICY "Users can manage their own usage tracking" ON usage_tracking
          FOR ALL USING ((select auth.uid()) = user_id);
        
        RAISE NOTICE '✓ Usage tracking table optimized';
    ELSE
        RAISE NOTICE '⚠ Usage tracking table does not exist or missing user_id column, skipping...';
    END IF;
END $$;

-- CIGARS TABLE (public read access)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'cigars'
    ) THEN
        RAISE NOTICE 'Optimizing cigars table...';
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Anyone can view cigars" ON cigars;
        DROP POLICY IF EXISTS "Authenticated users can view cigars" ON cigars;
        DROP POLICY IF EXISTS "Authenticated users can insert cigars" ON cigars;
        DROP POLICY IF EXISTS "Cigars are viewable by everyone." ON cigars;
        
        -- Create optimized policies
        CREATE POLICY "Anyone can view cigars" ON cigars
          FOR SELECT USING (true);
        
        CREATE POLICY "Authenticated users can insert cigars" ON cigars
          FOR INSERT WITH CHECK (auth.role() = 'authenticated');
        
        RAISE NOTICE '✓ Cigars table optimized';
    ELSE
        RAISE NOTICE '⚠ Cigars table does not exist, skipping...';
    END IF;
END $$;

-- SUBSCRIPTION_PLANS TABLE (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'subscription_plans'
    ) THEN
        RAISE NOTICE 'Optimizing subscription_plans table...';
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON subscription_plans;
        DROP POLICY IF EXISTS "Authenticated users can insert subscription plans" ON subscription_plans;
        DROP POLICY IF EXISTS "Service role can manage subscription plans" ON subscription_plans;
        
        -- Create optimized policies
        CREATE POLICY "Anyone can view active subscription plans" ON subscription_plans
          FOR SELECT USING (is_active = true);
        
        CREATE POLICY "Service role can manage subscription plans" ON subscription_plans
          FOR ALL USING (auth.role() = 'service_role');
        
        RAISE NOTICE '✓ Subscription plans table optimized';
    ELSE
        RAISE NOTICE '⚠ Subscription plans table does not exist, skipping...';
    END IF;
END $$;

-- ==============================================
-- 3. ADD INDEXES FOR PERFORMANCE
-- ==============================================

-- Add indexes only for tables that exist
DO $$
BEGIN
    -- Profiles table index
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
        RAISE NOTICE '✓ Added index for profiles table';
    END IF;
    
    -- Journal entries table index
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'journal_entries') THEN
        CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
        RAISE NOTICE '✓ Added index for journal_entries table';
    END IF;
    
    -- Humidors table index
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'humidors') THEN
        CREATE INDEX IF NOT EXISTS idx_humidors_user_id ON humidors(user_id);
        RAISE NOTICE '✓ Added index for humidors table';
    END IF;
    
    -- Inventory table index
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory') THEN
        CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON inventory(user_id);
        RAISE NOTICE '✓ Added index for inventory table';
    END IF;
    
    -- User inventory table index
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_inventory') THEN
        CREATE INDEX IF NOT EXISTS idx_user_inventory_user_id ON user_inventory(user_id);
        RAISE NOTICE '✓ Added index for user_inventory table';
    END IF;
    
    -- User subscriptions table index
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_subscriptions') THEN
        CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
        RAISE NOTICE '✓ Added index for user_subscriptions table';
    END IF;
    
    -- User preferences table index
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_preferences') THEN
        CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
        RAISE NOTICE '✓ Added index for user_preferences table';
    END IF;
    
    -- Recommendations table index
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recommendations') THEN
        CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);
        RAISE NOTICE '✓ Added index for recommendations table';
    END IF;
    
    -- Usage tracking table index
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'usage_tracking') THEN
        CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);
        RAISE NOTICE '✓ Added index for usage_tracking table';
    END IF;
END $$;

-- ==============================================
-- 4. UPDATE TABLE STATISTICS
-- ==============================================

-- Update statistics for all existing tables
DO $$
DECLARE
    current_table text;
BEGIN
    FOR current_table IN 
        SELECT t.table_name 
        FROM information_schema.tables t
        WHERE t.table_schema = 'public' 
        AND t.table_name IN (
            'profiles', 'journal_entries', 'user_inventory', 'humidors', 
            'inventory', 'user_subscriptions', 'user_preferences', 
            'recommendations', 'usage_tracking', 'cigars', 'subscription_plans'
        )
    LOOP
        EXECUTE 'ANALYZE ' || current_table;
        RAISE NOTICE '✓ Updated statistics for %', current_table;
    END LOOP;
END $$;

-- ==============================================
-- 5. VERIFICATION
-- ==============================================

-- Show final policy count
SELECT 
  'FINAL_POLICY_COUNT' as check_type,
  COUNT(*) as total_policies,
  'Policies after optimization' as status
FROM pg_policies 
WHERE schemaname = 'public';

-- Show which tables have optimized policies
SELECT 
  'OPTIMIZED_TABLES' as check_type,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ==============================================
-- COMPLETION MESSAGE
-- ==============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 RLS Performance Optimization Complete!';
  RAISE NOTICE '📊 Optimized policies for existing tables only';
  RAISE NOTICE '🚀 Your database should now perform significantly better at scale!';
  RAISE NOTICE '💡 Check the results above to see which tables were optimized';
  RAISE NOTICE '';
END $$;

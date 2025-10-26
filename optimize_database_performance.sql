-- ============================================
-- DATABASE PERFORMANCE OPTIMIZATION SCRIPT
-- Based on Supabase linter recommendations
-- ============================================

-- This script will:
-- 1. Add missing foreign key indexes (CRITICAL for performance)
-- 2. Remove unused indexes (reduce overhead)
-- 3. Add optimized composite indexes
-- 4. Update table statistics for better query planning

-- ============================================
-- STEP 1: ADD MISSING FOREIGN KEY INDEXES
-- ============================================
-- These are CRITICAL for performance - foreign keys without indexes cause slow JOINs

DO $$
BEGIN
    -- Add index for recommendations.cigar_id foreign key
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_recommendations_cigar_id'
    ) THEN
        CREATE INDEX idx_recommendations_cigar_id ON recommendations(cigar_id);
        RAISE NOTICE 'Added index: idx_recommendations_cigar_id';
    ELSE
        RAISE NOTICE 'Index already exists: idx_recommendations_cigar_id';
    END IF;
END $$;

DO $$
BEGIN
    -- Add index for user_subscriptions.plan_id foreign key
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_user_subscriptions_plan_id'
    ) THEN
        CREATE INDEX idx_user_subscriptions_plan_id ON user_subscriptions(plan_id);
        RAISE NOTICE 'Added index: idx_user_subscriptions_plan_id';
    ELSE
        RAISE NOTICE 'Index already exists: idx_user_subscriptions_plan_id';
    END IF;
END $$;

-- ============================================
-- STEP 2: REMOVE UNUSED INDEXES (SAFELY)
-- ============================================
-- Only remove indexes that are confirmed unused by the linter

DO $$
BEGIN
    -- Remove unused journal_entries indexes
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_journal_entries_selected_flavors') THEN
        DROP INDEX idx_journal_entries_selected_flavors;
        RAISE NOTICE 'Removed unused index: idx_journal_entries_selected_flavors';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_journal_entries_cigar_data') THEN
        DROP INDEX idx_journal_entries_cigar_data;
        RAISE NOTICE 'Removed unused index: idx_journal_entries_cigar_data';
    END IF;
END $$;

DO $$
BEGIN
    -- Remove unused inventory indexes
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_inventory_date_acquired') THEN
        DROP INDEX idx_inventory_date_acquired;
        RAISE NOTICE 'Removed unused index: idx_inventory_date_acquired';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_inventory_aging_preference') THEN
        DROP INDEX idx_inventory_aging_preference;
        RAISE NOTICE 'Removed unused index: idx_inventory_aging_preference';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_inventory_cigar_line') THEN
        DROP INDEX idx_inventory_cigar_line;
        RAISE NOTICE 'Removed unused index: idx_inventory_cigar_line';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_inventory_cigar_brand') THEN
        DROP INDEX idx_inventory_cigar_brand;
        RAISE NOTICE 'Removed unused index: idx_inventory_cigar_brand';
    END IF;
END $$;

DO $$
BEGIN
    -- Remove unused usage_tracking indexes
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_usage_tracking_action') THEN
        DROP INDEX idx_usage_tracking_action;
        RAISE NOTICE 'Removed unused index: idx_usage_tracking_action';
    END IF;
END $$;

-- ============================================
-- STEP 3: ADD OPTIMIZED COMPOSITE INDEXES
-- ============================================
-- These will improve common query patterns

DO $$
BEGIN
    -- Add composite index for journal entries (user_id + created_at)
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_journal_entries_user_created'
    ) THEN
        CREATE INDEX idx_journal_entries_user_created 
        ON journal_entries(user_id, created_at DESC);
        RAISE NOTICE 'Added composite index: idx_journal_entries_user_created';
    ELSE
        RAISE NOTICE 'Index already exists: idx_journal_entries_user_created';
    END IF;
END $$;

DO $$
BEGIN
    -- Add composite index for inventory (user_id + humidor_id)
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_inventory_user_humidor'
    ) THEN
        CREATE INDEX idx_inventory_user_humidor 
        ON inventory(user_id, humidor_id);
        RAISE NOTICE 'Added composite index: idx_inventory_user_humidor';
    ELSE
        RAISE NOTICE 'Index already exists: idx_inventory_user_humidor';
    END IF;
END $$;

DO $$
BEGIN
    -- Add composite index for humidors (user_id + created_at)
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_humidors_user_created'
    ) THEN
        CREATE INDEX idx_humidors_user_created 
        ON humidors(user_id, created_at DESC);
        RAISE NOTICE 'Added composite index: idx_humidors_user_created';
    ELSE
        RAISE NOTICE 'Index already exists: idx_humidors_user_created';
    END IF;
END $$;

-- ============================================
-- STEP 4: UPDATE TABLE STATISTICS
-- ============================================
-- This helps the query planner make better decisions

DO $$
BEGIN
    RAISE NOTICE 'Updating table statistics for better query planning...';
    
    ANALYZE journal_entries;
    ANALYZE inventory;
    ANALYZE humidors;
    ANALYZE user_subscriptions;
    ANALYZE recommendations;
    ANALYZE usage_tracking;
    
    RAISE NOTICE 'Table statistics updated successfully';
END $$;

-- ============================================
-- STEP 5: VERIFICATION
-- ============================================
-- Show current index status

DO $$
DECLARE
    index_count INTEGER;
BEGIN
    -- Count total indexes
    SELECT COUNT(*) INTO index_count 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename IN ('journal_entries', 'inventory', 'humidors', 'user_subscriptions', 'recommendations', 'usage_tracking');
    
    RAISE NOTICE 'Total indexes on main tables: %', index_count;
    
    -- Show critical indexes that should exist
    RAISE NOTICE 'Checking critical indexes...';
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_recommendations_cigar_id') THEN
        RAISE NOTICE '✓ idx_recommendations_cigar_id exists';
    ELSE
        RAISE WARNING '✗ idx_recommendations_cigar_id missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_subscriptions_plan_id') THEN
        RAISE NOTICE '✓ idx_user_subscriptions_plan_id exists';
    ELSE
        RAISE WARNING '✗ idx_user_subscriptions_plan_id missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_journal_entries_user_created') THEN
        RAISE NOTICE '✓ idx_journal_entries_user_created exists';
    ELSE
        RAISE WARNING '✗ idx_journal_entries_user_created missing';
    END IF;
    
    RAISE NOTICE 'Database optimization completed successfully!';
END $$;

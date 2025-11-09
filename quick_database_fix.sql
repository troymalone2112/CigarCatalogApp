-- QUICK DATABASE PERFORMANCE FIX
-- Run this in your Supabase SQL Editor for immediate performance improvements

-- ============================================
-- 1. ADD CRITICAL MISSING INDEXES (IMMEDIATE IMPACT)
-- ============================================

-- Add foreign key indexes (CRITICAL for JOIN performance)
CREATE INDEX IF NOT EXISTS idx_recommendations_cigar_id ON recommendations(cigar_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON user_subscriptions(plan_id);

-- ============================================
-- 2. REMOVE UNUSED INDEXES (REDUCE OVERHEAD)
-- ============================================

-- Remove unused journal_entries indexes
DROP INDEX IF EXISTS idx_journal_entries_selected_flavors;
DROP INDEX IF EXISTS idx_journal_entries_cigar_data;

-- Remove unused inventory indexes  
DROP INDEX IF EXISTS idx_inventory_date_acquired;
DROP INDEX IF EXISTS idx_inventory_aging_preference;
DROP INDEX IF EXISTS idx_inventory_cigar_line;
DROP INDEX IF EXISTS idx_inventory_cigar_brand;

-- Remove unused usage_tracking indexes
DROP INDEX IF EXISTS idx_usage_tracking_action;

-- ============================================
-- 3. ADD OPTIMIZED COMPOSITE INDEXES
-- ============================================

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_created ON journal_entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_user_humidor ON inventory(user_id, humidor_id);
CREATE INDEX IF NOT EXISTS idx_humidors_user_created ON humidors(user_id, created_at DESC);

-- ============================================
-- 4. UPDATE STATISTICS (IMPROVE QUERY PLANNING)
-- ============================================

ANALYZE journal_entries;
ANALYZE inventory;
ANALYZE humidors;
ANALYZE user_subscriptions;
ANALYZE recommendations;
ANALYZE usage_tracking;










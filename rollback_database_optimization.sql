-- ROLLBACK DATABASE OPTIMIZATION SCRIPT
-- Use this if you need to undo the optimization changes

-- ============================================
-- ROLLBACK: REMOVE ADDED INDEXES
-- ============================================

-- Remove the foreign key indexes we added
DROP INDEX IF EXISTS idx_recommendations_cigar_id;
DROP INDEX IF EXISTS idx_user_subscriptions_plan_id;

-- Remove the composite indexes we added
DROP INDEX IF EXISTS idx_journal_entries_user_created;
DROP INDEX IF EXISTS idx_inventory_user_humidor;
DROP INDEX IF EXISTS idx_humidors_user_created;

-- ============================================
-- ROLLBACK: RESTORE REMOVED INDEXES
-- ============================================
-- Note: You'll need to recreate these if they were actually needed

-- Restore journal_entries indexes (if needed)
-- CREATE INDEX IF NOT EXISTS idx_journal_entries_selected_flavors ON journal_entries USING GIN (selected_flavors);
-- CREATE INDEX IF NOT EXISTS idx_journal_entries_cigar_data ON journal_entries USING GIN (cigar_data);

-- Restore inventory indexes (if needed)
-- CREATE INDEX IF NOT EXISTS idx_inventory_date_acquired ON inventory(date_acquired);
-- CREATE INDEX IF NOT EXISTS idx_inventory_aging_preference ON inventory(aging_preference);
-- CREATE INDEX IF NOT EXISTS idx_inventory_cigar_line ON inventory(cigar_line);
-- CREATE INDEX IF NOT EXISTS idx_inventory_cigar_brand ON inventory(cigar_brand);

-- Restore usage_tracking indexes (if needed)
-- CREATE INDEX IF NOT EXISTS idx_usage_tracking_action ON usage_tracking(action);

-- ============================================
-- VERIFICATION
-- ============================================

-- Check current index status
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('journal_entries', 'inventory', 'humidors', 'user_subscriptions', 'recommendations', 'usage_tracking')
ORDER BY tablename, indexname;










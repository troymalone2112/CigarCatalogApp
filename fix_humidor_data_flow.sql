-- FIX HUMIDOR DATA FLOW
-- This script fixes the humidor stats view and ensures proper data flow

-- ============================================
-- STEP 1: FIX THE HUMIDOR_STATS VIEW
-- ============================================

-- Drop the problematic view
DROP VIEW IF EXISTS public.humidor_stats CASCADE;

-- Create the corrected humidor_stats view that works with actual schema
CREATE VIEW public.humidor_stats AS
SELECT 
  h.id as humidor_id,
  h.user_id,
  h.name as humidor_name,
  h.description,
  h.capacity,
  COALESCE(SUM(i.quantity), 0) as cigar_count, -- FIXED: Count total individual cigars, not types
  COALESCE(SUM(i.quantity), 0) as total_cigars,
  COALESCE(SUM(CASE WHEN i.price_paid IS NOT NULL THEN i.price_paid * i.quantity ELSE 0 END), 0) as total_value,
  COALESCE(AVG(CASE WHEN i.price_paid IS NOT NULL THEN i.price_paid ELSE NULL END), 0) as avg_cigar_price,
  h.created_at,
  h.updated_at
FROM public.humidors h
LEFT JOIN public.inventory i ON h.id = i.humidor_id
GROUP BY h.id, h.user_id, h.name, h.description, h.capacity, h.created_at, h.updated_at;

-- ============================================
-- STEP 2: GRANT PERMISSIONS
-- ============================================

GRANT SELECT ON public.humidor_stats TO authenticated;

-- ============================================
-- STEP 3: VERIFICATION
-- ============================================

-- Test the view to make sure it works
DO $$
DECLARE
    view_count INTEGER;
    test_result RECORD;
BEGIN
    -- Check if the view was created successfully
    SELECT COUNT(*) INTO view_count
    FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'humidor_stats';
    
    IF view_count > 0 THEN
        RAISE NOTICE '✅ humidor_stats view created successfully';
    ELSE
        RAISE WARNING '⚠️ humidor_stats view was not created';
    END IF;
    
    -- Test the view with a sample query
    BEGIN
        SELECT * INTO test_result FROM public.humidor_stats LIMIT 1;
        RAISE NOTICE '✅ humidor_stats view is queryable';
        
        -- Show sample data structure
        RAISE NOTICE 'Sample humidor_stats structure:';
        RAISE NOTICE '  humidor_id: %', test_result.humidor_id;
        RAISE NOTICE '  humidor_name: %', test_result.humidor_name;
        RAISE NOTICE '  cigar_count: %', test_result.cigar_count;
        RAISE NOTICE '  total_cigars: %', test_result.total_cigars;
        RAISE NOTICE '  total_value: %', test_result.total_value;
        RAISE NOTICE '  avg_cigar_price: %', test_result.avg_cigar_price;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING '⚠️ humidor_stats view has issues: %', SQLERRM;
    END;
END $$;

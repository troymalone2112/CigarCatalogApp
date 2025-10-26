-- FIX HUMIDOR STATS VIEW
-- The current view is trying to join with a non-existent cigars table
-- We need to fix it to work with the actual schema (cigar_data as JSONB)

-- ============================================
-- DROP AND RECREATE THE HUMIDOR_STATS VIEW
-- ============================================

DROP VIEW IF EXISTS public.humidor_stats CASCADE;

-- Create the corrected humidor_stats view
CREATE VIEW public.humidor_stats AS
SELECT 
  h.id as humidor_id,
  h.user_id,
  h.name as humidor_name,
  h.description,
  h.capacity,
  COUNT(i.id) as cigar_count,
  COALESCE(SUM(i.quantity), 0) as total_cigars,
  COALESCE(SUM(CASE WHEN i.price_paid IS NOT NULL THEN i.price_paid * i.quantity ELSE 0 END), 0) as total_value,
  COALESCE(AVG(CASE WHEN i.price_paid IS NOT NULL THEN i.price_paid ELSE NULL END), 0) as avg_cigar_price,
  h.created_at,
  h.updated_at
FROM public.humidors h
LEFT JOIN public.inventory i ON h.id = i.humidor_id
GROUP BY h.id, h.user_id, h.name, h.description, h.capacity, h.created_at, h.updated_at;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT SELECT ON public.humidor_stats TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================

-- Test the view to make sure it works
DO $$
DECLARE
    view_count INTEGER;
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
        PERFORM * FROM public.humidor_stats LIMIT 1;
        RAISE NOTICE '✅ humidor_stats view is queryable';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING '⚠️ humidor_stats view has issues: %', SQLERRM;
    END;
END $$;

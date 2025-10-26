-- FIX REMAINING SECURITY DEFINER VIEWS
-- Remove SECURITY DEFINER from humidor_stats and humidor_detail_stats views

-- ============================================
-- DROP AND RECREATE VIEWS WITHOUT SECURITY DEFINER
-- ============================================

-- Drop the problematic views
DROP VIEW IF EXISTS public.humidor_stats CASCADE;
DROP VIEW IF EXISTS public.humidor_detail_stats CASCADE;

-- ============================================
-- RECREATE HUMIDOR_STATS VIEW (SECURITY INVOKER)
-- ============================================

-- Recreate humidor_stats without SECURITY DEFINER
CREATE VIEW public.humidor_stats AS
SELECT 
  h.id as humidor_id,
  h.user_id,
  h.name as humidor_name,
  h.description,
  h.capacity,
  COALESCE(SUM(i.quantity), 0) as cigar_count, -- Count total individual cigars
  COALESCE(SUM(i.quantity), 0) as total_cigars,
  COALESCE(SUM(CASE WHEN i.price_paid IS NOT NULL THEN i.price_paid * i.quantity ELSE 0 END), 0) as total_value,
  COALESCE(AVG(CASE WHEN i.price_paid IS NOT NULL THEN i.price_paid ELSE NULL END), 0) as avg_cigar_price,
  h.created_at,
  h.updated_at
FROM public.humidors h
LEFT JOIN public.inventory i ON h.id = i.humidor_id
GROUP BY h.id, h.user_id, h.name, h.description, h.capacity, h.created_at, h.updated_at;

-- ============================================
-- RECREATE HUMIDOR_DETAIL_STATS VIEW (SECURITY INVOKER)
-- ============================================

-- Recreate humidor_detail_stats without SECURITY DEFINER
CREATE VIEW public.humidor_detail_stats AS
SELECT 
  h.id as humidor_id,
  h.user_id,
  h.name as humidor_name,
  h.description,
  h.capacity,
  COUNT(i.id) as cigar_types, -- Count unique cigar types
  COALESCE(SUM(i.quantity), 0) as total_cigars, -- Count total individual cigars
  COALESCE(SUM(CASE WHEN i.price_paid IS NOT NULL THEN i.price_paid * i.quantity ELSE 0 END), 0) as total_value,
  COALESCE(AVG(CASE WHEN i.price_paid IS NOT NULL THEN i.price_paid ELSE NULL END), 0) as avg_cigar_price,
  h.created_at,
  h.updated_at
FROM public.humidors h
LEFT JOIN public.inventory i ON h.id = i.humidor_id
GROUP BY h.id, h.user_id, h.name, h.description, h.capacity, h.created_at, h.updated_at;

-- ============================================
-- ENABLE RLS ON VIEWS
-- ============================================

-- Enable RLS on the views to ensure proper data isolation
ALTER VIEW public.humidor_stats SET (security_invoker = true);
ALTER VIEW public.humidor_detail_stats SET (security_invoker = true);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant select permissions to authenticated users only
GRANT SELECT ON public.humidor_stats TO authenticated;
GRANT SELECT ON public.humidor_detail_stats TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================

-- Check that views were created without SECURITY DEFINER
DO $$
DECLARE
    view_count INTEGER;
    definer_count INTEGER;
BEGIN
    -- Count views that still have SECURITY DEFINER
    SELECT COUNT(*) INTO definer_count
    FROM pg_views 
    WHERE schemaname = 'public' 
    AND viewname IN ('humidor_stats', 'humidor_detail_stats')
    AND definition LIKE '%SECURITY DEFINER%';
    
    -- Count total views
    SELECT COUNT(*) INTO view_count
    FROM pg_views 
    WHERE schemaname = 'public' 
    AND viewname IN ('humidor_stats', 'humidor_detail_stats');
    
    IF view_count = 2 AND definer_count = 0 THEN
        RAISE NOTICE '✅ Both views recreated without SECURITY DEFINER';
    ELSE
        RAISE WARNING '⚠️ % views still have SECURITY DEFINER (total: %)', definer_count, view_count;
    END IF;
    
    -- Show current view definitions
    RAISE NOTICE 'Current view security settings:';
    RAISE NOTICE 'humidor_stats: %', CASE WHEN EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'humidor_stats' AND definition LIKE '%SECURITY DEFINER%') THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END;
    RAISE NOTICE 'humidor_detail_stats: %', CASE WHEN EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'humidor_detail_stats' AND definition LIKE '%SECURITY DEFINER%') THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END;
    
    RAISE NOTICE 'Security fixes completed successfully!';
END $$;

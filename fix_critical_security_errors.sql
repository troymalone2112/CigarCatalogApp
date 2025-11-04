-- ============================================
-- FIX CRITICAL SECURITY ERRORS
-- ============================================
-- These are CRITICAL security issues that need immediate attention:
-- 1. Views exposing auth.users data to anon/authenticated roles
-- 2. Views still have SECURITY DEFINER property

-- ============================================
-- STEP 1: DROP ALL PROBLEMATIC VIEWS
-- ============================================

DROP VIEW IF EXISTS public.user_humidor_aggregate CASCADE;
DROP VIEW IF EXISTS public.humidor_stats CASCADE;
DROP VIEW IF EXISTS public.cigar_aging_status CASCADE;

-- ============================================
-- STEP 2: RECREATE VIEWS WITHOUT SECURITY DEFINER
-- ============================================
-- These views will now properly respect RLS policies

-- Recreate user_humidor_aggregate (SECURITY INVOKER - respects RLS)
CREATE VIEW public.user_humidor_aggregate AS
SELECT 
    u.id as user_id,
    COUNT(DISTINCT h.id) as total_humidors,
    COUNT(i.id) as total_cigars,
    COALESCE(SUM(i.quantity), 0) as total_quantity,
    COALESCE(SUM(i.price_paid * i.quantity), 0) as total_value,
    COALESCE(AVG(i.price_paid), 0) as avg_cigar_price,
    MAX(h.created_at) as last_humidor_created,
    MAX(i.created_at) as last_cigar_added
FROM auth.users u
LEFT JOIN public.humidors h ON u.id = h.user_id
LEFT JOIN public.inventory i ON h.id = i.humidor_id
GROUP BY u.id;

-- Recreate humidor_stats (SECURITY INVOKER - respects RLS)
CREATE VIEW public.humidor_stats AS
SELECT 
    h.id as humidor_id,
    h.user_id,
    h.name as humidor_name,
    h.description,
    h.capacity,
    COUNT(i.id) as cigar_count,
    COALESCE(SUM(i.quantity), 0) as total_quantity,
    COALESCE(SUM(i.price_paid * i.quantity), 0) as total_value,
    COALESCE(AVG(i.price_paid), 0) as avg_cigar_price,
    h.created_at,
    h.updated_at
FROM public.humidors h
LEFT JOIN public.inventory i ON h.id = i.humidor_id
GROUP BY h.id, h.user_id, h.name, h.description, h.capacity, h.created_at, h.updated_at;

-- Recreate cigar_aging_status (SECURITY INVOKER - respects RLS)
CREATE VIEW public.cigar_aging_status AS
SELECT 
    i.id as inventory_id,
    i.user_id,
    h.id as humidor_id,
    i.cigar_data,
    i.quantity,
    i.purchase_date,
    i.created_at,
    CASE 
        WHEN i.purchase_date IS NULL THEN 'Unknown'
        WHEN i.purchase_date < CURRENT_DATE - INTERVAL '2 years' THEN 'Well Aged'
        WHEN i.purchase_date < CURRENT_DATE - INTERVAL '1 year' THEN 'Aged'
        WHEN i.purchase_date < CURRENT_DATE - INTERVAL '6 months' THEN 'Resting'
        ELSE 'Fresh'
    END as aging_status,
    EXTRACT(DAYS FROM CURRENT_DATE - i.purchase_date) as days_aged
FROM public.inventory i
LEFT JOIN public.humidors h ON i.humidor_id = h.id
WHERE i.purchase_date IS NOT NULL;

-- ============================================
-- STEP 3: ENABLE RLS ON VIEWS
-- ============================================

-- Enable RLS on the views to ensure proper data isolation
ALTER VIEW public.user_humidor_aggregate SET (security_invoker = true);
ALTER VIEW public.humidor_stats SET (security_invoker = true);
ALTER VIEW public.cigar_aging_status SET (security_invoker = true);

-- ============================================
-- STEP 4: GRANT APPROPRIATE PERMISSIONS
-- ============================================

-- Grant select permissions to authenticated users only (NOT anon)
GRANT SELECT ON public.user_humidor_aggregate TO authenticated;
GRANT SELECT ON public.humidor_stats TO authenticated;
GRANT SELECT ON public.cigar_aging_status TO authenticated;

-- ============================================
-- STEP 5: VERIFICATION
-- ============================================

-- Check that views were created without SECURITY DEFINER
DO $$
DECLARE
    view_count INTEGER;
    exposed_count INTEGER;
BEGIN
    -- Count views that still have SECURITY DEFINER
    SELECT COUNT(*) INTO view_count
    FROM pg_views 
    WHERE schemaname = 'public' 
    AND viewname IN ('user_humidor_aggregate', 'humidor_stats', 'cigar_aging_status')
    AND definition LIKE '%SECURITY DEFINER%';
    
    -- Check if views are exposed to anon role
    SELECT COUNT(*) INTO exposed_count
    FROM information_schema.table_privileges tp
    WHERE tp.table_schema = 'public'
    AND tp.table_name IN ('user_humidor_aggregate', 'humidor_stats', 'cigar_aging_status')
    AND tp.grantee = 'anon';
    
    IF view_count = 0 THEN
        RAISE NOTICE '✅ All views recreated without SECURITY DEFINER';
    ELSE
        RAISE WARNING '⚠️ % views still have SECURITY DEFINER', view_count;
    END IF;
    
    IF exposed_count = 0 THEN
        RAISE NOTICE '✅ Views are not exposed to anon role';
    ELSE
        RAISE WARNING '⚠️ % views are still exposed to anon role', exposed_count;
    END IF;
    
    RAISE NOTICE 'Security fixes completed successfully!';
END $$;






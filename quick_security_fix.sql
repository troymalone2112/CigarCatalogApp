-- QUICK SECURITY FIX
-- Remove SECURITY DEFINER from views to fix security errors

-- ============================================
-- DROP AND RECREATE VIEWS WITHOUT SECURITY DEFINER
-- ============================================

-- Drop the problematic views
DROP VIEW IF EXISTS public.user_humidor_aggregate CASCADE;
DROP VIEW IF EXISTS public.cigar_aging_status CASCADE;
DROP VIEW IF EXISTS public.humidor_stats CASCADE;

-- ============================================
-- RECREATE VIEWS (SECURITY INVOKER)
-- ============================================

-- Recreate user_humidor_aggregate
CREATE VIEW public.user_humidor_aggregate AS
SELECT 
    u.id as user_id,
    COUNT(DISTINCT h.id) as total_humidors,
    COUNT(i.id) as total_cigars,
    COALESCE(SUM(i.quantity), 0) as total_quantity,
    COALESCE(SUM(i.price_paid * i.quantity), 0) as total_value,
    COALESCE(AVG(i.price_paid), 0) as avg_cigar_price
FROM auth.users u
LEFT JOIN public.humidors h ON u.id = h.user_id
LEFT JOIN public.inventory i ON h.id = i.humidor_id
GROUP BY u.id;

-- Recreate cigar_aging_status
CREATE VIEW public.cigar_aging_status AS
SELECT 
    i.id as inventory_id,
    i.user_id,
    i.humidor_id,
    i.cigar_data,
    i.quantity,
    i.purchase_date,
    CASE 
        WHEN i.purchase_date IS NULL THEN 'Unknown'
        WHEN i.purchase_date < CURRENT_DATE - INTERVAL '2 years' THEN 'Well Aged'
        WHEN i.purchase_date < CURRENT_DATE - INTERVAL '1 year' THEN 'Aged'
        WHEN i.purchase_date < CURRENT_DATE - INTERVAL '6 months' THEN 'Resting'
        ELSE 'Fresh'
    END as aging_status
FROM public.inventory i;

-- Recreate humidor_stats
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
    COALESCE(AVG(i.price_paid), 0) as avg_cigar_price
FROM public.humidors h
LEFT JOIN public.inventory i ON h.id = i.humidor_id
GROUP BY h.id, h.user_id, h.name, h.description, h.capacity;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT SELECT ON public.user_humidor_aggregate TO authenticated;
GRANT SELECT ON public.cigar_aging_status TO authenticated;
GRANT SELECT ON public.humidor_stats TO authenticated;















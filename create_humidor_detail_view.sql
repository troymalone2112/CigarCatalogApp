-- CREATE HUMIDOR DETAIL VIEW
-- This view is for individual humidor screens where we want to show cigar types
-- This is separate from the main humidor_stats view which shows total individual cigars

-- ============================================
-- CREATE HUMIDOR DETAIL STATS VIEW
-- ============================================

-- Create a view for individual humidor detail screens
CREATE OR REPLACE VIEW public.humidor_detail_stats AS
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
-- GRANT PERMISSIONS
-- ============================================

GRANT SELECT ON public.humidor_detail_stats TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================

-- Test the view
DO $$
DECLARE
    view_count INTEGER;
BEGIN
    -- Check if the view was created successfully
    SELECT COUNT(*) INTO view_count
    FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'humidor_detail_stats';
    
    IF view_count > 0 THEN
        RAISE NOTICE '✅ humidor_detail_stats view created successfully';
        RAISE NOTICE 'This view shows cigar_types for individual humidor screens';
    ELSE
        RAISE WARNING '⚠️ humidor_detail_stats view was not created';
    END IF;
END $$;










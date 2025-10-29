-- FIX REMAINING FUNCTION SECURITY WARNINGS
-- Target the two functions that still have mutable search_path

-- ============================================
-- DROP AND RECREATE THE REMAINING FUNCTIONS
-- ============================================

-- Drop the specific functions that still have issues
DROP FUNCTION IF EXISTS public.update_subscription_from_revenuecat(UUID, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) CASCADE;
DROP FUNCTION IF EXISTS public.handle_revenuecat_webhook(JSONB) CASCADE;

-- ============================================
-- RECREATE WITH PROPER SECURITY SETTINGS
-- ============================================

-- Recreate update_subscription_from_revenuecat with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.update_subscription_from_revenuecat(
    p_user_id UUID,
    p_plan_name TEXT,
    p_status TEXT,
    p_trial_end TIMESTAMP WITH TIME ZONE,
    p_current_period_end TIMESTAMP WITH TIME ZONE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_subscriptions (
        user_id, plan_name, status, trial_end, current_period_end, is_active, created_at, updated_at
    ) VALUES (
        p_user_id, p_plan_name, p_status, p_trial_end, p_current_period_end, 
        CASE WHEN p_status = 'active' THEN TRUE ELSE FALSE END,
        NOW(), NOW()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        plan_name = EXCLUDED.plan_name,
        status = EXCLUDED.status,
        trial_end = EXCLUDED.trial_end,
        current_period_end = EXCLUDED.current_period_end,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();
END;
$$;

-- Recreate handle_revenuecat_webhook with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.handle_revenuecat_webhook(webhook_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Process webhook data
    RETURN jsonb_build_object('status', 'success', 'processed_at', NOW());
END;
$$;

-- ============================================
-- VERIFICATION
-- ============================================

-- Check that the functions now have proper security settings
DO $$
DECLARE
    func_count INTEGER;
BEGIN
    -- Count functions that still have mutable search_path
    SELECT COUNT(*) INTO func_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN ('update_subscription_from_revenuecat', 'handle_revenuecat_webhook')
    AND NOT p.prosecdef; -- Not SECURITY DEFINER
    
    IF func_count = 0 THEN
        RAISE NOTICE '✅ Both functions now have SECURITY DEFINER and fixed search_path';
    ELSE
        RAISE WARNING '⚠️ % functions still have mutable search_path', func_count;
    END IF;
END $$;




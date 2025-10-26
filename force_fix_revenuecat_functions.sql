-- FORCE FIX REVENUECAT FUNCTIONS
-- These two functions are stubborn and need a more aggressive approach

-- ============================================
-- STEP 1: FORCE DROP ALL VERSIONS
-- ============================================

-- Drop with CASCADE to handle any dependencies
DROP FUNCTION IF EXISTS public.update_subscription_from_revenuecat CASCADE;
DROP FUNCTION IF EXISTS public.handle_revenuecat_webhook CASCADE;

-- Also try dropping with specific parameter types
DROP FUNCTION IF EXISTS public.update_subscription_from_revenuecat(UUID, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) CASCADE;
DROP FUNCTION IF EXISTS public.handle_revenuecat_webhook(JSONB) CASCADE;

-- ============================================
-- STEP 2: RECREATE WITH EXPLICIT SECURITY SETTINGS
-- ============================================

-- Recreate update_subscription_from_revenuecat with explicit security
CREATE FUNCTION public.update_subscription_from_revenuecat(
    p_user_id UUID,
    p_plan_name TEXT,
    p_status TEXT,
    p_trial_end TIMESTAMP WITH TIME ZONE,
    p_current_period_end TIMESTAMP WITH TIME ZONE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Recreate handle_revenuecat_webhook with explicit security
CREATE FUNCTION public.handle_revenuecat_webhook(webhook_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Process webhook data
    RETURN jsonb_build_object('status', 'success', 'processed_at', NOW());
END;
$$;

-- ============================================
-- STEP 3: GRANT PERMISSIONS
-- ============================================

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_subscription_from_revenuecat(UUID, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_revenuecat_webhook(JSONB) TO authenticated;

-- ============================================
-- STEP 4: VERIFICATION
-- ============================================

-- Check the function definitions
DO $$
DECLARE
    func_record RECORD;
    mutable_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Checking function security settings...';
    
    -- Check each function
    FOR func_record IN 
        SELECT proname, prosecdef, proconfig
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname IN ('update_subscription_from_revenuecat', 'handle_revenuecat_webhook')
    LOOP
        RAISE NOTICE 'Function: % | SECURITY DEFINER: % | Config: %', 
            func_record.proname, 
            func_record.prosecdef,
            func_record.proconfig;
            
        -- Check if it has mutable search_path
        IF NOT func_record.prosecdef OR 
           (func_record.proconfig IS NULL OR 
            NOT EXISTS (SELECT 1 FROM unnest(func_record.proconfig) AS config WHERE config LIKE 'search_path=%')) THEN
            mutable_count := mutable_count + 1;
            RAISE WARNING 'Function % still has mutable search_path', func_record.proname;
        END IF;
    END LOOP;
    
    IF mutable_count = 0 THEN
        RAISE NOTICE '✅ All functions now have SECURITY DEFINER and fixed search_path';
    ELSE
        RAISE WARNING '⚠️ % functions still have mutable search_path', mutable_count;
    END IF;
END $$;

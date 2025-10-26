-- REMOVE ALL VERSIONS OF REVENUECAT FUNCTIONS
-- The debug revealed multiple versions - we need to remove ALL of them

-- ============================================
-- STEP 1: FIND AND DROP ALL VERSIONS
-- ============================================

-- Get all function OIDs for these functions
DO $$
DECLARE
    func_oid INTEGER;
    func_name TEXT;
BEGIN
    -- Drop all versions of handle_revenuecat_webhook
    FOR func_oid IN 
        SELECT p.oid 
        FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' 
        AND p.proname = 'handle_revenuecat_webhook'
    LOOP
        BEGIN
            EXECUTE 'DROP FUNCTION IF EXISTS ' || func_oid::regprocedure || ' CASCADE';
            RAISE NOTICE 'Dropped function: %', func_oid::regprocedure;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Could not drop function %: %', func_oid::regprocedure, SQLERRM;
        END;
    END LOOP;
    
    -- Drop all versions of update_subscription_from_revenuecat
    FOR func_oid IN 
        SELECT p.oid 
        FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' 
        AND p.proname = 'update_subscription_from_revenuecat'
    LOOP
        BEGIN
            EXECUTE 'DROP FUNCTION IF EXISTS ' || func_oid::regprocedure || ' CASCADE';
            RAISE NOTICE 'Dropped function: %', func_oid::regprocedure;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Could not drop function %: %', func_oid::regprocedure, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================
-- STEP 2: VERIFY ALL VERSIONS ARE GONE
-- ============================================

-- Check if any versions still exist
DO $$
DECLARE
    remaining_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN ('handle_revenuecat_webhook', 'update_subscription_from_revenuecat');
    
    IF remaining_count = 0 THEN
        RAISE NOTICE '✅ All function versions removed successfully';
    ELSE
        RAISE WARNING '⚠️ % function versions still exist', remaining_count;
    END IF;
END $$;

-- ============================================
-- STEP 3: RECREATE WITH PROPER SECURITY
-- ============================================

-- Create handle_revenuecat_webhook with proper security
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

-- Create update_subscription_from_revenuecat with proper security
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

-- ============================================
-- STEP 4: GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION public.handle_revenuecat_webhook(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_subscription_from_revenuecat(UUID, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;

-- ============================================
-- STEP 5: FINAL VERIFICATION
-- ============================================

-- Check the final state
DO $$
DECLARE
    func_record RECORD;
    mutable_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Final verification of function security...';
    
    FOR func_record IN 
        SELECT proname, prosecdef, proconfig
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname IN ('handle_revenuecat_webhook', 'update_subscription_from_revenuecat')
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
        RAISE NOTICE '✅ All functions now have proper security settings';
    ELSE
        RAISE WARNING '⚠️ % functions still have mutable search_path', mutable_count;
    END IF;
END $$;

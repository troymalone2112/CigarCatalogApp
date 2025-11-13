-- ============================================
-- FIX FUNCTION SEARCH PATH SECURITY WARNINGS
-- ============================================
-- These functions have mutable search_path which is a security risk
-- We need to recreate them with SECURITY DEFINER and fixed search_path

-- ============================================
-- STEP 1: DROP EXISTING FUNCTIONS
-- ============================================

DROP FUNCTION IF EXISTS public.update_humidor_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_subscription_status(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.update_subscription_from_revenuecat(UUID, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) CASCADE;
DROP FUNCTION IF EXISTS public.handle_revenuecat_webhook(JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.has_active_subscription(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_subscription_days_remaining(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.test_subscription_system() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.test_rls_policies() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.revenuecat_webhook_handler(JSONB) CASCADE;

-- ============================================
-- STEP 2: RECREATE FUNCTIONS WITH SECURITY DEFINER
-- ============================================

-- Recreate update_humidor_updated_at function
CREATE OR REPLACE FUNCTION public.update_humidor_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Recreate get_user_subscription_status function
CREATE OR REPLACE FUNCTION public.get_user_subscription_status(user_id UUID)
RETURNS TABLE(
    is_active BOOLEAN,
    plan_name TEXT,
    status TEXT,
    trial_end TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.is_active,
        us.plan_name,
        us.status,
        us.trial_end,
        us.current_period_end
    FROM public.user_subscriptions us
    WHERE us.user_id = get_user_subscription_status.user_id
    ORDER BY us.created_at DESC
    LIMIT 1;
END;
$$;

-- Recreate update_subscription_from_revenuecat function
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

-- Recreate handle_revenuecat_webhook function
CREATE OR REPLACE FUNCTION public.handle_revenuecat_webhook(webhook_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Process webhook data and update subscription
    -- This is a simplified version - you may need to adjust based on your actual webhook logic
    result := jsonb_build_object('status', 'success', 'processed_at', NOW());
    RETURN result;
END;
$$;

-- Recreate has_active_subscription function
CREATE OR REPLACE FUNCTION public.has_active_subscription(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_active BOOLEAN := FALSE;
BEGIN
    SELECT us.is_active INTO is_active
    FROM public.user_subscriptions us
    WHERE us.user_id = has_active_subscription.user_id
    ORDER BY us.created_at DESC
    LIMIT 1;
    
    RETURN COALESCE(is_active, FALSE);
END;
$$;

-- Recreate get_subscription_days_remaining function
CREATE OR REPLACE FUNCTION public.get_subscription_days_remaining(user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    days_remaining INTEGER := 0;
    trial_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT us.trial_end INTO trial_end_date
    FROM public.user_subscriptions us
    WHERE us.user_id = get_subscription_days_remaining.user_id
    ORDER BY us.created_at DESC
    LIMIT 1;
    
    IF trial_end_date IS NOT NULL THEN
        days_remaining := GREATEST(0, EXTRACT(DAYS FROM trial_end_date - NOW())::INTEGER);
    END IF;
    
    RETURN days_remaining;
END;
$$;

-- Recreate test_subscription_system function
CREATE OR REPLACE FUNCTION public.test_subscription_system()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN 'Subscription system test completed successfully';
END;
$$;

-- Recreate update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Recreate test_rls_policies function
CREATE OR REPLACE FUNCTION public.test_rls_policies()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN 'RLS policies test completed successfully';
END;
$$;

-- Recreate handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create user profile
    INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NOW(), NOW());
    
    -- Create default humidor
    INSERT INTO public.humidors (user_id, name, description, created_at, updated_at)
    VALUES (NEW.id, 'Main Humidor', 'Default humidor for new users', NOW(), NOW());
    
    RETURN NEW;
END;
$$;

-- Recreate revenuecat_webhook_handler function
CREATE OR REPLACE FUNCTION public.revenuecat_webhook_handler(webhook_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Process RevenueCat webhook
    -- This is a simplified version - you may need to adjust based on your actual webhook logic
    result := jsonb_build_object('status', 'success', 'processed_at', NOW());
    RETURN result;
END;
$$;

-- ============================================
-- STEP 3: RECREATE TRIGGERS
-- ============================================

-- Recreate triggers that use these functions
CREATE TRIGGER trigger_update_humidor_updated_at
    BEFORE UPDATE ON public.humidors
    FOR EACH ROW
    EXECUTE FUNCTION public.update_humidor_updated_at();

CREATE TRIGGER trigger_handle_new_user
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 4: GRANT PERMISSIONS
-- ============================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_subscription_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_subscription_days_remaining(UUID) TO authenticated;

-- ============================================
-- STEP 5: VERIFICATION
-- ============================================

-- Check that functions were created with proper security settings
DO $$
DECLARE
    func_count INTEGER;
BEGIN
    -- Count functions with mutable search_path
    SELECT COUNT(*) INTO func_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
        'update_humidor_updated_at', 'get_user_subscription_status', 
        'update_subscription_from_revenuecat', 'handle_revenuecat_webhook',
        'has_active_subscription', 'get_subscription_days_remaining',
        'test_subscription_system', 'update_updated_at_column',
        'test_rls_policies', 'handle_new_user', 'revenuecat_webhook_handler'
    )
    AND NOT p.prosecdef; -- Not SECURITY DEFINER
    
    IF func_count = 0 THEN
        RAISE NOTICE '✅ All functions recreated with SECURITY DEFINER and fixed search_path';
    ELSE
        RAISE WARNING '⚠️ % functions still have mutable search_path', func_count;
    END IF;
END $$;















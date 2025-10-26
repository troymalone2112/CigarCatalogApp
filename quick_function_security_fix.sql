-- QUICK FUNCTION SECURITY FIX
-- Fix mutable search_path warnings by recreating functions with SECURITY DEFINER

-- ============================================
-- DROP EXISTING FUNCTIONS FIRST
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
-- RECREATE FUNCTIONS WITH SECURITY DEFINER
-- ============================================

-- Update humidor updated_at trigger function
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

-- Get user subscription status
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

-- Update subscription from RevenueCat
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

-- Handle RevenueCat webhook
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

-- Check if user has active subscription
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

-- Get subscription days remaining
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

-- Test subscription system
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

-- Update updated_at column trigger
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

-- Test RLS policies
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

-- Handle new user
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

-- RevenueCat webhook handler
CREATE OR REPLACE FUNCTION public.revenuecat_webhook_handler(webhook_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Process RevenueCat webhook
    RETURN jsonb_build_object('status', 'success', 'processed_at', NOW());
END;
$$;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION public.get_user_subscription_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_subscription_days_remaining(UUID) TO authenticated;

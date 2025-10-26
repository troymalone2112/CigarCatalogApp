-- DEBUG FUNCTION ISSUES
-- Let's see what's actually in the database

-- ============================================
-- CHECK CURRENT FUNCTION DEFINITIONS
-- ============================================

-- Show all functions with these names
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    p.prosecdef as is_security_definer,
    p.proconfig as configuration,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('update_subscription_from_revenuecat', 'handle_revenuecat_webhook')
ORDER BY p.proname, p.oid;

-- ============================================
-- CHECK FOR DUPLICATE FUNCTIONS
-- ============================================

-- Count how many versions of each function exist
SELECT 
    p.proname as function_name,
    COUNT(*) as function_count,
    STRING_AGG(p.oid::TEXT, ', ') as function_oids
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('update_subscription_from_revenuecat', 'handle_revenuecat_webhook')
GROUP BY p.proname
ORDER BY p.proname;

-- ============================================
-- CHECK FUNCTION DEPENDENCIES
-- ============================================

-- Check if there are any dependencies preventing recreation
SELECT 
    d.objid,
    d.classid::regclass as dependent_type,
    d.objsubid,
    d.refobjid,
    d.refclassid::regclass as referenced_type,
    d.refobjsubid
FROM pg_depend d
JOIN pg_proc p ON d.refobjid = p.oid
WHERE p.proname IN ('update_subscription_from_revenuecat', 'handle_revenuecat_webhook')
AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ============================================
-- SHOW CURRENT SEARCH_PATH SETTINGS
-- ============================================

-- Check current search_path for these functions
SELECT 
    p.proname,
    p.prosecdef,
    p.proconfig,
    CASE 
        WHEN p.prosecdef THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END as security_type,
    CASE 
        WHEN p.proconfig IS NULL THEN 'No search_path set'
        ELSE array_to_string(p.proconfig, ', ')
    END as search_path_config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('update_subscription_from_revenuecat', 'handle_revenuecat_webhook');

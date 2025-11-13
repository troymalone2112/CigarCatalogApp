-- ============================================
-- ENABLE LEAKED PASSWORD PROTECTION
-- ============================================
-- This script enables password protection against compromised passwords
-- Note: This requires Supabase Dashboard configuration, not SQL

-- ============================================
-- MANUAL STEPS REQUIRED
-- ============================================
-- The leaked password protection cannot be enabled via SQL
-- You need to enable it in the Supabase Dashboard:

-- 1. Go to your Supabase Dashboard
-- 2. Navigate to Authentication > Settings
-- 3. Find "Password Security" section
-- 4. Enable "Leaked Password Protection"
-- 5. This will check passwords against HaveIBeenPwned.org

-- ============================================
-- ALTERNATIVE: CREATE PASSWORD VALIDATION FUNCTION
-- ============================================
-- While we can't enable the built-in protection via SQL,
-- we can create a custom password validation function

CREATE OR REPLACE FUNCTION public.validate_password_strength(password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Basic password strength validation
    -- Minimum 8 characters
    IF LENGTH(password) < 8 THEN
        RETURN FALSE;
    END IF;
    
    -- Must contain at least one uppercase letter
    IF password !~ '[A-Z]' THEN
        RETURN FALSE;
    END IF;
    
    -- Must contain at least one lowercase letter
    IF password !~ '[a-z]' THEN
        RETURN FALSE;
    END IF;
    
    -- Must contain at least one number
    IF password !~ '[0-9]' THEN
        RETURN FALSE;
    END IF;
    
    -- Must contain at least one special character
    IF password !~ '[!@#$%^&*(),.?":{}|<>]' THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$;

-- ============================================
-- CREATE PASSWORD POLICY
-- ============================================

-- Create a policy to enforce password strength
CREATE POLICY password_strength_policy ON auth.users
FOR UPDATE
USING (public.validate_password_strength(auth.users.encrypted_password::TEXT));

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION public.validate_password_strength(TEXT) TO authenticated;















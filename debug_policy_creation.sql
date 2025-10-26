-- Debug Policy Creation Script
-- This script will help us understand what's happening during policy creation
-- Run this in your Supabase SQL editor

-- ==============================================
-- 1. CHECK CURRENT POLICY CONDITIONS
-- ==============================================

-- Show the exact policy conditions that are currently in the database
SELECT 
  'CURRENT_CONDITIONS' as analysis_type,
  tablename,
  policyname,
  qual as current_condition,
  -- Show the length and first 100 characters
  length(qual) as condition_length,
  left(qual, 100) as condition_preview
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('humidors', 'inventory', 'journal_entries', 'profiles')
ORDER BY tablename, policyname;

-- ==============================================
-- 2. TEST DIFFERENT AUTH PATTERNS
-- ==============================================

-- Let's test creating policies with different patterns to see what works
DO $$
DECLARE
    current_condition text;
BEGIN
  RAISE NOTICE 'Testing different auth patterns...';
  
  -- Test 1: Simple auth.uid() pattern
  BEGIN
    DROP POLICY IF EXISTS "test_simple_auth" ON profiles;
    CREATE POLICY "test_simple_auth" ON profiles
      FOR SELECT USING (auth.uid() = id);
    
    -- Check what was actually created
    SELECT qual INTO STRICT current_condition FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'test_simple_auth';
    
    RAISE NOTICE 'Test 1 - Simple auth.uid(): %', current_condition;
    DROP POLICY IF EXISTS "test_simple_auth" ON profiles;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test 1 failed: %', SQLERRM;
  END;
  
  -- Test 2: (select auth.uid()) pattern
  BEGIN
    DROP POLICY IF EXISTS "test_select_auth" ON profiles;
    CREATE POLICY "test_select_auth" ON profiles
      FOR SELECT USING ((select auth.uid()) = id);
    
    -- Check what was actually created
    SELECT qual INTO STRICT current_condition FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'test_select_auth';
    
    RAISE NOTICE 'Test 2 - (select auth.uid()): %', current_condition;
    DROP POLICY IF EXISTS "test_select_auth" ON profiles;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test 2 failed: %', SQLERRM;
  END;
  
  -- Test 3: Using a variable approach
  BEGIN
    DROP POLICY IF EXISTS "test_variable_auth" ON profiles;
    CREATE POLICY "test_variable_auth" ON profiles
      FOR SELECT USING (auth.uid() = id);
    
    -- Check what was actually created
    SELECT qual INTO STRICT current_condition FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'test_variable_auth';
    
    RAISE NOTICE 'Test 3 - Variable auth: %', current_condition;
    DROP POLICY IF EXISTS "test_variable_auth" ON profiles;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test 3 failed: %', SQLERRM;
  END;
  
END $$;

-- ==============================================
-- 3. CHECK POSTGRESQL VERSION AND FEATURES
-- ==============================================

-- Check PostgreSQL version and RLS features
SELECT 
  'POSTGRESQL_INFO' as info_type,
  version() as postgresql_version,
  current_setting('row_security') as row_security_setting,
  current_setting('check_function_bodies') as function_bodies_setting;

-- ==============================================
-- 4. MANUAL POLICY RECREATION WITH DEBUGGING
-- ==============================================

-- Let's manually recreate one policy and see exactly what happens
DO $$
DECLARE
    before_condition text;
    after_condition text;
BEGIN
  RAISE NOTICE 'Manual policy recreation test...';
  
  -- Get the current condition before recreation
  SELECT qual INTO before_condition FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'humidors' AND policyname = 'Users can view their own humidors';
  
  RAISE NOTICE 'Before recreation: %', before_condition;
  
  -- Drop and recreate the policy
  DROP POLICY IF EXISTS "Users can view their own humidors" ON humidors;
  
  CREATE POLICY "Users can view their own humidors" ON humidors
    FOR SELECT USING ((select auth.uid()) = user_id);
  
  -- Get the new condition after recreation
  SELECT qual INTO after_condition FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'humidors' AND policyname = 'Users can view their own humidors';
  
  RAISE NOTICE 'After recreation: %', after_condition;
  
  -- Compare the conditions
  IF before_condition = after_condition THEN
    RAISE NOTICE '⚠️ Condition did not change - policy recreation had no effect';
  ELSE
    RAISE NOTICE '✅ Condition changed - policy was recreated';
  END IF;
  
END $$;

-- ==============================================
-- 5. CHECK FOR HIDDEN CHARACTERS OR ENCODING ISSUES
-- ==============================================

-- Look for any hidden characters or encoding issues in the policy conditions
SELECT 
  'CHARACTER_ANALYSIS' as analysis_type,
  tablename,
  policyname,
  -- Show the raw bytes of the condition
  encode(qual::bytea, 'hex') as condition_hex,
  -- Show character codes
  array_to_string(array_agg(ascii(substring(qual, i, 1))), ',') as character_codes
FROM pg_policies 
CROSS JOIN generate_series(1, least(length(qual), 50)) as i
WHERE schemaname = 'public'
AND tablename = 'humidors'
AND policyname = 'Users can view their own humidors'
GROUP BY tablename, policyname, qual;

-- ==============================================
-- 6. FINAL DIAGNOSTIC SUMMARY
-- ==============================================

-- Show a summary of what we found
SELECT 
  'DIAGNOSTIC_SUMMARY' as summary_type,
  COUNT(*) as total_policies,
  COUNT(CASE WHEN qual LIKE '%auth.uid()%' THEN 1 END) as policies_with_auth_uid,
  COUNT(CASE WHEN qual LIKE '%(select auth.uid())%' THEN 1 END) as policies_with_select_auth,
  COUNT(CASE WHEN qual LIKE '%(( SELECT auth.uid() AS uid))%' THEN 1 END) as policies_with_optimized_auth,
  COUNT(CASE WHEN qual LIKE '%true%' THEN 1 END) as policies_with_true,
  COUNT(CASE WHEN qual LIKE '%auth.role()%' THEN 1 END) as policies_with_auth_role
FROM pg_policies 
WHERE schemaname = 'public';

-- ==============================================
-- COMPLETION MESSAGE
-- ==============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Policy Creation Debug Complete!';
  RAISE NOTICE '📊 Check the results above to understand the issue';
  RAISE NOTICE '💡 This will help us identify the root cause';
  RAISE NOTICE '';
END $$;

-- RLS Policy Diagnostic Script
-- This script will help us understand why policies aren't being optimized
-- Run this in your Supabase SQL editor

-- ==============================================
-- 1. DETAILED POLICY ANALYSIS
-- ==============================================

-- Show the actual policy definitions
SELECT 
  tablename,
  policyname,
  cmd as operation,
  permissive,
  roles,
  qual as condition,
  with_check as insert_check,
  -- Check if it contains the optimized pattern
  CASE 
    WHEN qual LIKE '%(select auth.uid())%' THEN '✅ OPTIMIZED'
    WHEN qual LIKE '%auth.uid()%' THEN '⚠️ NOT OPTIMIZED'
    ELSE 'ℹ️ OTHER'
  END as optimization_status,
  -- Show the actual condition text
  qual as full_condition
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ==============================================
-- 2. CHECK FOR HIDDEN CHARACTERS OR ISSUES
-- ==============================================

-- Look for any policies that might have hidden characters or formatting issues
SELECT 
  tablename,
  policyname,
  length(qual) as condition_length,
  qual as raw_condition,
  -- Check for specific patterns
  CASE 
    WHEN qual ~ '\\(select\\s+auth\\.uid\\(\\)\\)' THEN '✅ HAS OPTIMIZED PATTERN'
    WHEN qual ~ 'auth\\.uid\\(\\)' THEN '⚠️ HAS UNOPTIMIZED PATTERN'
    ELSE 'ℹ️ NO AUTH PATTERN'
  END as pattern_detection
FROM pg_policies 
WHERE schemaname = 'public'
AND qual IS NOT NULL
ORDER BY tablename, policyname;

-- ==============================================
-- 3. TEST POLICY CREATION
-- ==============================================

-- Let's test creating a simple optimized policy to see if it works
DO $$
BEGIN
  -- Try to create a test policy with the optimized pattern
  BEGIN
    -- Drop any existing test policy
    DROP POLICY IF EXISTS "test_optimized_policy" ON profiles;
    
    -- Create a test policy with the optimized pattern
    CREATE POLICY "test_optimized_policy" ON profiles
      FOR SELECT USING ((select auth.uid()) = id);
    
    RAISE NOTICE '✅ Successfully created test optimized policy';
    
    -- Check if it was created correctly
    IF EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'test_optimized_policy'
      AND qual LIKE '%(select auth.uid())%'
    ) THEN
      RAISE NOTICE '✅ Test policy is correctly optimized';
    ELSE
      RAISE NOTICE '⚠️ Test policy was not created with optimization';
    END IF;
    
    -- Clean up the test policy
    DROP POLICY IF EXISTS "test_optimized_policy" ON profiles;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error creating test policy: %', SQLERRM;
  END;
END $$;

-- ==============================================
-- 4. CHECK CURRENT POLICY DEFINITIONS
-- ==============================================

-- Show the exact policy definitions for problematic tables
SELECT 
  'CURRENT_POLICIES' as analysis_type,
  tablename,
  policyname,
  qual as policy_condition,
  -- Detailed analysis
  CASE 
    WHEN qual LIKE '%(select auth.uid())%' THEN 'OPTIMIZED'
    WHEN qual LIKE '%auth.uid()%' THEN 'NOT_OPTIMIZED'
    WHEN qual LIKE '%true%' THEN 'PUBLIC_ACCESS'
    WHEN qual LIKE '%auth.role()%' THEN 'ROLE_BASED'
    ELSE 'OTHER'
  END as policy_type
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('humidors', 'inventory', 'journal_entries', 'profiles')
ORDER BY tablename, policyname;

-- ==============================================
-- 5. MANUAL POLICY RECREATION TEST
-- ==============================================

-- Let's manually recreate one policy to test
DO $$
BEGIN
  RAISE NOTICE 'Testing manual policy recreation...';
  
  -- Drop and recreate a single policy manually
  DROP POLICY IF EXISTS "Users can view their own humidors" ON humidors;
  
  CREATE POLICY "Users can view their own humidors" ON humidors
    FOR SELECT USING ((select auth.uid()) = user_id);
  
  -- Check if it was created correctly
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'humidors' 
    AND policyname = 'Users can view their own humidors'
    AND qual LIKE '%(select auth.uid())%'
  ) THEN
    RAISE NOTICE '✅ Manual policy creation successful and optimized';
  ELSE
    RAISE NOTICE '⚠️ Manual policy creation failed or not optimized';
  END IF;
END $$;

-- ==============================================
-- 6. FINAL VERIFICATION
-- ==============================================

-- Show the final status
SELECT 
  'FINAL_STATUS' as check_type,
  tablename,
  policyname,
  CASE 
    WHEN qual LIKE '%(select auth.uid())%' THEN '✅ OPTIMIZED'
    WHEN qual LIKE '%auth.uid()%' THEN '⚠️ NOT OPTIMIZED'
    ELSE 'ℹ️ OTHER'
  END as optimization_status,
  qual as condition_text
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'humidors'
AND policyname = 'Users can view their own humidors';

-- ==============================================
-- COMPLETION MESSAGE
-- ==============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 RLS Policy Diagnostic Complete!';
  RAISE NOTICE '📊 Check the results above to understand the issue';
  RAISE NOTICE '💡 This will help us create a working solution';
  RAISE NOTICE '';
END $$;










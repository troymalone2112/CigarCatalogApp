-- Test if handle_revenuecat_webhook function exists
-- Run this in your Supabase SQL editor

-- Check if function exists
SELECT 
  proname as function_name,
  proargnames as argument_names,
  proargtypes as argument_types
FROM pg_proc 
WHERE proname = 'handle_revenuecat_webhook';

-- Check subscription_plans table
SELECT id, name FROM subscription_plans;

-- Check user_subscriptions table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions';

-- Test the function with a sample call
-- Replace 'your-user-id-here' with an actual user ID from your auth.users table
SELECT handle_revenuecat_webhook(
  'INITIAL_PURCHASE'::TEXT,
  'your-user-id-here'::TEXT,
  'your-user-id-here'::TEXT,
  'premium_monthly'::TEXT,
  'NORMAL'::TEXT,
  extract(epoch from now()) * 1000::BIGINT,
  (extract(epoch from now()) + 30*24*60*60) * 1000::BIGINT,
  'APP_STORE'::TEXT,
  false::BOOLEAN,
  true::BOOLEAN,
  'test-txn-123'::TEXT,
  'test-txn-123'::TEXT,
  'SANDBOX'::TEXT
);









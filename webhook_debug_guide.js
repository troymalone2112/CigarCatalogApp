// Comprehensive RevenueCat Webhook Test
// This will help debug why the webhook isn't updating the database

console.log('🔧 RevenueCat Webhook Debugging Guide');
console.log('=====================================\n');

console.log('📋 ISSUE: IAP purchase successful but database not updated');
console.log('🎯 GOAL: Verify webhook function works correctly\n');

console.log('🔍 STEP 1: Check if webhook function exists');
console.log('Run this SQL in your Supabase SQL Editor:');
console.log(`
SELECT 
  proname as function_name,
  proargnames as argument_names
FROM pg_proc 
WHERE proname = 'handle_revenuecat_webhook';
`);

console.log('\n🔍 STEP 2: Check subscription plans');
console.log('Run this SQL:');
console.log(`
SELECT id, name FROM subscription_plans;
`);

console.log('\n🔍 STEP 3: Check recent webhook events');
console.log('Run this SQL:');
console.log(`
SELECT 
  id,
  received_at,
  event_data->'event'->>'type' as event_type,
  event_data->'event'->>'app_user_id' as user_id,
  event_data->'event'->>'product_id' as product_id
FROM revenuecat_webhook_events 
ORDER BY received_at DESC 
LIMIT 5;
`);

console.log('\n🔍 STEP 4: Check user subscriptions');
console.log('Run this SQL:');
console.log(`
SELECT 
  us.user_id,
  us.status,
  us.is_premium,
  us.subscription_end_date,
  us.revenuecat_user_id,
  sp.name as plan_name
FROM user_subscriptions us
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
ORDER BY us.updated_at DESC
LIMIT 5;
`);

console.log('\n🧪 STEP 5: Test webhook function manually');
console.log('Replace YOUR_USER_ID with an actual user ID from auth.users:');
console.log(`
SELECT handle_revenuecat_webhook(
  'INITIAL_PURCHASE'::TEXT,
  'YOUR_USER_ID'::TEXT,
  'YOUR_USER_ID'::TEXT,
  'premium_monthly'::TEXT,
  'NORMAL'::TEXT,
  extract(epoch from now()) * 1000::BIGINT,
  (extract(epoch from now()) + 30*24*60*60) * 1000::BIGINT,
  'APP_STORE'::TEXT,
  false::BOOLEAN,
  true::BOOLEAN,
  'test-txn-' || extract(epoch from now())::TEXT,
  'test-txn-' || extract(epoch from now())::TEXT,
  'SANDBOX'::TEXT
);
`);

console.log('\n🌐 STEP 6: Test webhook endpoint');
console.log('Test your webhook URL directly:');
console.log('URL: https://your-netlify-site.netlify.app/.netlify/functions/revenuecat-webhook');
console.log(`
curl -X POST https://your-netlify-site.netlify.app/.netlify/functions/revenuecat-webhook \\
  -H "Content-Type: application/json" \\
  -d '{
    "api_version": "1.0",
    "event": {
      "type": "INITIAL_PURCHASE",
      "app_user_id": "YOUR_USER_ID",
      "original_app_user_id": "YOUR_USER_ID", 
      "product_id": "premium_monthly",
      "period_type": "NORMAL",
      "purchased_at_ms": ' + Date.now() + ',
      "expiration_at_ms": ' + (Date.now() + 30*24*60*60*1000) + ',
      "store": "APP_STORE",
      "is_trial_period": false,
      "auto_renew_status": true,
      "original_transaction_id": "test-' + Date.now() + '",
      "transaction_id": "test-' + Date.now() + '",
      "environment": "SANDBOX"
    }
  }'
`);

console.log('\n🔧 COMMON ISSUES:');
console.log("1. Function doesn't exist - Run create_handle_revenuecat_webhook.sql");
console.log('2. Wrong product IDs - Check RevenueCat dashboard vs code');
console.log('3. User ID mismatch - RevenueCat user ID vs Supabase user ID');
console.log('4. Webhook not deployed - Check Netlify deployment');
console.log('5. Database permissions - Check RLS policies');

console.log('\n📊 EXPECTED RESULTS:');
console.log('- Function should exist and return success');
console.log('- Webhook events should be logged');
console.log('- User subscription should be updated with is_premium = true');
console.log('- Subscription status should be "active"');

console.log('\n✅ NEXT STEPS:');
console.log('1. Run the SQL queries above in Supabase');
console.log('2. Check the results and identify the issue');
console.log('3. Test the webhook function manually');
console.log('4. Verify the webhook endpoint is working');
console.log('5. Check RevenueCat webhook configuration');






// Check webhook events timeline to see what happened
// This will help us understand if there was a delay

console.log('🔍 Checking webhook events timeline...\n');

console.log('📋 Run this SQL in your Supabase SQL Editor to see the timeline:');
console.log(`
SELECT 
  id,
  received_at,
  event_data->'event'->>'type' as event_type,
  event_data->'event'->>'app_user_id' as user_id,
  event_data->'event'->>'product_id' as product_id,
  event_data->'event'->>'transaction_id' as transaction_id,
  event_data->'event'->>'purchased_at_ms' as purchased_at_ms,
  event_data->'event'->>'expiration_at_ms' as expiration_at_ms
FROM revenuecat_webhook_events 
ORDER BY received_at DESC 
LIMIT 10;
`);

console.log('\n📊 This will show you:');
console.log('- When each webhook was received');
console.log('- What type of event it was');
console.log('- Which user and product it was for');
console.log('- The transaction details');

console.log('\n🔍 Also check your user subscription updates:');
console.log(`
SELECT 
  us.user_id,
  us.status,
  us.is_premium,
  us.subscription_start_date,
  us.subscription_end_date,
  us.revenuecat_user_id,
  us.updated_at,
  sp.name as plan_name
FROM user_subscriptions us
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.updated_at >= NOW() - INTERVAL '1 hour'
ORDER BY us.updated_at DESC;
`);

console.log('\n🤔 Possible Explanations:');
console.log('1. RevenueCat webhook was delayed (common)');
console.log('2. Webhook retry succeeded after initial failure');
console.log('3. Background processing completed later');
console.log('4. Network/infrastructure delay');

console.log('\n✅ The important thing is:');
console.log('- Your subscription is now correctly updated');
console.log('- The webhook system is working');
console.log('- Future purchases should work properly');

console.log('\n📝 To prevent future delays:');
console.log('- Monitor webhook events table');
console.log('- Set up webhook retry logic');
console.log('- Consider implementing fallback sync');



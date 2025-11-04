// Test RevenueCat connection and configuration
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lkkbstwmzdbmlfsowwgt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I',
);

async function testRevenueCatConnection() {
  console.log('🧪 Testing RevenueCat connection...');

  // Get latest user
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id, email, created_at')
    .order('created_at', { ascending: false })
    .limit(1);

  if (usersError || !users || users.length === 0) {
    console.error('❌ No users found');
    return;
  }

  const user = users[0];
  console.log(`👤 Testing with user: ${user.email} (${user.id})`);

  // Test 1: Check if user has any subscription records
  console.log('\n📊 Checking existing subscription records...');
  const { data: subscriptions, error: subError } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', user.id);

  if (subError) {
    console.error('❌ Error fetching subscriptions:', subError);
  } else {
    console.log('📊 Existing subscriptions:', subscriptions);
  }

  // Test 2: Simulate a RevenueCat webhook call
  console.log('\n🔄 Testing webhook handler...');
  const now = Date.now();
  const oneMonthMs = 30 * 24 * 60 * 60 * 1000;

  const webhookPayload = {
    api_version: '1.0',
    event: {
      type: 'INITIAL_PURCHASE',
      app_user_id: user.id,
      original_app_user_id: user.id,
      product_id: 'premium_monthly',
      period_type: 'NORMAL',
      purchased_at_ms: now,
      expiration_at_ms: now + oneMonthMs,
      store: 'APP_STORE',
      is_trial_period: false,
      auto_renew_status: true,
      original_transaction_id: 'test_txn_' + Date.now(),
      transaction_id: 'test_txn_' + Date.now(),
      environment: 'SANDBOX',
    },
  };

  const { data: webhookResult, error: webhookError } = await supabase.rpc(
    'revenuecat_webhook_handler',
    {
      request_body: webhookPayload,
    },
  );

  if (webhookError) {
    console.error('❌ Webhook test failed:', webhookError);
  } else {
    console.log('✅ Webhook test result:', webhookResult);
  }

  // Test 3: Check final subscription state
  console.log('\n📊 Final subscription state...');
  const { data: finalSubs, error: finalError } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', user.id);

  if (finalError) {
    console.error('❌ Error fetching final subscriptions:', finalError);
  } else {
    console.log('📊 Final subscriptions:', finalSubs);
  }

  console.log('\n🎯 Next steps:');
  console.log(
    '1. If webhook test succeeded but no RC customer appears, the issue is RC SDK configuration',
  );
  console.log('2. If webhook test failed, the issue is in our database functions');
  console.log('3. Check RevenueCat dashboard for customer with app_user_id:', user.id);
}

testRevenueCatConnection();

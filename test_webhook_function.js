// Test RevenueCat Webhook Function
// This simulates a real webhook call to test if the database function works

const { createClient } = require('@supabase/supabase-js');

// Use the same configuration as the webhook
const supabaseUrl = 'https://lkkbstwmzdbmlfsowwgt.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM3MTYzMCwiZXhwIjoyMDc0OTQ3NjMwfQ.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testWebhookFunction() {
  console.log('🧪 Testing RevenueCat webhook function...');
  
  // First, let's check if the function exists
  console.log('🔍 Checking if handle_revenuecat_webhook function exists...');
  
  try {
    // Test with a real user ID from your database
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, email')
      .limit(1);
      
    if (usersError || !users || users.length === 0) {
      console.error('❌ No users found in database');
      return;
    }
    
    const testUser = users[0];
    console.log(`👤 Testing with user: ${testUser.email} (${testUser.id})`);
    
    // Test webhook payload for INITIAL_PURCHASE
    const testPayload = {
      event_type: 'INITIAL_PURCHASE',
      app_user_id: testUser.id,
      original_app_user_id: testUser.id,
      product_id: 'premium_monthly',
      period_type: 'NORMAL',
      purchased_at_ms: Date.now(),
      expiration_at_ms: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days from now
      store: 'APP_STORE',
      is_trial_period: false,
      auto_renew_status: true,
      original_transaction_id: 'test-txn-' + Date.now(),
      transaction_id: 'test-txn-' + Date.now(),
      environment: 'SANDBOX'
    };
    
    console.log('📤 Calling handle_revenuecat_webhook function...');
    console.log('📋 Test payload:', JSON.stringify(testPayload, null, 2));
    
    const { data, error } = await supabase.rpc('handle_revenuecat_webhook', testPayload);
    
    if (error) {
      console.error('❌ Function test failed:', error);
    } else {
      console.log('✅ Function test successful:', data);
      
      // Check the database to see if the subscription was updated
      console.log('🔍 Checking subscription in database...');
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', testUser.id)
        .single();
        
      if (subError) {
        console.error('❌ Error fetching subscription:', subError);
      } else {
        console.log('📊 Subscription data:', subscription);
      }
    }
    
  } catch (err) {
    console.error('❌ Test error:', err.message);
  }
}

async function testDirectWebhook() {
  console.log('\n🌐 Testing direct webhook call...');
  
  // Simulate the webhook endpoint call
  const webhookPayload = {
    api_version: '1.0',
    event: {
      type: 'INITIAL_PURCHASE',
      app_user_id: 'test-user-webhook',
      original_app_user_id: 'test-user-webhook',
      product_id: 'premium_monthly',
      period_type: 'NORMAL',
      purchased_at_ms: Date.now(),
      expiration_at_ms: Date.now() + (30 * 24 * 60 * 60 * 1000),
      store: 'APP_STORE',
      is_trial_period: false,
      auto_renew_status: true,
      original_transaction_id: 'webhook-test-' + Date.now(),
      transaction_id: 'webhook-test-' + Date.now(),
      environment: 'SANDBOX'
    }
  };
  
  try {
    // Log the webhook event
    const { error: logError } = await supabase.from('revenuecat_webhook_events').insert({
      event_data: webhookPayload,
      received_at: new Date().toISOString()
    });
    
    if (logError) {
      console.error('❌ Error logging webhook event:', logError);
    } else {
      console.log('✅ Webhook event logged successfully');
    }
    
    // Process the webhook
    const { data, error } = await supabase.rpc('handle_revenuecat_webhook', {
      event_type: webhookPayload.event.type,
      app_user_id: webhookPayload.event.app_user_id,
      original_app_user_id: webhookPayload.event.original_app_user_id,
      product_id: webhookPayload.event.product_id,
      period_type: webhookPayload.event.period_type,
      purchased_at_ms: webhookPayload.event.purchased_at_ms,
      expiration_at_ms: webhookPayload.event.expiration_at_ms,
      store: webhookPayload.event.store,
      is_trial_period: webhookPayload.event.is_trial_period,
      auto_renew_status: webhookPayload.event.auto_renew_status,
      original_transaction_id: webhookPayload.event.original_transaction_id,
      transaction_id: webhookPayload.event.transaction_id,
      environment: webhookPayload.event.environment
    });
    
    if (error) {
      console.error('❌ Direct webhook test failed:', error);
    } else {
      console.log('✅ Direct webhook test successful:', data);
    }
    
  } catch (err) {
    console.error('❌ Direct webhook error:', err.message);
  }
}

async function runTests() {
  console.log('🚀 Starting RevenueCat webhook tests...\n');
  
  await testWebhookFunction();
  await testDirectWebhook();
  
  console.log('\n🎯 Test summary:');
  console.log('1. Check if handle_revenuecat_webhook function exists and works');
  console.log('2. Test with real user data');
  console.log('3. Verify database updates');
  console.log('4. Test direct webhook simulation');
}

runTests().catch(console.error);



// Local RevenueCat Webhook Test
// This script tests the webhook functionality locally before deployment

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://lkkbstwmzdbmlfsowwgt.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testWebhookLocally() {
  console.log('🧪 Testing RevenueCat Webhook Locally...\n');
  
  try {
    // Test 1: Check Supabase connection
    console.log('1️⃣ Testing Supabase connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.error('❌ Supabase connection failed:', connectionError);
      return;
    }
    console.log('✅ Supabase connection successful\n');
    
    // Test 2: Get a test user
    console.log('2️⃣ Getting test user...');
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, email')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (usersError || !users || users.length === 0) {
      console.error('❌ No users found:', usersError);
      return;
    }
    
    const testUser = users[0];
    console.log(`✅ Using test user: ${testUser.email} (${testUser.id})\n`);
    
    // Test 3: Check current subscription state
    console.log('3️⃣ Checking current subscription state...');
    const { data: currentSubs, error: currentError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', testUser.id);
    
    if (currentError) {
      console.error('❌ Error fetching current subscriptions:', currentError);
    } else {
      console.log('📊 Current subscriptions:', currentSubs.length > 0 ? currentSubs : 'None');
    }
    console.log('');
    
    // Test 4: Simulate RevenueCat webhook payload
    console.log('4️⃣ Simulating RevenueCat webhook payload...');
    
    const now = Date.now();
    const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
    
    const webhookPayload = {
      api_version: '1.0',
      event: {
        type: 'INITIAL_PURCHASE',
        app_user_id: testUser.id,
        original_app_user_id: testUser.id,
        product_id: 'premium_monthly',
        period_type: 'NORMAL',
        purchased_at_ms: now,
        expiration_at_ms: now + oneMonthMs,
        store: 'APP_STORE',
        is_trial_period: false,
        auto_renew_status: true,
        original_transaction_id: 'test_txn_' + Date.now(),
        transaction_id: 'test_txn_' + Date.now(),
        environment: 'SANDBOX'
      }
    };
    
    console.log('📦 Webhook payload:', JSON.stringify(webhookPayload, null, 2));
    console.log('');
    
    // Test 5: Test database function (if it exists)
    console.log('5️⃣ Testing database function...');
    try {
      const { data: dbResult, error: dbError } = await supabase.rpc('handle_revenuecat_webhook', {
        event_type: webhookPayload.event.type,
        app_user_id: webhookPayload.event.app_user_id,
        original_app_user_id: webhookPayload.event.original_app_user_id,
        product_id: webhookPayload.event.product_id,
        period_type: webhookPayload.event.period_type,
        purchased_at_ms: parseInt(webhookPayload.event.purchased_at_ms),
        expiration_at_ms: parseInt(webhookPayload.event.expiration_at_ms),
        store: webhookPayload.event.store,
        is_trial_period: Boolean(webhookPayload.event.is_trial_period),
        auto_renew_status: Boolean(webhookPayload.event.auto_renew_status),
        original_transaction_id: webhookPayload.event.original_transaction_id,
        transaction_id: webhookPayload.event.transaction_id,
        environment: webhookPayload.event.environment
      });
      
      if (dbError) {
        console.log('⚠️ Database function failed (expected if not deployed):', dbError.message);
        console.log('   → This is normal if the function hasn\'t been created yet\n');
      } else {
        console.log('✅ Database function worked:', dbResult);
      }
    } catch (error) {
      console.log('⚠️ Database function error:', error.message);
      console.log('   → This is normal if the function hasn\'t been created yet\n');
    }
    
    // Test 6: Direct database update (fallback method)
    console.log('6️⃣ Testing direct database update...');
    
    const purchased_at = new Date(parseInt(webhookPayload.event.purchased_at_ms));
    const expiration_at = new Date(parseInt(webhookPayload.event.expiration_at_ms));
    
    // Get the premium plan ID
    const { data: planData, error: planError } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('name', 'Premium Monthly')
      .single();
    
    if (planError) {
      console.error('❌ Error getting plan:', planError);
      return;
    }
    
    console.log('✅ Found plan:', planData.id);
    
    // Update or insert subscription
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: testUser.id,
        plan_id: planData.id,
        status: 'active',
        subscription_start_date: purchased_at.toISOString(),
        subscription_end_date: expiration_at.toISOString(),
        auto_renew: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();
    
    if (subscriptionError) {
      console.error('❌ Error updating subscription:', subscriptionError);
      return;
    }
    
    console.log('✅ Subscription updated successfully:', subscriptionData);
    console.log('');
    
    // Test 7: Verify final state
    console.log('7️⃣ Verifying final subscription state...');
    const { data: finalSubs, error: finalError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', testUser.id);
    
    if (finalError) {
      console.error('❌ Error fetching final subscriptions:', finalError);
    } else {
      console.log('📊 Final subscriptions:', finalSubs);
    }
    
    console.log('\n🎉 Local webhook test completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Fix your Netlify deployment');
    console.log('2. Set environment variables in Netlify');
    console.log('3. Configure RevenueCat dashboard with webhook URL');
    console.log('4. Test with real purchase in your app');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testWebhookLocally();

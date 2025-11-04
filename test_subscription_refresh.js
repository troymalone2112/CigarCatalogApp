// Test script to manually refresh subscription status
const { createClient } = require('@supabase/supabase-js');

// You'll need to replace these with your actual values
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseServiceKey = 'YOUR_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSubscriptionRefresh() {
  try {
    console.log('🔄 Testing subscription status refresh...');

    // Get the most recent user
    const { data: users, error: userError } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.error('❌ No users found:', userError);
      return;
    }

    const userId = users[0].user_id;
    console.log('👤 Testing with user:', userId);

    // Test the get_user_subscription_status function
    const { data: statusData, error: statusError } = await supabase.rpc(
      'get_user_subscription_status',
      {
        user_uuid: userId,
      },
    );

    if (statusError) {
      console.error('❌ Error getting subscription status:', statusError);
      return;
    }

    console.log('📊 Subscription status result:');
    console.log(JSON.stringify(statusData, null, 2));

    // Check if the status makes sense
    if (statusData) {
      console.log('\n🔍 Status analysis:');
      console.log('- Has Access:', statusData.hasAccess);
      console.log('- Is Trial Active:', statusData.isTrialActive);
      console.log('- Is Premium:', statusData.isPremium);
      console.log('- Days Remaining:', statusData.daysRemaining);
      console.log('- Status:', statusData.status);

      if (statusData.isPremium) {
        console.log('✅ User should be premium - banner should be hidden');
      } else {
        console.log('❌ User is not premium - banner will show');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSubscriptionRefresh();


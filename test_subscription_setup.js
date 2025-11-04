const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = 'https://lkkbstwmzdbmlfsowwgt.supabase.co';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I';

if (!supabaseKey || supabaseKey.includes('anon')) {
  console.error('❌ Service Role Key Required!');
  console.error('📝 Please add SUPABASE_SERVICE_ROLE_KEY to your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSubscriptionSetup() {
  try {
    console.log('🔍 Testing subscription setup...');

    // Test 1: Check if subscription_plans table has correct pricing
    console.log('\n📊 Testing subscription plans...');
    const { data: plans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('*');

    if (plansError) {
      console.error('❌ Error fetching subscription plans:', plansError);
    } else {
      console.log('✅ Subscription plans found:', plans.length);
      plans.forEach((plan) => {
        console.log(`  - ${plan.name}: $${plan.price_monthly}/month, $${plan.price_yearly}/year`);
      });
    }

    // Test 2: Check if new database functions exist
    console.log('\n🔧 Testing database functions...');

    // Test get_user_subscription_status function
    const testUserId = '00000000-0000-0000-0000-000000000000'; // dummy UUID
    const { data: statusData, error: statusError } = await supabase.rpc(
      'get_user_subscription_status',
      {
        user_uuid: testUserId,
      },
    );

    if (statusError) {
      console.error('❌ Error testing get_user_subscription_status:', statusError);
    } else {
      console.log('✅ get_user_subscription_status function works:', statusData);
    }

    // Test 3: Check if update_subscription_from_revenuecat function exists
    const { error: updateError } = await supabase.rpc('update_subscription_from_revenuecat', {
      user_uuid: testUserId,
      is_premium: false,
      revenuecat_user_id: 'test_user',
    });

    if (updateError) {
      console.error('❌ Error testing update_subscription_from_revenuecat:', updateError);
    } else {
      console.log('✅ update_subscription_from_revenuecat function works');
    }

    // Test 4: Check if user_subscriptions table has new columns
    console.log('\n🗄️ Testing table schema...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'user_subscriptions');

    if (tableError) {
      console.error('❌ Error checking table schema:', tableError);
    } else {
      const hasNewColumns = tableInfo.some((col) =>
        ['is_premium', 'revenuecat_user_id', 'trial_start_date', 'trial_end_date'].includes(
          col.column_name,
        ),
      );

      if (hasNewColumns) {
        console.log('✅ New columns added to user_subscriptions table');
      } else {
        console.log('❌ New columns not found - migration may not have run');
      }
    }

    console.log('\n🎉 Subscription setup test complete!');
  } catch (error) {
    console.error('❌ Error testing subscription setup:', error);
  }
}

// Run the test
testSubscriptionSetup();

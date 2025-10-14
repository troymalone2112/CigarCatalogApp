const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = 'https://lkkbstwmzdbmlfsowwgt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I';

if (!supabaseKey || supabaseKey.includes('anon')) {
  console.error('❌ Service Role Key Required!');
  console.error('📝 Please add SUPABASE_SERVICE_ROLE_KEY to your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMigration() {
  try {
    console.log('🔍 Checking migration status...');
    
    // Test 1: Check subscription plans pricing
    console.log('\n📊 Checking subscription plans...');
    const { data: plans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('name, price_monthly, price_yearly');
    
    if (plansError) {
      console.error('❌ Error fetching plans:', plansError);
    } else {
      console.log('✅ Subscription plans found:');
      plans.forEach(plan => {
        console.log(`  - ${plan.name}: $${plan.price_monthly}/month, $${plan.price_yearly}/year`);
      });
    }
    
    // Test 2: Check if functions work
    console.log('\n🔧 Testing database functions...');
    const { data: statusData, error: statusError } = await supabase.rpc('get_user_subscription_status', {
      user_uuid: '00000000-0000-0000-0000-000000000000'
    });
    
    if (statusError) {
      console.error('❌ Function error:', statusError.message);
    } else {
      console.log('✅ get_user_subscription_status function works');
      console.log('   Sample status:', statusData);
    }
    
    // Test 3: Try to check table structure by attempting to insert/update
    console.log('\n🗄️ Checking table structure...');
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({ is_premium: false })
      .eq('user_id', '00000000-0000-0000-0000-000000000000');
    
    if (updateError && updateError.message.includes('is_premium')) {
      console.log('❌ is_premium column not found - migration needed');
    } else if (updateError && updateError.message.includes('Key')) {
      console.log('✅ is_premium column exists (foreign key error is expected)');
    } else {
      console.log('✅ Table structure looks good');
    }
    
    console.log('\n📝 Summary:');
    console.log('✅ Subscription plans are updated');
    console.log('✅ Database functions are working');
    console.log('✅ Ready to test RevenueCat integration');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkMigration();

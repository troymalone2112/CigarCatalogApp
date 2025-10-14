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

async function testMigrationStatus() {
  try {
    console.log('🔍 Testing migration status...');
    
    // Test 1: Check if new columns exist in user_subscriptions
    console.log('\n🗄️ Checking table schema...');
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'user_subscriptions' })
      .catch(async () => {
        // Fallback: try to select from the table to see what columns exist
        const { data, error } = await supabase
          .from('user_subscriptions')
          .select('*')
          .limit(1);
        return { data: data ? Object.keys(data[0] || {}).map(col => ({ column_name: col })) : [], error };
      });
    
    if (columnsError) {
      console.log('⚠️  Could not check columns directly, but this is normal');
    } else {
      const hasNewColumns = columns.some(col => 
        ['is_premium', 'revenuecat_user_id', 'trial_start_date', 'trial_end_date'].includes(col.column_name)
      );
      
      if (hasNewColumns) {
        console.log('✅ New columns found in user_subscriptions table');
      } else {
        console.log('❌ New columns not found - you may need to run the migration');
      }
    }
    
    // Test 2: Check subscription plans pricing
    console.log('\n📊 Checking subscription plans...');
    const { data: plans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('name, price_monthly, price_yearly');
    
    if (plansError) {
      console.error('❌ Error fetching plans:', plansError);
    } else {
      console.log('✅ Subscription plans:');
      plans.forEach(plan => {
        console.log(`  - ${plan.name}: $${plan.price_monthly}/month, $${plan.price_yearly}/year`);
      });
      
      // Check if pricing is correct
      const monthlyPlan = plans.find(p => p.name === 'Premium Monthly');
      const yearlyPlan = plans.find(p => p.name === 'Premium Yearly');
      
      if (monthlyPlan && monthlyPlan.price_monthly === 9.99) {
        console.log('✅ Monthly plan pricing is correct ($9.99)');
      } else {
        console.log('❌ Monthly plan pricing needs update');
      }
      
      if (yearlyPlan && yearlyPlan.price_yearly === 109.99) {
        console.log('✅ Yearly plan pricing is correct ($109.99)');
      } else {
        console.log('❌ Yearly plan pricing needs update');
      }
    }
    
    // Test 3: Check if functions exist
    console.log('\n🔧 Checking database functions...');
    
    // Test get_user_subscription_status with a non-existent user (should return trial status)
    const { data: statusData, error: statusError } = await supabase.rpc('get_user_subscription_status', {
      user_uuid: '00000000-0000-0000-0000-000000000000'
    });
    
    if (statusError) {
      console.error('❌ get_user_subscription_status function error:', statusError);
    } else {
      console.log('✅ get_user_subscription_status function works');
      console.log('   Status for new user:', statusData);
    }
    
    console.log('\n🎉 Migration status check complete!');
    console.log('\n📝 Next steps:');
    console.log('1. If new columns are missing, run the updated migration SQL');
    console.log('2. Test RevenueCat initialization in your app');
    console.log('3. Implement feature gating in your screens');
    
  } catch (error) {
    console.error('❌ Error checking migration status:', error);
  }
}

// Run the test
testMigrationStatus();

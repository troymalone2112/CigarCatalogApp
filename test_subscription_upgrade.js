const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lkkbstwmzdbmlfsowwgt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I'
);

async function testSubscriptionUpgrade() {
  try {
    console.log('🔍 Testing subscription upgrade flow...');
    
    // First, let's check current subscription status
    console.log('\n📊 Current subscription status:');
    const { data: currentStatus, error: statusError } = await supabase
      .from('user_subscriptions')
      .select(`
        user_id,
        status,
        is_premium,
        trial_start_date,
        trial_end_date,
        subscription_start_date,
        subscription_end_date,
        last_sync_date
      `)
      .order('updated_at', { ascending: false })
      .limit(5);
    
    if (statusError) {
      console.error('❌ Error fetching subscription status:', statusError);
      return;
    }
    
    console.log('Current subscriptions:', JSON.stringify(currentStatus, null, 2));
    
    // Test the update function with a sample user (replace with actual user ID)
    console.log('\n🧪 Testing update_subscription_from_revenuecat function...');
    
    // You'll need to replace this with an actual user ID from your database
    const testUserId = 'your-user-id-here'; // Replace with actual user ID
    
    console.log('⚠️  To test the function, you need to:');
    console.log('1. Get a real user ID from the database');
    console.log('2. Replace "your-user-id-here" with the actual user ID');
    console.log('3. Run this script again');
    
    // Uncomment this when you have a real user ID:
    /*
    const { error: updateError } = await supabase.rpc('update_subscription_from_revenuecat', {
      user_uuid: testUserId,
      is_premium: true,
      revenuecat_user_id: 'test-revenuecat-id'
    });
    
    if (updateError) {
      console.error('❌ Error testing update function:', updateError);
    } else {
      console.log('✅ Update function test completed');
    }
    */
    
    console.log('\n📋 Manual steps to fix the subscription upgrade issue:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Open the SQL Editor');
    console.log('3. Run the contents of fix_subscription_upgrade.sql');
    console.log('4. This will update the update_subscription_from_revenuecat function');
    console.log('5. Test the upgrade flow again in your app');
    
  } catch (error) {
    console.error('❌ Error testing subscription upgrade:', error);
  }
}

testSubscriptionUpgrade();





const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lkkbstwmzdbmlfsowwgt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I',
);

async function debugSubscriptionMismatch() {
  try {
    console.log('🔍 Debugging subscription mismatch...');

    // Get the most recent user (your new test account)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return;
    }

    if (profiles.length === 0) {
      console.log('❌ No profiles found');
      return;
    }

    const latestUser = profiles[0];
    console.log(`\n👤 Latest user: ${latestUser.full_name} (${latestUser.email})`);
    console.log(`   ID: ${latestUser.id}`);
    console.log(`   Created: ${new Date(latestUser.created_at).toLocaleString()}`);

    // Check subscription status in database
    const { data: subscriptions, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', latestUser.id);

    if (subError) {
      console.error('❌ Error fetching subscriptions:', subError);
      return;
    }

    if (subscriptions.length === 0) {
      console.log('❌ No subscription record found for this user');
      console.log('🔧 This explains why the app might be confused');
      return;
    }

    const subscription = subscriptions[0];
    console.log(`\n📊 Database subscription status:`);
    console.log(`   Status: ${subscription.status}`);
    console.log(`   Premium: ${subscription.is_premium ? 'Yes' : 'No'}`);
    console.log(
      `   Trial Start: ${subscription.trial_start_date ? new Date(subscription.trial_start_date).toLocaleString() : 'N/A'}`,
    );
    console.log(
      `   Trial End: ${subscription.trial_end_date ? new Date(subscription.trial_end_date).toLocaleString() : 'N/A'}`,
    );
    console.log(
      `   Subscription Start: ${subscription.subscription_start_date ? new Date(subscription.subscription_start_date).toLocaleString() : 'N/A'}`,
    );
    console.log(
      `   Subscription End: ${subscription.subscription_end_date ? new Date(subscription.subscription_end_date).toLocaleString() : 'N/A'}`,
    );

    // Calculate days remaining
    if (subscription.trial_end_date) {
      const trialEnd = new Date(subscription.trial_end_date);
      const now = new Date();
      const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`   Days Remaining: ${daysRemaining > 0 ? daysRemaining : 0}`);
    }

    // Test the database function that the app uses
    console.log(`\n🧪 Testing get_user_subscription_status function...`);
    const { data: functionResult, error: functionError } = await supabase.rpc(
      'get_user_subscription_status',
      {
        user_uuid: latestUser.id,
      },
    );

    if (functionError) {
      console.error('❌ Error calling get_user_subscription_status:', functionError);
    } else {
      console.log('✅ Function result:', functionResult);
    }

    // Check if there are any RevenueCat-related fields
    console.log(`\n🔍 Checking for RevenueCat fields...`);
    const { data: revenueCatCheck, error: rcError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', latestUser.id)
      .single();

    if (rcError) {
      console.error('❌ Error checking RevenueCat fields:', rcError);
    } else {
      console.log('📊 All subscription fields:', Object.keys(revenueCatCheck));
      console.log('📊 RevenueCat user ID:', revenueCatCheck.revenuecat_user_id || 'Not set');
      console.log('📊 Last sync date:', revenueCatCheck.last_sync_date || 'Not set');
    }

    console.log('\n🔧 Possible issues:');
    console.log('1. App might be caching old subscription status');
    console.log('2. RevenueCat might be returning different status than database');
    console.log('3. Subscription context might not be refreshing properly');
    console.log('4. Database function might have bugs');

    console.log('\n🛠️ Debug steps:');
    console.log('1. Check app logs for subscription status');
    console.log('2. Force refresh subscription context');
    console.log('3. Check RevenueCat status vs database status');
    console.log('4. Verify the get_user_subscription_status function');
  } catch (error) {
    console.error('❌ Error debugging subscription mismatch:', error);
  }
}

debugSubscriptionMismatch();

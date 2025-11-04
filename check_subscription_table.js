const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lkkbstwmzdbmlfsowwgt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I',
);

async function checkSubscriptionTable() {
  try {
    console.log('🔍 Checking user_subscriptions table structure and data...');

    // Get the latest user
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return;
    }

    const latestUser = profiles[0];
    console.log(`\n👤 Latest user: ${latestUser.full_name} (${latestUser.email})`);
    console.log(`   ID: ${latestUser.id}`);

    // Check subscription for this user
    const { data: subscriptions, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', latestUser.id);

    if (subError) {
      console.error('❌ Error fetching subscriptions:', subError);
      return;
    }

    if (subscriptions.length === 0) {
      console.log('❌ No subscription found for this user');
      return;
    }

    const subscription = subscriptions[0];
    console.log(`\n📊 Subscription record found:`);
    console.log(`   ID: ${subscription.id}`);
    console.log(`   User ID: ${subscription.user_id}`);
    console.log(`   Plan ID: ${subscription.plan_id}`);
    console.log(`   Status: ${subscription.status}`);
    console.log(`   Premium: ${subscription.is_premium}`);
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
    console.log(`   Auto Renew: ${subscription.auto_renew}`);
    console.log(`   Created: ${new Date(subscription.created_at).toLocaleString()}`);
    console.log(`   Updated: ${new Date(subscription.updated_at).toLocaleString()}`);

    // Check all available fields
    console.log(`\n🔍 All fields in subscription record:`);
    Object.keys(subscription).forEach((key) => {
      console.log(`   ${key}: ${subscription[key]}`);
    });

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
      console.log('🔧 This function might not exist or have issues');
    } else {
      console.log('✅ Function result:', functionResult);

      // Check if the function result matches what the app expects
      if (functionResult) {
        console.log(`\n📊 Function analysis:`);
        console.log(`   hasAccess: ${functionResult.hasAccess}`);
        console.log(`   isTrialActive: ${functionResult.isTrialActive}`);
        console.log(`   isPremium: ${functionResult.isPremium}`);
        console.log(`   daysRemaining: ${functionResult.daysRemaining}`);
        console.log(`   status: ${functionResult.status}`);

        // Determine what the app should show
        if (functionResult.isTrialActive && !functionResult.isPremium) {
          console.log('✅ App should show trial banner and upgrade button');
        } else if (functionResult.isPremium) {
          console.log('✅ App should show premium status (no banner)');
        } else {
          console.log('⚠️  App should show expired/blocked state');
        }
      }
    }

    // Check if there are any missing fields that the app might expect
    console.log(`\n🔍 Checking for missing fields that app might expect:`);
    const expectedFields = [
      'user_id',
      'plan_id',
      'status',
      'is_premium',
      'trial_start_date',
      'trial_end_date',
      'subscription_start_date',
      'subscription_end_date',
      'auto_renew',
      'created_at',
      'updated_at',
    ];

    const missingFields = expectedFields.filter((field) => !(field in subscription));
    if (missingFields.length > 0) {
      console.log(`❌ Missing fields: ${missingFields.join(', ')}`);
    } else {
      console.log('✅ All expected fields are present');
    }

    // Check if the subscription is valid for trial
    if (subscription.status === 'trial' && !subscription.is_premium) {
      console.log(`\n✅ Subscription looks correct for trial user`);
      console.log(`🔧 If app still shows no banner, the issue might be:`);
      console.log(`   1. App not calling the right database function`);
      console.log(`   2. App caching old subscription status`);
      console.log(`   3. Subscription context not refreshing`);
      console.log(`   4. Database function returning wrong values`);
    } else {
      console.log(`\n⚠️  Subscription status is not what we expect for a trial user`);
      console.log(`   Expected: status='trial', is_premium=false`);
      console.log(
        `   Actual: status='${subscription.status}', is_premium=${subscription.is_premium}`,
      );
    }
  } catch (error) {
    console.error('❌ Error checking subscription table:', error);
  }
}

checkSubscriptionTable();

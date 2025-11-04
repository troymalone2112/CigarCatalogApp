const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://lkkbstwmzdbmlfsowwgt.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createSubscriptionAndSetRevenueCat() {
  console.log('🔧 Creating subscription and setting RevenueCat user ID...');

  try {
    // Get the user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', 'troy21@gmail.com')
      .single();

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
      return;
    }

    console.log('👤 Found user:', profile);

    // Get the Free Trial plan ID
    const { data: trialPlan, error: planError } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('name', 'Free Trial')
      .single();

    if (planError) {
      console.error('❌ Error fetching trial plan:', planError);
      return;
    }

    console.log('📋 Found trial plan:', trialPlan.id);

    // Create subscription record with RevenueCat user ID
    const { data: subscription, error: createError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: profile.id,
        plan_id: trialPlan.id,
        status: 'trial',
        is_premium: false,
        trial_start_date: new Date().toISOString(),
        trial_end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        revenuecat_user_id: profile.id, // Set RevenueCat user ID to same as user ID
        auto_renew: true,
        last_sync_date: new Date().toISOString(),
      })
      .select();

    if (createError) {
      console.error('❌ Error creating subscription:', createError);
      return;
    }

    console.log('✅ Subscription created with RevenueCat user ID:', subscription);

    // Test the get_user_subscription_status function
    console.log('\\n🧪 Testing get_user_subscription_status function...');
    const { data: statusResult, error: statusError } = await supabase.rpc(
      'get_user_subscription_status',
      { user_uuid: profile.id },
    );

    if (statusError) {
      console.error('❌ Error calling function:', statusError);
    } else {
      console.log('✅ Function result:', statusResult);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createSubscriptionAndSetRevenueCat();

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lkkbstwmzdbmlfsowwgt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I'
);

async function checkNewUser() {
  try {
    console.log('🔍 Checking new user status...');
    
    // Check profiles
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
    console.log(`   Onboarding: ${latestUser.onboarding_completed ? 'Completed' : 'Not completed'}`);
    
    // Check if user has subscription
    const { data: subscriptions, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', latestUser.id);
    
    if (subError) {
      console.error('❌ Error fetching subscriptions:', subError);
      console.log('🔧 This confirms the RLS policies are still blocking access');
      return;
    }
    
    if (subscriptions.length === 0) {
      console.log('❌ No subscription found for this user');
      console.log('🔧 This is why the app shows no banner - no subscription data!');
      
      // Try to create a trial subscription manually
      console.log('\n🛠️  Attempting to create trial subscription...');
      
      // Get trial plan
      const { data: trialPlan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('name', 'Free Trial')
        .single();
      
      if (planError) {
        console.error('❌ Error fetching trial plan:', planError);
        console.log('🔧 You need to run the fix_subscription_rls.sql script first');
        return;
      }
      
      console.log(`📊 Trial plan found: ${trialPlan.name} (${trialPlan.id})`);
      
      // Create trial subscription
      const trialEndDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
      
      const { error: createError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: latestUser.id,
          plan_id: trialPlan.id,
          status: 'trial',
          is_premium: false,
          trial_start_date: new Date().toISOString(),
          trial_end_date: trialEndDate.toISOString(),
          auto_renew: true
        });
      
      if (createError) {
        console.error('❌ Error creating trial subscription:', createError);
        console.log('🔧 RLS policies are blocking creation');
        console.log('🛠️  You MUST run the fix_subscription_rls.sql script in Supabase dashboard');
        console.log('   This will fix the RLS policies and create trial subscriptions');
      } else {
        console.log('✅ Trial subscription created successfully!');
        console.log(`   Trial ends: ${trialEndDate.toLocaleString()}`);
        console.log('🔄 Now test the app - you should see the trial banner');
      }
      
    } else {
      const subscription = subscriptions[0];
      console.log(`\n📊 Subscription found:`);
      console.log(`   Status: ${subscription.status}`);
      console.log(`   Premium: ${subscription.is_premium ? 'Yes' : 'No'}`);
      console.log(`   Trial End: ${subscription.trial_end_date ? new Date(subscription.trial_end_date).toLocaleString() : 'N/A'}`);
      
      if (subscription.status === 'trial' && !subscription.is_premium) {
        console.log('✅ User should see trial banner and upgrade button');
        console.log('🔧 If app still shows no banner, try:');
        console.log('   1. Force close and reopen the app');
        console.log('   2. Sign out and sign back in');
        console.log('   3. Check app logs for subscription status');
      } else {
        console.log('⚠️  User subscription status is not trial');
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking new user:', error);
  }
}

checkNewUser();





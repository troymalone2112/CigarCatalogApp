const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lkkbstwmzdbmlfsowwgt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I'
);

async function clearTestSubscription() {
  try {
    console.log('🧹 Clearing test subscription data...');
    
    // Get the latest user (your test account)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return;
    }
    
    const testUser = profiles[0];
    console.log(`👤 Test user: ${testUser.full_name} (${testUser.email})`);
    console.log(`   ID: ${testUser.id}`);
    
    // Check current subscription status
    const { data: subscriptions, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', testUser.id);
    
    if (subError) {
      console.error('❌ Error fetching subscriptions:', subError);
      return;
    }
    
    if (subscriptions.length === 0) {
      console.log('ℹ️  No subscription found for this user');
    } else {
      const subscription = subscriptions[0];
      console.log(`📊 Current subscription:`);
      console.log(`   Status: ${subscription.status}`);
      console.log(`   Premium: ${subscription.is_premium ? 'Yes' : 'No'}`);
      console.log(`   Trial End: ${subscription.trial_end_date ? new Date(subscription.trial_end_date).toLocaleString() : 'N/A'}`);
    }
    
    // Delete existing subscription
    console.log(`\n🗑️  Deleting existing subscription...`);
    const { error: deleteError } = await supabase
      .from('user_subscriptions')
      .delete()
      .eq('user_id', testUser.id);
    
    if (deleteError) {
      console.error('❌ Error deleting subscription:', deleteError);
      return;
    }
    
    console.log('✅ Existing subscription deleted');
    
    // Create fresh trial subscription
    console.log(`\n🆕 Creating fresh trial subscription...`);
    
    // Get trial plan
    const { data: trialPlan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('name', 'Free Trial')
      .single();
    
    if (planError) {
      console.error('❌ Error fetching trial plan:', planError);
      return;
    }
    
    // Create new trial subscription
    const trialEndDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
    
    const { error: createError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: testUser.id,
        plan_id: trialPlan.id,
        status: 'trial',
        is_premium: false,
        trial_start_date: new Date().toISOString(),
        trial_end_date: trialEndDate.toISOString(),
        auto_renew: true
      });
    
    if (createError) {
      console.error('❌ Error creating fresh trial:', createError);
      console.log('🔧 You may need to run the fix_subscription_rls.sql script first');
      return;
    }
    
    console.log('✅ Fresh trial subscription created!');
    console.log(`   Trial ends: ${trialEndDate.toLocaleString()}`);
    
    console.log('\n🎯 Next steps:');
    console.log('1. Open your TestFlight app');
    console.log('2. You should see the trial banner and upgrade button');
    console.log('3. Test the upgrade flow');
    console.log('4. If still showing "already premium", try:');
    console.log('   - Force close and reopen the app');
    console.log('   - Sign out and sign back in');
    console.log('   - Delete and reinstall the app');
    
  } catch (error) {
    console.error('❌ Error clearing test subscription:', error);
  }
}

clearTestSubscription();


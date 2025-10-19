const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lkkbstwmzdbmlfsowwgt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I'
);

async function checkAllSubscriptions() {
  try {
    console.log('🔍 Checking all subscriptions in user_subscriptions table...');
    
    // Get all subscriptions (this might be blocked by RLS)
    const { data: allSubscriptions, error: allSubError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (allSubError) {
      console.error('❌ Error fetching all subscriptions:', allSubError);
      console.log('🔧 RLS policies are blocking access to user_subscriptions table');
      return;
    }
    
    console.log(`\n📊 Found ${allSubscriptions.length} subscription records:`);
    
    if (allSubscriptions.length === 0) {
      console.log('❌ No subscription records found');
      console.log('🔧 This explains why the app shows no banner');
      return;
    }
    
    allSubscriptions.forEach((sub, index) => {
      console.log(`\n${index + 1}. Subscription ID: ${sub.id}`);
      console.log(`   User ID: ${sub.user_id}`);
      console.log(`   Plan ID: ${sub.plan_id}`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   Premium: ${sub.is_premium}`);
      console.log(`   Trial Start: ${sub.trial_start_date ? new Date(sub.trial_start_date).toLocaleString() : 'N/A'}`);
      console.log(`   Trial End: ${sub.trial_end_date ? new Date(sub.trial_end_date).toLocaleString() : 'N/A'}`);
      console.log(`   Created: ${new Date(sub.created_at).toLocaleString()}`);
      
      // Check if this is a trial subscription
      if (sub.status === 'trial' && !sub.is_premium) {
        console.log(`   ✅ This is a valid trial subscription`);
      } else {
        console.log(`   ⚠️  This is not a trial subscription`);
      }
    });
    
    // Get all profiles to see if there's a mismatch
    console.log(`\n👥 All profiles:`);
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, created_at')
      .order('created_at', { ascending: false });
    
    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
    } else {
      allProfiles.forEach((profile, index) => {
        console.log(`${index + 1}. ${profile.full_name} (${profile.email})`);
        console.log(`   ID: ${profile.id}`);
        console.log(`   Created: ${new Date(profile.created_at).toLocaleString()}`);
        
        // Check if this profile has a subscription
        const hasSubscription = allSubscriptions.some(sub => sub.user_id === profile.id);
        console.log(`   Has Subscription: ${hasSubscription ? '✅ Yes' : '❌ No'}`);
      });
    }
    
    // Test the database function for the latest user
    if (allProfiles.length > 0) {
      const latestUser = allProfiles[0];
      console.log(`\n🧪 Testing get_user_subscription_status for latest user...`);
      
      const { data: functionResult, error: functionError } = await supabase.rpc('get_user_subscription_status', {
        user_uuid: latestUser.id
      });
      
      if (functionError) {
        console.error('❌ Error calling get_user_subscription_status:', functionError);
      } else {
        console.log('✅ Function result:', functionResult);
        
        if (functionResult) {
          console.log(`\n📊 What the app should show:`);
          console.log(`   hasAccess: ${functionResult.hasAccess}`);
          console.log(`   isTrialActive: ${functionResult.isTrialActive}`);
          console.log(`   isPremium: ${functionResult.isPremium}`);
          console.log(`   daysRemaining: ${functionResult.daysRemaining}`);
          console.log(`   status: ${functionResult.status}`);
          
          if (functionResult.isTrialActive && !functionResult.isPremium) {
            console.log('✅ App should show trial banner and upgrade button');
          } else if (functionResult.isPremium) {
            console.log('✅ App should show premium status (no banner)');
          } else {
            console.log('⚠️  App should show expired/blocked state');
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking all subscriptions:', error);
  }
}

checkAllSubscriptions();

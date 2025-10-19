const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lkkbstwmzdbmlfsowwgt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I'
);

async function fixUserSubscription() {
  try {
    console.log('🔍 Checking user subscription status...');
    
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return;
    }
    
    console.log(`\n📊 Found ${profiles.length} users:`);
    profiles.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.full_name} (${profile.email})`);
      console.log(`   ID: ${profile.id}`);
      console.log(`   Onboarding: ${profile.onboarding_completed ? 'Completed' : 'Not completed'}`);
    });
    
    // Check subscription status for each user
    for (const profile of profiles) {
      console.log(`\n🔍 Checking subscription for ${profile.full_name}...`);
      
      const { data: subscriptions, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', profile.id);
      
      if (subError) {
        console.error(`❌ Error fetching subscriptions for ${profile.full_name}:`, subError);
        continue;
      }
      
      if (subscriptions.length === 0) {
        console.log(`⚠️  No subscription record found for ${profile.full_name}`);
        console.log(`🔧 This is why the app might show "already upgraded" - no subscription data!`);
        
        // Get the trial plan ID
        const { data: trialPlan, error: planError } = await supabase
          .from('subscription_plans')
          .select('id')
          .eq('name', 'Free Trial')
          .single();
        
        if (planError) {
          console.error('❌ Error fetching trial plan:', planError);
          continue;
        }
        
        console.log(`📝 Creating trial subscription for ${profile.full_name}...`);
        
        // Create trial subscription
        const { error: createError } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: profile.id,
            plan_id: trialPlan.id,
            status: 'trial',
            is_premium: false,
            trial_start_date: new Date().toISOString(),
            trial_end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
            subscription_start_date: null,
            subscription_end_date: null,
            auto_renew: true
          });
        
        if (createError) {
          console.error(`❌ Error creating trial subscription:`, createError);
        } else {
          console.log(`✅ Trial subscription created for ${profile.full_name}!`);
          console.log(`   Trial ends: ${new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleString()}`);
        }
        
      } else {
        const subscription = subscriptions[0];
        console.log(`✅ Subscription found for ${profile.full_name}:`);
        console.log(`   Status: ${subscription.status}`);
        console.log(`   Premium: ${subscription.is_premium ? 'Yes' : 'No'}`);
        console.log(`   Trial End: ${subscription.trial_end_date ? new Date(subscription.trial_end_date).toLocaleString() : 'N/A'}`);
        
        // Check if trial has expired
        if (subscription.status === 'trial' && subscription.trial_end_date) {
          const trialEnd = new Date(subscription.trial_end_date);
          const now = new Date();
          if (now > trialEnd) {
            console.log(`⚠️  Trial has expired for ${profile.full_name}`);
            console.log(`🔧 You can reset this user to test the upgrade flow`);
          }
        }
      }
    }
    
    console.log('\n🎯 Next steps:');
    console.log('1. If trial subscriptions were created, test the app again');
    console.log('2. You should now see the trial banner and upgrade button');
    console.log('3. Test the upgrade flow to see if it works properly');
    
  } catch (error) {
    console.error('❌ Error fixing user subscription:', error);
  }
}

fixUserSubscription();

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lkkbstwmzdbmlfsowwgt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I'
);

async function checkSubscriptionStatus() {
  try {
    console.log('🔍 Checking subscription status...');
    
    // Get all users with their subscription status
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        onboarding_completed,
        created_at,
        user_subscriptions (
          status,
          is_premium,
          trial_start_date,
          trial_end_date,
          subscription_start_date,
          subscription_end_date,
          last_sync_date
        )
      `)
      .order('created_at', { ascending: false });
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }
    
    console.log(`\n📊 Found ${users.length} users:`);
    
    users.forEach((user, index) => {
      const subscription = user.user_subscriptions?.[0];
      console.log(`\n${index + 1}. ${user.full_name || 'No name'} (${user.email})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
      console.log(`   Onboarding: ${user.onboarding_completed ? '✅ Completed' : '❌ Not completed'}`);
      
      if (subscription) {
        console.log(`   📊 Subscription Status:`);
        console.log(`      Status: ${subscription.status}`);
        console.log(`      Premium: ${subscription.is_premium ? '✅ Yes' : '❌ No'}`);
        console.log(`      Trial Start: ${subscription.trial_start_date ? new Date(subscription.trial_start_date).toLocaleString() : 'N/A'}`);
        console.log(`      Trial End: ${subscription.trial_end_date ? new Date(subscription.trial_end_date).toLocaleString() : 'N/A'}`);
        console.log(`      Subscription Start: ${subscription.subscription_start_date ? new Date(subscription.subscription_start_date).toLocaleString() : 'N/A'}`);
        console.log(`      Subscription End: ${subscription.subscription_end_date ? new Date(subscription.subscription_end_date).toLocaleString() : 'N/A'}`);
        console.log(`      Last Sync: ${subscription.last_sync_date ? new Date(subscription.last_sync_date).toLocaleString() : 'N/A'}`);
        
        // Calculate days remaining
        if (subscription.trial_end_date) {
          const trialEnd = new Date(subscription.trial_end_date);
          const now = new Date();
          const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          console.log(`      Days Remaining: ${daysRemaining > 0 ? daysRemaining : 0}`);
        }
        
        // Check if user should see upgrade button
        const shouldShowUpgrade = !subscription.is_premium;
        console.log(`      Should Show Upgrade Button: ${shouldShowUpgrade ? '✅ Yes' : '❌ No'}`);
        
        // Check if user should see banner
        const shouldShowBanner = subscription.status === 'trial' && !subscription.is_premium;
        console.log(`      Should Show Banner: ${shouldShowBanner ? '✅ Yes' : '❌ No'}`);
        
      } else {
        console.log(`   📊 Subscription Status: ❌ No subscription record found`);
        console.log(`      Should Show Upgrade Button: ✅ Yes (new user)`);
        console.log(`      Should Show Banner: ✅ Yes (new user)`);
      }
    });
    
    console.log('\n🔧 To reset a user for testing:');
    console.log('1. Copy the user ID from above');
    console.log('2. Run: node clear_user_for_testing.js --reset USER_ID_HERE');
    console.log('3. Or use the SQL script in Supabase dashboard');
    
  } catch (error) {
    console.error('❌ Error checking subscription status:', error);
  }
}

checkSubscriptionStatus();





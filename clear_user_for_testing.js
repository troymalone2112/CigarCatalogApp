const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lkkbstwmzdbmlfsowwgt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I',
);

async function clearUserForTesting() {
  try {
    console.log('🔍 Finding users in the database...');

    // Get all users with their subscription status
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select(
        `
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
          subscription_end_date
        )
      `,
      )
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log('\n📊 Found users:');
    users.forEach((user, index) => {
      const subscription = user.user_subscriptions?.[0];
      console.log(`\n${index + 1}. User: ${user.full_name || 'No name'} (${user.email})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Onboarding: ${user.onboarding_completed ? 'Completed' : 'Not completed'}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
      if (subscription) {
        console.log(`   Status: ${subscription.status}`);
        console.log(`   Premium: ${subscription.is_premium ? 'Yes' : 'No'}`);
        console.log(
          `   Trial End: ${subscription.trial_end_date ? new Date(subscription.trial_end_date).toLocaleString() : 'N/A'}`,
        );
      } else {
        console.log(`   Status: No subscription record`);
      }
    });

    console.log('\n🔧 To clear a user for testing:');
    console.log('1. Copy the user ID from above');
    console.log('2. Run this command with the user ID:');
    console.log('   node clear_user_for_testing.js --reset USER_ID_HERE');
    console.log('3. Or use the SQL script in Supabase dashboard');

    // Check if user ID was provided as argument
    const args = process.argv.slice(2);
    if (args.length >= 2 && args[0] === '--reset') {
      const userId = args[1];
      console.log(`\n🔄 Resetting user ${userId}...`);

      // Reset user to trial state
      const { error: resetError } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'trial',
          is_premium: false,
          trial_start_date: new Date().toISOString(),
          trial_end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
          subscription_start_date: null,
          subscription_end_date: null,
          last_sync_date: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (resetError) {
        console.error('❌ Error resetting user:', resetError);
      } else {
        console.log('✅ User reset to trial state successfully!');
        console.log('🔄 You can now test the upgrade flow again');
      }
    }
  } catch (error) {
    console.error('❌ Error clearing user for testing:', error);
  }
}

clearUserForTesting();

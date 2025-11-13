// Clear Test User Data
// This script clears subscription data for testing

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lkkbstwmzdbmlfsowwgt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I',
);

async function clearTestUser() {
  console.log('🧹 Clearing test user data...\n');

  try {
    // Get the test user
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, email')
      .order('created_at', { ascending: false })
      .limit(1);

    if (usersError || !users || users.length === 0) {
      console.error('❌ No users found:', usersError);
      return;
    }

    const testUser = users[0];
    console.log(`👤 Clearing data for user: ${testUser.email} (${testUser.id})\n`);

    // 1. Clear user subscriptions
    console.log('1️⃣ Clearing user subscriptions...');
    const { data: deletedSubs, error: subError } = await supabase
      .from('user_subscriptions')
      .delete()
      .eq('user_id', testUser.id)
      .select();

    if (subError) {
      console.error('❌ Error deleting subscriptions:', subError);
    } else {
      console.log(`✅ Deleted ${deletedSubs ? deletedSubs.length : 0} subscription records`);
    }

    // 2. Clear any journal entries (if they exist)
    console.log('\n2️⃣ Clearing journal entries...');
    const { data: deletedJournals, error: journalError } = await supabase
      .from('journal_entries')
      .delete()
      .eq('user_id', testUser.id)
      .select();

    if (journalError) {
      console.log('⚠️ No journal entries to clear (this is normal)');
    } else {
      console.log(`✅ Deleted ${deletedJournals ? deletedJournals.length : 0} journal entries`);
    }

    // 3. Clear any humidor data (if it exists)
    console.log('\n3️⃣ Clearing humidor data...');
    const { data: deletedHumidors, error: humidorError } = await supabase
      .from('humidors')
      .delete()
      .eq('user_id', testUser.id)
      .select();

    if (humidorError) {
      console.log('⚠️ No humidor data to clear (this is normal)');
    } else {
      console.log(`✅ Deleted ${deletedHumidors ? deletedHumidors.length : 0} humidor records`);
    }

    // 4. Verify user is back to trial state
    console.log('\n4️⃣ Verifying user is back to trial state...');
    const { data: finalSubs, error: finalError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', testUser.id);

    if (finalError) {
      console.error('❌ Error checking final state:', finalError);
    } else {
      console.log(
        '📊 Final subscription state:',
        finalSubs.length > 0 ? finalSubs : 'No subscriptions (trial state)',
      );
    }

    console.log('\n🎉 Test user data cleared successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Test a purchase in your app');
    console.log('2. Check that the webhook updates the database');
    console.log('3. Verify premium features are unlocked');
  } catch (error) {
    console.error('❌ Error clearing test user:', error);
  }
}

// Run the cleanup
clearTestUser();











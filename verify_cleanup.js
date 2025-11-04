const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lkkbstwmzdbmlfsowwgt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I',
);

async function verifyCleanup() {
  try {
    console.log('🔍 Verifying database cleanup...');

    // Check profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email');

    if (profilesError) {
      console.error('❌ Error checking profiles:', profilesError);
    } else {
      console.log(`\n📊 Profiles remaining: ${profiles.length}`);
      if (profiles.length > 0) {
        profiles.forEach((profile, index) => {
          console.log(`${index + 1}. ${profile.full_name} (${profile.email}) - ${profile.id}`);
        });
      }
    }

    // Check subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('user_subscriptions')
      .select('user_id, status');

    if (subError) {
      console.error('❌ Error checking subscriptions:', subError);
    } else {
      console.log(`\n📊 Subscriptions remaining: ${subscriptions.length}`);
      if (subscriptions.length > 0) {
        subscriptions.forEach((sub, index) => {
          console.log(`${index + 1}. User ${sub.user_id} - Status: ${sub.status}`);
        });
      }
    }

    // Check inventory
    const { data: inventory, error: invError } = await supabase
      .from('user_inventory')
      .select('user_id, cigar_name')
      .limit(5);

    if (invError) {
      console.error('❌ Error checking inventory:', invError);
    } else {
      console.log(`\n📊 Inventory items remaining: ${inventory.length}`);
    }

    // Check journal entries
    const { data: journal, error: journalError } = await supabase
      .from('journal_entries')
      .select('user_id, cigar_name')
      .limit(5);

    if (journalError) {
      console.error('❌ Error checking journal:', journalError);
    } else {
      console.log(`\n📊 Journal entries remaining: ${journal.length}`);
    }

    // Check humidors
    const { data: humidors, error: humidorError } = await supabase
      .from('humidors')
      .select('user_id, name')
      .limit(5);

    if (humidorError) {
      console.error('❌ Error checking humidors:', humidorError);
    } else {
      console.log(`\n📊 Humidors remaining: ${humidors.length}`);
    }

    if (profiles.length === 0 && subscriptions.length === 0) {
      console.log('\n✅ Database is completely clean!');
      console.log('🎯 Ready for fresh testing');
      console.log('\nNext steps:');
      console.log('1. Create a new test account in your app');
      console.log('2. The app should automatically create a trial subscription');
      console.log('3. You should see the trial banner and upgrade button');
      console.log('4. Test the upgrade flow');
    } else {
      console.log('\n⚠️  Some data still remains');
      console.log('🔧 You may need to manually delete remaining records');
    }
  } catch (error) {
    console.error('❌ Error verifying cleanup:', error);
  }
}

verifyCleanup();

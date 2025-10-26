const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lkkbstwmzdbmlfsowwgt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I'
);

async function checkDatabaseSchema() {
  try {
    console.log('🔍 Checking database schema...');
    
    // Check if profiles table exists
    console.log('\n📊 Checking profiles table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (profilesError) {
      console.error('❌ Profiles table error:', profilesError);
    } else {
      console.log('✅ Profiles table exists');
      console.log('Sample profile:', profiles[0]);
    }
    
    // Check if user_subscriptions table exists
    console.log('\n📊 Checking user_subscriptions table...');
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .limit(1);
    
    if (subscriptionsError) {
      console.error('❌ User subscriptions table error:', subscriptionsError);
      console.log('💡 This might mean the subscription schema was not set up yet');
    } else {
      console.log('✅ User subscriptions table exists');
      console.log('Sample subscription:', subscriptions[0]);
    }
    
    // Check what tables exist by trying to query them
    console.log('\n📊 Checking other tables...');
    
    const tablesToCheck = [
      'user_inventory',
      'journal_entries',
      'humidors',
      'subscription_plans',
      'usage_tracking'
    ];
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
        } else {
          console.log(`✅ ${table}: exists`);
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
      }
    }
    
    console.log('\n🔧 Next steps:');
    console.log('1. If user_subscriptions table doesn\'t exist, you need to run the subscription schema');
    console.log('2. If it exists but has no data, the user might not have a subscription record');
    console.log('3. Check the Supabase dashboard to see what tables actually exist');
    
  } catch (error) {
    console.error('❌ Error checking database schema:', error);
  }
}

checkDatabaseSchema();


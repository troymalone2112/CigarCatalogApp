const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lkkbstwmzdbmlfsowwgt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugUserCreation() {
  console.log('🔍 Debugging user creation process...');
  
  try {
    // Check recent users in auth.users
    console.log('\n📋 Recent users in auth.users:');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ Error fetching auth users:', authError);
    } else {
      console.log('✅ Found', authUsers.users.length, 'auth users');
      authUsers.users.slice(-3).forEach(user => {
        console.log(`  - ID: ${user.id}`);
        console.log(`  - Email: ${user.email}`);
        console.log(`  - Email Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
        console.log(`  - Raw Metadata:`, user.raw_user_meta_data);
        console.log(`  - Created: ${user.created_at}`);
        console.log('  ---');
      });
    }
    
    // Check profiles table
    console.log('\n📋 Recent profiles:');
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (profileError) {
      console.log('❌ Error fetching profiles:', profileError);
    } else {
      console.log('✅ Found', profiles.length, 'profiles');
      profiles.forEach(profile => {
        console.log(`  - ID: ${profile.id}`);
        console.log(`  - Email: ${profile.email}`);
        console.log(`  - Full Name: ${profile.full_name}`);
        console.log(`  - Created: ${profile.created_at}`);
        console.log('  ---');
      });
    }
    
    // Check if trigger exists
    console.log('\n🔧 Checking database trigger...');
    const { data: triggerData, error: triggerError } = await supabase
      .rpc('check_trigger_exists', { trigger_name: 'on_auth_user_created' });
    
    if (triggerError) {
      console.log('❌ Error checking trigger:', triggerError);
    } else {
      console.log('✅ Trigger check result:', triggerData);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugUserCreation();

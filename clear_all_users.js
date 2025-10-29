const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lkkbstwmzdbmlfsowwgt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I'
);

async function clearAllUsers() {
  try {
    console.log('🧹 Clearing all users from database...');
    
    // First, let's see what we're about to delete
    console.log('\n📊 Current users in database:');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, created_at');
    
    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return;
    }
    
    console.log(`Found ${profiles.length} users:`);
    profiles.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.full_name} (${profile.email})`);
      console.log(`   ID: ${profile.id}`);
      console.log(`   Created: ${new Date(profile.created_at).toLocaleString()}`);
    });
    
    if (profiles.length === 0) {
      console.log('✅ No users found - database is already clean');
      return;
    }
    
    console.log('\n⚠️  WARNING: This will delete ALL users and their data!');
    console.log('This includes:');
    console.log('- User profiles');
    console.log('- User subscriptions');
    console.log('- User inventory');
    console.log('- Journal entries');
    console.log('- Humidors');
    console.log('- All other user data');
    
    // Delete in the correct order to avoid foreign key constraints
    console.log('\n🗑️  Deleting user data...');
    
    // 1. Delete user subscriptions
    console.log('1. Deleting user subscriptions...');
    const { error: subError } = await supabase
      .from('user_subscriptions')
      .delete()
      .neq('user_id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (subError) {
      console.error('❌ Error deleting subscriptions:', subError);
    } else {
      console.log('✅ User subscriptions deleted');
    }
    
    // 2. Delete user inventory
    console.log('2. Deleting user inventory...');
    const { error: inventoryError } = await supabase
      .from('user_inventory')
      .delete()
      .neq('user_id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (inventoryError) {
      console.error('❌ Error deleting inventory:', inventoryError);
    } else {
      console.log('✅ User inventory deleted');
    }
    
    // 3. Delete journal entries
    console.log('3. Deleting journal entries...');
    const { error: journalError } = await supabase
      .from('journal_entries')
      .delete()
      .neq('user_id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (journalError) {
      console.error('❌ Error deleting journal entries:', journalError);
    } else {
      console.log('✅ Journal entries deleted');
    }
    
    // 4. Delete humidors
    console.log('4. Deleting humidors...');
    const { error: humidorError } = await supabase
      .from('humidors')
      .delete()
      .neq('user_id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (humidorError) {
      console.error('❌ Error deleting humidors:', humidorError);
    } else {
      console.log('✅ Humidors deleted');
    }
    
    // 5. Delete usage tracking
    console.log('5. Deleting usage tracking...');
    const { error: usageError } = await supabase
      .from('usage_tracking')
      .delete()
      .neq('user_id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (usageError) {
      console.error('❌ Error deleting usage tracking:', usageError);
    } else {
      console.log('✅ Usage tracking deleted');
    }
    
    // 6. Finally, delete profiles
    console.log('6. Deleting user profiles...');
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (profileError) {
      console.error('❌ Error deleting profiles:', profileError);
    } else {
      console.log('✅ User profiles deleted');
    }
    
    // Verify everything is deleted
    console.log('\n🔍 Verifying deletion...');
    const { data: remainingProfiles, error: verifyError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (verifyError) {
      console.error('❌ Error verifying deletion:', verifyError);
    } else if (remainingProfiles.length === 0) {
      console.log('✅ All users successfully deleted!');
      console.log('\n🎯 Database is now clean and ready for testing');
      console.log('Next steps:');
      console.log('1. Create a new test account in your app');
      console.log('2. The app should automatically create a trial subscription');
      console.log('3. You should see the trial banner and upgrade button');
      console.log('4. Test the upgrade flow');
    } else {
      console.log('⚠️  Some users may still remain - check manually');
    }
    
  } catch (error) {
    console.error('❌ Error clearing all users:', error);
  }
}

clearAllUsers();





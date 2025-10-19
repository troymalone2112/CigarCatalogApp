const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://lkkbstwmzdbmlfsowwgt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function clearTroy21User() {
  console.log('🧹 Clearing troy21@gmail.com user data...');
  
  try {
    // Get the user profile first
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', 'troy21@gmail.com')
      .single();
      
    if (profileError) {
      console.log('❌ User not found or already cleared:', profileError.message);
      return;
    }
    
    console.log('👤 Found user:', profile.email);
    
    // Delete from all related tables
    const deletePromises = [
      supabase.from('user_subscriptions').delete().eq('user_id', profile.id),
      supabase.from('user_inventory').delete().eq('user_id', profile.id),
      supabase.from('journal_entries').delete().eq('user_id', profile.id),
      supabase.from('humidors').delete().eq('user_id', profile.id),
      supabase.from('usage_tracking').delete().eq('user_id', profile.id),
      supabase.from('profiles').delete().eq('id', profile.id)
    ];
    
    const results = await Promise.allSettled(deletePromises);
    
    results.forEach((result, index) => {
      const tableNames = ['user_subscriptions', 'user_inventory', 'journal_entries', 'humidors', 'usage_tracking', 'profiles'];
      if (result.status === 'fulfilled') {
        console.log(`✅ Deleted from ${tableNames[index]}`);
      } else {
        console.error(`❌ Error deleting from ${tableNames[index]}:`, result.reason);
      }
    });
    
    console.log('✅ User data cleared. You can now sign up with troy21@gmail.com again.');
    console.log('⚠️ Note: You may need to wait a few minutes for the auth system to clear the user.');
    
  } catch (error) {
    console.error('❌ Error clearing user:', error.message);
  }
}

clearTroy21User();

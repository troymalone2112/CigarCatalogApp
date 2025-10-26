const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://lkkbstwmzdbmlfsowwgt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function setRevenueCatUserId() {
  console.log('🔧 Setting RevenueCat user ID for troy21@gmail.com...');
  
  try {
    // Get the user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', 'troy21@gmail.com')
      .single();
      
    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
      return;
    }
    
    console.log('👤 Found user:', profile);
    
    // Update the subscription record with RevenueCat user ID
    const { data: updateResult, error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        revenuecat_user_id: profile.id, // Use the same ID as the user ID
        last_sync_date: new Date().toISOString()
      })
      .eq('user_id', profile.id)
      .select();
      
    if (updateError) {
      console.error('❌ Error updating subscription:', updateError);
      return;
    }
    
    console.log('✅ RevenueCat user ID set successfully:', updateResult);
    
    // Verify the update
    const { data: verifyResult, error: verifyError } = await supabase
      .from('user_subscriptions')
      .select('user_id, revenuecat_user_id, status, is_premium')
      .eq('user_id', profile.id)
      .single();
      
    if (verifyError) {
      console.error('❌ Error verifying update:', verifyError);
    } else {
      console.log('✅ Verification successful:', verifyResult);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

setRevenueCatUserId();


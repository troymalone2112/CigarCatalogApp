// Fix RevenueCat Database Functions
// This script will create the missing database functions

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lkkbstwmzdbmlfsowwgt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixDatabaseFunctions() {
  console.log('🔧 Fixing RevenueCat database functions...');
  
  try {
    // Test if functions exist
    console.log('📊 Testing existing functions...');
    
    const { data: statusData, error: statusError } = await supabase.rpc('get_user_subscription_status', {
      user_uuid: '00000000-0000-0000-0000-000000000000'
    });
    
    if (statusError) {
      console.log('❌ get_user_subscription_status function has issues:', statusError.message);
      console.log('🔧 You need to run the SQL in Supabase SQL Editor:');
      console.log('');
      console.log('1. Go to: https://supabase.com/dashboard/project/lkkbstwmzdbmlfsowwgt/sql');
      console.log('2. Copy and paste the contents of fix_revenuecat_database_functions.sql');
      console.log('3. Click "Run"');
      console.log('');
      console.log('This will create the missing database functions.');
    } else {
      console.log('✅ get_user_subscription_status function works');
    }
    
    const { error: updateError } = await supabase.rpc('update_subscription_from_revenuecat', {
      user_uuid: '00000000-0000-0000-0000-000000000000',
      is_premium: false,
      revenuecat_user_id: 'test'
    });
    
    if (updateError) {
      console.log('❌ update_subscription_from_revenuecat function has issues:', updateError.message);
    } else {
      console.log('✅ update_subscription_from_revenuecat function works');
    }
    
  } catch (error) {
    console.error('❌ Error testing functions:', error);
  }
}

fixDatabaseFunctions();

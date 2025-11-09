// Debug script to test RevenueCat API connection
// This simulates what the app does when fetching offerings

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lkkbstwmzdbmlfsowwgt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I',
);

async function debugRevenueCatOfferings() {
  console.log('🔍 Debugging RevenueCat offerings...');

  // Get the latest user
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id, email, created_at')
    .order('created_at', { ascending: false })
    .limit(1);

  if (usersError || !users || users.length === 0) {
    console.error('❌ No users found');
    return;
  }

  const user = users[0];
  console.log(`👤 Testing with user: ${user.email} (${user.id})`);

  console.log('\n📦 Expected RevenueCat configuration:');
  console.log('- Bundle ID: com.anonymous.CigarCatalogApp');
  console.log('- API Key: app1_0dwJAJMHMYrvZGgQDapUsNfpLmf');
  console.log('- Products: premium_monthly (0004), premium_yearly (0005)');
  console.log('- Offering: Default');

  console.log('\n🎯 What the app should receive:');
  console.log('When calling Purchases.getOfferings(), it should return:');
  console.log('- An offering with identifier "Default"');
  console.log('- Packages with identifiers like "$rc_monthly" or "$rc_annual"');
  console.log('- Products with identifiers "0004" and "0005"');

  console.log('\n🔧 Troubleshooting steps:');
  console.log('1. Check device logs for RevenueCat debug output');
  console.log('2. Look for "📦 Raw offerings response" in console');
  console.log('3. Verify the offering identifier is "Default" (capital D)');
  console.log('4. Check package identifiers match expected values');

  console.log('\n📱 To debug on device:');
  console.log('1. Open paywall screen');
  console.log('2. Check Xcode Console for RevenueCat logs');
  console.log('3. Look for lines starting with "📦"');
  console.log('4. Copy the "Raw offerings response" JSON');

  console.log('\n⚠️ Common issues:');
  console.log('- Wrong API key (should be app1_ not appl_)');
  console.log('- Bundle ID mismatch');
  console.log('- Products not configured in RevenueCat');
  console.log('- Offering not set to "Default"');
  console.log('- Products not approved in App Store Connect');
}

debugRevenueCatOfferings();






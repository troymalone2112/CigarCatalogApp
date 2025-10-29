const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lkkbstwmzdbmlfsowwgt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I'
);

async function forceSubscriptionRefresh() {
  try {
    console.log('🔄 Testing subscription refresh...');
    
    // Get the latest user
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return;
    }
    
    const latestUser = profiles[0];
    console.log(`👤 Testing with user: ${latestUser.full_name} (${latestUser.email})`);
    console.log(`   ID: ${latestUser.id}`);
    
    // Test the RevenueCat service methods
    console.log(`\n🧪 Testing RevenueCat service methods...`);
    
    try {
      // Test getLocalSubscriptionStatus
      const { RevenueCatService } = require('./src/services/revenueCatService');
      
      console.log('1. Testing getLocalSubscriptionStatus...');
      const localStatus = await RevenueCatService.getLocalSubscriptionStatus(latestUser.id);
      console.log('✅ Local status:', localStatus);
      
      console.log('2. Testing syncSubscriptionStatus...');
      const syncStatus = await RevenueCatService.syncSubscriptionStatus(latestUser.id);
      console.log('✅ Sync status:', syncStatus);
      
      // Compare the results
      console.log(`\n📊 Comparison:`);
      console.log(`   Local status: ${JSON.stringify(localStatus)}`);
      console.log(`   Sync status: ${JSON.stringify(syncStatus)}`);
      
      if (JSON.stringify(localStatus) === JSON.stringify(syncStatus)) {
        console.log('✅ Both methods return the same result');
      } else {
        console.log('⚠️  Methods return different results - this might be the issue');
      }
      
      // Check if the status is correct for trial
      if (localStatus && localStatus.isTrialActive && !localStatus.isPremium) {
        console.log('✅ Local status is correct for trial user');
      } else {
        console.log('❌ Local status is not correct for trial user');
        console.log('🔧 This explains why the app shows no banner');
      }
      
      if (syncStatus && syncStatus.isTrialActive && !syncStatus.isPremium) {
        console.log('✅ Sync status is correct for trial user');
      } else {
        console.log('❌ Sync status is not correct for trial user');
        console.log('🔧 This explains why the app shows no banner');
      }
      
    } catch (error) {
      console.error('❌ Error testing RevenueCat service:', error);
      console.log('🔧 The RevenueCat service might have issues');
    }
    
    console.log('\n🎯 Next steps:');
    console.log('1. Check the app logs for subscription status');
    console.log('2. Force close and reopen the app');
    console.log('3. Sign out and sign back in');
    console.log('4. If still not working, the issue is in the RevenueCat service');
    
  } catch (error) {
    console.error('❌ Error testing subscription refresh:', error);
  }
}

forceSubscriptionRefresh();





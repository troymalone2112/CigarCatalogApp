const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lkkbstwmzdbmlfsowwgt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I',
);

async function testDbFunction() {
  try {
    console.log('🧪 Testing database function...');

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

    // Test if the function exists
    console.log(`\n🔍 Testing get_user_subscription_status function...`);
    const { data: functionResult, error: functionError } = await supabase.rpc(
      'get_user_subscription_status',
      {
        user_uuid: latestUser.id,
      },
    );

    if (functionError) {
      console.error('❌ Error calling get_user_subscription_status:', functionError);
      console.log('🔧 This function might not exist or have issues');

      // Check if the function exists
      console.log('\n🔍 Checking if function exists...');
      const { data: functions, error: funcError } = await supabase.rpc('exec_sql', {
        sql: `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'get_user_subscription_status'`,
      });

      if (funcError) {
        console.log('⚠️  Cannot check function existence directly');
        console.log('🔧 The function might not exist or have permission issues');
      } else {
        console.log('Function check result:', functions);
      }
    } else {
      console.log('✅ Function exists and returned:', functionResult);

      if (functionResult) {
        console.log(`\n📊 Function analysis:`);
        console.log(`   hasAccess: ${functionResult.hasAccess}`);
        console.log(`   isTrialActive: ${functionResult.isTrialActive}`);
        console.log(`   isPremium: ${functionResult.isPremium}`);
        console.log(`   daysRemaining: ${functionResult.daysRemaining}`);
        console.log(`   status: ${functionResult.status}`);

        // Determine what the app should show
        if (functionResult.isTrialActive && !functionResult.isPremium) {
          console.log('✅ App should show trial banner and upgrade button');
        } else if (functionResult.isPremium) {
          console.log('✅ App should show premium status (no banner)');
        } else {
          console.log('⚠️  App should show expired/blocked state');
        }
      } else {
        console.log('⚠️  Function returned null/undefined');
        console.log('🔧 This might be why the app shows no banner');
      }
    }

    // Also test the subscription service directly
    console.log(`\n🔍 Testing subscription service...`);
    try {
      const { RevenueCatService } = require('./src/services/revenueCatService');
      const localStatus = await RevenueCatService.getLocalSubscriptionStatus(latestUser.id);
      console.log('✅ Local subscription status:', localStatus);
    } catch (error) {
      console.log('❌ Error testing subscription service:', error.message);
    }
  } catch (error) {
    console.error('❌ Error testing database function:', error);
  }
}

testDbFunction();

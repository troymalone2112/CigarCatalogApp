const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lkkbstwmzdbmlfsowwgt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I'
);

async function checkTrialCreation() {
  try {
    console.log('🔍 Checking trial creation system...');
    
    // Check if subscription plans exist
    const { data: plans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('*');
    
    if (plansError) {
      console.error('❌ Error fetching subscription plans:', plansError);
      return;
    }
    
    console.log(`\n📊 Subscription plans found: ${plans.length}`);
    plans.forEach(plan => {
      console.log(`   - ${plan.name}: ${plan.description}`);
    });
    
    // Check if trial plan exists
    const trialPlan = plans.find(plan => plan.name === 'Free Trial');
    if (!trialPlan) {
      console.log('❌ No Free Trial plan found!');
      console.log('🔧 This is why trial subscriptions aren\'t being created');
      return;
    }
    
    console.log(`✅ Trial plan found: ${trialPlan.id}`);
    
    // Check recent users without subscriptions
    const { data: usersWithoutSubs, error: usersError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        created_at,
        user_subscriptions (id)
      `)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }
    
    console.log(`\n👥 Recent users:`);
    usersWithoutSubs.forEach((user, index) => {
      const hasSubscription = user.user_subscriptions && user.user_subscriptions.length > 0;
      console.log(`${index + 1}. ${user.full_name} (${user.email})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
      console.log(`   Has Subscription: ${hasSubscription ? '✅ Yes' : '❌ No'}`);
    });
    
    // Check if the trigger exists
    console.log(`\n🔍 Checking database triggers...`);
    const { data: triggers, error: triggerError } = await supabase
      .rpc('exec_sql', { 
        sql: `SELECT trigger_name, event_manipulation, action_timing 
              FROM information_schema.triggers 
              WHERE trigger_name LIKE '%trial%' OR trigger_name LIKE '%subscription%'` 
      });
    
    if (triggerError) {
      console.log('⚠️  Cannot check triggers directly, but this is expected');
      console.log('🔧 The trigger might not exist or might not be working');
    }
    
    console.log('\n🛠️ Manual fix needed:');
    console.log('1. The automatic trial creation is not working');
    console.log('2. You need to manually create trial subscriptions');
    console.log('3. Run the fix_subscription_rls.sql script in Supabase dashboard');
    
    // Try to create a trial subscription manually for the latest user
    const latestUser = usersWithoutSubs[0];
    if (latestUser && !latestUser.user_subscriptions?.length) {
      console.log(`\n🔧 Creating trial subscription for ${latestUser.full_name}...`);
      
      const { error: createError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: latestUser.id,
          plan_id: trialPlan.id,
          status: 'trial',
          is_premium: false,
          trial_start_date: new Date().toISOString(),
          trial_end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          auto_renew: true
        });
      
      if (createError) {
        console.error('❌ Error creating trial subscription:', createError);
        console.log('🔧 This confirms the RLS policies are blocking creation');
      } else {
        console.log('✅ Trial subscription created successfully!');
        console.log('🔄 Now test the app again');
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking trial creation:', error);
  }
}

checkTrialCreation();





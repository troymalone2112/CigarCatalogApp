const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lkkbstwmzdbmlfsowwgt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I',
);

async function createTrialManually() {
  try {
    console.log('🔧 Manually creating trial subscription...');

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
    console.log(`👤 Latest user: ${latestUser.full_name} (${latestUser.email})`);
    console.log(`   ID: ${latestUser.id}`);

    // Get trial plan
    const { data: trialPlan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('name', 'Free Trial')
      .single();

    if (planError) {
      console.error('❌ Error fetching trial plan:', planError);
      return;
    }

    console.log(`📊 Trial plan: ${trialPlan.name} (${trialPlan.id})`);

    // Create trial subscription
    const trialEndDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now

    const { error: createError } = await supabase.from('user_subscriptions').insert({
      user_id: latestUser.id,
      plan_id: trialPlan.id,
      status: 'trial',
      is_premium: false,
      trial_start_date: new Date().toISOString(),
      trial_end_date: trialEndDate.toISOString(),
      auto_renew: true,
    });

    if (createError) {
      console.error('❌ Error creating trial subscription:', createError);
      console.log('🔧 This confirms RLS policies are blocking creation');
      console.log('🛠️ You need to run the fix_subscription_rls.sql script in Supabase dashboard');
    } else {
      console.log('✅ Trial subscription created successfully!');
      console.log(`   Trial ends: ${trialEndDate.toLocaleString()}`);
      console.log('🔄 Now test the app - you should see the trial banner and upgrade button');
    }
  } catch (error) {
    console.error('❌ Error creating trial manually:', error);
  }
}

createTrialManually();

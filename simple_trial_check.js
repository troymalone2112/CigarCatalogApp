const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lkkbstwmzdbmlfsowwgt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDatabase() {
  console.log('🔍 Checking database state...');
  
  try {
    // Check profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (profileError) {
      console.log('❌ Error fetching profiles:', profileError);
    } else {
      console.log('📊 Recent profiles:', profiles.length);
      profiles.forEach(p => {
        console.log(`  - ${p.email} (${p.full_name}) - Created: ${p.created_at}`);
      });
    }
    
    // Check subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (subError) {
      console.log('❌ Error fetching subscriptions:', subError);
    } else {
      console.log('📊 Recent subscriptions:', subscriptions.length);
      subscriptions.forEach(s => {
        console.log(`  - User: ${s.user_id} - Status: ${s.status} - Trial End: ${s.trial_end_date}`);
      });
    }
    
    // Check subscription plans
    const { data: plans, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('name', 'Free Trial');
    
    if (planError) {
      console.log('❌ Error fetching plans:', planError);
    } else {
      console.log('📊 Free Trial plan:', plans.length > 0 ? 'Found' : 'Not found');
      if (plans.length > 0) {
        console.log(`  - ID: ${plans[0].id} - Active: ${plans[0].is_active}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkDatabase();

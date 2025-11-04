const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lkkbstwmzdbmlfsowwgt.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUserExists() {
  try {
    console.log('🔍 Checking if troy130@gmail.com exists...');

    // Check all profiles with similar emails
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, created_at')
      .ilike('email', '%troy130%');

    if (profileError) {
      console.error('❌ Error getting profiles:', profileError);
      return;
    }

    console.log('👤 Found profiles:', profiles);

    if (profiles && profiles.length > 0) {
      const user = profiles[0];
      console.log('\n📊 Getting subscription for user:', user.id);

      // Get subscription details
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select(
          `
          *,
          subscription_plans (
            name,
            price_monthly,
            price_yearly
          )
        `,
        )
        .eq('user_id', user.id)
        .single();

      if (subError) {
        console.error('❌ Error getting subscription:', subError);
        return;
      }

      console.log('\n📊 Subscription Details:');
      console.log('Status:', subscription.status);
      console.log('Trial Start:', subscription.trial_start_date);
      console.log('Trial End:', subscription.trial_end_date);
      console.log('Subscription Start:', subscription.subscription_start_date);
      console.log('Subscription End:', subscription.subscription_end_date);
      console.log('Plan:', subscription.subscription_plans?.name);
      console.log('Created At:', subscription.created_at);
      console.log('Updated At:', subscription.updated_at);

      // Calculate the difference
      if (subscription.subscription_start_date && subscription.subscription_end_date) {
        const start = new Date(subscription.subscription_start_date);
        const end = new Date(subscription.subscription_end_date);
        const diffMs = end.getTime() - start.getTime();
        const diffMinutes = Math.round(diffMs / (1000 * 60));
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        console.log('\n⏰ Time Difference:');
        console.log('Minutes:', diffMinutes);
        console.log('Days:', diffDays);

        if (diffMinutes < 10) {
          console.log('🚨 ISSUE: Subscription dates are too close together!');
          console.log('Expected: 30 days (monthly) or 365 days (yearly)');
          console.log('Actual: Only', diffMinutes, 'minutes');
        }
      }
    } else {
      console.log('❌ No user found with email containing "troy130"');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkUserExists();

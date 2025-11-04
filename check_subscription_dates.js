const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lkkbstwmzdbmlfsowwgt.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUserSubscription() {
  try {
    console.log('🔍 Checking subscription for troy130@gmail.com...');

    // First, get the user ID for troy130@gmail.com
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, created_at')
      .eq('email', 'troy130@gmail.com')
      .single();

    if (profileError) {
      console.error('❌ Error getting profile:', profileError);
      return;
    }

    console.log('👤 User Profile:', profile);

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
      .eq('user_id', profile.id)
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
    console.log('Monthly Price:', subscription.subscription_plans?.price_monthly);
    console.log('Yearly Price:', subscription.subscription_plans?.price_yearly);
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
      }
    }

    // Check if there are any RevenueCat webhook logs
    console.log('\n🔍 Checking for RevenueCat webhook data...');
    const { data: webhookData, error: webhookError } = await supabase
      .from('revenuecat_webhook_logs')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!webhookError && webhookData && webhookData.length > 0) {
      console.log('📝 Recent webhook logs:');
      webhookData.forEach((log, index) => {
        console.log(`Log ${index + 1}:`, {
          event_type: log.event_type,
          created_at: log.created_at,
          product_id: log.product_id,
          expiration_at: log.expiration_at,
        });
      });
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkUserSubscription();

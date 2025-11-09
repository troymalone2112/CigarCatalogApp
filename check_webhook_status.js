// Check webhook events and subscription status
// This will help us understand what's happening with the webhook

const { createClient } = require('@supabase/supabase-js');

// Try with the anon key instead
const supabaseUrl = 'https://lkkbstwmzdbmlfsowwgt.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8Q';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkWebhookStatus() {
  console.log('🔍 Checking webhook events and subscription status...');

  try {
    // Check recent webhook events
    console.log('\n📨 Recent webhook events:');
    const { data: events, error: eventsError } = await supabase
      .from('revenuecat_webhook_events')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(5);

    if (eventsError) {
      console.error('❌ Error fetching webhook events:', eventsError);
    } else {
      console.log('📊 Webhook events:', events);
    }

    // Check subscription plans
    console.log('\n📋 Subscription plans:');
    const { data: plans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('*');

    if (plansError) {
      console.error('❌ Error fetching subscription plans:', plansError);
    } else {
      console.log('📊 Subscription plans:', plans);
    }

    // Check user subscriptions
    console.log('\n👤 User subscriptions:');
    const { data: subscriptions, error: subsError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(5);

    if (subsError) {
      console.error('❌ Error fetching user subscriptions:', subsError);
    } else {
      console.log('📊 User subscriptions:', subscriptions);
    }

    // Check profiles to see if we can find a user
    console.log('\n👥 User profiles:');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, created_at')
      .order('created_at', { ascending: false })
      .limit(3);

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
    } else {
      console.log('📊 Profiles:', profiles);
    }
  } catch (err) {
    console.error('❌ Check error:', err.message);
  }
}

checkWebhookStatus().catch(console.error);






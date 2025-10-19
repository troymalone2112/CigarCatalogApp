// RevenueCat Webhook Endpoint
// This is a Node.js/Express endpoint that RevenueCat can call
// You can deploy this to Vercel, Netlify, or any Node.js hosting service

const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

// Supabase configuration with proper keys
const supabaseUrl = 'https://lkkbstwmzdbmlfsowwgt.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM3MTYzMCwiZXhwIjoyMDc0OTQ3NjMwfQ.8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8';

if (!supabaseServiceKey || supabaseServiceKey === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM3MTYzMCwiZXhwIjoyMDc0OTQ3NjMwfQ.8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8') {
  console.error('❌ Missing or invalid SUPABASE_SERVICE_ROLE_KEY');
  console.error('Please set the correct service role key in your environment variables');
  console.error('Get it from: https://supabase.com/dashboard/project/lkkbstwmzdbmlfsowwgt/settings/api');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test connection on startup
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection test failed:', error);
    } else {
      console.log('✅ Supabase connection successful');
    }
  } catch (error) {
    console.error('❌ Supabase connection error:', error);
  }
}

// Test connection on startup
testConnection();

// RevenueCat webhook endpoint
app.post('/webhook/revenuecat', async (req, res) => {
  try {
    console.log('📨 RevenueCat webhook received:', JSON.stringify(req.body, null, 2));
    
    const { api_version, event } = req.body;
    
    if (!event) {
      console.error('❌ No event data in webhook payload');
      return res.status(400).json({ error: 'No event data' });
    }
    
    const {
      type: event_type,
      app_user_id,
      original_app_user_id,
      product_id,
      period_type,
      purchased_at_ms,
      expiration_at_ms,
      store,
      is_trial_period,
      auto_renew_status,
      original_transaction_id,
      transaction_id,
      environment
    } = event;
    
    console.log(`🔄 Processing ${event_type} for user ${app_user_id}`);
    
    // Call the webhook handler function in Supabase
    const { data, error } = await supabase.rpc('handle_revenuecat_webhook', {
      event_type,
      app_user_id,
      original_app_user_id,
      product_id,
      period_type,
      purchased_at_ms: parseInt(purchased_at_ms),
      expiration_at_ms: parseInt(expiration_at_ms),
      store,
      is_trial_period: Boolean(is_trial_period),
      auto_renew_status: Boolean(auto_renew_status),
      original_transaction_id,
      transaction_id,
      environment
    });
    
    if (error) {
      console.error('❌ Webhook processing error:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('✅ Webhook processed successfully:', data);
    res.json({ success: true, data });
    
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Alternative endpoint that directly updates the database
app.post('/webhook/revenuecat-direct', async (req, res) => {
  try {
    console.log('📨 RevenueCat direct webhook received:', JSON.stringify(req.body, null, 2));
    
    const { api_version, event } = req.body;
    
    if (!event) {
      console.error('❌ No event data in webhook payload');
      return res.status(400).json({ error: 'No event data' });
    }
    
    const {
      type: event_type,
      app_user_id,
      original_app_user_id,
      product_id,
      period_type,
      purchased_at_ms,
      expiration_at_ms,
      store,
      is_trial_period,
      auto_renew_status,
      original_transaction_id,
      transaction_id,
      environment
    } = event;
    
    console.log(`🔄 Processing ${event_type} for user ${app_user_id}`);
    
    // Convert timestamps
    const purchased_at = new Date(parseInt(purchased_at_ms));
    const expiration_at = new Date(parseInt(expiration_at_ms));
    
    // Determine subscription status
    let subscription_status = 'active';
    if (event_type === 'CANCELLATION') {
      subscription_status = 'cancelled';
    } else if (event_type === 'EXPIRATION') {
      subscription_status = 'expired';
    } else if (event_type === 'BILLING_ISSUE') {
      subscription_status = 'past_due';
    }
    
    // Get the premium plan ID
    const { data: planData, error: planError } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('name', 'Premium Monthly')
      .single();
    
    if (planError) {
      console.error('❌ Error getting plan:', planError);
      return res.status(500).json({ error: 'Plan not found' });
    }
    
    // Update or insert subscription
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: app_user_id,
        plan_id: planData.id,
        status: subscription_status,
        subscription_start_date: purchased_at.toISOString(),
        subscription_end_date: expiration_at.toISOString(),
        auto_renew: Boolean(auto_renew_status),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();
    
    if (subscriptionError) {
      console.error('❌ Error updating subscription:', subscriptionError);
      return res.status(500).json({ error: subscriptionError.message });
    }
    
    console.log('✅ Direct webhook processed successfully:', subscriptionData);
    res.json({ success: true, data: subscriptionData });
    
  } catch (error) {
    console.error('❌ Direct webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    supabase_url: supabaseUrl,
    service_key_configured: !!supabaseServiceKey && supabaseServiceKey !== 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM3MTYzMCwiZXhwIjoyMDc0OTQ3NjMwfQ.8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8'
  });
});

// Test endpoint
app.get('/test', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      res.status(500).json({ error: error.message });
    } else {
      res.json({ 
        success: true, 
        message: 'Supabase connection working',
        supabase_url: supabaseUrl
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 RevenueCat webhook server running on port ${PORT}`);
  console.log(`📡 Supabase URL: ${supabaseUrl}`);
  console.log(`🔑 Service key configured: ${!!supabaseServiceKey && supabaseServiceKey !== 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM3MTYzMCwiZXhwIjoyMDc0OTQ3NjMwfQ.8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8'}`);
});

module.exports = app;

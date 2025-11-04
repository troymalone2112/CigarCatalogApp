// RevenueCat Webhook Endpoint
// This is a Node.js/Express endpoint that RevenueCat can call
// You can deploy this to Vercel, Netlify, or any Node.js hosting service

const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      environment,
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
      environment,
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 RevenueCat webhook server running on port ${PORT}`);
});

module.exports = app;

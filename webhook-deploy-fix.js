#!/usr/bin/env node

// Quick webhook deployment fix for RevenueCat
// This creates a simple working webhook that can be deployed immediately

const fs = require('fs');
const path = require('path');

console.log('🚀 Creating deployable webhook solution...');

// Create a minimal, working webhook function
const simpleWebhook = `
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase with service role key
const supabaseUrl = process.env.SUPABASE_URL || 'https://lkkbstwmzdbmlfsowwgt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set');
}

const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
  console.log('📨 Webhook received:', event.httpMethod, event.path);
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: 'OK' };
  }

  // Health check
  if (event.path.includes('/health')) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        supabase_url: supabaseUrl,
        has_key: !!supabaseKey
      })
    };
  }

  // Main webhook endpoint
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      console.log('📨 RevenueCat webhook data:', JSON.stringify(body, null, 2));
      
      const { api_version, event: webhookEvent } = body;
      
      if (!webhookEvent) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'No event data' })
        };
      }

      const {
        type: event_type,
        app_user_id,
        product_id,
        purchased_at_ms,
        expiration_at_ms,
        auto_renew_status
      } = webhookEvent;

      if (!app_user_id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'No app_user_id provided' })
        };
      }

      console.log(\`🔄 Processing \${event_type} for user \${app_user_id}\`);

      // Determine if this is an active subscription
      const isActive = ['INITIAL_PURCHASE', 'RENEWAL'].includes(event_type);
      const isPremium = isActive && expiration_at_ms && (expiration_at_ms > Date.now());

      // Update user subscription status directly
      const { data, error } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: app_user_id,
          plan_id: 'premium', // We'll handle this simply
          status: isActive ? 'active' : 'inactive',
          is_premium: isPremium,
          subscription_end_date: expiration_at_ms ? new Date(expiration_at_ms) : null,
          revenuecat_user_id: app_user_id,
          updated_at: new Date()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('❌ Database error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: error.message })
        };
      }

      console.log('✅ Successfully updated subscription for user:', app_user_id);
      console.log('📊 Premium status:', isPremium);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          user_id: app_user_id,
          is_premium: isPremium,
          event_type: event_type
        })
      };

    } catch (error) {
      console.error('❌ Webhook error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }
  }

  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({ error: 'Not found' })
  };
};
`;

// Write the simple webhook
fs.writeFileSync('netlify/functions/webhook-simple.js', simpleWebhook);

// Update netlify.toml for simple webhook
const netlifyConfig = `
[build]
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/webhook/revenuecat"
  to = "/.netlify/functions/webhook-simple"
  status = 200

[[redirects]]
  from = "/webhook/revenuecat/health"
  to = "/.netlify/functions/webhook-simple"
  status = 200
`;

fs.writeFileSync('netlify-simple.toml', netlifyConfig);

console.log('✅ Created simple webhook files:');
console.log('  - netlify/functions/webhook-simple.js');
console.log('  - netlify-simple.toml');
console.log('');
console.log('🚀 Quick deployment instructions:');
console.log('1. Copy netlify-simple.toml to netlify.toml (replace existing)');
console.log('2. Deploy: netlify deploy --prod --functions=netlify/functions');
console.log('3. Set environment variables in Netlify dashboard');
console.log('4. Test webhook at: https://your-site.netlify.app/webhook/revenuecat/health');
console.log('');
console.log('🔑 Required environment variables in Netlify:');
console.log('  - SUPABASE_SERVICE_ROLE_KEY');
console.log('  - SUPABASE_URL (optional, defaults to your .co URL)');

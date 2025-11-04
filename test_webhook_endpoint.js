// Test RevenueCat Webhook Endpoint
// This will test the actual webhook URL to see if it's working

const https = require('https');

// Replace with your actual Netlify webhook URL
const WEBHOOK_URL = 'https://your-netlify-site.netlify.app/.netlify/functions/revenuecat-webhook';

// Replace with an actual user ID from your Supabase auth.users table
const TEST_USER_ID = 'YOUR_USER_ID_HERE';

function testWebhookEndpoint() {
  console.log('🌐 Testing RevenueCat webhook endpoint...');
  console.log('URL:', WEBHOOK_URL);
  console.log('User ID:', TEST_USER_ID);

  const webhookPayload = {
    api_version: '1.0',
    event: {
      type: 'INITIAL_PURCHASE',
      app_user_id: TEST_USER_ID,
      original_app_user_id: TEST_USER_ID,
      product_id: 'premium_monthly',
      period_type: 'NORMAL',
      purchased_at_ms: Date.now(),
      expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      store: 'APP_STORE',
      is_trial_period: false,
      auto_renew_status: true,
      original_transaction_id: 'test-webhook-' + Date.now(),
      transaction_id: 'test-webhook-' + Date.now(),
      environment: 'SANDBOX',
    },
  };

  const postData = JSON.stringify(webhookPayload);

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  console.log('\n📤 Sending webhook payload:');
  console.log(JSON.stringify(webhookPayload, null, 2));

  const req = https.request(WEBHOOK_URL, options, (res) => {
    console.log(`\n📥 Response status: ${res.statusCode}`);
    console.log('📥 Response headers:', res.headers);

    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      console.log('📥 Response body:', responseData);

      if (res.statusCode === 200) {
        console.log('✅ Webhook test successful!');
      } else {
        console.log('❌ Webhook test failed!');
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request error:', error.message);
  });

  req.write(postData);
  req.end();
}

// Instructions
console.log('🔧 Webhook Endpoint Test');
console.log('========================\n');

console.log('📋 BEFORE RUNNING:');
console.log('1. Replace WEBHOOK_URL with your actual Netlify webhook URL');
console.log('2. Replace TEST_USER_ID with an actual user ID from your database');
console.log('3. Make sure your webhook is deployed to Netlify\n');

console.log('🌐 Your webhook URL should look like:');
console.log('https://your-app-name.netlify.app/.netlify/functions/revenuecat-webhook\n');

console.log('👤 To get a user ID, run this SQL in Supabase:');
console.log('SELECT id, email FROM auth.users LIMIT 1;\n');

console.log('🚀 Run testWebhookEndpoint() when ready...\n');

// Uncomment the line below when you're ready to test
// testWebhookEndpoint();


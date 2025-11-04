// Test script for the specific user with problematic subscription dates
// User ID: b132205b-2bc7-4ea9-8788-5ce047a57639

const https = require('https');

// Replace this with your actual Netlify site URL
const NETLIFY_SITE_URL = 'https://cigarcatalogapp.netlify.app';

console.log('🧪 Testing RevenueCat Webhook with Problematic Annual Subscription...');
console.log('📡 Site URL:', NETLIFY_SITE_URL);
console.log('👤 User ID: b132205b-2bc7-4ea9-8788-5ce047a57639');
console.log('');

// Helper function for making HTTP requests
function makeRequest(path, method = 'GET', payload = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: new URL(NETLIFY_SITE_URL).hostname,
      path: `/.netlify/functions/revenuecat-webhook${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body: data }); // Return raw data if not JSON
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (payload) {
      req.write(JSON.stringify(payload));
    }
    req.end();
  });
}

// Test 1: Health Check
async function testHealthCheck() {
  console.log('1️⃣ Testing Health Check...');
  try {
    const response = await makeRequest('/health');
    if (response.statusCode === 200 && response.body.status === 'healthy') {
      console.log('✅ Health check passed');
    } else {
      console.log('❌ Health check failed');
    }
    console.log('📊 Response:', response.body);
  } catch (error) {
    console.log('❌ Health check error:', error.message);
  }
  console.log('');
}

// Test 2: Problematic Annual Subscription (36 minutes apart - like the screenshot)
async function testProblematicAnnualSubscription() {
  console.log('2️⃣ Testing Problematic Annual Subscription (36 minutes apart)...');

  // Simulate the exact scenario from the screenshot
  const problematicWebhookPayload = {
    api_version: '1.0',
    event: {
      type: 'INITIAL_PURCHASE',
      app_user_id: 'b132205b-2bc7-4ea9-8788-5ce047a57639', // The actual user ID from the screenshot
      product_id: 'premium_yearly', // Annual plan
      period_type: 'NORMAL',
      purchased_at_ms: '1729982015000', // Oct 26, 2025 00:13:35 UTC
      expiration_at_ms: '1729982255000', // Oct 26, 2025 00:49:35 UTC (36 minutes later!)
      store: 'APP_STORE',
      is_trial_period: false,
      auto_renew_status: true,
      original_transaction_id: '1000000123456789',
      transaction_id: '1000000123456789',
      environment: 'PRODUCTION',
    },
  };

  try {
    console.log('📤 Sending webhook with problematic dates...');
    console.log(
      '📅 Purchase date:',
      new Date(parseInt(problematicWebhookPayload.event.purchased_at_ms)).toISOString(),
    );
    console.log(
      '📅 Expiration date:',
      new Date(parseInt(problematicWebhookPayload.event.expiration_at_ms)).toISOString(),
    );

    const response = await makeRequest('', 'POST', problematicWebhookPayload);

    if (response.statusCode === 200) {
      console.log('✅ Webhook processed successfully');

      if (response.body.corrected_dates) {
        console.log('🔧 Dates were corrected by the webhook');
      } else {
        console.log('⚠️ Dates were NOT corrected - check webhook logic');
      }
    } else {
      console.log('❌ Webhook failed');
    }

    console.log('📊 Status:', response.statusCode);
    console.log('📊 Response:', JSON.stringify(response.body, null, 2));
  } catch (error) {
    console.log('❌ Test error:', error.message);
  }
  console.log('');
}

// Test 3: Normal Annual Subscription (for comparison)
async function testNormalAnnualSubscription() {
  console.log('3️⃣ Testing Normal Annual Subscription (365 days)...');

  const normalWebhookPayload = {
    api_version: '1.0',
    event: {
      type: 'INITIAL_PURCHASE',
      app_user_id: 'b132205b-2bc7-4ea9-8788-5ce047a57639', // Same user
      product_id: 'premium_yearly', // Annual plan
      period_type: 'NORMAL',
      purchased_at_ms: '1729982015000', // Oct 26, 2025 00:13:35 UTC
      expiration_at_ms: '1861518015000', // Oct 26, 2026 00:13:35 UTC (1 year later)
      store: 'APP_STORE',
      is_trial_period: false,
      auto_renew_status: true,
      original_transaction_id: '1000000123456790',
      transaction_id: '1000000123456790',
      environment: 'PRODUCTION',
    },
  };

  try {
    console.log('📤 Sending webhook with normal dates...');
    console.log(
      '📅 Purchase date:',
      new Date(parseInt(normalWebhookPayload.event.purchased_at_ms)).toISOString(),
    );
    console.log(
      '📅 Expiration date:',
      new Date(parseInt(normalWebhookPayload.event.expiration_at_ms)).toISOString(),
    );

    const response = await makeRequest('', 'POST', normalWebhookPayload);

    if (response.statusCode === 200) {
      console.log('✅ Webhook processed successfully');

      if (response.body.corrected_dates) {
        console.log('⚠️ Normal dates were corrected (unexpected)');
      } else {
        console.log('✅ Normal dates were not corrected (expected)');
      }
    } else {
      console.log('❌ Webhook failed');
    }

    console.log('📊 Status:', response.statusCode);
    console.log('📊 Response:', JSON.stringify(response.body, null, 2));
  } catch (error) {
    console.log('❌ Test error:', error.message);
  }
  console.log('');
}

async function runAllTests() {
  console.log('🚀 Starting Webhook Tests for Annual Subscription Issue...');
  await testHealthCheck();
  await testProblematicAnnualSubscription();
  await testNormalAnnualSubscription();
  console.log('🏁 All tests completed!');

  console.log('\n📋 Summary:');
  console.log('- Health check: Tests if webhook is accessible');
  console.log('- Problematic annual: Tests date correction for 36-minute subscription');
  console.log('- Normal annual: Tests that correct dates are not modified');

  console.log('\n💡 Expected Results:');
  console.log('1. Health check should pass');
  console.log('2. Problematic annual subscription should have dates corrected to 365 days');
  console.log('3. Normal annual subscription should not be modified');
  console.log('4. RevenueCat user ID should be stored in the database');
}

runAllTests().catch(console.error);

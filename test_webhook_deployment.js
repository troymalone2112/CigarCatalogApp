// Test script to verify your RevenueCat webhook deployment
const https = require('https');

// Replace this with your actual Netlify site URL
const NETLIFY_SITE_URL = 'https://cigarcatalogapp.netlify.app';

console.log('🧪 Testing RevenueCat Webhook Deployment...');
console.log('📡 Site URL:', NETLIFY_SITE_URL);
console.log('');

// Test 1: Health Check
async function testHealthCheck() {
  console.log('1️⃣ Testing Health Check...');
  
  try {
    const response = await makeRequest(`${NETLIFY_SITE_URL}/.netlify/functions/revenuecat-webhook/health`);
    
    if (response.statusCode === 200) {
      console.log('✅ Health check passed');
      console.log('📊 Response:', JSON.parse(response.body));
    } else {
      console.log('❌ Health check failed');
      console.log('📊 Status:', response.statusCode);
      console.log('📊 Response:', response.body);
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
  }
  
  console.log('');
}

// Test 2: Test Connection
async function testConnection() {
  console.log('2️⃣ Testing Connection...');
  
  try {
    const response = await makeRequest(`${NETLIFY_SITE_URL}/.netlify/functions/revenuecat-webhook/test`);
    
    if (response.statusCode === 200) {
      console.log('✅ Connection test passed');
      console.log('📊 Response:', JSON.parse(response.body));
    } else {
      console.log('❌ Connection test failed');
      console.log('📊 Status:', response.statusCode);
      console.log('📊 Response:', response.body);
    }
  } catch (error) {
    console.log('❌ Connection test error:', error.message);
  }
  
  console.log('');
}

// Test 3: Mock Webhook Event
async function testMockWebhook() {
  console.log('3️⃣ Testing Mock Webhook Event...');
  
  const mockWebhookPayload = {
    api_version: "1.0",
    event: {
      type: "INITIAL_PURCHASE",
      app_user_id: "12345678-1234-1234-1234-123456789012",
      product_id: "premium_monthly",
      period_type: "NORMAL",
      purchased_at_ms: "1698123456789",
      expiration_at_ms: "1700715456789", // 30 days later
      store: "APP_STORE",
      is_trial_period: false,
      auto_renew_status: true,
      original_transaction_id: "1000000123456789",
      transaction_id: "1000000123456789",
      environment: "SANDBOX"
    }
  };
  
  try {
    const response = await makeRequest(`${NETLIFY_SITE_URL}/.netlify/functions/revenuecat-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mockWebhookPayload)
    });
    
    if (response.statusCode === 200) {
      console.log('✅ Mock webhook test passed');
      console.log('📊 Response:', JSON.parse(response.body));
    } else {
      console.log('❌ Mock webhook test failed');
      console.log('📊 Status:', response.statusCode);
      console.log('📊 Response:', response.body);
    }
  } catch (error) {
    console.log('❌ Mock webhook test error:', error.message);
  }
  
  console.log('');
}

// Test 4: Test with Problematic Dates (3 minutes apart)
async function testProblematicDates() {
  console.log('4️⃣ Testing with Problematic Dates (3 minutes apart)...');
  
  const problematicWebhookPayload = {
    api_version: "1.0",
    event: {
      type: "INITIAL_PURCHASE",
      app_user_id: "87654321-4321-4321-4321-210987654321",
      product_id: "premium_monthly",
      period_type: "NORMAL",
      purchased_at_ms: "1698123456789",
      expiration_at_ms: "1698123636789", // Only 3 minutes later (problematic!)
      store: "APP_STORE",
      is_trial_period: false,
      auto_renew_status: true,
      original_transaction_id: "1000000123456790",
      transaction_id: "1000000123456790",
      environment: "SANDBOX"
    }
  };
  
  try {
    const response = await makeRequest(`${NETLIFY_SITE_URL}/.netlify/functions/revenuecat-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(problematicWebhookPayload)
    });
    
    if (response.statusCode === 200) {
      console.log('✅ Problematic dates test passed');
      console.log('📊 Response:', JSON.parse(response.body));
      
      // Check if the response indicates date correction
      const responseData = JSON.parse(response.body);
      if (responseData.corrected_dates) {
        console.log('🔧 Date correction was applied!');
      }
    } else {
      console.log('❌ Problematic dates test failed');
      console.log('📊 Status:', response.statusCode);
      console.log('📊 Response:', response.body);
    }
  } catch (error) {
    console.log('❌ Problematic dates test error:', error.message);
  }
  
  console.log('');
}

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    
    const req = https.request(requestOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: body
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Webhook Deployment Tests...');
  console.log('');
  
  await testHealthCheck();
  await testConnection();
  await testMockWebhook();
  await testProblematicDates();
  
  console.log('🏁 All tests completed!');
  console.log('');
  console.log('📋 Summary:');
  console.log('- Health check: Tests if webhook is accessible');
  console.log('- Connection test: Tests Supabase connection');
  console.log('- Mock webhook: Tests normal webhook processing');
  console.log('- Problematic dates: Tests date correction logic');
  console.log('');
  console.log('💡 If any tests fail, check:');
  console.log('1. Your Netlify site URL is correct');
  console.log('2. Environment variables are set in Netlify');
  console.log('3. The webhook function is deployed correctly');
}

// URL is set, proceed with tests

runAllTests().catch(console.error);

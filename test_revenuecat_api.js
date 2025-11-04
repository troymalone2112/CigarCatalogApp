// Direct RevenueCat API Test
// This tests the RevenueCat API directly without requiring users

const https = require('https');

async function testRevenueCatAPI() {
  console.log('🧪 Testing RevenueCat API directly...');

  const apiKey = 'appl_OdWJAJMHMYrvZGgQDapUsNfpLmf';
  const baseUrl = 'https://api.revenuecat.com/v1';

  console.log(`🔑 Using API key: ${apiKey.substring(0, 10)}...`);

  // Test 1: Check API key validity by making a simple request
  console.log('\n📡 Testing API key validity...');

  const testOptions = {
    hostname: 'api.revenuecat.com',
    port: 443,
    path: '/v1/subscribers/test_user',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Platform': 'ios',
    },
  };

  try {
    const response = await makeRequest(testOptions);
    console.log('✅ API key is valid!');
    console.log('📊 Response:', response);
  } catch (error) {
    if (error.statusCode === 404) {
      console.log('✅ API key is valid (404 expected for test user)');
    } else {
      console.error('❌ API key test failed:', error.message);
      console.error('Status:', error.statusCode);
    }
  }

  // Test 2: Check products configuration
  console.log('\n📦 Testing products configuration...');

  const productsOptions = {
    hostname: 'api.revenuecat.com',
    port: 443,
    path: '/v1/projects/current/products',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  };

  try {
    const productsResponse = await makeRequest(productsOptions);
    console.log('✅ Products retrieved successfully!');
    console.log('📦 Available products:', productsResponse);

    // Check if our expected products exist
    const products = productsResponse.products || [];
    const productIds = products.map((p) => p.identifier);
    console.log('🔍 Product IDs found:', productIds);

    const expectedProducts = ['0004', '0005'];
    const missingProducts = expectedProducts.filter((id) => !productIds.includes(id));

    if (missingProducts.length > 0) {
      console.error('❌ Missing expected products:', missingProducts);
    } else {
      console.log('✅ All expected products found!');
    }
  } catch (error) {
    console.error('❌ Products test failed:', error.message);
  }

  // Test 3: Check offerings configuration
  console.log('\n🎁 Testing offerings configuration...');

  const offeringsOptions = {
    hostname: 'api.revenuecat.com',
    port: 443,
    path: '/v1/projects/current/offerings',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  };

  try {
    const offeringsResponse = await makeRequest(offeringsOptions);
    console.log('✅ Offerings retrieved successfully!');
    console.log('🎁 Available offerings:', offeringsResponse);

    const offerings = offeringsResponse.offerings || [];
    if (offerings.length === 0) {
      console.error('❌ No offerings configured!');
    } else {
      console.log('✅ Offerings are configured!');
    }
  } catch (error) {
    console.error('❌ Offerings test failed:', error.message);
  }

  console.log('\n🎯 Summary:');
  console.log('If all tests passed, RevenueCat API is working correctly.');
  console.log('If tests failed, check:');
  console.log('1. API key is correct');
  console.log('2. Products are configured in RevenueCat dashboard');
  console.log('3. Offerings are set up');
  console.log('4. Network connectivity to RevenueCat servers');
}

function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject({
              statusCode: res.statusCode,
              message: parsed.message || 'Request failed',
              data: parsed,
            });
          }
        } catch (e) {
          reject({
            statusCode: res.statusCode,
            message: 'Invalid JSON response',
            data: data,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject({
        statusCode: 0,
        message: error.message,
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject({
        statusCode: 0,
        message: 'Request timeout',
      });
    });

    req.end();
  });
}

testRevenueCatAPI().catch(console.error);


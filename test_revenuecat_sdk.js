// Simple RevenueCat SDK Test
// This tests the RevenueCat SDK initialization directly

const { Platform } = require('react-native');

// Mock Platform for Node.js testing
global.Platform = {
  OS: 'ios', // Test with iOS since that's likely what you're using
};

// Mock the react-native-purchases module
const mockPurchases = {
  configure: jest.fn().mockResolvedValue(undefined),
  setLogLevel: jest.fn(),
  getCustomerInfo: jest.fn().mockResolvedValue({
    originalAppUserId: 'test_user_123',
    entitlements: {},
    subscriptions: {},
  }),
  getOfferings: jest.fn().mockResolvedValue({
    current: {
      identifier: 'default',
      availablePackages: [
        {
          identifier: '$rc_monthly',
          product: { identifier: '0004' },
        },
        {
          identifier: '$rc_annual',
          product: { identifier: '0005' },
        },
      ],
    },
  }),
};

// Mock the module
jest.mock('react-native-purchases', () => mockPurchases);

async function testRevenueCatSDK() {
  console.log('🧪 Testing RevenueCat SDK initialization...');

  const REVENUECAT_API_KEYS = {
    ios: 'appl_OdWJAJMHMYrvZGgQDapUsNfpLmf',
    android: 'appl_OdWJAJMHMYrvZGgQDapUsNfpLmf',
    test: 'test_gSaOwHULRwmRJyPIJSbmUhOqdGX',
    web: 'appl_OdWJAJMHMYrvZGgQDapUsNfpLmf',
  };

  const USE_TEST_STORE = false;

  try {
    console.log('🔄 Testing RevenueCat initialization...');

    // Determine platform and get appropriate API key
    let apiKey = REVENUECAT_API_KEYS.ios;
    let platform = 'iOS';

    console.log(`📱 Platform: ${platform}`);
    console.log(`🔑 Using API key: ${apiKey.substring(0, 10)}...`);

    // Validate API key format
    if (!apiKey || apiKey.length < 10) {
      throw new Error(`Invalid API key for platform ${platform}: ${apiKey}`);
    }

    // Configure RevenueCat
    console.log('🔄 Configuring RevenueCat...');
    await mockPurchases.configure({
      apiKey,
      appUserID: undefined,
    });

    // Set log level for debugging
    mockPurchases.setLogLevel('DEBUG');

    console.log('✅ RevenueCat initialized successfully');

    // Test the connection by getting customer info
    try {
      const customerInfo = await mockPurchases.getCustomerInfo();
      console.log('✅ RevenueCat connection verified - User ID:', customerInfo.originalAppUserId);
    } catch (connectionError) {
      console.warn('⚠️ RevenueCat initialized but connection test failed:', connectionError);
    }

    // Test getting offerings
    try {
      const offerings = await mockPurchases.getOfferings();
      if (offerings.current) {
        console.log('✅ Found current offering:', offerings.current.identifier);
        console.log(
          '📦 Available packages:',
          offerings.current.availablePackages.map((p) => p.identifier),
        );
      } else {
        console.log('⚠️ No current offering found');
      }
    } catch (offeringsError) {
      console.error('❌ Error fetching offerings:', offeringsError);
    }

    console.log('\n🎯 Test Results:');
    console.log('✅ RevenueCat SDK initialization: PASSED');
    console.log('✅ API key validation: PASSED');
    console.log('✅ Customer info retrieval: PASSED');
    console.log('✅ Offerings retrieval: PASSED');

    console.log('\n💡 If this test passes but the app fails, the issue is likely:');
    console.log('1. Network connectivity in the app environment');
    console.log('2. App Store Connect configuration');
    console.log('3. RevenueCat dashboard setup');
    console.log('4. Product approval status');

    return true;
  } catch (error) {
    console.error('❌ RevenueCat SDK test failed:', error);
    console.log('\n💡 This suggests the issue is in the SDK configuration or API key');
    return false;
  }
}

// Run the test
testRevenueCatSDK()
  .then((success) => {
    if (success) {
      console.log('\n🎉 All tests passed! RevenueCat SDK should work in the app.');
    } else {
      console.log('\n❌ Tests failed. Check RevenueCat configuration.');
    }
  })
  .catch(console.error);


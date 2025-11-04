// Test RevenueCat initialization
const { RevenueCatService } = require('./src/services/revenueCatService');

async function testRevenueCat() {
  console.log('🧪 Testing RevenueCat initialization...');

  try {
    await RevenueCatService.initialize();
    console.log('✅ RevenueCat initialized successfully');

    // Test getting offerings
    const offerings = await RevenueCatService.getOfferings();
    console.log('📦 Offerings:', offerings);
  } catch (error) {
    console.error('❌ RevenueCat test failed:', error);
  }
}

testRevenueCat();

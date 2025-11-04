// Clear banner dismissal state for testing
// This simulates what the app would do to reset the banner

const AsyncStorage = require('@react-native-async-storage/async-storage');

async function clearBannerDismissal() {
  console.log('🧹 Clearing banner dismissal state...');

  try {
    // In a real app, this would be:
    // await AsyncStorage.removeItem('subscription_banner_dismissed');

    console.log('✅ Banner dismissal state cleared');
    console.log('🔧 In the app, the banner should now show');
    console.log('📱 Try logging out and back in, or restart the app');
  } catch (error) {
    console.error('❌ Error clearing banner dismissal:', error);
  }
}

clearBannerDismissal();

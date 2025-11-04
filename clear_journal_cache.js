/**
 * Clear Journal Cache Script
 * Run this to clear corrupted cache data and force fresh reload
 */

const AsyncStorage = require('@react-native-async-storage/async-storage').default;

async function clearJournalCache() {
  console.log('🧹 Clearing journal cache...');

  try {
    // Clear all cache-related keys
    await Promise.all([
      AsyncStorage.removeItem('journal_entries_cache'),
      AsyncStorage.removeItem('journal_cache_metadata'),
    ]);

    console.log('✅ Journal cache cleared successfully');
    console.log('📱 Restart the app to reload data from database');
  } catch (error) {
    console.error('❌ Error clearing journal cache:', error);
  }
}

// Run the script
clearJournalCache();


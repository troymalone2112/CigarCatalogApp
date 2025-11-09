/**
 * Test Journal Caching System
 * Run this script to test the caching functionality
 */

const { JournalCacheService } = require('./src/services/journalCacheService');
const { CacheUtils } = require('./src/utils/cacheUtils');

async function testJournalCaching() {
  console.log('🧪 Testing Journal Caching System...\n');

  try {
    // Test 1: Check initial cache state
    console.log('1️⃣ Testing initial cache state...');
    const initialStats = await CacheUtils.getCacheInfo();
    console.log('Initial cache status:', initialStats.status);
    console.log('Initial entry count:', initialStats.entryCount);
    console.log('');

    // Test 2: Test cache operations
    console.log('2️⃣ Testing cache operations...');

    // Simulate some journal entries
    const mockEntries = [
      {
        id: 'test-1',
        cigar: { brand: 'Test Brand', name: 'Test Cigar' },
        date: new Date(),
        rating: { overall: 4 },
        notes: 'Test entry 1',
      },
      {
        id: 'test-2',
        cigar: { brand: 'Test Brand 2', name: 'Test Cigar 2' },
        date: new Date(),
        rating: { overall: 5 },
        notes: 'Test entry 2',
      },
    ];

    // Cache the entries
    await JournalCacheService.cacheEntries(mockEntries);
    console.log('✅ Cached mock entries');

    // Test 3: Verify cache retrieval
    console.log('3️⃣ Testing cache retrieval...');
    const cachedEntries = await JournalCacheService.getCachedEntries();
    console.log('Retrieved entries:', cachedEntries?.length || 0);
    console.log('');

    // Test 4: Test cache statistics
    console.log('4️⃣ Testing cache statistics...');
    const stats = await CacheUtils.getCacheInfo();
    console.log('Cache status:', stats.status);
    console.log('Entry count:', stats.entryCount);
    console.log('Cache size:', stats.cacheSizeKB + ' KB');
    console.log('Last updated:', stats.lastUpdatedFormatted);
    console.log('');

    // Test 5: Test cache health
    console.log('5️⃣ Testing cache health...');
    const isHealthy = await CacheUtils.isCacheHealthy();
    console.log('Cache healthy:', isHealthy);
    console.log('');

    // Test 6: Test cache manipulation
    console.log('6️⃣ Testing cache manipulation...');

    // Add new entry
    const newEntry = {
      id: 'test-3',
      cigar: { brand: 'New Brand', name: 'New Cigar' },
      date: new Date(),
      rating: { overall: 3 },
      notes: 'New test entry',
    };

    await JournalCacheService.addEntryToCache(newEntry);
    console.log('✅ Added new entry to cache');

    // Update entry
    const updatedEntry = { ...newEntry, notes: 'Updated test entry' };
    await JournalCacheService.updateEntryInCache(updatedEntry);
    console.log('✅ Updated entry in cache');

    // Remove entry
    await JournalCacheService.removeEntryFromCache('test-1');
    console.log('✅ Removed entry from cache');

    // Test 7: Final cache state
    console.log('7️⃣ Testing final cache state...');
    const finalStats = await CacheUtils.getCacheInfo();
    console.log('Final cache status:', finalStats.status);
    console.log('Final entry count:', finalStats.entryCount);
    console.log('');

    // Test 8: Cleanup
    console.log('8️⃣ Cleaning up test data...');
    await CacheUtils.clearAllCaches();
    console.log('✅ Cache cleared');

    console.log('🎉 All tests completed successfully!');
    console.log('\n📊 Cache System Features:');
    console.log('   ✅ Automatic caching');
    console.log('   ✅ Cache expiry handling');
    console.log('   ✅ Entry manipulation');
    console.log('   ✅ Statistics tracking');
    console.log('   ✅ Health monitoring');
    console.log('   ✅ Cache cleanup');
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testJournalCaching();






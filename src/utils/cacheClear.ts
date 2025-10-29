/**
 * Cache Clear Utility
 * Provides a way to clear cache from within the app
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export class CacheClear {
  /**
   * Clear all journal cache
   */
  static async clearJournalCache(): Promise<void> {
    try {
      console.log('🧹 Clearing journal cache...');
      
      await Promise.all([
        AsyncStorage.removeItem('journal_entries_cache'),
        AsyncStorage.removeItem('journal_cache_metadata')
      ]);
      
      console.log('✅ Journal cache cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing journal cache:', error);
      throw error;
    }
  }

  /**
   * Clear all app cache
   */
  static async clearAllCache(): Promise<void> {
    try {
      console.log('🧹 Clearing all app cache...');
      
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.includes('cache') || 
        key.includes('journal') || 
        key.includes('inventory') ||
        key.includes('humidor')
      );
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`✅ Cleared ${cacheKeys.length} cache keys`);
      } else {
        console.log('📦 No cache keys found');
      }
    } catch (error) {
      console.error('❌ Error clearing all cache:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    totalKeys: number;
    cacheKeys: string[];
    totalSize: number;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.includes('cache') || 
        key.includes('journal') || 
        key.includes('inventory') ||
        key.includes('humidor')
      );
      
      let totalSize = 0;
      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }
      
      return {
        totalKeys: keys.length,
        cacheKeys,
        totalSize
      };
    } catch (error) {
      console.error('❌ Error getting cache stats:', error);
      return {
        totalKeys: 0,
        cacheKeys: [],
        totalSize: 0
      };
    }
  }
}




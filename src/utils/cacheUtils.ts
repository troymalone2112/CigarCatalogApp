/**
 * Cache Utilities
 * Provides debugging and monitoring tools for the journal cache
 */

import { JournalCacheService } from '../services/journalCacheService';

export class CacheUtils {
  /**
   * Get comprehensive cache statistics
   */
  static async getCacheInfo() {
    try {
      const stats = await JournalCacheService.getCacheStats();
      const cacheSize = await this.getCacheSize();

      return {
        ...stats,
        cacheSizeKB: cacheSize,
        lastUpdatedFormatted: stats.lastUpdated
          ? new Date(stats.lastUpdated).toLocaleString()
          : 'Never',
        status: stats.hasCache ? (stats.isExpired ? 'Expired' : 'Valid') : 'No Cache',
      };
    } catch (error) {
      console.error('Error getting cache info:', error);
      return {
        hasCache: false,
        entryCount: 0,
        lastUpdated: null,
        isExpired: true,
        cacheSizeKB: 0,
        lastUpdatedFormatted: 'Error',
        status: 'Error',
      };
    }
  }

  /**
   * Get cache size in KB
   */
  private static async getCacheSize(): Promise<number> {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const cacheData = await AsyncStorage.default.getItem('journal_entries_cache');
      if (cacheData) {
        return Math.round(new Blob([cacheData]).size / 1024);
      }
      return 0;
    } catch (error) {
      console.error('Error calculating cache size:', error);
      return 0;
    }
  }

  /**
   * Clear all caches (useful for debugging)
   */
  static async clearAllCaches() {
    try {
      await JournalCacheService.clearCache();
      console.log('🧹 All caches cleared');
    } catch (error) {
      console.error('Error clearing caches:', error);
    }
  }

  /**
   * Force refresh cache from database
   */
  static async refreshCache() {
    try {
      const entries = await JournalCacheService.refreshCache();
      console.log(`🔄 Cache refreshed with ${entries.length} entries`);
      return entries;
    } catch (error) {
      console.error('Error refreshing cache:', error);
      throw error;
    }
  }

  /**
   * Log cache statistics to console
   */
  static async logCacheStats() {
    try {
      const info = await this.getCacheInfo();
      console.log('📊 Journal Cache Statistics:');
      console.log(`   Status: ${info.status}`);
      console.log(`   Entries: ${info.entryCount}`);
      console.log(`   Size: ${info.cacheSizeKB} KB`);
      console.log(`   Last Updated: ${info.lastUpdatedFormatted}`);
    } catch (error) {
      console.error('Error logging cache stats:', error);
    }
  }

  /**
   * Check if cache is healthy
   */
  static async isCacheHealthy(): Promise<boolean> {
    try {
      const stats = await JournalCacheService.getCacheStats();
      return stats.hasCache && !stats.isExpired && stats.entryCount > 0;
    } catch (error) {
      console.error('Error checking cache health:', error);
      return false;
    }
  }
}


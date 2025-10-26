/**
 * Journal Cache Service
 * Provides intelligent caching for journal entries to reduce database calls
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { JournalEntry } from '../types';

export interface CacheMetadata {
  lastUpdated: number;
  version: string;
  entryCount: number;
}

export class JournalCacheService {
  private static readonly CACHE_KEY = 'journal_entries_cache';
  private static readonly METADATA_KEY = 'journal_cache_metadata';
  private static readonly CACHE_VERSION = '1.0.0';
  private static readonly CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

  /**
   * Get cached journal entries if available and not expired
   */
  static async getCachedEntries(): Promise<JournalEntry[] | null> {
    try {
      const metadata = await this.getCacheMetadata();
      
      // Check if cache exists and is not expired
      if (!metadata || this.isCacheExpired(metadata.lastUpdated)) {
        console.log('📦 Journal cache expired or missing');
        return null;
      }

      const cachedEntries = await AsyncStorage.getItem(this.CACHE_KEY);
      if (cachedEntries) {
        const entries = JSON.parse(cachedEntries);
        console.log(`📦 Loaded ${entries.length} journal entries from cache`);
        return entries;
      }
    } catch (error) {
      console.error('❌ Error loading journal cache:', error);
    }
    
    return null;
  }

  /**
   * Cache journal entries with metadata
   */
  static async cacheEntries(entries: JournalEntry[]): Promise<void> {
    try {
      // Validate entries before caching
      const validEntries = entries.filter(entry => {
        if (!entry.id) {
          console.warn('⚠️ Skipping entry with missing ID');
          return false;
        }
        if (!entry.date || !(entry.date instanceof Date) || isNaN(entry.date.getTime())) {
          console.warn('⚠️ Skipping entry with invalid date:', entry.id);
          return false;
        }
        return true;
      });

      const metadata: CacheMetadata = {
        lastUpdated: Date.now(),
        version: this.CACHE_VERSION,
        entryCount: validEntries.length
      };

      await Promise.all([
        AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(validEntries)),
        AsyncStorage.setItem(this.METADATA_KEY, JSON.stringify(metadata))
      ]);

      console.log(`📦 Cached ${validEntries.length} journal entries (${entries.length - validEntries.length} invalid entries skipped)`);
    } catch (error) {
      console.error('❌ Error caching journal entries:', error);
    }
  }

  /**
   * Add a new entry to cache
   */
  static async addEntryToCache(entry: JournalEntry): Promise<void> {
    try {
      const cachedEntries = await this.getCachedEntries();
      if (cachedEntries) {
        const updatedEntries = [entry, ...cachedEntries].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        await this.cacheEntries(updatedEntries);
        console.log('📦 Added new entry to cache');
      }
    } catch (error) {
      console.error('❌ Error adding entry to cache:', error);
    }
  }

  /**
   * Update an entry in cache
   */
  static async updateEntryInCache(updatedEntry: JournalEntry): Promise<void> {
    try {
      const cachedEntries = await this.getCachedEntries();
      if (cachedEntries) {
        const updatedEntries = cachedEntries.map(entry => 
          entry.id === updatedEntry.id ? updatedEntry : entry
        );
        await this.cacheEntries(updatedEntries);
        console.log('📦 Updated entry in cache');
      }
    } catch (error) {
      console.error('❌ Error updating entry in cache:', error);
    }
  }

  /**
   * Remove an entry from cache
   */
  static async removeEntryFromCache(entryId: string): Promise<void> {
    try {
      const cachedEntries = await this.getCachedEntries();
      if (cachedEntries) {
        const updatedEntries = cachedEntries.filter(entry => entry.id !== entryId);
        await this.cacheEntries(updatedEntries);
        console.log('📦 Removed entry from cache');
      }
    } catch (error) {
      console.error('❌ Error removing entry from cache:', error);
    }
  }

  /**
   * Clear the entire cache
   */
  static async clearCache(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(this.CACHE_KEY),
        AsyncStorage.removeItem(this.METADATA_KEY)
      ]);
      console.log('📦 Journal cache cleared');
    } catch (error) {
      console.error('❌ Error clearing journal cache:', error);
    }
  }

  /**
   * Force refresh cache from database
   */
  static async refreshCache(): Promise<JournalEntry[]> {
    try {
      console.log('🔄 Refreshing journal cache from database');
      const { StorageService } = await import('../storage/storageService');
      const entries = await StorageService.getJournalEntries();
      await this.cacheEntries(entries);
      return entries;
    } catch (error) {
      console.error('❌ Error refreshing journal cache:', error);
      throw error;
    }
  }

  /**
   * Get cache metadata
   */
  private static async getCacheMetadata(): Promise<CacheMetadata | null> {
    try {
      const metadataStr = await AsyncStorage.getItem(this.METADATA_KEY);
      return metadataStr ? JSON.parse(metadataStr) : null;
    } catch (error) {
      console.error('❌ Error getting cache metadata:', error);
      return null;
    }
  }

  /**
   * Check if cache is expired
   */
  private static isCacheExpired(lastUpdated: number): boolean {
    return Date.now() - lastUpdated > this.CACHE_EXPIRY_MS;
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    hasCache: boolean;
    entryCount: number;
    lastUpdated: number | null;
    isExpired: boolean;
  }> {
    try {
      const metadata = await this.getCacheMetadata();
      return {
        hasCache: !!metadata,
        entryCount: metadata?.entryCount || 0,
        lastUpdated: metadata?.lastUpdated || null,
        isExpired: metadata ? this.isCacheExpired(metadata.lastUpdated) : true
      };
    } catch (error) {
      console.error('❌ Error getting cache stats:', error);
      return {
        hasCache: false,
        entryCount: 0,
        lastUpdated: null,
        isExpired: true
      };
    }
  }
}

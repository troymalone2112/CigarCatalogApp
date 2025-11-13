/**
 * Dashboard Cache Service
 *
 * This service caches dashboard data (inventory count, journal count, latest entries)
 * to provide instant loading when users return to the app.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { JournalEntry, InventoryItem } from '../types';

interface CachedDashboardData {
  inventoryCount: number;
  journalCount: number;
  latestJournalEntries: JournalEntry[];
  lastUpdated: number;
  userId: string;
}

const CACHE_KEY = 'dashboard_data_cache';
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

export class DashboardCacheService {
  /**
   * Get cached dashboard data if available and not expired
   */
  static async getCachedDashboardData(userId: string): Promise<CachedDashboardData | null> {
    try {
      const cachedData = await AsyncStorage.getItem(`${CACHE_KEY}_${userId}`);
      if (cachedData) {
        const parsedCache: CachedDashboardData = JSON.parse(cachedData);
        const now = Date.now();
        const isExpired = now - parsedCache.lastUpdated > CACHE_DURATION;

        if (!isExpired && parsedCache.userId === userId) {
          console.log('✅ Using cached dashboard data');
          return parsedCache;
        } else {
          // Cache expired, remove from storage
          await AsyncStorage.removeItem(`${CACHE_KEY}_${userId}`);
        }
      }
    } catch (error) {
      console.error('❌ Error loading dashboard cache:', error);
    }

    return null;
  }

  /**
   * Cache dashboard data
   */
  static async cacheDashboardData(
    userId: string,
    inventoryCount: number,
    journalCount: number,
    latestJournalEntries: JournalEntry[],
  ): Promise<void> {
    try {
      const cacheData: CachedDashboardData = {
        inventoryCount,
        journalCount,
        latestJournalEntries,
        lastUpdated: Date.now(),
        userId,
      };

      await AsyncStorage.setItem(`${CACHE_KEY}_${userId}`, JSON.stringify(cacheData));
      console.log('💾 Dashboard data cached successfully');
    } catch (error) {
      console.error('❌ Error caching dashboard data:', error);
    }
  }

  /**
   * Clear dashboard cache
   */
  static async clearDashboardCache(userId?: string): Promise<void> {
    try {
      if (userId) {
        await AsyncStorage.removeItem(`${CACHE_KEY}_${userId}`);
        console.log('🗑️ Dashboard cache cleared for user:', userId);
      } else {
        // Clear all dashboard caches
        const keys = await AsyncStorage.getAllKeys();
        const dashboardKeys = keys.filter((key) => key.startsWith(CACHE_KEY));
        await AsyncStorage.multiRemove(dashboardKeys);
        console.log('🗑️ All dashboard caches cleared');
      }
    } catch (error) {
      console.error('❌ Error clearing dashboard cache:', error);
    }
  }

  /**
   * Update journal count in cache
   */
  static async updateJournalCount(userId: string, newCount: number): Promise<void> {
    try {
      const cachedData = await this.getCachedDashboardData(userId);
      if (cachedData) {
        cachedData.journalCount = newCount;
        cachedData.lastUpdated = Date.now();
        await AsyncStorage.setItem(`${CACHE_KEY}_${userId}`, JSON.stringify(cachedData));
        console.log('📊 Updated journal count in cache');
      }
    } catch (error) {
      console.error('❌ Error updating journal count in cache:', error);
    }
  }

  /**
   * Update inventory count in cache
   */
  static async updateInventoryCount(userId: string, newCount: number): Promise<void> {
    try {
      const cachedData = await this.getCachedDashboardData(userId);
      if (cachedData) {
        cachedData.inventoryCount = newCount;
        cachedData.lastUpdated = Date.now();
        await AsyncStorage.setItem(`${CACHE_KEY}_${userId}`, JSON.stringify(cachedData));
        console.log('📊 Updated inventory count in cache');
      }
    } catch (error) {
      console.error('❌ Error updating inventory count in cache:', error);
    }
  }

  /**
   * Add new journal entry to cache
   */
  static async addJournalEntryToCache(userId: string, newEntry: JournalEntry): Promise<void> {
    try {
      const cachedData = await this.getCachedDashboardData(userId);
      if (cachedData) {
        // Add new entry to the beginning of the array
        cachedData.latestJournalEntries = [newEntry, ...cachedData.latestJournalEntries].slice(
          0,
          3,
        );
        cachedData.journalCount += 1;
        cachedData.lastUpdated = Date.now();
        await AsyncStorage.setItem(`${CACHE_KEY}_${userId}`, JSON.stringify(cachedData));
        console.log('📊 Added new journal entry to dashboard cache');
      }
    } catch (error) {
      console.error('❌ Error adding journal entry to cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(userId: string): Promise<{
    hasCache: boolean;
    lastUpdated: number | null;
    isExpired: boolean;
    dataAge: number | null;
  }> {
    try {
      const cachedData = await this.getCachedDashboardData(userId);
      if (cachedData) {
        const now = Date.now();
        return {
          hasCache: true,
          lastUpdated: cachedData.lastUpdated,
          isExpired: now - cachedData.lastUpdated > CACHE_DURATION,
          dataAge: now - cachedData.lastUpdated,
        };
      }
    } catch (error) {
      console.error('❌ Error getting dashboard cache stats:', error);
    }

    return {
      hasCache: false,
      lastUpdated: null,
      isExpired: true,
      dataAge: null,
    };
  }
}











import AsyncStorage from '@react-native-async-storage/async-storage';
import { HumidorStats, UserHumidorAggregate } from '../types';

/**
 * Humidor Cache Service
 * 
 * This service caches humidor data to prevent repeated database calls
 * and improve performance in the humidor flow.
 */

interface CachedHumidorData {
  humidors: any[];
  humidorStats: HumidorStats[];
  aggregate: UserHumidorAggregate;
  lastUpdated: number;
  userId: string;
}

// Cache storage
let humidorCache: CachedHumidorData | null = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const CACHE_KEY = 'humidor_data_cache';

/**
 * Get cached humidor data if available and not expired
 */
export const getCachedHumidorData = async (userId: string): Promise<CachedHumidorData | null> => {
  try {
    // First check in-memory cache
    if (humidorCache && humidorCache.userId === userId) {
      const now = Date.now();
      const isExpired = (now - humidorCache.lastUpdated) > CACHE_DURATION;
      
      if (!isExpired) {
        console.log('✅ Using in-memory humidor cache');
        return humidorCache;
      }
    }

    // Try to load from persistent storage
    const cachedData = await AsyncStorage.getItem(`${CACHE_KEY}_${userId}`);
    if (cachedData) {
      const parsedCache: CachedHumidorData = JSON.parse(cachedData);
      const now = Date.now();
      const isExpired = (now - parsedCache.lastUpdated) > CACHE_DURATION;
      
      if (!isExpired && parsedCache.userId === userId) {
        // Load into memory cache
        humidorCache = parsedCache;
        console.log('✅ Using persistent humidor cache');
        return parsedCache;
      } else {
        // Cache expired, remove from storage
        await AsyncStorage.removeItem(`${CACHE_KEY}_${userId}`);
      }
    }
  } catch (error) {
    console.error('❌ Error loading humidor cache:', error);
  }

  return null;
};

/**
 * Cache humidor data
 */
export const setCachedHumidorData = async (
  userId: string,
  humidors: any[],
  humidorStats: HumidorStats[],
  aggregate: UserHumidorAggregate
): Promise<void> => {
  const cacheData: CachedHumidorData = {
    humidors,
    humidorStats,
    aggregate,
    lastUpdated: Date.now(),
    userId
  };

  // Store in memory
  humidorCache = cacheData;

  // Store in persistent storage
  try {
    await AsyncStorage.setItem(`${CACHE_KEY}_${userId}`, JSON.stringify(cacheData));
    console.log('💾 Humidor data cached successfully (memory + persistent)');
  } catch (error) {
    console.error('❌ Error caching humidor data:', error);
    console.log('💾 Humidor data cached in memory only');
  }
};

/**
 * Clear humidor cache
 */
export const clearHumidorCache = async (userId?: string): Promise<void> => {
  humidorCache = null;
  
  if (userId) {
    try {
      await AsyncStorage.removeItem(`${CACHE_KEY}_${userId}`);
      console.log('🗑️ Humidor cache cleared (memory + persistent)');
    } catch (error) {
      console.error('❌ Error clearing persistent humidor cache:', error);
    }
  } else {
    console.log('🗑️ Humidor cache cleared (memory only)');
  }
};

/**
 * Invalidate cache for a specific user
 */
export const invalidateHumidorCache = (userId: string): void => {
  if (humidorCache && humidorCache.userId === userId) {
    humidorCache = null;
    console.log('🗑️ Humidor cache invalidated for user:', userId);
  }
};

/**
 * Check if humidor data is cached
 */
export const isHumidorDataCached = (userId: string): boolean => {
  return humidorCache !== null && 
         humidorCache.userId === userId && 
         (Date.now() - humidorCache.lastUpdated) <= CACHE_DURATION;
};

import AsyncStorage from '@react-native-async-storage/async-storage';
import { InventoryItem } from '../types';

interface CachedInventoryData {
  items: InventoryItem[];
  lastUpdated: number;
  userId: string;
  humidorId?: string;
}

const CACHE_KEY = 'inventory_cache';
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

export class InventoryCacheService {
  static async getCachedInventory(
    userId: string,
    humidorId?: string,
  ): Promise<CachedInventoryData | null> {
    try {
      const key = `${CACHE_KEY}_${userId}_${humidorId || 'all'}`;
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;
      const data: CachedInventoryData = JSON.parse(cached);
      const isExpired = Date.now() - data.lastUpdated > CACHE_DURATION;
      if (isExpired) {
        await AsyncStorage.removeItem(key);
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  }

  static async cacheInventory(
    userId: string,
    items: InventoryItem[],
    humidorId?: string,
  ): Promise<void> {
    try {
      const key = `${CACHE_KEY}_${userId}_${humidorId || 'all'}`;
      const data: CachedInventoryData = {
        items,
        lastUpdated: Date.now(),
        userId,
        humidorId,
      };
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      // Non-critical
    }
  }

  static async clearInventoryCache(userId: string, humidorId?: string): Promise<void> {
    try {
      const key = `${CACHE_KEY}_${userId}_${humidorId || 'all'}`;
      await AsyncStorage.removeItem(key);
    } catch (e) {}
  }
}

/**
 * OptimizedHumidorService - High-Performance Humidor Data Loading
 * 
 * This service provides optimized, cached access to humidor data with:
 * - Aggressive multi-layer caching
 * - Parallel database queries
 * - Progressive loading support
 * - Graceful degradation
 */

import { supabase, executeWithResilience } from './supabaseService';
import { DatabaseService } from './supabaseService';
import { HumidorStats, UserHumidorAggregate } from '../types';
import { getCachedHumidorData, setCachedHumidorData, clearHumidorCache } from './humidorCacheService';

export interface OptimizedHumidorData {
  humidors: any[];
  humidorStats: HumidorStats[];
  aggregate: UserHumidorAggregate;
  loadTime: number;
  source: 'database' | 'cache' | 'partial';
}

export interface HumidorLoadOptions {
  useCache?: boolean;
  forceRefresh?: boolean;
  progressCallback?: (stage: string, progress: number) => void;
}

export class OptimizedHumidorService {
  private static loadingPromises: Map<string, Promise<OptimizedHumidorData>> = new Map();

  /**
   * Get optimized humidor data with aggressive caching and parallel loading
   */
  static async getOptimizedHumidorData(
    userId: string, 
    options: HumidorLoadOptions = {}
  ): Promise<OptimizedHumidorData> {
    const { useCache = true, forceRefresh = false, progressCallback } = options;
    
    // Prevent duplicate requests for the same user
    const cacheKey = `${userId}_${forceRefresh}`;
    if (this.loadingPromises.has(cacheKey)) {
      console.log('🔄 Using existing loading promise for user:', userId);
      return this.loadingPromises.get(cacheKey)!;
    }

    // Create loading promise
    const loadingPromise = this.performOptimizedLoad(userId, { useCache, forceRefresh, progressCallback });
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const result = await loadingPromise;
      return result;
    } finally {
      // Clean up loading promise
      this.loadingPromises.delete(cacheKey);
    }
  }

  /**
   * Perform the actual optimized loading
   */
  private static async performOptimizedLoad(
    userId: string,
    options: HumidorLoadOptions
  ): Promise<OptimizedHumidorData> {
    const { useCache, forceRefresh, progressCallback } = options;
    const startTime = Date.now();

    try {
      progressCallback?.('Checking cache', 10);

      // Step 1: Try cache first (if allowed)
      if (useCache && !forceRefresh) {
        const cachedData = await getCachedHumidorData(userId);
        if (cachedData) {
          console.log('✅ Using cached humidor data');
          progressCallback?.('Loaded from cache', 100);
          return {
            ...cachedData,
            loadTime: Date.now() - startTime,
            source: 'cache'
          };
        }
      }

      progressCallback?.('Loading from database', 30);

      // Step 2: Load fresh data using the existing optimized method
      console.log('🚀 Loading fresh humidor data with optimized method...');
      
      const freshData = await executeWithResilience(
        () => DatabaseService.getHumidorDataOptimized(userId),
        'optimized-humidor-load',
        { timeoutMs: 15000, maxRetries: 2 }
      );

      progressCallback?.('Processing data', 80);

      const optimizedResult: OptimizedHumidorData = {
        humidors: freshData.humidors,
        humidorStats: freshData.humidorStats,
        aggregate: freshData.aggregate,
        loadTime: Date.now() - startTime,
        source: 'database'
      };

      // Step 3: Cache the successful result
      progressCallback?.('Caching results', 90);
      await setCachedHumidorData(
        userId,
        optimizedResult.humidors,
        optimizedResult.humidorStats,
        optimizedResult.aggregate
      );

      progressCallback?.('Complete', 100);
      console.log('✅ Optimized humidor data loaded successfully in', optimizedResult.loadTime, 'ms');
      
      return optimizedResult;

    } catch (error) {
      console.error('❌ Optimized humidor load failed:', error);

      // Step 4: Fallback strategies
      progressCallback?.('Trying fallback', 50);

      // Try cached data as fallback
      if (useCache) {
        const cachedData = await getCachedHumidorData(userId);
        if (cachedData) {
          console.log('⚠️ Using cached data as fallback');
          return {
            ...cachedData,
            loadTime: Date.now() - startTime,
            source: 'cache'
          };
        }
      }

      // Last resort: try basic humidor list only
      try {
        console.log('🆘 Attempting degraded load (basic humidors only)...');
        const basicHumidors = await executeWithResilience(
          () => DatabaseService.getHumidors(userId),
          'basic-humidor-load',
          { timeoutMs: 8000, maxRetries: 1 }
        );

        return {
          humidors: basicHumidors,
          humidorStats: [],
          aggregate: {
            userId,
            totalHumidors: basicHumidors.length,
            totalCigars: 0,
            totalCollectionValue: 0,
            avgCigarValue: 0,
            uniqueBrands: 0,
          },
          loadTime: Date.now() - startTime,
          source: 'partial'
        };

      } catch (fallbackError) {
        console.error('❌ All fallback strategies failed:', fallbackError);
        throw error; // Re-throw original error
      }
    }
  }

  /**
   * Get basic humidor info quickly (for progressive loading)
   */
  static async getBasicHumidors(userId: string): Promise<any[]> {
    try {
      console.log('🚀 Loading basic humidors for progressive display...');
      
      return await executeWithResilience(
        () => DatabaseService.getHumidors(userId),
        'basic-humidors-progressive',
        { timeoutMs: 5000, maxRetries: 2 }
      );

    } catch (error) {
      console.error('❌ Failed to load basic humidors:', error);
      return [];
    }
  }

  /**
   * Load stats for specific humidors (for progressive loading)
   */
  static async getStatsForHumidors(userId: string, humidorIds: string[]): Promise<HumidorStats[]> {
    try {
      console.log('📊 Loading stats for specific humidors:', humidorIds.length);

      // If loading stats for all humidors, use the optimized method
      if (humidorIds.length > 3) {
        const fullData = await this.getOptimizedHumidorData(userId);
        return fullData.humidorStats;
      }

      // For specific humidors, query them individually (still faster than full scan)
      const statsPromises = humidorIds.map(async (humidorId) => {
        const { data, error } = await supabase
          .from('humidor_stats')
          .select('*')
          .eq('humidor_id', humidorId)
          .single();

        if (error) {
          console.warn(`⚠️ Stats failed for humidor ${humidorId}:`, error);
          return null;
        }

        return {
          humidorId: data.humidor_id,
          userId: data.user_id,
          humidorName: data.humidor_name,
          description: data.description,
          capacity: data.capacity,
          cigarCount: data.cigar_count,
          totalValue: data.total_value,
          avgCigarPrice: data.avg_cigar_price,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        };
      });

      const results = await Promise.allSettled(statsPromises);
      return results
        .filter((result) => result.status === 'fulfilled' && result.value !== null)
        .map((result) => (result as PromiseFulfilledResult<HumidorStats>).value);

    } catch (error) {
      console.error('❌ Failed to load humidor stats:', error);
      return [];
    }
  }

  /**
   * Refresh humidor data (clear cache and reload)
   */
  static async refreshHumidorData(userId: string): Promise<OptimizedHumidorData> {
    console.log('🔄 Force refreshing humidor data for user:', userId);
    
    // Clear any existing loading promises
    const existingKeys = Array.from(this.loadingPromises.keys()).filter(key => key.startsWith(userId));
    existingKeys.forEach(key => this.loadingPromises.delete(key));

    return this.getOptimizedHumidorData(userId, { 
      useCache: false, 
      forceRefresh: true 
    });
  }

  /**
   * Preload humidor data in background (for cache warming)
   */
  static async preloadHumidorData(userId: string): Promise<void> {
    try {
      console.log('🔥 Preloading humidor data for user:', userId);
      
      // Load in background, don't await
      this.getOptimizedHumidorData(userId, { useCache: true }).catch(error => {
        console.warn('⚠️ Humidor preload failed (non-critical):', error);
      });

    } catch (error) {
      // Preloading failures are non-critical
      console.warn('⚠️ Humidor preload setup failed:', error);
    }
  }

  /**
   * Get cache status for debugging
   */
  static async getCacheStatus(userId: string): Promise<{
    hasCachedData: boolean;
    cacheAge?: number;
    cacheSize?: number;
  }> {
    try {
      const cachedData = await getCachedHumidorData(userId);
      
      if (cachedData) {
        const cacheAge = Date.now() - cachedData.lastUpdated;
        return {
          hasCachedData: true,
          cacheAge: Math.floor(cacheAge / 1000), // Age in seconds
          cacheSize: JSON.stringify(cachedData).length
        };
      }

      return { hasCachedData: false };

    } catch (error) {
      return { hasCachedData: false };
    }
  }

  /**
   * Clear cache for user
   */
  static async clearCache(userId: string): Promise<void> {
    try {
      // Clear loading promises
      const existingKeys = Array.from(this.loadingPromises.keys()).filter(key => key.startsWith(userId));
      existingKeys.forEach(key => this.loadingPromises.delete(key));

      // Clear persistent cache using existing HumidorCacheService
      await clearHumidorCache(userId);
      
      console.log('🧹 Humidor cache cleared for user:', userId);

    } catch (error) {
      console.error('❌ Failed to clear humidor cache:', error);
    }
  }
}

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CachedProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
  cached_at: string; // When this profile was cached
  cache_version: string; // Version for cache invalidation
}

export interface NetworkError {
  type: 'timeout' | 'network' | 'server' | 'auth' | 'unknown';
  message: string;
  retryable: boolean;
  timestamp: number;
}

const PROFILE_CACHE_KEY = 'cached_user_profile';
const CACHE_VERSION = '1.0.0';
const CACHE_EXPIRY_HOURS = 24; // Cache expires after 24 hours
const MAX_CACHE_AGE_MS = CACHE_EXPIRY_HOURS * 60 * 60 * 1000;

export class ProfileCacheService {
  /**
   * Cache a user profile locally
   */
  static async cacheProfile(profile: Omit<CachedProfile, 'cached_at' | 'cache_version'>): Promise<void> {
    try {
      // Check if profile is valid before caching
      if (!profile || !profile.id) {
        console.log('⚠️ Cannot cache profile - profile is null or missing id');
        return;
      }

      const cachedProfile: CachedProfile = {
        ...profile,
        cached_at: new Date().toISOString(),
        cache_version: CACHE_VERSION,
      };

      await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cachedProfile));
      console.log('✅ Profile cached successfully:', profile.id);
    } catch (error) {
      console.error('❌ Failed to cache profile:', error);
    }
  }

  /**
   * Get cached profile if it exists and is not expired
   */
  static async getCachedProfile(): Promise<CachedProfile | null> {
    try {
      const cachedData = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
      if (!cachedData) {
        console.log('🔍 No cached profile found');
        return null;
      }

      const cachedProfile: CachedProfile = JSON.parse(cachedData);
      
      // Check if cache is expired
      const cacheAge = Date.now() - new Date(cachedProfile.cached_at).getTime();
      if (cacheAge > MAX_CACHE_AGE_MS) {
        console.log('⏰ Cached profile expired, removing');
        await this.clearCachedProfile();
        return null;
      }

      // Check cache version
      if (cachedProfile.cache_version !== CACHE_VERSION) {
        console.log('🔄 Cache version mismatch, clearing cache');
        await this.clearCachedProfile();
        return null;
      }

      console.log('✅ Using cached profile:', cachedProfile.id);
      return cachedProfile;
    } catch (error) {
      console.error('❌ Failed to get cached profile:', error);
      return null;
    }
  }

  /**
   * Clear cached profile
   */
  static async clearCachedProfile(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
      console.log('🧹 Cached profile cleared');
    } catch (error) {
      console.error('❌ Failed to clear cached profile:', error);
    }
  }

  /**
   * Check if cached profile exists and is valid
   */
  static async hasValidCachedProfile(): Promise<boolean> {
    const cached = await this.getCachedProfile();
    return cached !== null;
  }

  /**
   * Get cache age in minutes
   */
  static async getCacheAge(): Promise<number> {
    try {
      const cachedData = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
      if (!cachedData) return -1;

      const cachedProfile: CachedProfile = JSON.parse(cachedData);
      const cacheAge = Date.now() - new Date(cachedProfile.cached_at).getTime();
      return Math.floor(cacheAge / (1000 * 60)); // Return age in minutes
    } catch (error) {
      console.error('❌ Failed to get cache age:', error);
      return -1;
    }
  }

  /**
   * Classify network errors for better handling
   */
  static classifyNetworkError(error: any): NetworkError {
    const errorMessage = error?.message || error?.toString() || '';
    const timestamp = Date.now();

    // Timeout errors
    if (errorMessage.includes('timeout') || errorMessage.includes('Profile load timeout')) {
      return {
        type: 'timeout',
        message: 'Profile request timed out',
        retryable: true,
        timestamp,
      };
    }

    // Network connectivity errors
    if (errorMessage.includes('Network request failed') || 
        errorMessage.includes('fetch') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('offline')) {
      return {
        type: 'network',
        message: 'Network connection failed',
        retryable: true,
        timestamp,
      };
    }

    // Server errors (5xx)
    if (errorMessage.includes('500') || 
        errorMessage.includes('502') || 
        errorMessage.includes('503') || 
        errorMessage.includes('504')) {
      return {
        type: 'server',
        message: 'Server error occurred',
        retryable: true,
        timestamp,
      };
    }

    // Authentication errors
    if (errorMessage.includes('401') || 
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('auth')) {
      return {
        type: 'auth',
        message: 'Authentication failed',
        retryable: false,
        timestamp,
      };
    }

    // Unknown errors
    return {
      type: 'unknown',
      message: errorMessage || 'Unknown error occurred',
      retryable: true,
      timestamp,
    };
  }

  /**
   * Determine if we should use cached profile based on error type
   */
  static shouldUseCachedProfile(error: NetworkError): boolean {
    // Use cached profile for network/timeout errors
    return error.type === 'timeout' || error.type === 'network' || error.type === 'server';
  }

  /**
   * Get retry delay based on error type and attempt count
   */
  static getRetryDelay(error: NetworkError, attemptCount: number): number {
    const baseDelay = 1000; // 1 second base delay
    
    switch (error.type) {
      case 'timeout':
        return baseDelay * Math.pow(2, attemptCount); // Exponential backoff
      case 'network':
        return baseDelay * (attemptCount + 1); // Linear backoff
      case 'server':
        return baseDelay * Math.pow(1.5, attemptCount); // Moderate exponential
      default:
        return baseDelay * Math.pow(2, attemptCount);
    }
  }

  /**
   * Check if error is retryable based on type and attempt count
   */
  static shouldRetry(error: NetworkError, attemptCount: number, maxRetries: number = 3): boolean {
    if (!error.retryable) return false;
    if (attemptCount >= maxRetries) return false;
    
    // Don't retry auth errors
    if (error.type === 'auth') return false;
    
    return true;
  }
}

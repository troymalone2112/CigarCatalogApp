/**
 * ColdStartCache - Manages caching of successful app states
 * Provides fallback data when network operations fail during cold starts
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Session } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface FastSubscriptionStatus {
  hasAccess: boolean;
  isTrialActive: boolean;
  isPremium: boolean;
  status: string;
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
}

export interface CachedAppState {
  user: User;
  profile: Profile;
  subscriptionStatus: FastSubscriptionStatus;
  session: Session;
  timestamp: number;
  version: string; // Cache version for migration compatibility
}

export interface CacheMetadata {
  lastCacheTime: number;
  cacheVersion: string;
  userId: string;
}

export class ColdStartCache {
  private static readonly CACHE_VERSION = '1.0.0';
  private static readonly CACHE_KEYS = {
    APP_STATE: 'cold_start_app_state',
    METADATA: 'cold_start_metadata',
    USER_SESSION: 'cold_start_session',
    USER_PROFILE: 'cold_start_profile',
    SUBSCRIPTION_STATUS: 'cold_start_subscription',
  };

  // Cache validity periods (in milliseconds)
  private static readonly CACHE_VALIDITY = {
    APP_STATE: 24 * 60 * 60 * 1000, // 24 hours for full app state
    SESSION: 7 * 24 * 60 * 60 * 1000, // 7 days for session data
    PROFILE: 24 * 60 * 60 * 1000, // 24 hours for profile
    SUBSCRIPTION: 4 * 60 * 60 * 1000, // 4 hours for subscription status
  };

  /**
   * Cache complete successful app state
   */
  static async cacheSuccessfulState(
    user: User,
    profile: Profile,
    subscriptionStatus: FastSubscriptionStatus,
    session: Session,
  ): Promise<void> {
    try {
      console.log('💾 Caching successful app state for user:', user.id);

      const appState: CachedAppState = {
        user,
        profile,
        subscriptionStatus,
        session,
        timestamp: Date.now(),
        version: this.CACHE_VERSION,
      };

      const metadata: CacheMetadata = {
        lastCacheTime: Date.now(),
        cacheVersion: this.CACHE_VERSION,
        userId: user.id,
      };

      // Save complete app state
      await Promise.all([
        AsyncStorage.setItem(this.CACHE_KEYS.APP_STATE, JSON.stringify(appState)),
        AsyncStorage.setItem(this.CACHE_KEYS.METADATA, JSON.stringify(metadata)),
        // Also cache individual components for partial loading
        this.cacheUserSession(session),
        this.cacheUserProfile(profile),
        this.cacheSubscriptionStatus(subscriptionStatus),
      ]);

      console.log('✅ App state cached successfully');
    } catch (error) {
      console.error('❌ Failed to cache app state:', error);
    }
  }

  /**
   * Load cached app state with validation
   */
  static async loadCachedAppState(): Promise<CachedAppState | null> {
    try {
      console.log('📖 Loading cached app state...');

      const [cachedStateStr, metadataStr] = await Promise.all([
        AsyncStorage.getItem(this.CACHE_KEYS.APP_STATE),
        AsyncStorage.getItem(this.CACHE_KEYS.METADATA),
      ]);

      if (!cachedStateStr || !metadataStr) {
        console.log('ℹ️ No cached app state found');
        return null;
      }

      const cachedState: CachedAppState = JSON.parse(cachedStateStr);
      const metadata: CacheMetadata = JSON.parse(metadataStr);

      // Validate cache version compatibility
      if (metadata.cacheVersion !== this.CACHE_VERSION) {
        console.log('⚠️ Cache version mismatch, clearing old cache');
        await this.clearAllCache();
        return null;
      }

      // Check if cache is still valid
      const cacheAge = Date.now() - cachedState.timestamp;
      if (cacheAge > this.CACHE_VALIDITY.APP_STATE) {
        console.log(
          '⚠️ Cached app state expired, age:',
          Math.floor(cacheAge / (1000 * 60)),
          'minutes',
        );
        return null;
      }

      console.log(
        '✅ Loaded valid cached app state, age:',
        Math.floor(cacheAge / (1000 * 60)),
        'minutes',
      );
      return cachedState;
    } catch (error) {
      console.error('❌ Failed to load cached app state:', error);
      return null;
    }
  }

  /**
   * Cache user session separately
   */
  static async cacheUserSession(session: Session): Promise<void> {
    try {
      const sessionData = {
        session,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(this.CACHE_KEYS.USER_SESSION, JSON.stringify(sessionData));
      console.log('💾 User session cached');
    } catch (error) {
      console.error('❌ Failed to cache user session:', error);
    }
  }

  /**
   * Load cached user session
   */
  static async loadCachedUserSession(): Promise<Session | null> {
    try {
      const cachedSessionStr = await AsyncStorage.getItem(this.CACHE_KEYS.USER_SESSION);
      if (!cachedSessionStr) return null;

      const sessionData = JSON.parse(cachedSessionStr);
      const cacheAge = Date.now() - sessionData.timestamp;

      if (cacheAge > this.CACHE_VALIDITY.SESSION) {
        console.log('⚠️ Cached session expired');
        return null;
      }

      console.log('✅ Loaded cached session');
      return sessionData.session;
    } catch (error) {
      console.error('❌ Failed to load cached session:', error);
      return null;
    }
  }

  /**
   * Cache user profile separately
   */
  static async cacheUserProfile(profile: Profile): Promise<void> {
    try {
      const profileData = {
        profile,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(this.CACHE_KEYS.USER_PROFILE, JSON.stringify(profileData));
      console.log('💾 User profile cached');
    } catch (error) {
      console.error('❌ Failed to cache user profile:', error);
    }
  }

  /**
   * Load cached user profile
   */
  static async loadCachedUserProfile(): Promise<Profile | null> {
    try {
      const cachedProfileStr = await AsyncStorage.getItem(this.CACHE_KEYS.USER_PROFILE);
      if (!cachedProfileStr) return null;

      const profileData = JSON.parse(cachedProfileStr);
      const cacheAge = Date.now() - profileData.timestamp;

      if (cacheAge > this.CACHE_VALIDITY.PROFILE) {
        console.log('⚠️ Cached profile expired');
        return null;
      }

      console.log('✅ Loaded cached profile');
      return profileData.profile;
    } catch (error) {
      console.error('❌ Failed to load cached profile:', error);
      return null;
    }
  }

  /**
   * Cache subscription status separately
   */
  static async cacheSubscriptionStatus(subscriptionStatus: FastSubscriptionStatus): Promise<void> {
    try {
      const subscriptionData = {
        subscriptionStatus,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(
        this.CACHE_KEYS.SUBSCRIPTION_STATUS,
        JSON.stringify(subscriptionData),
      );
      console.log('💾 Subscription status cached');
    } catch (error) {
      console.error('❌ Failed to cache subscription status:', error);
    }
  }

  /**
   * Load cached subscription status
   */
  static async loadCachedSubscriptionStatus(): Promise<FastSubscriptionStatus | null> {
    try {
      const cachedSubscriptionStr = await AsyncStorage.getItem(this.CACHE_KEYS.SUBSCRIPTION_STATUS);
      if (!cachedSubscriptionStr) return null;

      const subscriptionData = JSON.parse(cachedSubscriptionStr);
      const cacheAge = Date.now() - subscriptionData.timestamp;

      if (cacheAge > this.CACHE_VALIDITY.SUBSCRIPTION) {
        console.log('⚠️ Cached subscription status expired');
        return null;
      }

      console.log('✅ Loaded cached subscription status');
      return subscriptionData.subscriptionStatus;
    } catch (error) {
      console.error('❌ Failed to load cached subscription status:', error);
      return null;
    }
  }

  /**
   * Check if we have valid cached data available
   */
  static async hasCachedData(): Promise<boolean> {
    try {
      const metadata = await AsyncStorage.getItem(this.CACHE_KEYS.METADATA);
      if (!metadata) return false;

      const metadataObj: CacheMetadata = JSON.parse(metadata);
      const cacheAge = Date.now() - metadataObj.lastCacheTime;

      return (
        cacheAge < this.CACHE_VALIDITY.APP_STATE && metadataObj.cacheVersion === this.CACHE_VERSION
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Get cache metadata for debugging
   */
  static async getCacheInfo(): Promise<CacheMetadata | null> {
    try {
      const metadataStr = await AsyncStorage.getItem(this.CACHE_KEYS.METADATA);
      if (!metadataStr) return null;

      const metadata: CacheMetadata = JSON.parse(metadataStr);
      return metadata;
    } catch (error) {
      console.error('❌ Failed to get cache info:', error);
      return null;
    }
  }

  /**
   * Clear all cached data
   */
  static async clearAllCache(): Promise<void> {
    try {
      console.log('🧹 Clearing all cold start cache...');

      await Promise.all([
        AsyncStorage.removeItem(this.CACHE_KEYS.APP_STATE),
        AsyncStorage.removeItem(this.CACHE_KEYS.METADATA),
        AsyncStorage.removeItem(this.CACHE_KEYS.USER_SESSION),
        AsyncStorage.removeItem(this.CACHE_KEYS.USER_PROFILE),
        AsyncStorage.removeItem(this.CACHE_KEYS.SUBSCRIPTION_STATUS),
      ]);

      console.log('✅ All cache cleared');
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
    }
  }

  /**
   * Clear cache for specific user (useful on logout)
   */
  static async clearUserCache(userId: string): Promise<void> {
    try {
      console.log('🧹 Clearing cache for user:', userId);

      const metadata = await this.getCacheInfo();
      if (metadata && metadata.userId === userId) {
        await this.clearAllCache();
      }
    } catch (error) {
      console.error('❌ Failed to clear user cache:', error);
    }
  }

  /**
   * Update cache timestamp (useful when data is refreshed successfully)
   */
  static async updateCacheTimestamp(): Promise<void> {
    try {
      const metadataStr = await AsyncStorage.getItem(this.CACHE_KEYS.METADATA);
      if (metadataStr) {
        const metadata: CacheMetadata = JSON.parse(metadataStr);
        metadata.lastCacheTime = Date.now();

        await AsyncStorage.setItem(this.CACHE_KEYS.METADATA, JSON.stringify(metadata));
        console.log('✅ Cache timestamp updated');
      }
    } catch (error) {
      console.error('❌ Failed to update cache timestamp:', error);
    }
  }
}











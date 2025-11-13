import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { User, Session } from '@supabase/supabase-js';
import { supabase, AuthService, checkSupabaseConnection, executeWithResilience } from '../services/supabaseService';
import { Api } from '../services/api';
import { connectionHealthManager } from '../services/connectionHealthManager';
import { connectionManager } from '../services/connectionManager';
import { ColdStartCache } from '../services/coldStartCache';
import { StorageService } from '../storage/storageService';
import { UserManagementService } from '../services/userManagementService';
import { UserRole } from '../types';
import {
  DEVELOPMENT_CONFIG,
  isExpoGo,
  getTimeoutValue,
  getRetryCount,
  getRetryDelay,
  shouldUseGracefulDegradation,
  shouldPreserveExistingData,
} from '../config/development';
import { ProfileCacheService, NetworkError } from '../services/profileCacheService';
import { PerformanceMonitor } from '../utils/performanceMonitor';
import {
  FastSubscriptionService,
  FastSubscriptionStatus,
} from '../services/fastSubscriptionService';
import { DatabaseSubscriptionManager } from '../services/databaseSubscriptionManager';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  userRole: UserRole | null;
  isSuperUser: boolean;
  canAccessAdmin: boolean;
  subscriptionStatus: FastSubscriptionStatus | null;
  subscriptionLoading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: { full_name?: string; avatar_url?: string }) => Promise<void>;
  refreshUserPermissions: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<FastSubscriptionStatus | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);

  const SESSION_TIMEOUT_MS = 8000;
  const MAX_SESSION_RETRIES = 4;
  const BASE_RETRY_DELAY_MS = 2000;
  const MAX_RETRY_DELAY_MS = 20000;

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('📱 App state changed:', appState, '->', nextAppState);

      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('🔄 App came to foreground - refreshing auth state');
        // App came to foreground, refresh auth state
        refreshAuthState();
      }

      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [appState]);

  const refreshAuthState = async () => {
    try {
      console.log('🔄 Refreshing auth state...');
      
      // Track activity and ensure connection is fresh
      connectionManager.trackActivity();
      await connectionManager.ensureFreshConnection();

      // Quick session check with timeout
      const {
        data: { session },
      } = await Promise.race([
        supabase.auth.getSession(),
        new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error('Session check timeout')), 5000),
        ),
      ]);

      if (session?.user) {
        console.log('✅ Session still valid, doing lightweight refresh');
        // Ensure StorageService has current user
        StorageService.setCurrentUser(session.user.id);

        // Only refresh if profile is missing or stale
        if (!profile || profile.id !== session.user.id) {
          console.log('🔄 Profile missing or stale, refreshing...');
          loadProfile(session.user.id).catch((err) =>
            console.error('❌ Profile refresh failed:', err),
          );
        }

        // Load permissions in background (non-blocking)
        loadUserPermissions().catch((err) => console.error('❌ Permissions refresh failed:', err));
      } else {
        console.log('❌ No valid session found');
      }
    } catch (error) {
      console.warn('⚠️ Error refreshing auth state (non-fatal):', error);
    }
  };

  useEffect(() => {
    console.log('🚀 AuthContext: Starting resilient initialization with cache fallback...');

    // Shorter timeout for faster failure detection
    const authTimeout = getTimeoutValue(SESSION_TIMEOUT_MS, 'auth');
    const loadingTimeout = setTimeout(() => {
      console.log('⏰ Auth loading timeout - forcing loading to false');
      setLoading(false);
    }, authTimeout);

    let sessionRetryTimeout: NodeJS.Timeout | null = null;

    const calculateBackoffDelay = (attempt: number) =>
      Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1), MAX_RETRY_DELAY_MS);

    const clearScheduledSessionRetry = () => {
      if (sessionRetryTimeout) {
        clearTimeout(sessionRetryTimeout);
        sessionRetryTimeout = null;
      }
    };

    // Resilient initialization with cache fallback
    const initializeAuth = async () => {
      try {
        PerformanceMonitor.startTimer('auth-initialization');
        console.log('🔄 Starting resilient auth initialization...');

        // Step 1: Check if we have cached data available
        const hasCachedData = await ColdStartCache.hasCachedData();
        console.log('💾 Cached data available:', hasCachedData);

        // Step 2: If we have cached data, load it instantly and refresh in background
        if (hasCachedData) {
          console.log('⚡ Loading from cache instantly for fast startup...');
          await loadFromCache();
          // Ensure connection is fresh (non-blocking)
          connectionManager.ensureFreshConnection().catch(() => {});
          // Refresh in background without blocking
          refreshInBackground();
        } else {
          // Step 3: No cache - do quick health check and load fresh
          console.log('🔄 No cache available, performing quick health check...');
          const healthCheck = await connectionHealthManager.performHealthCheck();
          console.log('🔍 Connection health:', healthCheck);

          if (healthCheck.isOnline && healthCheck.isDatabaseHealthy) {
            console.log('✅ Network is healthy, attempting fresh data load...');
            const success = await loadFreshData();
            if (!success) {
              console.log(
                '❌ Fresh load failed, falling back to degraded mode and scheduling retry',
              );
              await attemptDegradedLoad();
              scheduleSessionRetry();
            }
          } else {
            console.log('❌ Network issues, attempting degraded load...');
            await attemptDegradedLoad();
            scheduleSessionRetry();
          }
        }

        console.log('✅ Resilient auth initialization complete');
        PerformanceMonitor.endTimer('auth-initialization');
        setLoading(false);
        clearTimeout(loadingTimeout);
      } catch (error) {
        console.error('❌ Error during resilient auth initialization:', error);
        PerformanceMonitor.endTimer('auth-initialization');

        // Try cache as last resort
        const cachedState = await ColdStartCache.loadCachedAppState();
        if (cachedState) {
          console.log('🆘 Using cached app state as fallback');
          setUser(cachedState.user);
          setProfile(cachedState.profile);
          setSession(cachedState.session);
          setSubscriptionStatus(cachedState.subscriptionStatus);
          StorageService.setCurrentUser(cachedState.user.id);
        }

        setLoading(false);
        clearTimeout(loadingTimeout);
        scheduleSessionRetry();
      }
    };

    // Helper function to load fresh data from network
    const loadFreshData = async (
      options: { background?: boolean } = {},
    ): Promise<boolean> => {
      const { background = false } = options;
      try {
        const sessionData = await executeWithResilience(
          () => supabase.auth.getSession(),
          'session-check',
          { timeoutMs: SESSION_TIMEOUT_MS, maxRetries: 2, initialDelay: 1000, maxDelay: 4000 },
        );

        const {
          data: { session },
        } = sessionData;
        console.log('🔍 Fresh session loaded:', session?.user?.id || 'no user');

        setSession(session);
        setUser(session?.user ?? null);

        if (!session?.user) {
          return false;
        }

        StorageService.setCurrentUser(session.user.id);

        const subscription = await loadSubscriptionStatus(session.user.id);

        if (background) {
          loadProfile(session.user.id).catch((error) =>
            console.warn('⚠️ Background profile refresh failed:', error),
          );
        } else {
          await loadProfile(session.user.id);
        }

        setTimeout(async () => {
          try {
            const cachedProfile = await ProfileCacheService.getCachedProfile();
            const profileForCache = cachedProfile || profile;
            const subscriptionForCache = subscription || subscriptionStatus;
            if (profileForCache && subscriptionForCache && session?.user) {
              await ColdStartCache.cacheSuccessfulState(
                session.user,
                profileForCache,
                subscriptionForCache,
                session,
              );
              console.log('✅ Complete app state cached successfully (fresh load)');
            }
          } catch (error) {
            console.error('❌ Failed to cache complete app state:', error);
          }
        }, 1000);

        clearScheduledSessionRetry();
        return true;
      } catch (error) {
        console.error('❌ Fresh data load failed:', error);
        return false;
      }
    };

    const scheduleSessionRetry = (attempt: number = 1) => {
      if (sessionRetryTimeout) {
        clearScheduledSessionRetry();
      }
      if (attempt > MAX_SESSION_RETRIES) {
        console.warn('⚠️ Max session retries reached. Giving up until next trigger.');
        return;
      }

      const delay = calculateBackoffDelay(attempt) + Math.floor(Math.random() * 400);
      console.log(
        `⏳ Scheduling session retry in ${delay}ms (attempt ${attempt}/${MAX_SESSION_RETRIES})`,
      );

      sessionRetryTimeout = setTimeout(async () => {
        const success = await loadFreshData({ background: true });
        if (!success) {
          scheduleSessionRetry(attempt + 1);
        }
      }, delay);
    };

    // Helper function to load from cache
    const loadFromCache = async () => {
      try {
        console.log('💾 Loading app state from cache...');
        const cachedState = await ColdStartCache.loadCachedAppState();

        if (cachedState) {
          console.log('✅ Loaded cached app state successfully');
          setUser(cachedState.user);
          setProfile(cachedState.profile);
          setSession(cachedState.session);
          setSubscriptionStatus(cachedState.subscriptionStatus);
          StorageService.setCurrentUser(cachedState.user.id);
        } else {
          console.log('❌ No valid cached state found');
          throw new Error('No cached state available');
        }
      } catch (error) {
        console.error('❌ Cache load failed:', error);
        throw error;
      }
    };

    // Helper function for background refresh (faster than sync)
    const refreshInBackground = async () => {
      try {
        setTimeout(async () => {
          try {
            console.log('🔄 Starting background refresh...');
            await connectionManager.ensureFreshConnection().catch(() => {});
            const success = await loadFreshData({ background: true });
            if (!success) {
              scheduleSessionRetry();
            }
          } catch (error) {
            console.warn('⚠️ Background refresh failed (non-fatal):', error);
            scheduleSessionRetry();
          }
        }, 500);
      } catch (error) {
        console.warn('⚠️ Background refresh setup failed (non-fatal):', error);
      }
    };

    // Helper function for degraded load (last resort)
    const attemptDegradedLoad = async () => {
      try {
        console.log('🆘 Attempting degraded load...');

        // Try to get session from AsyncStorage
        const cachedSession = await ColdStartCache.loadCachedUserSession();
        if (cachedSession) {
          setSession(cachedSession);
          setUser(cachedSession.user);
          StorageService.setCurrentUser(cachedSession.user.id);

          // Try to load other cached components
          const [cachedProfile, cachedSubscription] = await Promise.all([
            ColdStartCache.loadCachedUserProfile(),
            ColdStartCache.loadCachedSubscriptionStatus(),
          ]);

          if (cachedProfile) setProfile(cachedProfile);
          if (cachedSubscription) setSubscriptionStatus(cachedSubscription);

          console.log('✅ Degraded load completed with partial cached data');
        } else {
          console.log('❌ No cached session available, user needs to sign in');
        }
      } catch (error) {
        console.error('❌ Degraded load failed:', error);
        // At this point, we just show the login screen
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔍 Auth state change:', event, session?.user?.id || 'no user');
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        clearScheduledSessionRetry();
        // Set current user in StorageService for user-specific data
        StorageService.setCurrentUser(session.user.id);

        // Sync RevenueCat user ID with Supabase user ID
        try {
          const { PaymentService } = await import('../services/paymentService');
          await PaymentService.setUserId(session.user.id);
          console.log('✅ RevenueCat user ID synchronized:', session.user.id);
        } catch (rcError) {
          console.log('⚠️ Failed to sync RevenueCat user ID:', rcError);
        }

        await loadProfile(session.user.id);
        await loadUserPermissions();
      } else {
        // Clear user data when logging out
        await StorageService.clearCurrentUserData();
        setProfile(null);
        setUserRole(null);
        setIsSuperUser(false);
        setCanAccessAdmin(false);
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(loadingTimeout);
      clearScheduledSessionRetry();
    };
  }, []);

  const loadProfile = async (userId: string, retryCount = 0) => {
    try {
      console.log(
        '🔍 Loading profile for user:',
        userId,
        retryCount > 0 ? `(retry ${retryCount})` : '',
      );

      // First, try to get cached profile if this is a retry or we're in Expo Go
      if (retryCount > 0 || isExpoGo) {
        const cachedProfile = await ProfileCacheService.getCachedProfile();
        if (cachedProfile && cachedProfile.id === userId) {
          console.log('✅ Using cached profile:', cachedProfile.id);
          setProfile(cachedProfile);
          return;
        }
      }

      // Reduced timeout for faster failure and better UX
      const profileTimeout = getTimeoutValue(8000, 'profile'); // Reduced from 15s to 8s
      const profilePromise = Api.profiles.get(userId);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile load timeout')), profileTimeout),
      );

      const profileData = await Promise.race([profilePromise, timeoutPromise]);
      console.log('✅ Profile loaded successfully:', profileData);

      // Cache the profile for future use (both old and new cache systems)
      await ProfileCacheService.cacheProfile(profileData);
      await ColdStartCache.cacheUserProfile(profileData);

      setProfile(profileData);
    } catch (error) {
      console.error('❌ Error loading profile:', error);

      // Classify the error for better handling
      const networkError = ProfileCacheService.classifyNetworkError(error);
      console.log('🔍 Network error classified:', networkError);

      // Try to use cached profile for network/timeout errors
      if (ProfileCacheService.shouldUseCachedProfile(networkError)) {
        const cachedProfile = await ProfileCacheService.getCachedProfile();
        if (cachedProfile && cachedProfile.id === userId) {
          console.log('✅ Using cached profile due to network error:', networkError.type);
          setProfile(cachedProfile);
          return;
        }
      }

      // Check if we should retry
      const maxRetries = getRetryCount();
      if (ProfileCacheService.shouldRetry(networkError, retryCount, maxRetries)) {
        const delay = ProfileCacheService.getRetryDelay(networkError, retryCount);
        console.log(
          `🔄 Retrying profile load in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries}) - Error: ${networkError.type}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return loadProfile(userId, retryCount + 1);
      }

      // If we already have a profile in state, keep it (don't reset to default)
      if (profile && shouldPreserveExistingData()) {
        console.log(
          '⚠️ Profile load failed after retries, keeping existing profile (Expo Go mode)',
        );
        return;
      }

      // Final fallback - try to get minimal profile info
      if (networkError.type === 'timeout' || networkError.type === 'network') {
        console.log('⚠️ Profile load timeout/network error - checking if user exists in database');

        // Try to check if user exists in database with a simple query
        try {
          const { data: existingProfile, error: checkError } = await supabase
            .from('profiles')
            .select('id, onboarding_completed, full_name, created_at, updated_at')
            .eq('id', userId)
            .single();

          if (existingProfile && !checkError) {
            console.log('✅ User exists in database, using existing profile data');
            const fallbackProfile = {
              id: userId,
              email: user?.email || '',
              full_name: existingProfile.full_name || user?.email?.split('@')[0] || 'User',
              onboarding_completed: existingProfile.onboarding_completed,
              created_at: existingProfile.created_at || new Date().toISOString(),
              updated_at: existingProfile.updated_at || new Date().toISOString(),
            };

            // Cache the fallback profile
            await ProfileCacheService.cacheProfile(fallbackProfile);
            setProfile(fallbackProfile);

            // Set RevenueCat user ID to match Supabase user ID
            try {
              const { RevenueCatService } = await import('../services/revenueCatService');
              await RevenueCatService.setUserId(userId);
              console.log('✅ RevenueCat user ID synchronized with Supabase');
            } catch (rcError) {
              console.log('⚠️ Failed to sync RevenueCat user ID:', rcError);
            }

            return;
          }
        } catch (checkError) {
          console.log('⚠️ Could not verify user existence, using cached profile or default');
        }

        // Try cached profile one more time
        const cachedProfile = await ProfileCacheService.getCachedProfile();
        if (cachedProfile) {
          console.log('✅ Using cached profile as final fallback');
          setProfile(cachedProfile);
          return;
        }
      }

      // Last resort - create default profile
      console.log('🔧 Setting default profile for new user (all fallbacks failed)');
      const defaultProfile = {
        id: userId,
        email: user?.email || '',
        full_name: 'New User',
        onboarding_completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Cache the default profile
      await ProfileCacheService.cacheProfile(defaultProfile);
      setProfile(defaultProfile);
    }
  };

  // Function to refresh profile (useful after onboarding completion)
  const refreshProfile = async () => {
    if (user) {
      // Clear cached profile to force fresh load
      await ProfileCacheService.clearCachedProfile();
      await loadProfile(user.id);
    }
  };

  // Function to refresh subscription status
  const refreshSubscription = async () => {
    if (user) {
      DatabaseSubscriptionManager.clearUserCache(user.id);
      await loadSubscriptionStatus(user.id, true);
    }
  };

  // Load subscription status with priority and cache fallback
  const loadSubscriptionStatus = async (userId: string, forceRefresh = false) => {
    try {
      setSubscriptionLoading(true);
      console.log(
        '💎 Loading subscription status (PRIORITY) for user:',
        userId,
        forceRefresh ? '(forced refresh)' : '',
      );

      // Try to load with resilience using DatabaseSubscriptionManager directly
      const dbStatus = await executeWithResilience(
        () => DatabaseSubscriptionManager.getSubscriptionStatus(userId),
        'subscription-status-load',
        { timeoutMs: 5000, maxRetries: 2 },
      );

      // Convert to FastSubscriptionStatus for compatibility
      const status: FastSubscriptionStatus = {
        hasAccess: dbStatus.hasAccess,
        isPremium: dbStatus.isPremium,
        isTrialActive: dbStatus.isTrialActive,
        status: dbStatus.status,
        planId: dbStatus.planId,
        daysRemaining: dbStatus.daysRemaining,
      };

      console.log('💎 Subscription status loaded:', {
        hasAccess: status.hasAccess,
        isPremium: status.isPremium,
        isTrialActive: status.isTrialActive,
        status: status.status,
      });

      // Cache successful subscription status
      await ColdStartCache.cacheSubscriptionStatus(status);

      setSubscriptionStatus(status);
      return status;
    } catch (error) {
      console.error('❌ Error loading subscription status:', error);

      // Try to use cached subscription status
      try {
        const cachedStatus = await ColdStartCache.loadCachedSubscriptionStatus();
        if (cachedStatus) {
          console.log('✅ Using cached subscription status due to network error');
          setSubscriptionStatus(cachedStatus);
          return cachedStatus;
        }
      } catch (cacheError) {
        console.error('❌ Failed to load cached subscription status:', cacheError);
      }

      // Provide fallback status
      const fallbackStatus: FastSubscriptionStatus = {
        hasAccess: false,
        isTrialActive: false,
        isPremium: false,
        status: 'error',
      };
      setSubscriptionStatus(fallbackStatus);
      return fallbackStatus;
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const loadUserPermissions = async (retryCount = 0) => {
    try {
      console.log('🔍 Loading user permissions...', retryCount > 0 ? `(retry ${retryCount})` : '');

      // Add timeout to prevent hanging (dynamic based on environment)
      const permissionsTimeout = getTimeoutValue(10000, 'permissions');
      const permissionsPromise = UserManagementService.getCurrentUserPermissions();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Permissions load timeout')), permissionsTimeout),
      );

      const permissions = await Promise.race([permissionsPromise, timeoutPromise]);
      console.log('✅ User permissions loaded:', permissions);
      setUserRole(permissions.role);
      setIsSuperUser(permissions.isSuperUser);
      setCanAccessAdmin(permissions.canAccessAdmin);
    } catch (error) {
      console.error('❌ Error loading user permissions:', error);

      // EMERGENCY FIX: Disable retry logic to prevent infinite loops
      console.log('🚨 Permissions load failed - setting default permissions to prevent loop');
      setUserRole('user');
      setIsSuperUser(false);
      setCanAccessAdmin(false);
      return;

      // If we already have permissions in state, keep them
      if (userRole && shouldPreserveExistingData()) {
        console.log(
          '⚠️ Permissions load failed after retries, keeping existing permissions (Expo Go mode)',
        );
        return;
      }

      // Set safe defaults only if we don't have existing data
      console.log('🔧 Setting default permissions (timeout/network error)');
      setUserRole('standard_user');
      setIsSuperUser(false);
      setCanAccessAdmin(false);
    }
  };

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    try {
      setLoading(true);
      await AuthService.signUp(email, password, fullName);

      // Set RevenueCat user ID after successful signup
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        try {
          const { RevenueCatService } = await import('../services/revenueCatService');
          await RevenueCatService.setUserId(user.id);
          console.log('✅ RevenueCat user ID set for new user:', user.id);
        } catch (error) {
          console.error('❌ Failed to set RevenueCat user ID for new user:', error);
          // Don't throw - RevenueCat setup failure shouldn't break signup
        }
      }

      // Note: Profile creation is handled automatically by database trigger
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      await AuthService.signIn(email, password);

      // Set RevenueCat user ID after successful login
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        try {
          const { RevenueCatService } = await import('../services/revenueCatService');
          await RevenueCatService.setUserId(user.id);
          console.log('✅ RevenueCat user ID set:', user.id);
        } catch (error) {
          console.error('❌ Failed to set RevenueCat user ID:', error);
        }
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      PerformanceMonitor.startTimer('logout-cleanup');
      console.log('🔄 Starting parallel logout cleanup...');

      // Run all cleanup operations in parallel for faster logout
      const cleanupPromises = [
        StorageService.clearCurrentUserData(),
        ProfileCacheService.clearCachedProfile(),
        // Clear cold start cache for the current user
        user ? ColdStartCache.clearUserCache(user.id) : Promise.resolve(),
        // RevenueCat logout with error handling
        (async () => {
          try {
            const { RevenueCatService } = await import('../services/revenueCatService');
            await RevenueCatService.logOut();
            console.log('✅ RevenueCat user logged out');
          } catch (error) {
            console.error('❌ Failed to log out from RevenueCat:', error);
            // Don't throw - continue with other cleanup
          }
        })(),
        AuthService.signOut(),
      ];

      // Wait for all cleanup operations to complete (or fail gracefully)
      await Promise.allSettled(cleanupPromises);
      PerformanceMonitor.endTimer('logout-cleanup');
      console.log('✅ Logout cleanup completed');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await AuthService.resetPassword(email);
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }, []);

  const updateProfile = useCallback(
    async (updates: { full_name?: string; avatar_url?: string }) => {
      try {
        if (!user) throw new Error('No user logged in');

        // Update auth user data
        await AuthService.updateProfile(updates);

        // Update profile in database
        const updatedProfile = await Api.profiles.update(user.id, {
          ...updates,
          updated_at: new Date().toISOString(),
        });

        setProfile(updatedProfile);
      } catch (error) {
        console.error('Update profile error:', error);
        throw error;
      }
    },
    [user],
  );

  const refreshUserPermissions = useCallback(async () => {
    await loadUserPermissions();
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      session,
      loading,
      userRole,
      isSuperUser,
      canAccessAdmin,
      subscriptionStatus,
      subscriptionLoading,
      signUp,
      signIn,
      signOut,
      resetPassword,
      updateProfile,
      refreshUserPermissions,
      refreshProfile,
      refreshSubscription,
    }),
    [
      user,
      profile,
      session,
      loading,
      userRole,
      isSuperUser,
      canAccessAdmin,
      subscriptionStatus,
      subscriptionLoading,
      signUp,
      signIn,
      signOut,
      resetPassword,
      updateProfile,
      refreshUserPermissions,
      refreshProfile,
      refreshSubscription,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Simple Optimized Auth Context
 * Minimal changes to existing AuthContext to prioritize subscription status
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../services/supabaseService';
import { StorageService } from '../storage/storageService';
import { FastSubscriptionService, FastSubscriptionStatus } from '../services/fastSubscriptionService';
import { getTimeoutValue } from '../config/development';

interface User {
  id: string;
  email?: string;
  user_metadata?: any;
}

interface Profile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  onboarding_completed?: boolean;
}

interface Session {
  user: User;
  access_token: string;
  refresh_token: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  subscriptionStatus: FastSubscriptionStatus | null;
  subscriptionLoading: boolean;
  refreshAuthState: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<FastSubscriptionStatus | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('📱 App state changed:', appState, '->', nextAppState);
      
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('🔄 App came to foreground - refreshing subscription status');
        refreshSubscription();
      }
      
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [appState]);

  // Load subscription status with priority
  const loadSubscriptionStatus = async (userId: string, forceRefresh = false) => {
    try {
      setSubscriptionLoading(true);
      console.log('💎 Loading subscription status (PRIORITY) for user:', userId);
      
      const status = await FastSubscriptionService.getFastSubscriptionStatus(userId);
      console.log('💎 Subscription status loaded:', {
        hasAccess: status.hasAccess,
        isPremium: status.isPremium,
        isTrialActive: status.isTrialActive,
        status: status.status
      });
      
      setSubscriptionStatus(status);
      return status;
    } catch (error) {
      console.error('❌ Error loading subscription status:', error);
      // Provide fallback status
      const fallbackStatus: FastSubscriptionStatus = {
        hasAccess: false,
        isTrialActive: false,
        isPremium: false,
        status: 'error'
      };
      setSubscriptionStatus(fallbackStatus);
      return fallbackStatus;
    } finally {
      setSubscriptionLoading(false);
    }
  };

  // Load profile data (background)
  const loadProfile = async (userId: string) => {
    try {
      console.log('👤 Loading profile (background) for user:', userId);
      const { DatabaseService } = await import('../services/supabaseService');
      const profileData = await DatabaseService.getProfile(userId);
      setProfile(profileData);
      console.log('👤 Profile loaded:', profileData?.full_name || 'No name');
      return profileData;
    } catch (error) {
      console.error('❌ Error loading profile:', error);
      return null;
    }
  };

  // Refresh auth state
  const refreshAuthState = async () => {
    try {
      console.log('🔄 Refreshing auth state...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        StorageService.setCurrentUser(session.user.id);
        
        // Load subscription status FIRST (highest priority)
        await loadSubscriptionStatus(session.user.id);
        
        // Load profile in background (non-blocking)
        loadProfile(session.user.id);
      } else {
        console.log('❌ No valid session found');
        setSession(null);
        setUser(null);
        setProfile(null);
        setSubscriptionStatus(null);
      }
    } catch (error) {
      console.error('❌ Error refreshing auth state:', error);
    }
  };

  // Refresh profile
  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  // Refresh subscription
  const refreshSubscription = async () => {
    if (user) {
      FastSubscriptionService.clearCache(user.id);
      await loadSubscriptionStatus(user.id, true);
    }
  };

  // Main initialization with optimized sequence
  useEffect(() => {
    console.log('🚀 OptimizedAuthContext: Starting prioritized loading sequence...');
    
    const authTimeout = getTimeoutValue(2000, 'auth'); // Reduced to 2 seconds
    const loadingTimeout = setTimeout(() => {
      console.log('⏰ Auth loading timeout - forcing loading to false');
      setLoading(false);
    }, authTimeout);

    const initializeAuth = async () => {
      try {
        console.log('🔄 Starting optimized auth initialization...');
        
        // Step 1: Get session (fastest)
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔍 Session check complete:', session?.user?.id || 'no user');
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Set current user immediately
          StorageService.setCurrentUser(session.user.id);
          
          // Step 2: Load subscription status FIRST (highest priority)
          console.log('💎 Loading subscription status with PRIORITY...');
          await loadSubscriptionStatus(session.user.id);
          
          // Step 3: Load profile in background (non-blocking)
          console.log('👤 Loading profile in background (non-blocking)...');
          loadProfile(session.user.id);
        }
        
        console.log('✅ Optimized auth initialization complete');
        setLoading(false);
        clearTimeout(loadingTimeout);
        
      } catch (error) {
        console.error('❌ Error during optimized auth initialization:', error);
        setLoading(false);
        clearTimeout(loadingTimeout);
      }
    };
    
    initializeAuth();
    
    return () => clearTimeout(loadingTimeout);
  }, []);

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    subscriptionStatus,
    subscriptionLoading,
    refreshAuthState,
    refreshProfile,
    refreshSubscription,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};




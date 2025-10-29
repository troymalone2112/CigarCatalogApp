/**
 * Priority Loading Context
 * Manages app loading with subscription status as top priority
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../services/supabaseService';
import { StorageService } from '../storage/storageService';
import { FastSubscriptionService, FastSubscriptionStatus } from '../services/fastSubscriptionService';

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

interface LoadingState {
  // Core loading states
  sessionLoading: boolean;
  subscriptionLoading: boolean;
  profileLoading: boolean;
  
  // Overall loading state
  isAppReady: boolean;
  
  // Data states
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  subscriptionStatus: FastSubscriptionStatus | null;
  
  // Error states
  hasError: boolean;
  errorMessage?: string;
}

interface PriorityLoadingContextType extends LoadingState {
  refreshAll: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const PriorityLoadingContext = createContext<PriorityLoadingContextType | undefined>(undefined);

export const usePriorityLoading = () => {
  const context = useContext(PriorityLoadingContext);
  if (!context) {
    throw new Error('usePriorityLoading must be used within a PriorityLoadingProvider');
  }
  return context;
};

export const PriorityLoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    sessionLoading: true,
    subscriptionLoading: false,
    profileLoading: false,
    isAppReady: false,
    user: null,
    profile: null,
    session: null,
    subscriptionStatus: null,
    hasError: false,
  });

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

  // Update loading state helper
  const updateLoadingState = (updates: Partial<LoadingState>) => {
    setLoadingState(prev => {
      const newState = { ...prev, ...updates };
      
      // Determine if app is ready
      const isAppReady = !newState.sessionLoading && 
                         !newState.subscriptionLoading && 
                         !newState.profileLoading &&
                         !newState.hasError;
      
      newState.isAppReady = isAppReady;
      
      console.log('🔄 Loading state updated:', {
        sessionLoading: newState.sessionLoading,
        subscriptionLoading: newState.subscriptionLoading,
        profileLoading: newState.profileLoading,
        isAppReady,
        hasUser: !!newState.user,
        hasSubscription: !!newState.subscriptionStatus,
        hasProfile: !!newState.profile
      });
      
      return newState;
    });
  };

  // Load session (fastest)
  const loadSession = async (): Promise<boolean> => {
    try {
      console.log('🔐 Loading session...');
      updateLoadingState({ sessionLoading: true });
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('✅ Session loaded for user:', session.user.id);
        updateLoadingState({
          session: session,
          user: session.user,
          sessionLoading: false
        });
        
        // Set current user immediately
        StorageService.setCurrentUser(session.user.id);
        return true;
      } else {
        console.log('❌ No session found');
        updateLoadingState({
          session: null,
          user: null,
          sessionLoading: false
        });
        return false;
      }
    } catch (error) {
      console.error('❌ Error loading session:', error);
      updateLoadingState({
        sessionLoading: false,
        hasError: true,
        errorMessage: 'Failed to load session'
      });
      return false;
    }
  };

  // Load subscription status (highest priority after session)
  const loadSubscriptionStatus = async (userId: string): Promise<void> => {
    try {
      console.log('💎 Loading subscription status (priority)...');
      updateLoadingState({ subscriptionLoading: true });
      
      const subscriptionStatus = await FastSubscriptionService.getFastSubscriptionStatus(userId);
      
      console.log('💎 Subscription status loaded:', {
        hasAccess: subscriptionStatus.hasAccess,
        isPremium: subscriptionStatus.isPremium,
        isTrialActive: subscriptionStatus.isTrialActive,
        status: subscriptionStatus.status
      });
      
      updateLoadingState({
        subscriptionStatus,
        subscriptionLoading: false
      });
    } catch (error) {
      console.error('❌ Error loading subscription status:', error);
      updateLoadingState({
        subscriptionLoading: false,
        hasError: true,
        errorMessage: 'Failed to load subscription status'
      });
    }
  };

  // Load profile (lowest priority)
  const loadProfile = async (userId: string): Promise<void> => {
    try {
      console.log('👤 Loading profile (background)...');
      updateLoadingState({ profileLoading: true });
      
      const { DatabaseService } = await import('../services/supabaseService');
      const profile = await DatabaseService.getProfile(userId);
      
      console.log('👤 Profile loaded:', profile?.full_name || 'No name');
      updateLoadingState({
        profile,
        profileLoading: false
      });
    } catch (error) {
      console.error('❌ Error loading profile:', error);
      updateLoadingState({
        profileLoading: false,
        // Don't set error for profile - it's not critical
      });
    }
  };

  // Refresh subscription
  const refreshSubscription = async (): Promise<void> => {
    if (loadingState.user) {
      FastSubscriptionService.clearCache(loadingState.user.id);
      await loadSubscriptionStatus(loadingState.user.id);
    }
  };

  // Refresh profile
  const refreshProfile = async (): Promise<void> => {
    if (loadingState.user) {
      await loadProfile(loadingState.user.id);
    }
  };

  // Refresh all
  const refreshAll = async (): Promise<void> => {
    console.log('🔄 Refreshing all data...');
    
    // Clear caches
    if (loadingState.user) {
      FastSubscriptionService.clearCache(loadingState.user.id);
    }
    
    // Reload everything
    const hasSession = await loadSession();
    if (hasSession && loadingState.user) {
      await Promise.all([
        loadSubscriptionStatus(loadingState.user.id),
        loadProfile(loadingState.user.id)
      ]);
    }
  };

  // Main initialization
  useEffect(() => {
    console.log('🚀 PriorityLoadingProvider: Starting optimized loading sequence...');
    
    const initializeApp = async () => {
      try {
        // Step 1: Load session (fastest)
        const hasSession = await loadSession();
        
        if (hasSession && loadingState.user) {
          // Step 2: Load subscription status FIRST (highest priority)
          await loadSubscriptionStatus(loadingState.user.id);
          
          // Step 3: Load profile in background (non-blocking)
          loadProfile(loadingState.user.id);
        }
        
        console.log('✅ Priority loading initialization complete');
      } catch (error) {
        console.error('❌ Error during priority loading initialization:', error);
        updateLoadingState({
          hasError: true,
          errorMessage: 'Failed to initialize app'
        });
      }
    };
    
    initializeApp();
  }, []);

  const contextValue: PriorityLoadingContextType = {
    ...loadingState,
    refreshAll,
    refreshSubscription,
    refreshProfile,
  };

  return (
    <PriorityLoadingContext.Provider value={contextValue}>
      {children}
    </PriorityLoadingContext.Provider>
  );
};




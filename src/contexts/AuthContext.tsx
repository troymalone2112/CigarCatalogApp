import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { User, Session } from '@supabase/supabase-js';
import { supabase, AuthService, DatabaseService, checkSupabaseConnection } from '../services/supabaseService';
import { StorageService } from '../storage/storageService';
import { UserManagementService } from '../services/userManagementService';
import { UserRole } from '../types';

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
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: { full_name?: string; avatar_url?: string }) => Promise<void>;
  refreshUserPermissions: () => Promise<void>;
  refreshProfile: () => Promise<void>;
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
  const [appState, setAppState] = useState(AppState.currentState);

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
      
      // First check if Supabase connection is healthy
      const isConnectionHealthy = await checkSupabaseConnection();
      if (!isConnectionHealthy) {
        console.log('⚠️ Supabase connection unhealthy, skipping refresh');
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('✅ Session still valid, refreshing profile');
        // Ensure StorageService has current user
        StorageService.setCurrentUser(session.user.id);
        // Refresh profile and permissions
        await loadProfile(session.user.id);
        await loadUserPermissions();
      } else {
        console.log('❌ No valid session found');
      }
    } catch (error) {
      console.error('❌ Error refreshing auth state:', error);
    }
  };

  useEffect(() => {
    console.log('🚀 AuthContext: Starting initialization...');
    
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.log('⏰ Auth loading timeout - forcing loading to false');
      setLoading(false);
    }, 10000); // 10 second timeout

    // Get initial session with timeout protection
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Session timeout')), 5000)
    );
    
    Promise.race([sessionPromise, timeoutPromise])
      .then(({ data: { session } }: any) => {
        console.log('🔍 Initial session check:', session?.user?.id || 'no user');
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          console.log('👤 User found, loading profile and permissions...');
          // Set current user in StorageService for user-specific data
          StorageService.setCurrentUser(session.user.id);
          // Load profile and permissions in background, don't block
          loadProfile(session.user.id).catch(err => 
            console.error('❌ Profile load failed:', err)
          );
          loadUserPermissions().catch(err => 
            console.error('❌ Permissions load failed:', err)
          );
        } else {
          console.log('👤 No user found, proceeding to login');
        }
        console.log('✅ Auth initialization complete');
        setLoading(false);
        clearTimeout(loadingTimeout);
      })
      .catch((error) => {
        console.error('❌ Error getting initial session:', error);
        setLoading(false);
        clearTimeout(loadingTimeout);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔍 Auth state change:', event, session?.user?.id || 'no user');
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Set current user in StorageService for user-specific data
        StorageService.setCurrentUser(session.user.id);
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
    };
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      console.log('🔍 Loading profile for user:', userId);
      
      // Add timeout to prevent hanging
      const profilePromise = DatabaseService.getProfile(userId);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile load timeout')), 8000)
      );
      
      const profileData = await Promise.race([profilePromise, timeoutPromise]);
      console.log('✅ Profile loaded successfully:', profileData);
      setProfile(profileData);
    } catch (error) {
      console.error('❌ Error loading profile:', error);
      // Set a default profile if loading fails
      const defaultProfile = {
        id: userId,
        email: user?.email || '',
        full_name: 'New User',
        onboarding_completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      console.log('🔧 Setting default profile:', defaultProfile);
      setProfile(defaultProfile);
    }
  };

  // Function to refresh profile (useful after onboarding completion)
  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  const loadUserPermissions = async () => {
    try {
      console.log('🔍 Loading user permissions...');
      
      // Add timeout to prevent hanging
      const permissionsPromise = UserManagementService.getCurrentUserPermissions();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Permissions load timeout')), 5000)
      );
      
      const permissions = await Promise.race([permissionsPromise, timeoutPromise]);
      console.log('✅ User permissions loaded:', permissions);
      setUserRole(permissions.role);
      setIsSuperUser(permissions.isSuperUser);
      setCanAccessAdmin(permissions.canAccessAdmin);
    } catch (error) {
      console.error('❌ Error loading user permissions:', error);
      // Set safe defaults
      setUserRole('standard_user');
      setIsSuperUser(false);
      setCanAccessAdmin(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      setLoading(true);
      await AuthService.signUp(email, password, fullName);
      // Note: Profile creation is handled automatically by database trigger
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      await AuthService.signIn(email, password);
      
      // Set RevenueCat user ID after successful login
      const { data: { user } } = await supabase.auth.getUser();
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
  };

  const signOut = async () => {
    try {
      setLoading(true);
      // Clear user data before signing out
      await StorageService.clearCurrentUserData();
      
      // Log out from RevenueCat
      try {
        const { RevenueCatService } = await import('../services/revenueCatService');
        await RevenueCatService.logOut();
        console.log('✅ RevenueCat user logged out');
      } catch (error) {
        console.error('❌ Failed to log out from RevenueCat:', error);
      }
      
      await AuthService.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await AuthService.resetPassword(email);
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  };

  const updateProfile = async (updates: { full_name?: string; avatar_url?: string }) => {
    try {
      if (!user) throw new Error('No user logged in');
      
      // Update auth user data
      await AuthService.updateProfile(updates);
      
      // Update profile in database
      const updatedProfile = await DatabaseService.updateProfile(user.id, {
        ...updates,
        updated_at: new Date().toISOString(),
      });
      
      setProfile(updatedProfile);
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const refreshUserPermissions = async () => {
    await loadUserPermissions();
  };

  const value = {
    user,
    profile,
    session,
    loading,
    userRole,
    isSuperUser,
    canAccessAdmin,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
    refreshUserPermissions,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


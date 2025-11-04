import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Custom hook to handle screen loading states with proper app lifecycle management
 * Prevents loading states from getting stuck when app resumes from background
 */
export const useScreenLoading = (initialLoading = true) => {
  const [loading, setLoading] = useState(initialLoading);
  const [refreshing, setRefreshing] = useState(false);
  const appStateRef = useRef(AppState.currentState);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log(
        '🔄 Screen loading - App state changed:',
        appStateRef.current,
        '->',
        nextAppState,
      );

      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('📱 App resumed - clearing stuck loading states');
        // Clear any stuck loading states when app resumes
        if (loading) {
          console.log('🔧 Clearing stuck loading state');
          setLoading(false);
        }
        if (refreshing) {
          console.log('🔧 Clearing stuck refreshing state');
          setRefreshing(false);
        }
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [loading, refreshing]);

  // Set loading with timeout protection
  const setLoadingWithTimeout = useCallback((isLoading: boolean, timeout = 10000) => {
    // Clear existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    setLoading(isLoading);

    if (isLoading) {
      // Set timeout to prevent infinite loading
      loadingTimeoutRef.current = setTimeout(() => {
        console.log('⏰ Screen loading timeout - forcing loading to false');
        setLoading(false);
        loadingTimeoutRef.current = null;
      }, timeout);
    }
  }, []);

  // Set refreshing with timeout protection
  const setRefreshingWithTimeout = useCallback((isRefreshing: boolean, timeout = 5000) => {
    if (isRefreshing) {
      // Clear existing timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }

      setRefreshing(isRefreshing);

      // Set timeout to prevent infinite refreshing
      loadingTimeoutRef.current = setTimeout(() => {
        console.log('⏰ Screen refreshing timeout - forcing refreshing to false');
        setRefreshing(false);
        loadingTimeoutRef.current = null;
      }, timeout);
    } else {
      setRefreshing(isRefreshing);
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  return {
    loading,
    refreshing,
    setLoading: setLoadingWithTimeout,
    setRefreshing: setRefreshingWithTimeout,
    // Convenience methods
    startLoading: () => setLoadingWithTimeout(true),
    stopLoading: () => setLoadingWithTimeout(false),
    startRefreshing: () => setRefreshingWithTimeout(true),
    stopRefreshing: () => setRefreshingWithTimeout(false),
  };
};

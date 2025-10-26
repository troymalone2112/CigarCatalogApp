/**
 * Development-specific configuration for Expo Go
 * These settings help with timeout and connection issues in development
 */

export const DEVELOPMENT_CONFIG = {
  // Timeout settings (in milliseconds) - Optimized for database operations
  TIMEOUTS: {
    SESSION_LOAD: 20000,        // 20 seconds for session loading
    PROFILE_LOAD: 25000,        // 25 seconds for profile loading (database operations)
    PERMISSIONS_LOAD: 15000,    // 15 seconds for permissions loading
    AUTH_LOADING: 25000,        // 25 seconds for overall auth loading
  },
  
  // Retry settings
  RETRIES: {
    MAX_ATTEMPTS: 3,            // Maximum retry attempts
    BACKOFF_MULTIPLIER: 2,      // Exponential backoff multiplier
    INITIAL_DELAY: 1000,        // Initial delay in milliseconds
  },
  
  // Network settings
  NETWORK: {
    ENABLE_CONNECTION_CHECK: true,  // Check Supabase connection health
    CONNECTION_TIMEOUT: 5000,       // 5 seconds for connection check
  },
  
  // Debug settings
  DEBUG: {
    ENABLE_VERBOSE_LOGGING: true,   // Enable detailed console logs
    LOG_NETWORK_ERRORS: true,       // Log network-related errors
    LOG_TIMEOUT_EVENTS: true,       // Log timeout events
  },
  
  // Expo Go specific settings
  EXPO_GO: {
    // These settings help with Expo Go's slower network performance
    INCREASED_TIMEOUTS: true,      // Use longer timeouts in Expo Go
    GRACEFUL_DEGRADATION: true,    // Continue with degraded state on errors
    PRESERVE_EXISTING_DATA: true,  // Keep existing data when possible
  }
};

/**
 * Check if we're running in Expo Go
 */
export const isExpoGo = () => {
  // Check for Expo Go environment
  return __DEV__ && 
         typeof navigator !== 'undefined' && 
         navigator.product === 'ReactNative' &&
         // Additional check for Expo Go
         (global as any).expo?.modules?.ExpoGo;
};

/**
 * Get timeout value based on environment
 */
export const getTimeoutValue = (baseTimeout: number, type: 'session' | 'profile' | 'permissions' | 'auth') => {
  if (isExpoGo()) {
    // Use development config timeouts for Expo Go
    return DEVELOPMENT_CONFIG.TIMEOUTS[`${type.toUpperCase()}_LOAD` as keyof typeof DEVELOPMENT_CONFIG.TIMEOUTS];
  }
  return baseTimeout;
};

/**
 * Get retry count based on environment
 */
export const getRetryCount = () => {
  if (isExpoGo()) {
    return DEVELOPMENT_CONFIG.RETRIES.MAX_ATTEMPTS;
  }
  return 2; // Default retry count for production
};

/**
 * Get backoff delay for retries
 */
export const getRetryDelay = (attempt: number) => {
  const baseDelay = DEVELOPMENT_CONFIG.RETRIES.INITIAL_DELAY;
  const multiplier = DEVELOPMENT_CONFIG.RETRIES.BACKOFF_MULTIPLIER;
  return baseDelay * Math.pow(multiplier, attempt);
};

/**
 * Check if we should use graceful degradation
 */
export const shouldUseGracefulDegradation = () => {
  return isExpoGo() && DEVELOPMENT_CONFIG.EXPO_GO.GRACEFUL_DEGRADATION;
};

/**
 * Check if we should preserve existing data
 */
export const shouldPreserveExistingData = () => {
  return isExpoGo() && DEVELOPMENT_CONFIG.EXPO_GO.PRESERVE_EXISTING_DATA;
};

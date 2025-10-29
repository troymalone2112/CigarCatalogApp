/**
 * Production-optimized configuration
 * These settings are optimized for performance and security in production builds
 */

export const PRODUCTION_CONFIG = {
  // Timeout settings (in milliseconds) - Optimized for production performance
  TIMEOUTS: {
    SESSION_LOAD: 8000,         // 8 seconds for session loading (faster than dev)
    PROFILE_LOAD: 10000,        // 10 seconds for profile loading
    PERMISSIONS_LOAD: 6000,     // 6 seconds for permissions loading
    AUTH_LOADING: 12000,        // 12 seconds for overall auth loading
    NETWORK_TIMEOUT: 5000,      // 5 seconds for network calls
  },
  
  // Retry settings
  RETRIES: {
    MAX_ATTEMPTS: 2,            // Fewer retries in production (faster failure)
    BACKOFF_MULTIPLIER: 1.5,    // Lower backoff multiplier
    INITIAL_DELAY: 500,         // Shorter initial delay
  },
  
  // Network settings
  NETWORK: {
    ENABLE_CONNECTION_CHECK: true,  // Keep connection checks
    CONNECTION_TIMEOUT: 3000,       // Shorter timeout for production
  },
  
  // Debug settings - Minimal logging for production
  DEBUG: {
    ENABLE_VERBOSE_LOGGING: false,  // Disable verbose logging
    LOG_NETWORK_ERRORS: true,       // Keep error logging only
    LOG_TIMEOUT_EVENTS: false,      // Disable timeout logging
    LOG_PERFORMANCE: false,         // Disable performance logging
  },
  
  // Production optimizations
  PRODUCTION: {
    OPTIMIZE_FOR_PERFORMANCE: true,  // Enable performance optimizations
    MINIMIZE_LOGS: true,            // Minimize console output
    CACHE_AGGRESSIVE: true,         // Use aggressive caching
    PRELOAD_DATA: true,            // Preload critical data
  }
};

/**
 * Check if we're running in production
 */
export const isProduction = () => {
  return !__DEV__ && process.env.NODE_ENV === 'production';
};

/**
 * Get timeout value based on environment (production vs development)
 */
export const getProductionTimeoutValue = (
  baseTimeout: number, 
  type: 'session' | 'profile' | 'permissions' | 'auth' | 'network'
): number => {
  if (isProduction()) {
    return PRODUCTION_CONFIG.TIMEOUTS[type.toUpperCase() as keyof typeof PRODUCTION_CONFIG.TIMEOUTS] || baseTimeout;
  }
  
  // Use development config in dev mode
  const { getTimeoutValue } = require('./development');
  return getTimeoutValue(baseTimeout, type);
};

/**
 * Get retry delay with production optimization
 */
export const getProductionRetryDelay = (attempt: number, baseDelay: number = 500): number => {
  const config = isProduction() ? PRODUCTION_CONFIG.RETRIES : require('./development').DEVELOPMENT_CONFIG.RETRIES;
  const multiplier = config.BACKOFF_MULTIPLIER;
  return Math.min(baseDelay * Math.pow(multiplier, attempt), 5000); // Cap at 5s in production
};

/**
 * Check if we should enable verbose logging
 */
export const shouldEnableVerboseLogging = (): boolean => {
  if (isProduction()) {
    return PRODUCTION_CONFIG.DEBUG.ENABLE_VERBOSE_LOGGING;
  }
  
  // Enable in development
  return true;
};

/**
 * Production-safe console.log wrapper
 */
export const productionLog = (message: string, ...args: any[]): void => {
  if (shouldEnableVerboseLogging()) {
    console.log(message, ...args);
  }
};

/**
 * Production-safe console.warn wrapper (always shows warnings)
 */
export const productionWarn = (message: string, ...args: any[]): void => {
  console.warn(message, ...args);
};

/**
 * Production-safe console.error wrapper (always shows errors)
 */
export const productionError = (message: string, ...args: any[]): void => {
  console.error(message, ...args);
};


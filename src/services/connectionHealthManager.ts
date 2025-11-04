/**
 * ConnectionHealthManager - Manages network connectivity and database health
 * Provides connection health checks, retry logic, and graceful degradation
 */

export interface ConnectionHealth {
  isOnline: boolean;
  isDatabaseHealthy: boolean;
  lastSuccessfulCheck: number;
  consecutiveFailures: number;
}

export interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  timeoutMs: number;
}

export class ConnectionHealthManager {
  private static instance: ConnectionHealthManager;
  private healthState: ConnectionHealth = {
    isOnline: true,
    isDatabaseHealthy: true,
    lastSuccessfulCheck: 0,
    consecutiveFailures: 0,
  };

  private readonly supabaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://lkkbstwmzdbmlfsowwgt.supabase.co';
  private readonly defaultRetryOptions: RetryOptions = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 8000,
    backoffMultiplier: 2,
    timeoutMs: 10000,
  };

  private constructor() {}

  static getInstance(): ConnectionHealthManager {
    if (!ConnectionHealthManager.instance) {
      ConnectionHealthManager.instance = new ConnectionHealthManager();
    }
    return ConnectionHealthManager.instance;
  }

  /**
   * Quick network connectivity check
   */
  async checkNetworkConnectivity(): Promise<boolean> {
    try {
      console.log('🔍 Checking network connectivity...');

      // Try to reach a reliable endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache',
      });

      clearTimeout(timeoutId);
      const isOnline = response.ok;

      console.log(
        isOnline ? '✅ Network connectivity: ONLINE' : '❌ Network connectivity: OFFLINE',
      );
      this.healthState.isOnline = isOnline;
      return isOnline;
    } catch (error) {
      console.log('❌ Network connectivity check failed:', error.message);
      this.healthState.isOnline = false;
      return false;
    }
  }

  /**
   * Check Supabase database health
   */
  async checkDatabaseHealth(): Promise<boolean> {
    try {
      console.log('🔍 Checking Supabase database health...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.defaultRetryOptions.timeoutMs);

      // Try to reach Supabase health endpoint or make a simple API call
      const response = await fetch(`${this.supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          apikey:
            process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I',
        },
      });

      clearTimeout(timeoutId);
      const isDatabaseHealthy = response.ok || response.status === 401; // 401 is also OK (means auth is working)

      if (isDatabaseHealthy) {
        console.log('✅ Database health: HEALTHY');
        this.healthState.isDatabaseHealthy = true;
        this.healthState.lastSuccessfulCheck = Date.now();
        this.healthState.consecutiveFailures = 0;
      } else {
        console.log('❌ Database health: UNHEALTHY');
        this.healthState.isDatabaseHealthy = false;
        this.healthState.consecutiveFailures++;
      }

      return isDatabaseHealthy;
    } catch (error) {
      console.log('❌ Database health check failed:', error.message);
      this.healthState.isDatabaseHealthy = false;
      this.healthState.consecutiveFailures++;
      return false;
    }
  }

  /**
   * Comprehensive health check
   */
  async performHealthCheck(): Promise<ConnectionHealth> {
    console.log('🔄 Performing comprehensive health check...');

    const [isOnline, isDatabaseHealthy] = await Promise.allSettled([
      this.checkNetworkConnectivity(),
      this.checkDatabaseHealth(),
    ]);

    this.healthState.isOnline = isOnline.status === 'fulfilled' ? isOnline.value : false;
    this.healthState.isDatabaseHealthy =
      isDatabaseHealthy.status === 'fulfilled' ? isDatabaseHealthy.value : false;

    console.log('🔍 Health check result:', {
      isOnline: this.healthState.isOnline,
      isDatabaseHealthy: this.healthState.isDatabaseHealthy,
      consecutiveFailures: this.healthState.consecutiveFailures,
    });

    return { ...this.healthState };
  }

  /**
   * Execute operation with retry logic and exponential backoff
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    options: Partial<RetryOptions> = {},
  ): Promise<T> {
    const opts = { ...this.defaultRetryOptions, ...options };
    let lastError: Error | null = null;

    console.log(`🔄 Starting resilient operation: ${operationName}`);

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      try {
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`${operationName} timeout after ${opts.timeoutMs}ms`)),
            opts.timeoutMs,
          ),
        );

        // Race between operation and timeout
        const result = await Promise.race([operation(), timeoutPromise]);

        console.log(`✅ ${operationName} succeeded on attempt ${attempt + 1}`);

        // Reset failure count on success
        this.healthState.consecutiveFailures = 0;
        this.healthState.lastSuccessfulCheck = Date.now();

        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ ${operationName} failed on attempt ${attempt + 1}:`, error.message);

        // Don't retry on the last attempt
        if (attempt === opts.maxRetries) {
          break;
        }

        // Check if error is retryable
        if (!this.isRetryableError(error as Error)) {
          console.log(`❌ ${operationName} failed with non-retryable error, stopping retries`);
          break;
        }

        // Calculate delay for next retry (exponential backoff with jitter)
        const baseDelay = Math.min(
          opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt),
          opts.maxDelay,
        );
        const jitter = Math.random() * 0.1 * baseDelay; // Add 10% jitter
        const delay = Math.floor(baseDelay + jitter);

        console.log(`⏳ Retrying ${operationName} in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    this.healthState.consecutiveFailures++;
    throw lastError || new Error(`${operationName} failed after ${opts.maxRetries + 1} attempts`);
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const retryablePatterns = [
      'timeout',
      'network',
      'fetch',
      'connection',
      'ENOTFOUND',
      'ECONNRESET',
      'ETIMEDOUT',
      '500',
      '502',
      '503',
      '504',
    ];

    const errorMessage = error.message.toLowerCase();
    return retryablePatterns.some((pattern) => errorMessage.includes(pattern));
  }

  /**
   * Get current health state
   */
  getHealthState(): ConnectionHealth {
    return { ...this.healthState };
  }

  /**
   * Check if we should use degraded mode
   */
  shouldUseDegradedMode(): boolean {
    return (
      !this.healthState.isOnline ||
      !this.healthState.isDatabaseHealthy ||
      this.healthState.consecutiveFailures >= 3
    );
  }

  /**
   * Reset health state (useful after successful recovery)
   */
  resetHealthState(): void {
    console.log('🔄 Resetting connection health state');
    this.healthState.consecutiveFailures = 0;
    this.healthState.lastSuccessfulCheck = Date.now();
    this.healthState.isOnline = true;
    this.healthState.isDatabaseHealthy = true;
  }
}

// Export singleton instance
export const connectionHealthManager = ConnectionHealthManager.getInstance();

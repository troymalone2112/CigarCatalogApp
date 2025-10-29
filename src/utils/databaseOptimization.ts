/**
 * Database Optimization Utilities
 * Helps with timeout issues and database performance
 */

export interface DatabaseOperationOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  operation: string;
}

export class DatabaseOptimization {
  /**
   * Execute a database operation with retry logic and timeout
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: DatabaseOperationOptions
  ): Promise<T> {
    const {
      timeout = 20000,
      retries = 3,
      retryDelay = 1000,
      operation: operationName
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        console.log(`🔄 Database operation: ${operationName} (attempt ${attempt + 1}/${retries + 1})`);
        
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`${operationName} timeout`)), timeout)
        );
        
        // Race between operation and timeout
        const result = await Promise.race([operation(), timeoutPromise]);
        
        console.log(`✅ Database operation: ${operationName} completed successfully`);
        return result;
        
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Database operation: ${operationName} failed (attempt ${attempt + 1}):`, error);
        
        // Don't retry on the last attempt
        if (attempt === retries) {
          break;
        }
        
        // Calculate delay for next retry (exponential backoff)
        const delay = retryDelay * Math.pow(2, attempt);
        console.log(`⏳ Retrying ${operationName} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError || new Error(`${operationName} failed after ${retries + 1} attempts`);
  }

  /**
   * Check if error is retryable
   */
  static isRetryableError(error: Error): boolean {
    const retryablePatterns = [
      'timeout',
      'network',
      'connection',
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT'
    ];
    
    const errorMessage = error.message.toLowerCase();
    return retryablePatterns.some(pattern => errorMessage.includes(pattern));
  }

  /**
   * Get optimized timeout based on operation type
   */
  static getTimeoutForOperation(operation: string): number {
    const timeouts: Record<string, number> = {
      'profile_load': 25000,
      'permissions_load': 15000,
      'humidor_data': 20000,
      'dashboard_data': 20000,
      'inventory_load': 15000,
      'journal_load': 15000,
      'default': 20000
    };
    
    return timeouts[operation] || timeouts.default;
  }

  /**
   * Log database performance metrics
   */
  static logPerformanceMetrics(operation: string, startTime: number, success: boolean) {
    const duration = Date.now() - startTime;
    const status = success ? '✅' : '❌';
    
    console.log(`${status} Database Performance: ${operation} took ${duration}ms`);
    
    // Log slow operations
    if (duration > 10000) {
      console.warn(`🐌 Slow database operation: ${operation} took ${duration}ms (>10s)`);
    }
  }
}




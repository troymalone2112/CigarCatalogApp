// Performance monitoring utility to track app startup and operation times
export class PerformanceMonitor {
  private static timers: Map<string, number> = new Map();
  private static metrics: Map<string, number[]> = new Map();

  /**
   * Start timing an operation
   */
  static startTimer(operation: string): void {
    this.timers.set(operation, Date.now());
    console.log(`⏱️ Started timing: ${operation}`);
  }

  /**
   * End timing an operation and log the duration
   */
  static endTimer(operation: string): number {
    const startTime = this.timers.get(operation);
    if (!startTime) {
      console.warn(`⚠️ No start time found for operation: ${operation}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(operation);

    // Store metric for analysis
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)!.push(duration);

    console.log(`⏱️ ${operation}: ${duration}ms`);
    return duration;
  }

  /**
   * Get average time for an operation
   */
  static getAverageTime(operation: string): number {
    const times = this.metrics.get(operation);
    if (!times || times.length === 0) return 0;

    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  /**
   * Get performance summary
   */
  static getPerformanceSummary(): Record<
    string,
    { average: number; count: number; latest: number }
  > {
    const summary: Record<string, { average: number; count: number; latest: number }> = {};

    for (const [operation, times] of this.metrics.entries()) {
      summary[operation] = {
        average: this.getAverageTime(operation),
        count: times.length,
        latest: times[times.length - 1] || 0,
      };
    }

    return summary;
  }

  /**
   * Clear all metrics
   */
  static clearMetrics(): void {
    this.metrics.clear();
    this.timers.clear();
  }

  /**
   * Log performance summary
   */
  static logPerformanceSummary(): void {
    const summary = this.getPerformanceSummary();
    console.log('📊 Performance Summary:');

    for (const [operation, data] of Object.entries(summary)) {
      console.log(
        `  ${operation}: avg=${data.average.toFixed(0)}ms, count=${data.count}, latest=${data.latest}ms`,
      );
    }
  }
}

// Performance tracking decorator for functions
export function trackPerformance(operationName: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      PerformanceMonitor.startTimer(operationName);
      try {
        const result = await method.apply(this, args);
        PerformanceMonitor.endTimer(operationName);
        return result;
      } catch (error) {
        PerformanceMonitor.endTimer(operationName);
        throw error;
      }
    };
  };
}


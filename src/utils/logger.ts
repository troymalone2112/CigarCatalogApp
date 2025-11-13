/**
 * Production-Safe Logger
 *
 * This logger automatically adjusts logging levels based on the environment.
 * In production, it minimizes console output while preserving critical information.
 */

import { shouldEnableVerboseLogging, isProduction } from '../config/production';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

export class Logger {
  private static logLevel: LogLevel = isProduction() ? LogLevel.WARN : LogLevel.DEBUG;

  /**
   * Debug logging (dev only)
   */
  static debug(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.DEBUG && shouldEnableVerboseLogging()) {
      console.log(`🔧 DEBUG: ${message}`, ...args);
    }
  }

  /**
   * Info logging (minimal in production)
   */
  static info(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.INFO) {
      if (shouldEnableVerboseLogging()) {
        console.log(`ℹ️ INFO: ${message}`, ...args);
      }
    }
  }

  /**
   * Warning logging (always shown)
   */
  static warn(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.WARN) {
      console.warn(`⚠️ WARN: ${message}`, ...args);
    }
  }

  /**
   * Error logging (always shown)
   */
  static error(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.ERROR) {
      console.error(`❌ ERROR: ${message}`, ...args);
    }
  }

  /**
   * Critical logging (always shown)
   */
  static critical(message: string, ...args: any[]): void {
    console.error(`🚨 CRITICAL: ${message}`, ...args);
  }

  /**
   * Performance logging (dev only)
   */
  static performance(operation: string, duration: number): void {
    if (shouldEnableVerboseLogging()) {
      console.log(`⏱️ PERF: ${operation} took ${duration}ms`);
    }
  }

  /**
   * Auth-specific logging (important for debugging)
   */
  static auth(message: string, ...args: any[]): void {
    if (shouldEnableVerboseLogging()) {
      console.log(`🔐 AUTH: ${message}`, ...args);
    } else {
      // In production, only log auth errors
      if (message.includes('Error') || message.includes('Failed')) {
        console.warn(`🔐 AUTH: ${message}`);
      }
    }
  }

  /**
   * Network-specific logging (important for debugging)
   */
  static network(message: string, ...args: any[]): void {
    if (shouldEnableVerboseLogging()) {
      console.log(`🌐 NETWORK: ${message}`, ...args);
    } else {
      // In production, only log network errors
      if (message.includes('Error') || message.includes('Failed') || message.includes('Timeout')) {
        console.warn(`🌐 NETWORK: ${message}`);
      }
    }
  }

  /**
   * Payment-specific logging (important for support)
   */
  static payment(message: string, ...args: any[]): void {
    // Payment logs are important for support, show in production with reduced verbosity
    if (shouldEnableVerboseLogging()) {
      console.log(`💳 PAYMENT: ${message}`, ...args);
    } else {
      // In production, log payment events without detailed arguments
      console.log(`💳 PAYMENT: ${message}`);
    }
  }

  /**
   * Set log level dynamically
   */
  static setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Get current log level
   */
  static getLogLevel(): LogLevel {
    return this.logLevel;
  }
}

// Export convenience functions
export const { debug, info, warn, error, critical, performance, auth, network, payment } = Logger;











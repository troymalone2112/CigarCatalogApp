/**
 * ConnectionManager - Handles Supabase connection lifecycle and refresh
 * Prevents stale connections from causing hangs after idle periods
 */

import { supabase } from './supabaseService';

class ConnectionManager {
  private static instance: ConnectionManager;
  private lastActivityTime: number = Date.now();
  private isRefreshing: boolean = false;
  private readonly STALE_CONNECTION_THRESHOLD = 5 * 60 * 1000; // 5 minutes
  private readonly REFRESH_INTERVAL = 2 * 60 * 1000; // Refresh every 2 minutes if active

  private constructor() {
    // Track activity to detect idle periods
    this.trackActivity();
  }

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  /**
   * Track user activity to detect idle periods
   */
  trackActivity(): void {
    this.lastActivityTime = Date.now();
  }

  /**
   * Check if connection might be stale (app was idle)
   */
  private isConnectionStale(): boolean {
    const idleTime = Date.now() - this.lastActivityTime;
    return idleTime > this.STALE_CONNECTION_THRESHOLD;
  }

  /**
   * Refresh the Supabase connection by verifying session
   */
  async refreshConnection(): Promise<boolean> {
    if (this.isRefreshing) {
      console.log('🔄 Connection refresh already in progress');
      return true;
    }

    try {
      this.isRefreshing = true;
      console.log('🔄 Refreshing Supabase connection...');

      // Quick session check to refresh connection
      const {
        data: { session },
        error,
      } = await Promise.race([
        supabase.auth.getSession(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Session refresh timeout')), 5000),
        ),
      ]);

      if (error || !session) {
        console.warn('⚠️ Session refresh returned no session:', error);
        return false;
      }

      console.log('✅ Connection refreshed successfully');
      this.lastActivityTime = Date.now();
      return true;
    } catch (error: any) {
      console.warn('⚠️ Connection refresh failed:', error.message);
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Ensure connection is fresh before operations
   */
  async ensureFreshConnection(): Promise<void> {
    if (this.isConnectionStale()) {
      console.log('🔄 Connection appears stale, refreshing...');
      await this.refreshConnection();
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      lastActivity: this.lastActivityTime,
      isStale: this.isConnectionStale(),
      idleTime: Date.now() - this.lastActivityTime,
    };
  }
}

export const connectionManager = ConnectionManager.getInstance();


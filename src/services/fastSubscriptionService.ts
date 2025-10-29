/**
 * Fast Subscription Service
 * NOW DELEGATES TO DatabaseSubscriptionManager for consistency
 * Maintains backward compatibility while using database-first architecture
 */

import { DatabaseSubscriptionManager } from './databaseSubscriptionManager';

export interface FastSubscriptionStatus {
  hasAccess: boolean;
  isPremium: boolean;
  isTrialActive: boolean;
  status: string;
  planId?: string;
  daysRemaining?: number;
}

export class FastSubscriptionService {
  /**
   * Get subscription status quickly with caching
   * Now delegates to DatabaseSubscriptionManager for single source of truth
   */
  static async getFastSubscriptionStatus(userId: string): Promise<FastSubscriptionStatus> {
    try {
      console.log('💎 Getting fast subscription status via DatabaseSubscriptionManager...');
      
      // Use the new DatabaseSubscriptionManager as single source of truth
      const dbStatus = await DatabaseSubscriptionManager.getSubscriptionStatus(userId);
      
      // Convert to legacy format for backward compatibility
      const legacyStatus: FastSubscriptionStatus = {
        hasAccess: dbStatus.hasAccess,
        isPremium: dbStatus.isPremium,
        isTrialActive: dbStatus.isTrialActive,
        status: dbStatus.status,
        planId: dbStatus.planId,
        daysRemaining: dbStatus.daysRemaining
      };

      console.log('💎 Fast subscription status (via DatabaseSubscriptionManager):', {
        hasAccess: legacyStatus.hasAccess,
        isPremium: legacyStatus.isPremium,
        isTrialActive: legacyStatus.isTrialActive,
        status: legacyStatus.status,
        source: dbStatus.source
      });

      return legacyStatus;

    } catch (error) {
      console.error('❌ Error in getFastSubscriptionStatus:', error);
      
      // Return fallback status on error
      return {
        hasAccess: false,
        isPremium: false,
        isTrialActive: false,
        status: 'error'
      };
    }
  }

  /**
   * Clear cache for a user - now delegates to DatabaseSubscriptionManager
   */
  static clearCache(userId?: string): void {
    if (userId) {
      DatabaseSubscriptionManager.clearUserCache(userId);
    }
    // Note: DatabaseSubscriptionManager handles its own caching
    console.log('💎 Cache cleared via DatabaseSubscriptionManager');
  }

  /**
   * Get cache statistics - now from DatabaseSubscriptionManager
   */
  static getCacheStats(): { size: number; entries: string[] } {
    const stats = DatabaseSubscriptionManager.getCacheStats();
    return {
      size: stats.size,
      entries: stats.entries.map(e => e.userId)
    };
  }
}

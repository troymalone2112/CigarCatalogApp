/**
 * Fast Subscription Service
 * Provides immediate subscription status checking with minimal database calls
 * Optimized for app loading performance
 */

import { supabase } from './supabaseService';

export interface FastSubscriptionStatus {
  hasAccess: boolean;
  isPremium: boolean;
  isTrialActive: boolean;
  status: string;
  planId?: string;
  daysRemaining?: number;
}

export class FastSubscriptionService {
  private static cache: Map<string, { status: FastSubscriptionStatus; timestamp: number }> = new Map();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get subscription status quickly with caching
   */
  static async getFastSubscriptionStatus(userId: string): Promise<FastSubscriptionStatus> {
    try {
      // Check cache first
      const cached = this.cache.get(userId);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log('💎 Using cached subscription status');
        return cached.status;
      }

      console.log('💎 Fetching fresh subscription status for user:', userId);
      
      // Single optimized query to get subscription status
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('status, is_premium, trial_end_date, subscription_end_date, plan_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .or('status.eq.trial,status.eq.active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.log('💎 No active subscription found, checking for trial...');
        
        // Check for trial status
        const { data: trialData } = await supabase
          .from('user_subscriptions')
          .select('status, trial_end_date, plan_id')
          .eq('user_id', userId)
          .eq('status', 'trial')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (trialData) {
          const now = new Date();
          const trialEndDate = new Date(trialData.trial_end_date);
          const isTrialActive = trialEndDate > now;
          const daysRemaining = isTrialActive ? Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

          const status: FastSubscriptionStatus = {
            hasAccess: isTrialActive,
            isPremium: false,
            isTrialActive,
            status: isTrialActive ? 'trial' : 'expired',
            planId: trialData.plan_id,
            daysRemaining
          };

          // Cache the result
          this.cache.set(userId, { status, timestamp: Date.now() });
          return status;
        }

        // No subscription found - provide default trial
        const defaultStatus: FastSubscriptionStatus = {
          hasAccess: true,
          isPremium: false,
          isTrialActive: true,
          status: 'trial',
          planId: 'free',
          daysRemaining: 3
        };

        this.cache.set(userId, { status: defaultStatus, timestamp: Date.now() });
        return defaultStatus;
      }

      // Process active subscription
      const now = new Date();
      let hasAccess = false;
      let isPremium = false;
      let isTrialActive = false;
      let daysRemaining = 0;

      if (data.is_premium) {
        // User is premium
        hasAccess = true;
        isPremium = true;
        isTrialActive = false;
      } else if (data.status === 'trial') {
        // User is on trial
        const trialEndDate = new Date(data.trial_end_date);
        isTrialActive = trialEndDate > now;
        hasAccess = isTrialActive;
        daysRemaining = isTrialActive ? Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      } else if (data.status === 'active') {
        // User has active subscription
        hasAccess = true;
        isPremium = true;
        isTrialActive = false;
      }

      const status: FastSubscriptionStatus = {
        hasAccess,
        isPremium,
        isTrialActive,
        status: data.status,
        planId: data.plan_id,
        daysRemaining
      };

      // Cache the result
      this.cache.set(userId, { status, timestamp: Date.now() });
      
      console.log('💎 Subscription status determined:', {
        hasAccess,
        isPremium,
        isTrialActive,
        status: data.status
      });

      return status;

    } catch (error) {
      console.error('❌ Error getting fast subscription status:', error);
      
      // Return safe fallback
      const fallbackStatus: FastSubscriptionStatus = {
        hasAccess: false,
        isPremium: false,
        isTrialActive: false,
        status: 'error'
      };
      
      return fallbackStatus;
    }
  }

  /**
   * Clear cache for a user
   */
  static clearCache(userId?: string): void {
    if (userId) {
      this.cache.delete(userId);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

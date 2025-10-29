/**
 * DatabaseSubscriptionManager - Single Source of Truth for Subscription State
 * 
 * This service makes the database the authoritative source for subscription status,
 * eliminating dependency on RevenueCat for app startup and subscription checks.
 * RevenueCat is only used for payments, webhooks update the database.
 */

import { supabase, executeWithResilience } from './supabaseService';
import { ColdStartCache } from './coldStartCache';

export interface DatabaseSubscriptionStatus {
  // Core status
  hasAccess: boolean;
  isPremium: boolean;
  isTrialActive: boolean;
  status: 'trial' | 'active' | 'expired' | 'cancelled' | 'past_due' | 'none';
  
  // Detailed info
  planId?: string;
  planName?: string;
  trialEndsAt?: Date;
  subscriptionEndsAt?: Date;
  autoRenew?: boolean;
  daysRemaining?: number;
  
  // Metadata
  lastUpdated?: Date;
  source: 'database' | 'cache' | 'fallback';
}

export interface UserSubscriptionRecord {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  is_premium: boolean;
  trial_start_date: string;
  trial_end_date: string;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  auto_renew: boolean;
  revenuecat_user_id: string | null;
  created_at: string;
  updated_at: string;
  subscription_plans?: {
    id: string;
    name: string;
    description: string;
  };
}

export class DatabaseSubscriptionManager {
  private static cache: Map<string, { status: DatabaseSubscriptionStatus; timestamp: number }> = new Map();
  private static readonly CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for real-time feel

  /**
   * Get subscription status from database (primary method)
   * This is now the single source of truth for subscription state
   */
  static async getSubscriptionStatus(userId: string, useCache: boolean = true): Promise<DatabaseSubscriptionStatus> {
    try {
      // Check memory cache first
      if (useCache) {
        const cached = this.cache.get(userId);
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
          console.log('💾 Using memory cached subscription status');
          cached.status.source = 'cache';
          return cached.status;
        }
      }

      console.log('🔄 Fetching fresh subscription status from database for user:', userId);
      
      // Get subscription data from database with resilience
      const subscriptionData = await executeWithResilience(
        () => this.fetchSubscriptionFromDatabase(userId),
        'database-subscription-fetch',
        { timeoutMs: 5000, maxRetries: 2 }
      );

      const status = this.processSubscriptionData(subscriptionData);
      status.source = 'database';

      // Cache successful result
      this.cache.set(userId, { 
        status: { ...status }, 
        timestamp: Date.now() 
      });

      // Also cache in persistent storage for cold starts
      await ColdStartCache.cacheSubscriptionStatus({
        hasAccess: status.hasAccess,
        isTrialActive: status.isTrialActive,
        isPremium: status.isPremium,
        status: status.status,
        trialEndsAt: status.trialEndsAt?.toISOString(),
        subscriptionEndsAt: status.subscriptionEndsAt?.toISOString()
      });

      console.log('✅ Database subscription status processed:', {
        hasAccess: status.hasAccess,
        isPremium: status.isPremium,
        status: status.status,
        daysRemaining: status.daysRemaining
      });

      return status;

    } catch (error) {
      console.error('❌ Error fetching database subscription status:', error);
      
      // Try to use persistent cache as fallback
      try {
        const cachedStatus = await ColdStartCache.loadCachedSubscriptionStatus();
        if (cachedStatus) {
          console.log('⚠️ Using persistent cache due to database error');
          return this.convertCacheToStatus(cachedStatus, 'cache');
        }
      } catch (cacheError) {
        console.error('❌ Cache fallback also failed:', cacheError);
      }

      // Last resort fallback
      console.log('🆘 Using fallback subscription status');
      return this.getFallbackStatus('fallback');
    }
  }

  /**
   * Fetch subscription data from database
   */
  private static async fetchSubscriptionFromDatabase(userId: string): Promise<UserSubscriptionRecord | null> {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plans (
          id,
          name,
          description
        )
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(); // Use maybeSingle to handle no results gracefully

    if (error) {
      console.error('Database subscription query error:', error);
      throw error;
    }

    return data;
  }

  /**
   * Process raw database data into standardized status
   */
  private static processSubscriptionData(data: UserSubscriptionRecord | null): DatabaseSubscriptionStatus {
    if (!data) {
      // No subscription record - new user or free user
      return this.getFallbackStatus('database');
    }

    const now = new Date();
    const trialEndDate = data.trial_end_date ? new Date(data.trial_end_date) : null;
    const subscriptionEndDate = data.subscription_end_date ? new Date(data.subscription_end_date) : null;

    // Determine if trial is active
    const isTrialActive = data.status === 'trial' && trialEndDate && trialEndDate > now;
    
    // Determine if subscription is active
    const isSubscriptionActive = ['active', 'cancelled'].includes(data.status) && 
                                subscriptionEndDate && 
                                subscriptionEndDate > now;

    // User has access if they have active trial OR active subscription
    const hasAccess = isTrialActive || isSubscriptionActive || data.is_premium === true;
    
    // User is premium if they have paid subscription (not just trial)
    const isPremium = isSubscriptionActive || (data.is_premium === true && data.status !== 'trial');

    // Calculate days remaining
    let daysRemaining = 0;
    if (isTrialActive && trialEndDate) {
      daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    } else if (isSubscriptionActive && subscriptionEndDate) {
      daysRemaining = Math.ceil((subscriptionEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      hasAccess,
      isPremium,
      isTrialActive,
      status: data.status as any,
      planId: data.plan_id,
      planName: data.subscription_plans?.name,
      trialEndsAt: trialEndDate,
      subscriptionEndsAt: subscriptionEndDate,
      autoRenew: data.auto_renew,
      daysRemaining: Math.max(0, daysRemaining),
      lastUpdated: new Date(data.updated_at),
      source: 'database'
    };
  }

  /**
   * Convert cache format to status format
   */
  private static convertCacheToStatus(cache: any, source: string): DatabaseSubscriptionStatus {
    return {
      hasAccess: cache.hasAccess || false,
      isPremium: cache.isPremium || false,
      isTrialActive: cache.isTrialActive || false,
      status: cache.status || 'none',
      trialEndsAt: cache.trialEndsAt ? new Date(cache.trialEndsAt) : undefined,
      subscriptionEndsAt: cache.subscriptionEndsAt ? new Date(cache.subscriptionEndsAt) : undefined,
      source: source as any
    };
  }

  /**
   * Fallback status for when database is unavailable
   */
  private static getFallbackStatus(source: string): DatabaseSubscriptionStatus {
    return {
      hasAccess: false,
      isPremium: false,
      isTrialActive: false,
      status: 'none',
      daysRemaining: 0,
      source: source as any
    };
  }

  /**
   * Force refresh subscription status (bypass cache)
   */
  static async refreshSubscriptionStatus(userId: string): Promise<DatabaseSubscriptionStatus> {
    console.log('🔄 Force refreshing subscription status for user:', userId);
    
    // Clear caches
    this.cache.delete(userId);
    
    // Fetch fresh data
    return this.getSubscriptionStatus(userId, false);
  }

  /**
   * Check if user has specific access level
   */
  static async hasAccess(userId: string, level: 'trial' | 'premium' | 'any' = 'any'): Promise<boolean> {
    const status = await this.getSubscriptionStatus(userId);
    
    switch (level) {
      case 'trial':
        return status.isTrialActive;
      case 'premium':
        return status.isPremium;
      case 'any':
      default:
        return status.hasAccess;
    }
  }

  /**
   * Get user's subscription plan details
   */
  static async getSubscriptionPlan(userId: string): Promise<{ id: string; name: string; description?: string } | null> {
    try {
      const status = await this.getSubscriptionStatus(userId);
      
      if (!status.planId) {
        return null;
      }

      // Get detailed plan information
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, name, description, price_monthly, price_yearly, features')
        .eq('id', status.planId)
        .single();

      if (error) {
        console.error('Error fetching plan details:', error);
        return null;
      }

      return data;

    } catch (error) {
      console.error('Error getting subscription plan:', error);
      return null;
    }
  }

  /**
   * Create or update trial for new user
   */
  static async createTrial(userId: string, trialDays: number = 7): Promise<boolean> {
    try {
      console.log(`🎁 Creating ${trialDays}-day trial for user:`, userId);
      
      const now = new Date();
      const trialEnd = new Date(now.getTime() + (trialDays * 24 * 60 * 60 * 1000));

      // Get or create free trial plan
      const { data: planData } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('name', 'Free Trial')
        .single();

      if (!planData) {
        console.error('❌ Free trial plan not found in database');
        return false;
      }

      const { error } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          plan_id: planData.id,
          status: 'trial',
          is_premium: false,
          trial_start_date: now.toISOString(),
          trial_end_date: trialEnd.toISOString(),
          auto_renew: false,
          updated_at: now.toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('❌ Error creating trial:', error);
        return false;
      }

      // Clear cache to force refresh
      this.cache.delete(userId);
      
      console.log('✅ Trial created successfully');
      return true;

    } catch (error) {
      console.error('❌ Error in createTrial:', error);
      return false;
    }
  }

  /**
   * Mark subscription as manually updated (useful for admin overrides)
   */
  static async updateSubscriptionStatus(
    userId: string, 
    updates: {
      status?: string;
      isPremium?: boolean;
      subscriptionEndDate?: Date;
      planId?: string;
    }
  ): Promise<boolean> {
    try {
      console.log('🔧 Manually updating subscription for user:', userId, updates);

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.status) updateData.status = updates.status;
      if (updates.isPremium !== undefined) updateData.is_premium = updates.isPremium;
      if (updates.subscriptionEndDate) updateData.subscription_end_date = updates.subscriptionEndDate.toISOString();
      if (updates.planId) updateData.plan_id = updates.planId;

      const { error } = await supabase
        .from('user_subscriptions')
        .update(updateData)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error updating subscription:', error);
        return false;
      }

      // Clear cache to force refresh
      this.cache.delete(userId);

      console.log('✅ Subscription updated manually');
      return true;

    } catch (error) {
      console.error('❌ Error in updateSubscriptionStatus:', error);
      return false;
    }
  }

  /**
   * Clear all caches for user (useful on logout)
   */
  static clearUserCache(userId: string): void {
    this.cache.delete(userId);
    // Note: ColdStartCache.clearUserCache(userId) is handled elsewhere
  }

  /**
   * Get cache statistics for debugging
   */
  static getCacheStats(): { size: number; entries: Array<{ userId: string; age: number }> } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([userId, data]) => ({
      userId,
      age: Math.floor((now - data.timestamp) / 1000)
    }));

    return {
      size: this.cache.size,
      entries
    };
  }
}


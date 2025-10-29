import { supabase } from './supabaseService';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number | null;
  price_yearly: number | null;
  features: string[];
  is_active: boolean;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'trial' | 'active' | 'expired' | 'cancelled' | 'past_due';
  trial_start_date: string;
  trial_end_date: string;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  revenuecat_user_id: string | null;
  is_premium: boolean | null;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionStatus {
  hasAccess: boolean;
  isTrialActive: boolean;
  isPremium: boolean;
  daysRemaining: number;
  status: string;
  plan: SubscriptionPlan | null;
}

export class SubscriptionService {
  // Get all available subscription plans
  static async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true, nullsFirst: false });

      if (error) {
        console.log('🔍 SubscriptionService - subscription_plans table not found or RLS issue, using default plans');
        // Return default plans if table doesn't exist
        return [
          {
            id: 'free',
            name: 'Free Trial',
            description: '7-day free trial with full access',
            price_monthly: 0,
            price_yearly: 0,
            features: ['Cigar Recognition', 'Journal Entries', 'Humidor Management'],
            is_active: true,
          }
        ];
      }
      return data || [];
    } catch (error) {
      console.log('🔍 SubscriptionService - Error fetching subscription plans, using default:', error);
      return [
        {
          id: 'free',
          name: 'Free Trial',
          description: '7-day free trial with full access',
          price_monthly: 0,
          price_yearly: 0,
          features: ['Cigar Recognition', 'Journal Entries', 'Humidor Management'],
          is_active: true,
        }
      ];
    }
  }

  // Get user's current subscription
  static async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.log('🔍 SubscriptionService - user_subscriptions table not found or RLS issue:', error);
        return null;
      }
      return data || null;
    } catch (error) {
      console.log('🔍 SubscriptionService - Error fetching user subscription, returning null:', error);
      return null;
    }
  }

  // Check if user has active access (trial or premium)
  static async checkSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription) {
        console.log('🔍 SubscriptionService - No subscription found, providing default trial status');
        // Provide a default trial status for new users
        const trialStartDate = new Date();
        const trialEndDate = new Date(trialStartDate.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
        
        return {
          hasAccess: true,
          isTrialActive: true,
          isPremium: false,
          daysRemaining: 3,
          status: 'trial',
          plan: {
            id: 'free',
            name: 'Free Trial',
            description: '3-day free trial with full access',
            price_monthly: 0,
            price_yearly: 0,
            features: ['Cigar Recognition', 'Journal Entries', 'Humidor Management'],
            is_active: true,
          },
        };
      }

      const now = new Date();
      let hasAccess = false;
      let isTrialActive = false;
      let isPremium = false;
      let daysRemaining = 0;

      // PRIORITY: If is_premium is true (written immediately after purchase), treat as premium now
      if (subscription.is_premium === true) {
        isPremium = true;
        hasAccess = true;
        // Days remaining if we already have an end date
        if (subscription.subscription_end_date) {
          const subscriptionEndDate = new Date(subscription.subscription_end_date);
          daysRemaining = Math.ceil((subscriptionEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }
        console.log('🔍 SubscriptionService - Prioritizing is_premium=true for immediate access');
      } else if (subscription.status === 'trial') {
        const trialEndDate = new Date(subscription.trial_end_date);
        isTrialActive = trialEndDate > now;
        hasAccess = isTrialActive;
        
        if (isTrialActive) {
          daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }
        console.log('🔍 SubscriptionService - Trial status:', { isTrialActive, hasAccess, daysRemaining, trialEndDate });
      } else if (subscription.status === 'active') {
        const subscriptionEndDate = new Date(subscription.subscription_end_date || '');
        isPremium = subscriptionEndDate > now;
        hasAccess = isPremium;
        
        if (isPremium) {
          daysRemaining = Math.ceil((subscriptionEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }
        console.log('🔍 SubscriptionService - Premium status:', { isPremium, hasAccess, daysRemaining });
      } else {
        // Non-trial, non-active statuses
        if (subscription.is_premium === true) {
          isPremium = true;
          hasAccess = true;
          console.log('🔍 SubscriptionService - Using is_premium=true for access');
        }
      }

      // If user is premium, calculate days remaining from subscription end date
      if (isPremium && subscription.subscription_end_date) {
        const subscriptionEndDate = new Date(subscription.subscription_end_date);
        daysRemaining = Math.ceil((subscriptionEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }

      console.log('🔍 SubscriptionService - Final status:', {
        hasAccess,
        isTrialActive,
        isPremium,
        daysRemaining,
        status: subscription.status,
        is_premium_from_db: subscription.is_premium
      });

      return {
        hasAccess,
        isTrialActive,
        isPremium,
        daysRemaining,
        status: subscription.status,
        plan: subscription.subscription_plans as SubscriptionPlan,
      };
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return {
        hasAccess: false,
        isTrialActive: false,
        isPremium: false,
        daysRemaining: 0,
        status: 'error',
        plan: null,
      };
    }
  }

  // Track usage for analytics
  static async trackUsage(userId: string, action: string, metadata?: any) {
    try {
      const { error } = await supabase
        .from('usage_tracking')
        .insert([
          {
            user_id: userId,
            action,
            metadata: metadata || {},
          },
        ]);

      if (error) throw error;
    } catch (error) {
      console.error('Error tracking usage:', error);
      // Don't throw - usage tracking shouldn't break the app
    }
  }

  // Create premium subscription (placeholder for Stripe integration)
  static async createPremiumSubscription(
    userId: string, 
    planId: string, 
    paymentMethodId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // This would integrate with Stripe in a real implementation
      // For now, we'll simulate a successful subscription
      
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'active',
          plan_id: planId,
          subscription_start_date: new Date().toISOString(),
          subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          payment_method_id: paymentMethodId,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error creating premium subscription:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Cancel subscription
  static async cancelSubscription(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'cancelled',
          auto_renew: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Extend trial (admin function)
  static async extendTrial(userId: string, days: number): Promise<{ success: boolean; error?: string }> {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) {
        return { success: false, error: 'No subscription found' };
      }

      const currentEndDate = new Date(subscription.trial_end_date);
      const newEndDate = new Date(currentEndDate.getTime() + days * 24 * 60 * 60 * 1000);

      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          trial_end_date: newEndDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error extending trial:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}







import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { SubscriptionService, SubscriptionPlan, SubscriptionStatus } from '../services/subscriptionService';
import { DatabaseSubscriptionManager } from '../services/databaseSubscriptionManager';
import { useAuth } from './AuthContext';

interface SubscriptionContextType {
  subscriptionStatus: SubscriptionStatus | null;
  subscriptionPlans: SubscriptionPlan[];
  loading: boolean;
  refreshSubscription: () => Promise<void>;
  trackUsage: (action: string, metadata?: any) => Promise<void>;
  createPremiumSubscription: (
    planId: string,
    paymentMethodId: string,
  ) => Promise<{ success: boolean; error?: string }>;
  cancelSubscription: () => Promise<{ success: boolean; error?: string }>;
  hasFeatureAccess: (feature: string) => boolean;
  showPaywall: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);

  const loadSubscriptionData = useCallback(async (forceRefresh = false) => {
    if (!user) {
      console.log('🔍 SubscriptionContext - No user, skipping subscription data load');
      return;
    }

    try {
      setLoading(true);
      console.log(
        '🔍 SubscriptionContext - Loading subscription data for user:',
        user.id,
        forceRefresh ? '(forced refresh)' : '',
      );

      // Use DatabaseSubscriptionManager as source of truth for subscription status
      console.log('📊 Getting subscription status from database...');
      const dbStatus = await DatabaseSubscriptionManager.getSubscriptionStatus(user.id);
      const status = {
        hasAccess: dbStatus.hasAccess,
        isTrialActive: dbStatus.isTrialActive,
        isPremium: dbStatus.isPremium,
        status: dbStatus.status,
        daysRemaining: dbStatus.daysRemaining,
        plan: dbStatus.planId ? { id: dbStatus.planId, name: dbStatus.planName || '', description: '' } : undefined,
      } as any;
      console.log('🔍 SubscriptionContext - Database status result:', status);

      // Get subscription plans
      const plans = await SubscriptionService.getSubscriptionPlans();

      console.log('🔍 SubscriptionContext - Subscription status:', status);
      console.log('🔍 SubscriptionContext - Subscription plans:', plans);
      setSubscriptionStatus(status);
      setSubscriptionPlans(plans);
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      // Load subscription data in background - don't block app startup
      console.log('🔄 Loading subscription data in background for user:', user.id);
      loadSubscriptionData().catch((error) => {
        console.error('❌ Background subscription load failed:', error);
        // Don't block the app if subscription loading fails
      });
    } else {
      setSubscriptionStatus(null);
      setLoading(false);
    }
  }, [user, loadSubscriptionData]);

  useEffect(() => {
    // Check if we should show paywall
    if (subscriptionStatus) {
      // Show paywall only if user has no access (trial expired or never had subscription)
      // Don't force paywall during active trial, even on last day - let them use the app
      const shouldShowPaywall = !subscriptionStatus.hasAccess;
      setShowPaywall(shouldShowPaywall);
    }
  }, [subscriptionStatus]);

  const refreshSubscription = useCallback(async () => {
    await loadSubscriptionData(true);
  }, [loadSubscriptionData]);

  const trackUsage = useCallback(
    async (action: string, metadata?: any) => {
      if (!user) return;
      await SubscriptionService.trackUsage(user.id, action, metadata);
    },
    [user],
  );

  const createPremiumSubscription = useCallback(
    async (planId: string, paymentMethodId: string) => {
      if (!user) return { success: false, error: 'No user logged in' };

      const result = await SubscriptionService.createPremiumSubscription(
        user.id,
        planId,
        paymentMethodId,
      );

      if (result.success) {
        await refreshSubscription();
      }

      return result;
    },
    [user, refreshSubscription],
  );

  const cancelSubscription = useCallback(async () => {
    if (!user) return { success: false, error: 'No user logged in' };

    const result = await SubscriptionService.cancelSubscription(user.id);

    if (result.success) {
      await refreshSubscription();
    }

    return result;
  }, [user, refreshSubscription]);

  const hasFeatureAccess = useCallback(
    (feature: string): boolean => {
      if (!subscriptionStatus) return false;

      // During trial or active subscription, all features are available
      if (subscriptionStatus.hasAccess) return true;

      // Define free features (if any)
      const freeFeatures = ['basic_catalog_view'];
      return freeFeatures.includes(feature);
    },
    [subscriptionStatus],
  );

  const value = useMemo(
    () => ({
      subscriptionStatus,
      subscriptionPlans,
      loading,
      refreshSubscription,
      trackUsage,
      createPremiumSubscription,
      cancelSubscription,
      hasFeatureAccess,
      showPaywall,
    }),
    [
      subscriptionStatus,
      subscriptionPlans,
      loading,
      refreshSubscription,
      trackUsage,
      createPremiumSubscription,
      cancelSubscription,
      hasFeatureAccess,
      showPaywall,
    ],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};

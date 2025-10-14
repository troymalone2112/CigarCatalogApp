import React, { createContext, useContext, useEffect, useState } from 'react';
import { SubscriptionService, SubscriptionStatus, SubscriptionPlan } from '../services/subscriptionService';
import { RevenueCatService } from '../services/revenueCatService';
import { useAuth } from './AuthContext';

interface SubscriptionContextType {
  subscriptionStatus: SubscriptionStatus | null;
  subscriptionPlans: SubscriptionPlan[];
  loading: boolean;
  refreshSubscription: () => Promise<void>;
  trackUsage: (action: string, metadata?: any) => Promise<void>;
  createPremiumSubscription: (planId: string, paymentMethodId: string) => Promise<{ success: boolean; error?: string }>;
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

  useEffect(() => {
    if (user) {
      loadSubscriptionData();
    } else {
      setSubscriptionStatus(null);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Check if we should show paywall
    if (subscriptionStatus) {
      const shouldShowPaywall = !subscriptionStatus.hasAccess || 
        (subscriptionStatus.isTrialActive && subscriptionStatus.daysRemaining <= 1);
      setShowPaywall(shouldShowPaywall);
    }
  }, [subscriptionStatus]);

  const loadSubscriptionData = async () => {
    if (!user) {
      console.log('🔍 SubscriptionContext - No user, skipping subscription data load');
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 SubscriptionContext - Loading subscription data for user:', user.id);
      
      // First, try to get local status (fast)
      let status = await RevenueCatService.getLocalSubscriptionStatus(user.id);
      
      // If user is premium or trial is active, we're good
      // If trial expired, sync with RevenueCat to check for new purchases
      if (!status.hasAccess) {
        console.log('🔄 Trial expired, syncing with RevenueCat...');
        status = await RevenueCatService.syncSubscriptionStatus(user.id);
      }
      
      // Also sync with RevenueCat periodically (every 5th time or if status is expired)
      const shouldSync = Math.random() < 0.2 || status.status === 'expired';
      if (shouldSync) {
        console.log('🔄 Periodic sync with RevenueCat...');
        status = await RevenueCatService.syncSubscriptionStatus(user.id);
      }
      
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
  };

  const refreshSubscription = async () => {
    await loadSubscriptionData();
  };

  const trackUsage = async (action: string, metadata?: any) => {
    if (!user) return;
    await SubscriptionService.trackUsage(user.id, action, metadata);
  };

  const createPremiumSubscription = async (planId: string, paymentMethodId: string) => {
    if (!user) return { success: false, error: 'No user logged in' };

    const result = await SubscriptionService.createPremiumSubscription(user.id, planId, paymentMethodId);
    
    if (result.success) {
      await refreshSubscription();
    }
    
    return result;
  };

  const cancelSubscription = async () => {
    if (!user) return { success: false, error: 'No user logged in' };

    const result = await SubscriptionService.cancelSubscription(user.id);
    
    if (result.success) {
      await refreshSubscription();
    }
    
    return result;
  };

  const hasFeatureAccess = (feature: string): boolean => {
    if (!subscriptionStatus) return false;
    
    // During trial or active subscription, all features are available
    if (subscriptionStatus.hasAccess) return true;
    
    // Define free features (if any)
    const freeFeatures = ['basic_catalog_view'];
    return freeFeatures.includes(feature);
  };

  const value = {
    subscriptionStatus,
    subscriptionPlans,
    loading,
    refreshSubscription,
    trackUsage,
    createPremiumSubscription,
    cancelSubscription,
    hasFeatureAccess,
    showPaywall,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};







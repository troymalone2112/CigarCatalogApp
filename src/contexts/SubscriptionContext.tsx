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
      // Load subscription data in background - don't block app startup
      console.log('🔄 Loading subscription data in background for user:', user.id);
      loadSubscriptionData().catch(error => {
        console.error('❌ Background subscription load failed:', error);
        // Don't block the app if subscription loading fails
      });
    } else {
      setSubscriptionStatus(null);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Check if we should show paywall
    if (subscriptionStatus) {
      // Show paywall only if user has no access (trial expired or never had subscription)
      // Don't force paywall during active trial, even on last day - let them use the app
      const shouldShowPaywall = !subscriptionStatus.hasAccess;
      setShowPaywall(shouldShowPaywall);
    }
  }, [subscriptionStatus]);

  const loadSubscriptionData = async (forceRefresh = false) => {
    if (!user) {
      console.log('🔍 SubscriptionContext - No user, skipping subscription data load');
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 SubscriptionContext - Loading subscription data for user:', user.id, forceRefresh ? '(forced refresh)' : '');
      
      // Use database as source of truth for subscription status
      console.log('📊 Getting subscription status from database...');
      const status = await SubscriptionService.checkSubscriptionStatus(user.id);
      console.log('🔍 SubscriptionContext - Database status result:', status);
      
      // Only sync with RevenueCat if user is premium (has upgraded)
      if (status.isPremium && forceRefresh) {
        console.log('🔄 Premium user - syncing with RevenueCat...');
        try {
          const revenueCatStatus = await RevenueCatService.syncSubscriptionStatus(user.id);
          console.log('✅ RevenueCat sync completed for premium user');
        } catch (error) {
          console.log('⚠️ RevenueCat sync failed, using database status:', error.message);
        }
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
    await loadSubscriptionData(true); // Force refresh from database
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







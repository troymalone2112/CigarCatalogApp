import { Platform } from 'react-native';
import { supabase } from './supabaseService';

// Type definitions for RevenueCat (to avoid importing on web)
type PurchasesOffering = any;
type PurchasesPackage = any;
type CustomerInfo = any;
type PurchasesError = any;
type LOG_LEVEL = any;

// Helper to check if we're on web
const isWeb = Platform.OS === 'web';

// Dynamic import helper for RevenueCat
const getPurchases = async () => {
  if (isWeb) {
    throw new Error('RevenueCat is not available on web');
  }
  const Purchases = (await import('react-native-purchases')).default;
  return Purchases;
};

// RevenueCat API Keys - use environment variables for production security
const REVENUECAT_API_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || 'appl_OdWJAJMHMYrvZGgQDapUsNfpLmf', // iOS key for cigar app
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || 'appl_OdWJAJMHMYrvZGgQDapUsNfpLmf', // Android key
  test: process.env.EXPO_PUBLIC_REVENUECAT_TEST_KEY || 'test_gSaOwHULRwmRJyPIJSbmUhOqdGX', // Test Store key
  web: process.env.EXPO_PUBLIC_REVENUECAT_WEB_KEY || 'appl_OdWJAJMHMYrvZGgQDapUsNfpLmf', // Web key
};

// Validate RevenueCat environment variables
if (!process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY) {
  console.warn(
    '⚠️ EXPO_PUBLIC_REVENUECAT_IOS_KEY not found in environment variables, using fallback',
  );
}

// For TestFlight testing - use production iOS key
const USE_TEST_STORE = false; // TestFlight will use native iOS mode

// Product IDs (must match what you set up in RevenueCat dashboard)
export const PRODUCT_IDS = {
  MONTHLY: 'premium_monthly_2025', // Premium Monthly
  YEARLY: 'premium_yearly_2025', // Premium Yearly
};

// Entitlement IDs (what users get access to)
export const ENTITLEMENTS = {
  PREMIUM: 'premium_features', // Full access to all features
};

// Initialize RevenueCat
export const initializeRevenueCat = async (): Promise<boolean> => {
  try {
    // Delegate to PaymentService to prevent duplicate configuration
    const { PaymentService } = await import('./paymentService');
    return await PaymentService.initializeForPayments();
  } catch (error) {
    console.error('❌ RevenueCat initialization failed:', error);
    return false;
  }
};

// Get available offerings
export const getOfferings = async (): Promise<PurchasesOffering[] | null> => {
  try {
    if (isWeb) {
      console.log('⚠️ RevenueCat offerings not available on web');
      return null;
    }
    console.log('🔄 Fetching RevenueCat offerings...');

    const Purchases = await getPurchases();
    const offerings = await Purchases.getOfferings();

    if (offerings.current) {
      console.log('✅ Found current offering:', offerings.current.identifier);
      console.log(
        '📦 Available packages:',
        offerings.current.availablePackages.map((p) => p.identifier),
      );
      return [offerings.current];
    } else {
      console.log('⚠️ No current offering found');
      return null;
    }
  } catch (error) {
    console.error('❌ Error fetching offerings:', error);
    return null;
  }
};

// Get customer info
export const getCustomerInfo = async (): Promise<CustomerInfo | null> => {
  try {
    if (isWeb) {
      console.log('⚠️ RevenueCat customer info not available on web');
      return null;
    }
    console.log('🔄 Fetching customer info...');

    const Purchases = await getPurchases();
    const customerInfo = await Purchases.getCustomerInfo();

    console.log('✅ Customer info retrieved');
    console.log('👤 User ID:', customerInfo.originalAppUserId);
    console.log('🎫 Active entitlements:', Object.keys(customerInfo.entitlements.active));
    console.log('📅 Latest purchase date:', customerInfo.latestExpirationDate);

    return customerInfo;
  } catch (error) {
    console.error('❌ Error fetching customer info:', error);
    return null;
  }
};

// Purchase a package
export const purchasePackage = async (
  packageToPurchase: PurchasesPackage,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { PaymentService } = await import('./paymentService');
    const result = await PaymentService.purchasePackage(packageToPurchase as any);
    return { success: result.success, error: result.error };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Purchase failed' };
  }
};

// Restore purchases
export const restorePurchases = async (): Promise<boolean> => {
  try {
    if (isWeb) {
      console.log('⚠️ RevenueCat restore purchases not available on web');
      return false;
    }
    console.log('🔄 Restoring purchases...');

    const Purchases = await getPurchases();
    const customerInfo = await Purchases.restorePurchases();

    console.log('✅ Purchases restored');
    console.log('🎫 Active entitlements:', Object.keys(customerInfo.entitlements.active));

    return true;
  } catch (error) {
    console.error('❌ Error restoring purchases:', error);
    return false;
  }
};

// Check if user has premium access
// Updated to check for ANY active entitlements (supports both 'premium_features' and 'Premium Access')
export const hasPremiumAccess = (customerInfo: CustomerInfo): boolean => {
  const activeEntitlements = customerInfo.entitlements.active;

  // Check for specific entitlement ID first (legacy support)
  if (activeEntitlements[ENTITLEMENTS.PREMIUM] !== undefined) {
    return true;
  }

  // Check for 'Premium Access' entitlement (current RevenueCat configuration)
  if (activeEntitlements['Premium Access'] !== undefined) {
    return true;
  }

  // Fallback: check if user has ANY active entitlements (most flexible)
  // This matches PaymentService logic and will catch any entitlement configuration
  return Object.keys(activeEntitlements).length > 0;
};

// Sync subscription status with Supabase
export const syncSubscriptionWithSupabase = async (
  customerInfo: CustomerInfo,
): Promise<boolean> => {
  try {
    console.log('🔄 Syncing subscription with Supabase...');

    const hasAccess = hasPremiumAccess(customerInfo);
    const userId = customerInfo.originalAppUserId;

    console.log('👤 User ID:', userId);
    console.log('🎫 Has premium access:', hasAccess);
    console.log('🎫 Active entitlements:', Object.keys(customerInfo.entitlements.active));

    // Update user subscription in Supabase
    const { error } = await supabase.from('user_subscriptions').upsert(
      {
        user_id: userId,
        is_premium: hasAccess,
        revenuecat_user_id: customerInfo.originalAppUserId,
        last_sync_date: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      },
    );

    if (error) {
      console.error('❌ Error syncing with Supabase:', error);
      return false;
    }

    console.log('✅ Subscription synced with Supabase - is_premium set to:', hasAccess);
    return true;
  } catch (error) {
    console.error('❌ Error syncing subscription:', error);
    return false;
  }
};

// Get subscription status for display
export const getSubscriptionStatus = (customerInfo: CustomerInfo) => {
  const hasAccess = hasPremiumAccess(customerInfo);

  // Find the active entitlement (check for both entitlement IDs)
  const activeEntitlements = customerInfo.entitlements.active;
  const premiumEntitlement =
    activeEntitlements[ENTITLEMENTS.PREMIUM] ||
    activeEntitlements['Premium Access'] ||
    Object.values(activeEntitlements)[0]; // Fallback to first active entitlement

  return {
    hasAccess,
    isActive: hasAccess,
    expirationDate: premiumEntitlement?.expirationDate,
    willRenew: premiumEntitlement?.willRenew,
    productIdentifier: premiumEntitlement?.productIdentifier,
    originalPurchaseDate: premiumEntitlement?.originalPurchaseDate,
  };
};

// Export as a service object for convenience
export const RevenueCatService = {
  initialize: initializeRevenueCat,
  getOfferings,
  getCustomerInfo,
  purchasePackage,
  restorePurchases,
  hasPremiumAccess,
  syncSubscriptionWithSupabase,
  getSubscriptionStatus,
  setUserId: async (userId: string) => {
    try {
      if (isWeb) {
        console.log('⚠️ RevenueCat setUserId not available on web');
        return false;
      }
      console.log('🔄 Setting RevenueCat user ID to:', userId);

      const Purchases = await getPurchases();
      // First, get current customer info to see if we need to migrate
      const currentCustomerInfo = await Purchases.getCustomerInfo();
      const currentUserId = currentCustomerInfo.originalAppUserId;

      console.log('🔍 Current RevenueCat user ID:', currentUserId);

      // If user ID is already set correctly, no need to change
      if (currentUserId === userId) {
        console.log('✅ RevenueCat user ID already correct');
        return true;
      }

      // Force login with new user ID (this will migrate existing purchases)
      console.log('🔄 Migrating RevenueCat user ID from', currentUserId, 'to', userId);
      const loginResult = await Purchases.logIn(userId);

      console.log('✅ RevenueCat user ID migrated successfully');
      console.log('🔍 New user ID:', loginResult.customerInfo.originalAppUserId);

      return true;
    } catch (error) {
      console.error('❌ Error setting RevenueCat user ID:', error);
      return false;
    }
  },
  logOut: async () => {
    try {
      if (isWeb) {
        console.log('⚠️ RevenueCat logOut not available on web');
        return false;
      }
      const Purchases = await getPurchases();
      await Purchases.logOut();
      console.log('✅ RevenueCat user logged out');
      return true;
    } catch (error) {
      console.error('❌ Error logging out from RevenueCat:', error);
      return false;
    }
  },
  syncSubscriptionStatus: async (userId: string) => {
    try {
      if (isWeb) {
        console.log('⚠️ RevenueCat syncSubscriptionStatus not available on web');
        return false;
      }
      const Purchases = await getPurchases();
      const customerInfo = await Purchases.getCustomerInfo();
      return await syncSubscriptionWithSupabase(customerInfo);
    } catch (error) {
      console.error('❌ Error syncing subscription status:', error);
      return false;
    }
  },
  debugSubscriptionStatus: async () => {
    try {
      if (isWeb) {
        return 'RevenueCat debug not available on web';
      }
      const Purchases = await getPurchases();
      const customerInfo = await Purchases.getCustomerInfo();
      const status = getSubscriptionStatus(customerInfo);
      return (
        `User ID: ${customerInfo.originalAppUserId}\n` +
        `Has Access: ${status.hasAccess}\n` +
        `Is Active: ${status.isActive}\n` +
        `Product ID: ${status.productIdentifier || 'None'}`
      );
    } catch (error) {
      return `Error: ${error}`;
    }
  },
  forceUserMigration: async (supabaseUserId: string) => {
    try {
      if (isWeb) {
        console.log('⚠️ RevenueCat forceUserMigration not available on web');
        return false;
      }
      console.log('🔄 Force migrating RevenueCat user ID to Supabase UUID...');

      // Force the user ID change
      const success = await RevenueCatService.setUserId(supabaseUserId);

      if (success) {
        // Get updated customer info
        const Purchases = await getPurchases();
        const customerInfo = await Purchases.getCustomerInfo();

        // Sync with Supabase using the new user ID
        await syncSubscriptionWithSupabase(customerInfo);

        console.log('✅ Force migration completed successfully');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Error during force migration:', error);
      return false;
    }
  },
};

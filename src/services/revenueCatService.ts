import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';
import { 
  PurchasesOffering, 
  PurchasesPackage, 
  CustomerInfo,
  PurchasesError,
  LOG_LEVEL
} from 'react-native-purchases';
import { supabase } from './supabaseService';

// RevenueCat API Keys - use environment variables for production security
const REVENUECAT_API_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || 'appl_OdWJAJMHMYrvZGgQDapUsNfpLmf', // iOS key for cigar app
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || 'appl_OdWJAJMHMYrvZGgQDapUsNfpLmf', // Android key
  test: process.env.EXPO_PUBLIC_REVENUECAT_TEST_KEY || 'test_gSaOwHULRwmRJyPIJSbmUhOqdGX', // Test Store key
  web: process.env.EXPO_PUBLIC_REVENUECAT_WEB_KEY || 'appl_OdWJAJMHMYrvZGgQDapUsNfpLmf', // Web key
};

// Validate RevenueCat environment variables
if (!process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY) {
  console.warn('⚠️ EXPO_PUBLIC_REVENUECAT_IOS_KEY not found in environment variables, using fallback');
}

// For TestFlight testing - use production iOS key
const USE_TEST_STORE = false; // TestFlight will use native iOS mode

// Product IDs (must match what you set up in RevenueCat dashboard)
export const PRODUCT_IDS = {
  MONTHLY: 'premium_monthly', // Premium Monthly
  YEARLY: 'premium_yearly',  // Premium Yearly
};

// Entitlement IDs (what users get access to)
export const ENTITLEMENTS = {
  PREMIUM: 'premium_features', // Full access to all features
};

// Initialize RevenueCat
export const initializeRevenueCat = async (): Promise<boolean> => {
  try {
    console.log('🔄 Initializing RevenueCat...');
    
    // Determine platform and get appropriate API key
    let apiKey: string;
    let platform: string;
    
    if (Platform.OS === 'ios') {
      apiKey = USE_TEST_STORE ? REVENUECAT_API_KEYS.test : REVENUECAT_API_KEYS.ios;
      platform = 'iOS';
    } else if (Platform.OS === 'android') {
      apiKey = REVENUECAT_API_KEYS.android;
      platform = 'Android';
    } else {
      // Web/Expo Go
      apiKey = REVENUECAT_API_KEYS.web;
      platform = 'Web';
    }
    
    console.log(`📱 Platform: ${platform}`);
    console.log(`🔑 Using API key: ${apiKey.substring(0, 10)}...`);
    
    // Validate API key format
    if (!apiKey || apiKey.length < 10) {
      throw new Error(`Invalid API key for platform ${platform}: ${apiKey}`);
    }
    
    // Configure RevenueCat
    console.log('🔄 Configuring RevenueCat...');
    await Purchases.configure({
      apiKey,
      appUserID: undefined, // Let RevenueCat generate anonymous user ID
    });
    
    // Set log level for debugging
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    
    console.log('✅ RevenueCat initialized successfully');
    
    // Test the connection by getting customer info
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      console.log('✅ RevenueCat connection verified - User ID:', customerInfo.originalAppUserId);
    } catch (connectionError) {
      console.warn('⚠️ RevenueCat initialized but connection test failed:', connectionError);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ RevenueCat initialization failed:', error);
    return false;
  }
};

// Get available offerings
export const getOfferings = async (): Promise<PurchasesOffering[] | null> => {
  try {
    console.log('🔄 Fetching RevenueCat offerings...');
    
    const offerings = await Purchases.getOfferings();
    
    if (offerings.current) {
      console.log('✅ Found current offering:', offerings.current.identifier);
      console.log('📦 Available packages:', offerings.current.availablePackages.map(p => p.identifier));
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
    console.log('🔄 Fetching customer info...');
    
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
export const purchasePackage = async (packageToPurchase: PurchasesPackage): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🔄 Starting purchase...');
    console.log('📦 Package:', packageToPurchase.identifier);
    console.log('💰 Price:', packageToPurchase.product.priceString);
    
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    
    console.log('✅ Purchase successful!');
    console.log('🎫 Active entitlements:', Object.keys(customerInfo.entitlements.active));
    
    return { success: true };
    
  } catch (error: any) {
    // Check if error has the structure of a PurchasesError
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'PURCHASES_ERROR_PURCHASE_CANCELLED') {
        console.log('ℹ️ Purchase cancelled by user');
        return { success: false, error: 'Purchase cancelled by user' };
      } else {
        console.error('❌ Purchase error:', error.message || error.code);
        return { success: false, error: error.message || error.code || 'Purchase failed' };
      }
    } else {
      console.error('❌ Unexpected purchase error:', error);
      return { success: false, error: (error as Error)?.message || 'Unknown error' };
    }
  }
};

// Restore purchases
export const restorePurchases = async (): Promise<boolean> => {
  try {
    console.log('🔄 Restoring purchases...');
    
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
export const hasPremiumAccess = (customerInfo: CustomerInfo): boolean => {
  return customerInfo.entitlements.active[ENTITLEMENTS.PREMIUM] !== undefined;
};

// Sync subscription status with Supabase
export const syncSubscriptionWithSupabase = async (customerInfo: CustomerInfo): Promise<boolean> => {
  try {
    console.log('🔄 Syncing subscription with Supabase...');
    
    const hasAccess = hasPremiumAccess(customerInfo);
    const userId = customerInfo.originalAppUserId;
    
    console.log('👤 User ID:', userId);
    console.log('🎫 Has premium access:', hasAccess);
    
    // Update user subscription in Supabase
    const { error } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        is_premium: hasAccess,
        revenuecat_user_id: customerInfo.originalAppUserId,
        last_sync_date: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });
    
    if (error) {
      console.error('❌ Error syncing with Supabase:', error);
      return false;
    }
    
    console.log('✅ Subscription synced with Supabase');
    return true;
    
  } catch (error) {
    console.error('❌ Error syncing subscription:', error);
    return false;
  }
};

// Get subscription status for display
export const getSubscriptionStatus = (customerInfo: CustomerInfo) => {
  const hasAccess = hasPremiumAccess(customerInfo);
  const premiumEntitlement = customerInfo.entitlements.active[ENTITLEMENTS.PREMIUM];
  
  return {
    hasAccess,
    isActive: hasAccess,
    expirationDate: premiumEntitlement?.expirationDate,
    willRenew: premiumEntitlement?.willRenew,
    productIdentifier: premiumEntitlement?.productIdentifier,
    originalPurchaseDate: premiumEntitlement?.originalPurchaseDate
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
      await Purchases.logIn(userId);
      console.log('✅ RevenueCat user ID set:', userId);
      return true;
    } catch (error) {
      console.error('❌ Error setting RevenueCat user ID:', error);
      return false;
    }
  },
  logOut: async () => {
    try {
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
      const customerInfo = await Purchases.getCustomerInfo();
      return await syncSubscriptionWithSupabase(customerInfo);
    } catch (error) {
      console.error('❌ Error syncing subscription status:', error);
      return false;
    }
  },
  debugSubscriptionStatus: async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const status = getSubscriptionStatus(customerInfo);
      return `User ID: ${customerInfo.originalAppUserId}\n` +
        `Has Access: ${status.hasAccess}\n` +
        `Is Active: ${status.isActive}\n` +
        `Product ID: ${status.productIdentifier || 'None'}`;
    } catch (error) {
      return `Error: ${error}`;
    }
  }
};

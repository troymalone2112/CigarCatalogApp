/**
 * PaymentService - On-Demand RevenueCat for Payments Only
 *
 * This service initializes RevenueCat ONLY when needed for payments,
 * eliminating the startup dependency while maintaining payment functionality.
 */

import { Platform } from 'react-native';
import { DatabaseSubscriptionManager } from './databaseSubscriptionManager';
import { isExpoGo } from '../config/development';

// RevenueCat types (we'll import dynamically to avoid startup dependency)
type PurchasesOffering = any;
type PurchasesPackage = any;
type CustomerInfo = any;

export interface PaymentResult {
  success: boolean;
  error?: string;
  customerInfo?: CustomerInfo;
}

export interface PaymentOffering {
  identifier: string;
  serverDescription: string;
  packages: PaymentPackage[];
}

export interface PaymentPackage {
  identifier: string;
  packageType: string;
  product: {
    identifier: string;
    description: string;
    priceString: string;
  };
}

export class PaymentService {
  private static isInitialized = false;
  private static initializationPromise: Promise<boolean> | null = null;
  private static purchasingInProgress = false;

  // RevenueCat configuration - use environment variables with fallbacks
  private static readonly REVENUECAT_API_KEYS = {
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || 'appl_OdWJAJMHMYrvZGgQDapUsNfpLmf',
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || 'appl_OdWJAJMHMYrvZGgQDapUsNfpLmf',
    web: process.env.EXPO_PUBLIC_REVENUECAT_WEB_KEY || 'appl_OdWJAJMHMYrvZGgQDapUsNfpLmf',
  };

  /**
   * Initialize RevenueCat only when needed for payments
   */
  static async initializeForPayments(): Promise<boolean> {
    // In Expo Go, native store isn't available. Silently no-op to avoid noisy errors.
    if (isExpoGo()) {
      console.log('🧪 Expo Go detected: skipping RevenueCat initialization (payments disabled)');
      this.isInitialized = false;
      return false;
    }
    // Return existing initialization if in progress
    if (this.initializationPromise) {
      console.log('🔄 RevenueCat initialization already in progress, waiting...');
      return this.initializationPromise;
    }

    // Return true if already initialized
    if (this.isInitialized) {
      console.log('✅ RevenueCat already initialized for payments');
      return true;
    }

    console.log('🔄 Initializing RevenueCat for payments...');

    // Create initialization promise
    this.initializationPromise = this.performInitialization();

    try {
      const result = await this.initializationPromise;
      this.isInitialized = result;
      return result;
    } finally {
      this.initializationPromise = null;
    }
  }

  /**
   * Perform the actual RevenueCat initialization
   */
  private static async performInitialization(): Promise<boolean> {
    try {
      if (isExpoGo()) {
        // Double guard – never attempt native SDK init in Expo Go
        return false;
      }
      // Dynamic import to avoid loading RevenueCat on app startup
      const Purchases = (await import('react-native-purchases')).default;
      const { LOG_LEVEL } = await import('react-native-purchases');

      // Determine platform and API key
      let apiKey: string;
      if (Platform.OS === 'ios') {
        apiKey = this.REVENUECAT_API_KEYS.ios;
      } else if (Platform.OS === 'android') {
        apiKey = this.REVENUECAT_API_KEYS.android;
      } else {
        apiKey = this.REVENUECAT_API_KEYS.web;
      }

      console.log(`📱 Initializing RevenueCat for ${Platform.OS}`);

      // Configure RevenueCat with timeout
      const configPromise = Purchases.configure({
        apiKey,
        appUserID: undefined, // Will be set later when user is identified
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('RevenueCat initialization timeout')), 8000),
      );

      await Promise.race([configPromise, timeoutPromise]);

      // Set log level for debugging
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);

      // Sync purchases to process any pending StoreKit transactions
      // This helps clear the transaction queue from previous failed attempts
      try {
        console.log('🔄 Syncing purchases to process pending transactions...');
        await Purchases.getCustomerInfo();
        console.log('✅ Purchase sync completed - pending transactions processed');
      } catch (syncError) {
        // Don't fail initialization if sync fails - it's non-critical
        console.warn('⚠️ Purchase sync warning (non-critical):', syncError);
      }

      console.log('✅ RevenueCat initialized successfully for payments');
      return true;
    } catch (error) {
      console.error('❌ RevenueCat initialization failed:', error);
      return false;
    }
  }

  /**
   * Set user ID for RevenueCat (call this when user is authenticated)
   */
  static async setUserId(userId: string): Promise<boolean> {
    try {
      if (isExpoGo()) {
        // Consider user ID set in Expo Go without touching SDK
        console.log('🧪 Expo Go: skipping RevenueCat setUserId');
        return true;
      }
      await this.initializeForPayments();

      if (!this.isInitialized) {
        console.error('❌ Cannot set user ID - RevenueCat not initialized');
        return false;
      }

      const Purchases = (await import('react-native-purchases')).default;
      await Purchases.logIn(userId);

      console.log('✅ RevenueCat user ID set:', userId);
      return true;
    } catch (error) {
      console.error('❌ Error setting RevenueCat user ID:', error);
      return false;
    }
  }

  /**
   * Get available subscription offerings for purchase
   */
  static async getOfferings(): Promise<PaymentOffering[]> {
    try {
      if (isExpoGo()) return [];
      await this.initializeForPayments();

      if (!this.isInitialized) {
        console.error('❌ Cannot get offerings - RevenueCat not initialized');
        return [];
      }

      const Purchases = (await import('react-native-purchases')).default;

      console.log('📦 Fetching RevenueCat offerings...');
      const offerings = await Purchases.getOfferings();

      if (!offerings.current) {
        console.log('⚠️ No current offering found');
        return [];
      }

      // Convert RevenueCat offerings to our format
      const paymentOfferings: PaymentOffering[] = Object.values(offerings.all).map(
        (offering: PurchasesOffering) => ({
          identifier: offering.identifier,
          serverDescription: offering.serverDescription,
          packages: offering.availablePackages.map((pkg: PurchasesPackage) => ({
            identifier: pkg.identifier,
            packageType: pkg.packageType,
            product: {
              identifier: pkg.product.identifier,
              description: pkg.product.description,
              priceString: pkg.product.priceString,
            },
          })),
        }),
      );

      console.log('✅ Offerings fetched:', paymentOfferings.length);
      return paymentOfferings;
    } catch (error) {
      console.error('❌ Error fetching offerings:', error);
      return [];
    }
  }

  /**
   * Get raw RevenueCat packages (needed for purchasePackage calls)
   * This centralizes all RevenueCat SDK calls through PaymentService
   */
  static async getRawPackages(): Promise<PurchasesPackage[]> {
    try {
      if (isExpoGo()) return [];
      await this.initializeForPayments();

      if (!this.isInitialized) {
        console.error('❌ Cannot get packages - RevenueCat not initialized');
        return [];
      }

      const Purchases = (await import('react-native-purchases')).default;

      console.log('📦 Fetching RevenueCat packages (raw)...');
      const offerings = await Purchases.getOfferings();

      if (!offerings.current || !offerings.current.availablePackages) {
        console.log('⚠️ No current offering or packages available');
        return [];
      }

      const packages = offerings.current.availablePackages;
      console.log('✅ Packages fetched:', packages.length);
      console.log(
        '📦 Package identifiers:',
        packages.map((pkg) => ({
          identifier: pkg.identifier,
          productId: pkg.product.identifier,
        })),
      );

      return packages;
    } catch (error) {
      console.error('❌ Error fetching packages:', error);
      return [];
    }
  }

  /**
   * Purchase a subscription package (accepts RevenueCat package object)
   */
  static async purchasePackage(packageToPurchase: any): Promise<PaymentResult> {
    try {
      if (isExpoGo()) {
        return { success: false, error: 'Purchases disabled in Expo Go' };
      }
      await this.initializeForPayments();

      if (!this.isInitialized) {
        return {
          success: false,
          error: 'RevenueCat not initialized',
        };
      }

      // Prevent concurrent purchases that can cause duplicate StoreKit transactions
      if (this.purchasingInProgress) {
        console.warn('⚠️ Purchase attempt ignored: another purchase is already in progress');
        console.warn('⚠️ Guard is working - preventing duplicate purchase calls');
        return {
          success: false,
          error: 'Another purchase is already in progress. Please wait.',
        };
      }

      const Purchases = (await import('react-native-purchases')).default;

      console.log('💳 Starting purchase:', packageToPurchase.identifier);
      console.log('🔒 Purchase guard: ENABLED (prevents concurrent purchases)');

      this.purchasingInProgress = true;

      // Perform the purchase
      // Note: If StoreKit shows many "Updating existing transaction" messages,
      // this indicates old transactions are in the queue from previous failed attempts.
      // This is a StoreKit backlog issue, not caused by our code.
      console.log('💰 Calling RevenueCat purchasePackage (single call)');
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);

      console.log('✅ Purchase completed successfully');
      console.log('🎫 Active entitlements:', Object.keys(customerInfo.entitlements.active));
      console.log('🔓 Purchase guard: RELEASED (ready for next purchase)');

      // Note: If you see many "Updating existing transaction" logs from StoreKit,
      // those are OLD transactions queued from previous purchase attempts.
      // To clear them: Delete app → Reinstall → New purchase
      // This does NOT indicate our code is creating duplicate purchases.

      return {
        success: true,
        customerInfo,
      };
    } catch (error: any) {
      console.error('❌ Purchase error:', error);

      // Handle specific RevenueCat error types
      if (error.code === 'PURCHASES_ERROR_PURCHASE_CANCELLED') {
        return {
          success: false,
          error: 'Purchase cancelled by user',
        };
      } else if (error.code === 'PURCHASES_ERROR_PAYMENT_PENDING') {
        return {
          success: false,
          error: 'Payment is pending approval',
        };
      } else {
        return {
          success: false,
          error: error.message || 'Purchase failed',
        };
      }
    } finally {
      this.purchasingInProgress = false;
    }
  }

  /**
   * Restore previous purchases
   */
  static async restorePurchases(): Promise<PaymentResult> {
    try {
      if (isExpoGo()) {
        return { success: false, error: 'Restore disabled in Expo Go' };
      }
      await this.initializeForPayments();

      if (!this.isInitialized) {
        return {
          success: false,
          error: 'RevenueCat not initialized',
        };
      }

      const Purchases = (await import('react-native-purchases')).default;

      console.log('🔄 Restoring purchases...');
      const { customerInfo } = await Purchases.restorePurchases();

      console.log('✅ Purchases restored successfully');
      console.log('🎫 Active entitlements:', Object.keys(customerInfo.entitlements.active));

      return {
        success: true,
        customerInfo,
      };
    } catch (error: any) {
      console.error('❌ Restore purchases error:', error);
      return {
        success: false,
        error: error.message || 'Restore failed',
      };
    }
  }

  /**
   * Get current customer info (for verification)
   */
  static async getCustomerInfo(): Promise<CustomerInfo | null> {
    try {
      if (isExpoGo()) return null;
      await this.initializeForPayments();

      if (!this.isInitialized) {
        console.error('❌ Cannot get customer info - RevenueCat not initialized');
        return null;
      }

      const Purchases = (await import('react-native-purchases')).default;
      const customerInfo = await Purchases.getCustomerInfo();

      return customerInfo;
    } catch (error) {
      console.error('❌ Error getting customer info:', error);
      return null;
    }
  }

  /**
   * Sync RevenueCat state with database after purchase
   */
  static async syncWithDatabase(userId: string, customerInfo: CustomerInfo): Promise<boolean> {
    try {
      console.log('🔄 Syncing purchase with database...');

      // Extract subscription info from RevenueCat
      const activeEntitlements = customerInfo.entitlements.active;
      const isPremium = Object.keys(activeEntitlements).length > 0;

      let subscriptionEndDate: Date | undefined;
      let planName = 'Premium Monthly'; // Default

      if (isPremium) {
        const entitlement = Object.values(activeEntitlements)[0] as any;
        subscriptionEndDate = new Date(entitlement.expirationDate);

        // Determine plan based on product identifier
        const productId = entitlement.productIdentifier;
        if (productId.includes('yearly') || productId.includes('annual')) {
          planName = 'Premium Yearly';
        }
      }

      // Update database via webhook simulation or direct update
      // Note: In production, this should be handled by RevenueCat webhooks
      // But we can also update directly as a backup

      console.log('📊 Subscription info:', {
        isPremium,
        subscriptionEndDate,
        planName,
      });

      // Force refresh of database subscription status
      await DatabaseSubscriptionManager.refreshSubscriptionStatus(userId);

      console.log('✅ Database sync completed');
      return true;
    } catch (error) {
      console.error('❌ Error syncing with database:', error);
      return false;
    }
  }

  /**
   * Logout from RevenueCat (call on user logout)
   */
  static async logout(): Promise<void> {
    try {
      if (isExpoGo()) return;
      if (!this.isInitialized) {
        return; // Nothing to logout from
      }

      const Purchases = (await import('react-native-purchases')).default;
      await Purchases.logOut();

      console.log('✅ Logged out from RevenueCat');
    } catch (error) {
      console.error('❌ Error logging out from RevenueCat:', error);
    }
  }

  /**
   * Check if RevenueCat is available for payments
   */
  static isAvailable(): boolean {
    return this.isInitialized;
  }

  /**
   * Get initialization status for debugging
   */
  static getStatus(): {
    isInitialized: boolean;
    initializationInProgress: boolean;
    platform: string;
  } {
    return {
      isInitialized: this.isInitialized,
      initializationInProgress: this.initializationPromise !== null,
      platform: Platform.OS,
    };
  }
}

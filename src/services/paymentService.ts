/**
 * PaymentService - On-Demand RevenueCat for Payments Only
 * 
 * This service initializes RevenueCat ONLY when needed for payments,
 * eliminating the startup dependency while maintaining payment functionality.
 */

import { Platform } from 'react-native';
import { DatabaseSubscriptionManager } from './databaseSubscriptionManager';

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
  
  // RevenueCat configuration
  private static readonly REVENUECAT_API_KEYS = {
    ios: 'appl_OdWJAJMHMYrvZGgQDapUsNfpLmf',
    android: 'appl_OdWJAJMHMYrvZGgQDapUsNfpLmf', // Using iOS key for now
    web: 'appl_OdWJAJMHMYrvZGgQDapUsNfpLmf'
  };

  /**
   * Initialize RevenueCat only when needed for payments
   */
  static async initializeForPayments(): Promise<boolean> {
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
        setTimeout(() => reject(new Error('RevenueCat initialization timeout')), 8000)
      );

      await Promise.race([configPromise, timeoutPromise]);

      // Set log level for debugging
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);

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
      const paymentOfferings: PaymentOffering[] = Object.values(offerings.all).map((offering: PurchasesOffering) => ({
        identifier: offering.identifier,
        serverDescription: offering.serverDescription,
        packages: offering.availablePackages.map((pkg: PurchasesPackage) => ({
          identifier: pkg.identifier,
          packageType: pkg.packageType,
          product: {
            identifier: pkg.product.identifier,
            description: pkg.product.description,
            priceString: pkg.product.priceString
          }
        }))
      }));

      console.log('✅ Offerings fetched:', paymentOfferings.length);
      return paymentOfferings;

    } catch (error) {
      console.error('❌ Error fetching offerings:', error);
      return [];
    }
  }

  /**
   * Purchase a subscription package (accepts RevenueCat package object)
   */
  static async purchasePackage(packageToPurchase: any): Promise<PaymentResult> {
    try {
      await this.initializeForPayments();

      if (!this.isInitialized) {
        return {
          success: false,
          error: 'RevenueCat not initialized'
        };
      }

      const Purchases = (await import('react-native-purchases')).default;
      
      console.log('💳 Starting purchase:', packageToPurchase.identifier);

      // Perform the purchase
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);

      console.log('✅ Purchase completed successfully');
      console.log('🎫 Active entitlements:', Object.keys(customerInfo.entitlements.active));

      return {
        success: true,
        customerInfo
      };

    } catch (error: any) {
      console.error('❌ Purchase error:', error);

      // Handle specific RevenueCat error types
      if (error.code === 'PURCHASES_ERROR_PURCHASE_CANCELLED') {
        return {
          success: false,
          error: 'Purchase cancelled by user'
        };
      } else if (error.code === 'PURCHASES_ERROR_PAYMENT_PENDING') {
        return {
          success: false,
          error: 'Payment is pending approval'
        };
      } else {
        return {
          success: false,
          error: error.message || 'Purchase failed'
        };
      }
    }
  }

  /**
   * Restore previous purchases
   */
  static async restorePurchases(): Promise<PaymentResult> {
    try {
      await this.initializeForPayments();

      if (!this.isInitialized) {
        return {
          success: false,
          error: 'RevenueCat not initialized'
        };
      }

      const Purchases = (await import('react-native-purchases')).default;
      
      console.log('🔄 Restoring purchases...');
      const { customerInfo } = await Purchases.restorePurchases();

      console.log('✅ Purchases restored successfully');
      console.log('🎫 Active entitlements:', Object.keys(customerInfo.entitlements.active));

      return {
        success: true,
        customerInfo
      };

    } catch (error: any) {
      console.error('❌ Restore purchases error:', error);
      return {
        success: false,
        error: error.message || 'Restore failed'
      };
    }
  }

  /**
   * Get current customer info (for verification)
   */
  static async getCustomerInfo(): Promise<CustomerInfo | null> {
    try {
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
        planName
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
      platform: Platform.OS
    };
  }
}

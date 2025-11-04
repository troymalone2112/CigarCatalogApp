# Facebook Ads SDK Implementation Guide

## 🚀 **Step-by-Step Implementation**

### **Step 1: Install Dependencies**

```bash
# Install Facebook Ads SDK
npm install react-native-fbsdk-next

# Install Expo development client (required for native modules)
npx expo install expo-dev-client
```

### **Step 2: Configure Your App**

#### **Update app.json**

```json
{
  "expo": {
    "name": "Cigar Catalog",
    "slug": "cigar-catalog",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.cigarcatalog",
      "config": {
        "facebookAppId": "YOUR_FACEBOOK_APP_ID",
        "facebookDisplayName": "Cigar Catalog"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "package": "com.yourcompany.cigarcatalog",
      "config": {
        "facebookAppId": "YOUR_FACEBOOK_APP_ID",
        "facebookDisplayName": "Cigar Catalog"
      }
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      [
        "react-native-fbsdk-next",
        {
          "appID": "YOUR_FACEBOOK_APP_ID",
          "clientToken": "YOUR_FACEBOOK_CLIENT_TOKEN",
          "displayName": "Cigar Catalog"
        }
      ]
    ]
  }
}
```

### **Step 3: Create Facebook Ads Service**

Create `src/services/facebookAdsService.ts`:

```typescript
import { AppEvents, Settings } from 'react-native-fbsdk-next';

export class FacebookAdsService {
  private static isInitialized = false;

  /**
   * Initialize Facebook Ads SDK
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('🔄 Facebook Ads already initialized');
      return;
    }

    try {
      console.log('📊 Initializing Facebook Ads SDK...');

      // Set user data collection
      Settings.setDataProcessingOptions(['LDU'], 0, 0);

      // Enable automatic event logging
      Settings.setAutoLogAppEventsEnabled(true);

      // Set advertiser tracking
      Settings.setAdvertiserTrackingEnabled(true);

      this.isInitialized = true;
      console.log('✅ Facebook Ads SDK initialized successfully');
    } catch (error) {
      console.error('❌ Facebook Ads initialization failed:', error);
      throw error;
    }
  }

  /**
   * Log app events for tracking
   */
  static logEvent(eventName: string, parameters?: { [key: string]: any }): void {
    try {
      if (!this.isInitialized) {
        console.warn('⚠️ Facebook Ads not initialized, skipping event:', eventName);
        return;
      }

      AppEvents.logEvent(eventName, parameters);
      console.log(`📊 Facebook event logged: ${eventName}`, parameters);
    } catch (error) {
      console.error('❌ Failed to log Facebook event:', error);
    }
  }

  /**
   * Track user registration
   */
  static trackRegistration(method: string = 'email'): void {
    this.logEvent('fb_mobile_complete_registration', {
      fb_registration_method: method,
      app_name: 'Cigar Catalog',
    });
  }

  /**
   * Track trial start
   */
  static trackTrialStart(): void {
    this.logEvent('fb_mobile_start_trial', {
      fb_content_type: 'subscription',
      fb_content_name: 'Free Trial',
    });
  }

  /**
   * Track subscription purchase
   */
  static trackSubscriptionPurchase(
    planType: string,
    price: number,
    currency: string = 'USD',
  ): void {
    this.logEvent('fb_mobile_purchase', {
      fb_currency: currency,
      fb_content_type: 'subscription',
      fb_content_name: planType,
      value: price,
    });
  }

  /**
   * Track cigar recognition
   */
  static trackCigarRecognition(success: boolean, method: string = 'camera'): void {
    this.logEvent('cigar_recognition', {
      success: success,
      method: method,
      app_name: 'Cigar Catalog',
    });
  }

  /**
   * Track journal entry creation
   */
  static trackJournalEntry(): void {
    this.logEvent('journal_entry_created', {
      app_name: 'Cigar Catalog',
    });
  }

  /**
   * Track humidor interaction
   */
  static trackHumidorAction(action: string): void {
    this.logEvent('humidor_action', {
      action: action,
      app_name: 'Cigar Catalog',
    });
  }

  /**
   * Set user ID for better tracking
   */
  static setUserId(userId: string): void {
    try {
      AppEvents.setUserID(userId);
      console.log('📊 Facebook user ID set:', userId);
    } catch (error) {
      console.error('❌ Failed to set Facebook user ID:', error);
    }
  }

  /**
   * Track custom events
   */
  static trackCustomEvent(eventName: string, value?: number, currency?: string): void {
    const parameters: { [key: string]: any } = {
      app_name: 'Cigar Catalog',
    };

    if (value !== undefined) {
      parameters.value = value;
    }
    if (currency) {
      parameters.fb_currency = currency;
    }

    this.logEvent(eventName, parameters);
  }
}
```

### **Step 4: Integrate with Your App**

#### **Update App.tsx**

```typescript
import React, { useEffect } from 'react';
import { FacebookAdsService } from './src/services/facebookAdsService';

export default function App() {
  useEffect(() => {
    // Initialize Facebook Ads
    const initializeFacebookAds = async () => {
      try {
        await FacebookAdsService.initialize();
        console.log('✅ Facebook Ads initialized');
      } catch (error) {
        console.error('❌ Facebook Ads initialization failed:', error);
      }
    };

    initializeFacebookAds();
  }, []);

  // ... rest of your existing app code
}
```

#### **Update AuthContext.tsx**

```typescript
import { FacebookAdsService } from '../services/facebookAdsService';

// In your signUp function
const signUp = async (email: string, password: string, fullName: string) => {
  try {
    const result = await AuthService.signUp(email, password, fullName);

    // Track registration with Facebook
    FacebookAdsService.trackRegistration('email');
    FacebookAdsService.setUserId(result.user?.id);

    return result;
  } catch (error) {
    throw error;
  }
};
```

#### **Update RevenueCatService.tsx**

```typescript
import { FacebookAdsService } from './facebookAdsService';

// In your purchasePackage function
static async purchasePackage(packageToPurchase: PurchasesPackage): Promise<{ success: boolean; error?: string }> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);

    // Track purchase with Facebook
    FacebookAdsService.trackSubscriptionPurchase(
      packageToPurchase.product.identifier,
      parseFloat(packageToPurchase.product.priceString.replace('$', '')),
      packageToPurchase.product.currencyCode
    );

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

#### **Update EnhancedCigarRecognitionScreen.tsx**

```typescript
import { FacebookAdsService } from '../services/facebookAdsService';

// In your takePicture function after successful recognition
if (recognitionResult && recognitionResult.enrichedCigar) {
  // Track successful recognition
  FacebookAdsService.trackCigarRecognition(true, 'camera');
  // ... rest of your existing logic
}
```

### **Step 5: Create Development Build**

Since you're using Expo, you'll need to create a development build:

```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Configure EAS
eas build:configure

# Create development build for iOS
eas build --profile development --platform ios

# Create development build for Android
eas build --profile development --platform android
```

### **Step 6: Test the Integration**

Create a test component to verify events are being sent:

```typescript
// src/components/FacebookAdsTest.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FacebookAdsService } from '../services/facebookAdsService';

export default function FacebookAdsTest() {
  const testEvents = () => {
    FacebookAdsService.trackRegistration('email');
    FacebookAdsService.trackTrialStart();
    FacebookAdsService.trackCigarRecognition(true, 'camera');
    FacebookAdsService.trackJournalEntry();
    FacebookAdsService.trackHumidorAction('add_cigar');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Facebook Ads Test</Text>
      <TouchableOpacity style={styles.button} onPress={testEvents}>
        <Text style={styles.buttonText}>Test Events</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    margin: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#DC851F',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

## 🔧 **How It Works**

### **1. Event Tracking Flow**

```
User Action → Your App → FacebookAdsService → Facebook SDK → Facebook Servers → Ads Manager
```

### **2. Key Events Tracked**

- **Registration**: When user signs up
- **Trial Start**: When user starts free trial
- **Purchase**: When user upgrades to premium
- **Cigar Recognition**: When user scans a cigar
- **Journal Entry**: When user creates journal entry
- **Humidor Actions**: When user adds cigars to humidor

### **3. Facebook Ads Manager Integration**

- **Events appear** in Facebook Events Manager
- **Create custom audiences** based on events
- **Optimize ad campaigns** for specific events
- **Track conversion rates** and ROI

## 📱 **Testing & Verification**

1. **Use Facebook Events Manager** to verify events
2. **Test on development build** (not Expo Go)
3. **Check event parameters** in Facebook dashboard
4. **Verify conversion tracking** works correctly

## 🚨 **Important Notes**

- **Development Build Required**: Facebook SDK won't work in Expo Go
- **App Tracking Transparency**: Required for iOS 14.5+
- **Privacy Compliance**: Ensure GDPR/CCPA compliance
- **Testing**: Use Facebook Events Manager to verify events

This integration will give you powerful insights into user behavior and help optimize your ad campaigns! 🚀

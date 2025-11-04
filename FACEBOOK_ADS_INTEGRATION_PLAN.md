# Facebook Ads SDK Integration Plan

## 🎯 **Overview**

Integrate Facebook Ads SDK to track user events, conversions, and optimize ad campaigns for your cigar catalog app.

## 📋 **Integration Steps**

### **Step 1: Install Facebook Ads SDK**

```bash
# Install the Facebook Ads SDK
npm install react-native-fbsdk-next

# For Expo managed workflow, you'll need to use a development build
npx expo install expo-dev-client
```

### **Step 2: Configure Facebook App**

1. **Create Facebook App** at [developers.facebook.com](https://developers.facebook.com)
2. **Add Facebook Login** product to your app
3. **Get App ID and App Secret**
4. **Configure App Settings**:
   - Bundle ID: `com.yourcompany.cigarcatalog` (match your app.json)
   - iOS Bundle ID: Same as above
   - Android Package Name: Same as above

### **Step 3: Configure App.json**

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

### **Step 4: Create Facebook Ads Service**

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

### **Step 5: Integrate with App.tsx**

```typescript
// Add to App.tsx
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

  // ... rest of your app
}
```

### **Step 6: Add Tracking to Key Events**

#### **User Registration (AuthContext.tsx)**

```typescript
import { FacebookAdsService } from '../services/facebookAdsService';

// In signUp function
const signUp = async (email: string, password: string, fullName: string) => {
  try {
    const result = await AuthService.signUp(email, password, fullName);

    // Track registration
    FacebookAdsService.trackRegistration('email');
    FacebookAdsService.setUserId(result.user?.id);

    return result;
  } catch (error) {
    throw error;
  }
};
```

#### **Trial Start (SubscriptionService.tsx)**

```typescript
import { FacebookAdsService } from './facebookAdsService';

// In checkSubscriptionStatus when trial is active
if (subscription.status === 'trial') {
  // Track trial start
  FacebookAdsService.trackTrialStart();
  // ... rest of logic
}
```

#### **Subscription Purchase (RevenueCatService.tsx)**

```typescript
import { FacebookAdsService } from './facebookAdsService';

// In purchasePackage function
static async purchasePackage(packageToPurchase: PurchasesPackage): Promise<{ success: boolean; error?: string }> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);

    // Track purchase
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

#### **Cigar Recognition (EnhancedCigarRecognitionScreen.tsx)**

```typescript
import { FacebookAdsService } from '../services/facebookAdsService';

// In takePicture function after successful recognition
if (recognitionResult && recognitionResult.enrichedCigar) {
  // Track successful recognition
  FacebookAdsService.trackCigarRecognition(true, 'camera');
  // ... rest of logic
}
```

#### **Journal Entry (JournalEntryScreen.tsx)**

```typescript
import { FacebookAdsService } from '../services/facebookAdsService';

// After saving journal entry
const saveJournalEntry = async () => {
  try {
    await StorageService.saveJournalEntry(entryData);

    // Track journal entry creation
    FacebookAdsService.trackJournalEntry();

    // Navigate back
    navigation.goBack();
  } catch (error) {
    console.error('Failed to save journal entry:', error);
  }
};
```

### **Step 7: Create Development Build**

Since you're using Expo, you'll need to create a development build:

```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Configure EAS
eas build:configure

# Create development build
eas build --profile development --platform ios
eas build --profile development --platform android
```

### **Step 8: Test Events**

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

## 🎯 **Key Events to Track**

### **Conversion Events**

- ✅ **Registration**: `fb_mobile_complete_registration`
- ✅ **Trial Start**: `fb_mobile_start_trial`
- ✅ **Purchase**: `fb_mobile_purchase`
- ✅ **App Install**: Automatic

### **Engagement Events**

- ✅ **Cigar Recognition**: Custom event
- ✅ **Journal Entry**: Custom event
- ✅ **Humidor Actions**: Custom event
- ✅ **App Opens**: Automatic

## 📊 **Facebook Ads Manager Setup**

1. **Create Campaign** in Facebook Ads Manager
2. **Set Conversion Events**:
   - Primary: `fb_mobile_purchase`
   - Secondary: `fb_mobile_start_trial`
3. **Create Custom Audiences**:
   - Trial users
   - Purchased users
   - Engaged users
4. **Set Up Lookalike Audiences** based on purchasers

## 🔧 **Testing & Verification**

1. **Use Facebook Events Manager** to verify events
2. **Test on development build** (not Expo Go)
3. **Check event parameters** in Facebook dashboard
4. **Verify conversion tracking** works correctly

## 📱 **Platform Considerations**

- **iOS**: Requires App Tracking Transparency (ATT) permission
- **Android**: Requires Google Play Services
- **Privacy**: Ensure GDPR/CCPA compliance

This integration will give you powerful insights into user behavior and help optimize your ad campaigns for better ROI! 🚀

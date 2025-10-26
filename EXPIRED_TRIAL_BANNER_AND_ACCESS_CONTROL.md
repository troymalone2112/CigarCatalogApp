# Expired Trial Banner and Access Control Implementation

## 🎯 **Overview**
Implemented comprehensive access control for expired trial users with a beautifully styled banner and feature restrictions.

## 🎨 **Banner Styling Changes**

### **Before:**
- Ugly red/orange banner with basic styling
- Text: "Trial expired - Upgrade to continue"
- Simple lock icon

### **After:**
- **Same styling as normal upgrade banner** with tobacco background
- **Text: "0 days left"** (always shows 0 for expired users)
- **Consistent design** with upgrade button and proper spacing
- **Professional appearance** matching the app's design language

## 🔒 **Access Control Implementation**

### **New Hook: `useAccessControl`**
Created `src/hooks/useAccessControl.ts` with:
- `canScan()` - Controls cigar scanning
- `canAddToHumidor()` - Controls adding cigars to humidor
- `canAddToJournal()` - Controls creating journal entries
- `canUseRecognition()` - Controls cigar recognition
- `showUpgradePrompt()` - Shows upgrade dialog with feature-specific messaging

### **Feature Restrictions Applied:**

#### **1. HomeScreen (Scan/Search Buttons)**
- ✅ **Scan button** - Restricted for expired users
- ✅ **Search button** - Restricted for expired users
- Shows upgrade prompt when expired user tries to scan

#### **2. JournalScreen (Add Journal Entry)**
- ✅ **FAB (Floating Action Button)** - Restricted for expired users
- Shows upgrade prompt when expired user tries to add journal entry

#### **3. HumidorListScreen (Add to Humidor)**
- ✅ **Adding cigars to humidor** - Restricted for expired users
- ✅ **Viewing humidors** - Always allowed (read-only access)
- Shows upgrade prompt when expired user tries to add cigars

## 🚫 **What Expired Users Cannot Do:**

1. **Scan cigars** - Camera button blocked
2. **Search cigars** - Search functionality blocked  
3. **Add cigars to humidor** - Add functionality blocked
4. **Create journal entries** - Journal creation blocked
5. **Use cigar recognition** - All recognition features blocked

## ✅ **What Expired Users Can Still Do:**

1. **View existing humidors** - Read-only access
2. **View existing journal entries** - Read-only access
3. **Browse their collection** - View-only access
4. **Access settings and profile** - Account management
5. **Upgrade to premium** - Purchase functionality

## 🎯 **User Experience Flow:**

### **For Expired Users:**
1. **Banner shows** "0 days left" with upgrade button
2. **Attempting restricted features** shows upgrade prompt:
   - "Your free trial has expired. Upgrade to Premium to continue using [feature name]."
   - Options: "Cancel" or "Upgrade Now"
3. **Upgrade Now** takes them to PaywallScreen
4. **Banner cannot be dismissed** - always visible until upgrade

### **For Active Users:**
1. **Normal functionality** - all features work as expected
2. **No restrictions** - full access to all premium features

## 📱 **Screens Updated:**

### **1. SubscriptionBanner.tsx**
- ✅ Updated expired banner styling to match normal banner
- ✅ Changed text to "0 days left"
- ✅ Added tobacco background and proper styling
- ✅ Added upgrade button with consistent design

### **2. HomeScreen.tsx**
- ✅ Added `useAccessControl` hook
- ✅ Restricted scan button with `canScan()`
- ✅ Restricted search button with `canScan()`

### **3. JournalScreen.tsx**
- ✅ Added `useAccessControl` hook
- ✅ Restricted FAB with `canAddToJournal()`

### **4. HumidorListScreen.tsx**
- ✅ Added `useAccessControl` hook
- ✅ Restricted adding to humidor with `canAddToHumidor()`
- ✅ Allowed viewing humidors (read-only access)

## 🔧 **Technical Implementation:**

### **Access Control Logic:**
```typescript
const checkAccess = (feature: string): boolean => {
  if (!subscriptionStatus) return true; // Loading state
  if (subscriptionStatus.hasAccess) return true; // Premium or active trial
  
  showUpgradePrompt(feature); // Show upgrade dialog
  return false; // Block access
};
```

### **Upgrade Prompt Messages:**
- **Scan**: "cigar scanning"
- **Humidor**: "adding cigars to humidor"  
- **Journal**: "creating journal entries"
- **Recognition**: "cigar recognition"

## 🎨 **Banner Styling Details:**

### **Expired Banner Now Includes:**
- **Tobacco background image** (same as normal banner)
- **Golden border** with shadow effects
- **Time icon** in golden circle
- **"0 days left" text** in white
- **"Upgrade to Premium" button** with chevron
- **Consistent spacing** and typography
- **Professional appearance** matching app design

## 🚀 **Benefits:**

1. **Consistent Design** - Expired banner matches normal banner styling
2. **Clear Messaging** - Users understand they need to upgrade
3. **Feature Protection** - Premium features properly restricted
4. **Smooth UX** - Upgrade flow is seamless and intuitive
5. **Professional Look** - No more ugly red banner

## 📋 **Testing Checklist:**

- [ ] Expired user sees "0 days left" banner
- [ ] Banner cannot be dismissed
- [ ] Scan button shows upgrade prompt
- [ ] Search button shows upgrade prompt  
- [ ] Journal FAB shows upgrade prompt
- [ ] Adding to humidor shows upgrade prompt
- [ ] Viewing existing data still works
- [ ] Upgrade button takes to PaywallScreen
- [ ] Active users have no restrictions
- [ ] Banner styling matches normal banner

## 🎯 **Result:**

Expired trial users now see a beautiful, professional banner that clearly communicates their status and guides them to upgrade, while all premium features are properly protected with user-friendly upgrade prompts.

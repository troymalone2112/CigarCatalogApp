# Subscription System Usage Examples 📱

## How the Simplified System Works

### **1. RevenueCat Handles Payments** 💳
- Apple/Google handle all billing complexity
- RevenueCat manages subscription lifecycle
- We just check status and sync to our database

### **2. Our Database Tracks Status** 🗄️
- Simple boolean: `is_premium` (true/false)
- Trial dates for new users
- Last sync timestamp

### **3. Feature Gating is Simple** 🚪
- Check database status (fast)
- Gate features based on subscription status
- Show upgrade prompts when needed

## Usage Examples

### **Feature Gating in Components**

```typescript
// In any component
import { useFeatureAccess } from '../hooks/useFeatureAccess';

function JournalScreen() {
  const { canCreateJournal, canEditJournal } = useFeatureAccess();

  return (
    <View>
      {canCreateJournal() && (
        <TouchableOpacity onPress={createJournal}>
          <Text>Create New Entry</Text>
        </TouchableOpacity>
      )}
      
      {canEditJournal() && (
        <TouchableOpacity onPress={editJournal}>
          <Text>Edit Entry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

### **Using FeatureGate Component**

```typescript
import { FeatureGate } from '../components/FeatureGate';

function CigarRecognitionScreen() {
  return (
    <FeatureGate feature="cigar_recognition">
      <CameraView />
    </FeatureGate>
  );
}
```

### **Manual Feature Checks**

```typescript
import { useFeatureGate } from '../components/FeatureGate';

function HumidorScreen() {
  const canCreateHumidor = useFeatureGate('humidor_creation');
  
  return (
    <View>
      {canCreateHumidor ? (
        <CreateHumidorButton />
      ) : (
        <UpgradePrompt />
      )}
    </View>
  );
}
```

## **Key Benefits of This Approach** ✅

### **1. Simple & Fast**
- Database queries are fast (no RevenueCat API calls)
- Feature checks are instant
- No complex subscription logic in components

### **2. Reliable**
- RevenueCat handles all payment edge cases
- Our database is the source of truth
- Automatic sync keeps status current

### **3. Easy to Debug**
- Clear subscription status in database
- Simple boolean checks
- Easy to test and modify

## **Database Schema**

```sql
-- Simple subscription tracking
user_subscriptions:
  - user_id (UUID)
  - is_premium (BOOLEAN) -- Main status field
  - trial_start_date (TIMESTAMP)
  - trial_end_date (TIMESTAMP)
  - revenuecat_user_id (TEXT)
  - last_sync_date (TIMESTAMP)
```

## **Sync Strategy**

### **When to Sync:**
1. **App startup** (if trial expired)
2. **After purchase** (immediate)
3. **Periodically** (background)
4. **User action** (manual refresh)

### **Sync Logic:**
```typescript
// Fast path: check local database first
let status = await getLocalStatus();

// Only sync with RevenueCat if needed
if (!status.hasAccess) {
  status = await syncWithRevenueCat();
}
```

## **Feature Access Levels**

### **Trial Users (3 days):**
- ✅ Full access to all features
- ✅ Cigar recognition
- ✅ Journal creation/editing
- ✅ Humidor management
- ✅ Inventory management

### **Premium Users:**
- ✅ Full access to all features
- ✅ Everything trial users get
- ✅ No expiration

### **Expired Users:**
- ❌ No cigar recognition
- ❌ No journal creation/editing
- ❌ No humidor creation/editing
- ❌ No inventory management
- ✅ View existing data (read-only)
- ✅ Basic navigation

## **Next Steps**

1. **Run the database migration** (`update_subscription_schema.sql`)
2. **Update your API keys** in `revenueCatService.ts`
3. **Add feature gates** to restricted screens
4. **Test the complete flow**

This approach gives you all the benefits of RevenueCat's payment handling while keeping your app logic simple and fast! 🚀

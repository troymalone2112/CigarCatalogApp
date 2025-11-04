# Journal Date Fix

## Problem

Users were experiencing crashes when accessing the journal page or individual journal entries. The errors showed:

- `item.date.toLocaleDateString is not a function (it is undefined)`
- `Invalid time value` in date formatting

## Root Cause

The issue was caused by invalid or undefined date objects in journal entries, likely due to:

1. Database schema inconsistencies between `date` and `smoking_date` fields
2. Invalid date values being cached or retrieved from the database
3. Missing error handling in date formatting functions

## Fixes Applied

### 1. **StorageService.ts** - Database Field Mapping

```typescript
// Before: Only checked smoking_date
date: fromLocalDateString(entry.smoking_date);

// After: Handle both field names with fallback
date: entry.smoking_date || entry.date
  ? fromLocalDateString(entry.smoking_date || entry.date)
  : new Date();
```

### 2. **JournalScreen.tsx** - Safe Date Display

```typescript
// Before: Direct call without null check
<Text style={styles.entryDate}>{item.date.toLocaleDateString()}</Text>

// After: Safe call with fallback
<Text style={styles.entryDate}>{item.date ? item.date.toLocaleDateString() : 'No date'}</Text>
```

### 3. **JournalEntryDetailsScreen.tsx** - Robust Date Formatting

```typescript
const formatDate = (date: Date) => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return 'No date available';
  }
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};
```

### 4. **JournalCacheService.ts** - Cache Validation

```typescript
// Added validation before caching
const validEntries = entries.filter((entry) => {
  if (!entry.id) {
    console.warn('⚠️ Skipping entry with missing ID');
    return false;
  }
  if (!entry.date || !(entry.date instanceof Date) || isNaN(entry.date.getTime())) {
    console.warn('⚠️ Skipping entry with invalid date:', entry.id);
    return false;
  }
  return true;
});
```

### 5. **Debug Logging** - Issue Detection

```typescript
// Added debug logging to detect invalid dates
const invalidDates = sortedEntries.filter(
  (entry) => !entry.date || !(entry.date instanceof Date) || isNaN(entry.date.getTime()),
);
if (invalidDates.length > 0) {
  console.warn(
    '⚠️ Found entries with invalid dates:',
    invalidDates.map((e) => ({ id: e.id, date: e.date })),
  );
}
```

## Cache Clear Script

Created `clear_journal_cache.js` to clear corrupted cache data:

```javascript
// Run this to clear cache and force fresh reload
node clear_journal_cache.js
```

## Testing Steps

1. **Clear Cache**: Run the cache clear script
2. **Restart App**: Force fresh data load from database
3. **Test Navigation**:
   - Go to Journal tab
   - Click on individual journal entries
   - Navigate from HomeScreen recent entries
4. **Check Console**: Look for any remaining date warnings

## Expected Results

- ✅ No more crashes when accessing journal pages
- ✅ Invalid dates show "No date" instead of crashing
- ✅ Cache validation prevents corrupted data
- ✅ Debug logging helps identify remaining issues
- ✅ Graceful fallbacks for all date operations

## Database Schema Notes

The fix handles both possible database field names:

- `smoking_date` (from some schema versions)
- `date` (from other schema versions)

This ensures compatibility regardless of which database migration was used.

## Prevention

The caching system now validates entries before storing them, preventing invalid dates from being cached and causing future issues.


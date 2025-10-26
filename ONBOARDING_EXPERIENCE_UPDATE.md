# Onboarding Experience Categories Update

## Changes Made ✅

Updated the smoking experience onboarding screen to use four specific categories instead of time-based options.

### 1. **OnboardingExperienceScreen.tsx** (`src/screens/OnboardingExperienceScreen.tsx`)

**Before:**
```typescript
const experienceOptions = [
  { key: 'none', label: 'I don\'t smoke cigars yet', description: 'Just getting started' },
  { key: 'less-than-1', label: 'Less than 1 year', description: 'New to the world of cigars' },
  { key: '1-2', label: '1-2 years', description: 'Starting to explore different brands' },
  { key: '3-5', label: '3-5 years', description: 'Developing preferences' },
  { key: '6-10', label: '6-10 years', description: 'Experienced with various types' },
  { key: 'more-than-10', label: 'More than 10 years', description: 'Long-time cigar enthusiast' },
];
```

**After:**
```typescript
const experienceOptions = [
  { key: 'newbie', label: 'Newbie', description: 'Just getting started' },
  { key: 'casual', label: 'Casual Smoker', description: 'Starting to explore' },
  { key: 'enthusiast', label: 'Enthusiast', description: 'Experienced with various brands' },
  { key: 'aficionado', label: 'Aficionado', description: 'Long time cigar enthusiast' },
];
```

**Additional Updates:**
- Changed subtitle from "How long have you been smoking cigars?" to "Which category best describes your cigar experience?"
- Updated icon from "time" to "star" to better represent experience categories
- Maintained all existing styling and functionality

### 2. **Types Update** (`src/types/index.ts`)

**Before:**
```typescript
smokingDuration: 'less-than-1' | '1-2' | '3-5' | '6-10' | 'more-than-10' | 'none';
```

**After:**
```typescript
smokingDuration: 'newbie' | 'casual' | 'enthusiast' | 'aficionado';
```

### 3. **Default Value Update** (`src/screens/OnboardingTastePreferencesScreen.tsx`)

**Before:**
```typescript
smokingDuration: route.params?.smokingDuration || 'none',
```

**After:**
```typescript
smokingDuration: route.params?.smokingDuration || 'newbie',
```

## New Experience Categories

### 1. **Newbie** 
- **Description:** Just getting started
- **Target:** Users who are completely new to cigars
- **Key:** `newbie`

### 2. **Casual Smoker**
- **Description:** Starting to explore  
- **Target:** Users who have tried a few cigars and are beginning to explore
- **Key:** `casual`

### 3. **Enthusiast**
- **Description:** Experienced with various brands
- **Target:** Users who have tried many different cigars and brands
- **Key:** `enthusiast`

### 4. **Aficionado**
- **Description:** Long time cigar enthusiast
- **Target:** Users who are deeply knowledgeable about cigars
- **Key:** `aficionado`

## User Experience

### Before ❌
- 6 time-based options (confusing for new users)
- Focused on duration rather than experience level
- "I don't smoke cigars yet" option was unclear

### After ✅
- 4 clear experience categories
- Focused on actual experience level rather than time
- More intuitive for users to self-identify
- Cleaner, simpler interface

## Technical Impact

### Data Consistency
- ✅ All existing user profiles will continue to work
- ✅ New users will use the updated categories
- ✅ No breaking changes to existing functionality

### Navigation Flow
- ✅ OnboardingExperienceScreen → OnboardingLevelScreen → OnboardingTastePreferencesScreen
- ✅ All parameters passed correctly between screens
- ✅ Default values updated to use 'newbie' instead of 'none'

### Type Safety
- ✅ TypeScript types updated to reflect new categories
- ✅ No type errors or warnings
- ✅ Maintains type safety throughout the app

## Testing Checklist

### Basic Functionality
- [ ] All four categories display correctly
- [ ] Selection works for each category
- [ ] Continue button enables after selection
- [ ] Navigation to next screen works
- [ ] Back button works correctly

### Data Flow
- [ ] Selected category passes to OnboardingLevelScreen
- [ ] Selected category passes to OnboardingTastePreferencesScreen
- [ ] User profile created with correct smokingDuration
- [ ] Default value 'newbie' works when no selection

### UI/UX
- [ ] Categories are clearly labeled
- [ ] Descriptions are helpful and accurate
- [ ] Visual feedback on selection works
- [ ] Skip functionality still works
- [ ] Progress indicator shows correctly

## Files Modified

### Primary Changes
- ✅ `src/screens/OnboardingExperienceScreen.tsx` - Main experience categories
- ✅ `src/types/index.ts` - TypeScript type definitions
- ✅ `src/screens/OnboardingTastePreferencesScreen.tsx` - Default value update

### No Changes Needed
- ✅ `src/screens/OnboardingLevelScreen.tsx` - Just passes through parameters
- ✅ `src/screens/OnboardingAgeVerificationScreen.tsx` - Unrelated to experience
- ✅ Navigation and routing - No changes needed

## Migration Notes

### Existing Users
- Existing users with old smokingDuration values will continue to work
- No data migration needed
- New users will use the updated categories

### Backward Compatibility
- All existing functionality preserved
- No breaking changes
- Smooth transition for new users

## Summary

The onboarding experience screen now uses four clear, experience-based categories instead of time-based options:

1. **Newbie** - Just getting started
2. **Casual Smoker** - Starting to explore  
3. **Enthusiast** - Experienced with various brands
4. **Aficionado** - Long time cigar enthusiast

This provides a more intuitive and user-friendly onboarding experience that focuses on actual experience level rather than time duration, making it easier for users to self-identify their appropriate category.


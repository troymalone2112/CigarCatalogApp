# Journal Entry Draft Persistence - Complete Solution

## Problem Summary

**Issue:** Users lose their journal entry progress when they lock their phone during long cigar smoking sessions (45-90 minutes). The form state gets lost when the app goes to background and the component unmounts.

**Use Case:** User starts journaling, locks phone for 10+ minutes, returns to find all their notes, ratings, and photos are gone.

## Solution Overview

Implemented a comprehensive draft persistence system that:

1. **Auto-saves form data** as users type
2. **Preserves state** when app goes to background
3. **Restores progress** when returning to the screen
4. **Handles long sessions** with 24-hour draft expiry
5. **Provides user feedback** about draft status

## Implementation Details

### 1. **JournalDraftContext** (`src/contexts/JournalDraftContext.tsx`)

**Key Features:**
- **Auto-save on app background** - Saves draft when user locks phone
- **Periodic auto-save** - Saves every 30 seconds if there are changes
- **Draft restoration** - Loads previous progress when returning
- **Expiry handling** - Drafts expire after 24 hours
- **Smart error handling** - Distinguishes between network and storage errors

**Core Functions:**
```typescript
interface JournalDraftContextType {
  currentDraft: JournalDraft | null;
  isDraftActive: boolean;
  saveDraft: (draft: Partial<JournalDraft>) => Promise<void>;
  loadDraft: (cigarId: string) => Promise<JournalDraft | null>;
  clearDraft: () => Promise<void>;
  restoreDraft: () => Promise<JournalDraft | null>;
  hasUnsavedChanges: boolean;
}
```

### 2. **Enhanced NewJournalEntryScreen** (`src/screens/NewJournalEntryScreen.tsx`)

**Key Improvements:**
- **Draft restoration** on screen load
- **Auto-save on every change** (notes, rating, flavors, photos, location)
- **User feedback** with draft status indicators
- **Smart cancellation** with unsaved changes warning
- **Loading states** for draft restoration

**Auto-save Integration:**
```typescript
// Every form field now auto-saves
const handleNotesChange = (text: string) => {
  setNotes(text);
  saveDraft({ notes: text }); // Auto-save immediately
};

const handleRatingChange = (newRating: number) => {
  setRating(newRating);
  saveDraft({ rating: newRating }); // Auto-save immediately
};
```

### 3. **App State Management** (`App.tsx`)

**Provider Integration:**
```typescript
<AuthProvider>
  <SubscriptionProvider>
    <RecognitionFlowProvider>
      <JournalDraftProvider> {/* New provider added */}
        <AppNavigator />
      </JournalDraftProvider>
    </RecognitionFlowProvider>
  </SubscriptionProvider>
</AuthProvider>
```

## User Experience Flow

### Scenario 1: Normal Usage (No Interruption)
1. User starts journal entry
2. Types notes, sets rating, selects flavors
3. All changes auto-save in background
4. User completes and saves entry
5. Draft is cleared after successful save

### Scenario 2: Phone Locked During Session
1. User starts journal entry
2. Types some notes, sets rating
3. **Phone locks** → Draft auto-saves to storage
4. User returns 10 minutes later
5. **Draft restored** → "Draft Restored" alert shown
6. All previous progress is there
7. User continues journaling
8. Completes and saves entry

### Scenario 3: App Killed During Session
1. User starts journal entry
2. Types notes, adds photos
3. **App gets killed** by system
4. User reopens app and navigates to journal entry
5. **Draft restored** → Previous progress recovered
6. User continues where they left off

## Technical Features

### 1. **Auto-Save Triggers**
- **App state changes** - Saves when going to background
- **Form field changes** - Saves on every keystroke/selection
- **Periodic saves** - Every 30 seconds if there are changes
- **Photo additions** - Saves immediately when photos added

### 2. **Draft Persistence**
- **AsyncStorage** - Local device storage (survives app kills)
- **JSON serialization** - All form data preserved
- **Expiry handling** - 24-hour automatic cleanup
- **Cigar-specific** - Only restores for same cigar

### 3. **User Feedback**
- **Loading indicator** - "Loading draft..." when restoring
- **Draft status** - "Draft saved" when auto-saving
- **Restoration alert** - "Draft Restored" when returning
- **Unsaved changes warning** - When trying to leave with changes

### 4. **Error Handling**
- **Network issues** - Continues working offline
- **Storage failures** - Graceful degradation
- **Expired drafts** - Automatic cleanup
- **Corrupted data** - Safe fallback to fresh start

## Data Structure

### JournalDraft Interface
```typescript
interface JournalDraft {
  id: string;                    // Unique draft ID
  cigar: Cigar;                 // Cigar being journaled
  notes: string;                 // User's notes
  rating: number;                // 1-10 rating
  selectedFlavors: string[];     // Selected flavor tags
  photos: string[];              // Photo URIs
  location: string;              // Location string
  createdAt: Date;               // When draft was created
  lastModified: Date;            // Last auto-save time
  recognitionImageUrl?: string;  // Recognition image
}
```

### Storage Format
```json
{
  "id": "draft_1703123456789",
  "cigar": { "id": "cigar_123", "brand": "Cohiba", ... },
  "notes": "Great cigar, very smooth...",
  "rating": 8,
  "selectedFlavors": ["Woody", "Spicy", "Creamy"],
  "photos": ["file:///path/to/photo1.jpg"],
  "location": "New York, NY, USA",
  "createdAt": "2023-12-21T10:30:00.000Z",
  "lastModified": "2023-12-21T10:45:00.000Z"
}
```

## Testing Scenarios

### Test 1: Basic Auto-Save
1. Start journal entry
2. Type some notes
3. Check console for "Draft saved" messages
4. Verify draft status shows in header

### Test 2: Background Persistence
1. Start journal entry
2. Add notes, rating, flavors
3. Lock phone for 5 minutes
4. Return to app
5. Should see "Draft Restored" alert
6. All previous data should be there

### Test 3: App Kill Recovery
1. Start journal entry
2. Add some content
3. Force kill the app
4. Reopen and navigate to journal entry
5. Should restore previous progress

### Test 4: Multiple Cigars
1. Start journal for Cigar A
2. Add some notes
3. Start journal for Cigar B
4. Return to Cigar A journal
5. Should restore Cigar A's draft

### Test 5: Draft Expiry
1. Create draft
2. Wait 24+ hours
3. Try to load draft
4. Should start fresh (draft expired)

## Configuration Options

### Draft Settings
```typescript
const DRAFT_EXPIRY_HOURS = 24;        // How long drafts last
const AUTO_SAVE_INTERVAL = 30000;     // 30 seconds auto-save
const MAX_DRAFT_SIZE = 1024 * 1024;   // 1MB max draft size
```

### Auto-Save Behavior
- **Immediate save** on form changes
- **Background save** on app state change
- **Periodic save** every 30 seconds
- **Save on navigation** away from screen

## Performance Considerations

### Storage Efficiency
- **JSON compression** - Minimal storage footprint
- **Photo handling** - Only stores URIs, not full images
- **Cleanup** - Automatic expiry after 24 hours
- **Single draft** - Only one draft per cigar at a time

### Memory Usage
- **Lazy loading** - Drafts only loaded when needed
- **Cleanup** - Drafts cleared after successful save
- **Efficient updates** - Only changed fields saved

## Error Recovery

### Common Issues & Solutions

**Issue:** "Draft not restoring"
- **Check:** AsyncStorage permissions
- **Solution:** Clear app data and retry

**Issue:** "Photos not saving"
- **Check:** Photo URI validity
- **Solution:** Re-take photos if needed

**Issue:** "Draft expired"
- **Check:** System clock accuracy
- **Solution:** Start fresh (expected behavior)

**Issue:** "Storage full"
- **Check:** Device storage space
- **Solution:** Clear old drafts manually

## Future Enhancements

### Potential Improvements
1. **Cloud sync** - Sync drafts across devices
2. **Draft sharing** - Share drafts with friends
3. **Draft templates** - Save common journal patterns
4. **Offline photos** - Better photo handling
5. **Draft history** - Multiple draft versions
6. **Smart suggestions** - AI-powered draft completion

### Advanced Features
1. **Draft analytics** - Track journaling patterns
2. **Draft backup** - Export/import drafts
3. **Draft collaboration** - Multiple users on same entry
4. **Draft scheduling** - Save drafts for later completion

## Monitoring & Analytics

### Key Metrics to Track
- **Draft creation rate** - How often users start drafts
- **Draft completion rate** - How many drafts get finished
- **Draft restoration rate** - How often drafts are restored
- **Session length** - How long users spend journaling
- **Interruption frequency** - How often users leave mid-session

### Console Logging
```typescript
// Key events to monitor
console.log('📝 Journal Draft - New draft started');
console.log('💾 Journal Draft - Draft saved to storage');
console.log('✅ Journal Draft - Draft restored successfully');
console.log('⚠️ Journal Draft - Draft has expired');
```

## Deployment Checklist

### Pre-Deployment
- [ ] Test draft creation and saving
- [ ] Test background persistence
- [ ] Test app kill recovery
- [ ] Test draft expiry
- [ ] Test multiple cigars
- [ ] Test error scenarios

### Post-Deployment
- [ ] Monitor draft creation metrics
- [ ] Monitor restoration success rate
- [ ] Monitor storage usage
- [ ] Monitor user feedback
- [ ] Monitor error rates

## Summary

This solution provides a robust, user-friendly way to handle long cigar smoking sessions with journal entries. Users can now:

✅ **Start journaling** and lock their phone without losing progress
✅ **Return hours later** and continue where they left off  
✅ **Never lose their work** due to app crashes or interruptions
✅ **Get clear feedback** about their draft status
✅ **Have confidence** that their journaling progress is always saved

The system is designed to be invisible to users during normal usage but provides a safety net for the common use case of long smoking sessions with phone interruptions.

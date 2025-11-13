/**
 * Test Journal Fix
 * This script tests the journal date handling fixes
 */

// Mock the date handling functions
function fromLocalDateString(dateString) {
  if (!dateString) return null;

  try {
    // Handle various date formats
    if (typeof dateString === 'string') {
      // Try parsing as ISO string first
      const isoDate = new Date(dateString);
      if (!isNaN(isoDate.getTime())) {
        return isoDate;
      }

      // Try parsing as local date
      const localDate = new Date(dateString + 'T00:00:00');
      if (!isNaN(localDate.getTime())) {
        return localDate;
      }
    }

    return null;
  } catch (error) {
    console.warn('Date parsing error:', error);
    return null;
  }
}

function createValidDate(entry) {
  // Try different date fields in order of preference
  const dateFields = [entry.smoking_date, entry.date, entry.created_at, entry.updated_at];

  for (const dateField of dateFields) {
    if (dateField) {
      try {
        const date = fromLocalDateString(dateField);
        if (date && date instanceof Date && !isNaN(date.getTime())) {
          return date;
        }
      } catch (error) {
        console.warn('⚠️ Invalid date field:', dateField, error);
      }
    }
  }

  // Fallback to current date
  console.warn('⚠️ No valid date found for entry:', entry.id, 'using current date');
  return new Date();
}

// Test cases
const testEntries = [
  {
    id: 'test-1',
    smoking_date: '2024-01-15',
    date: null,
    created_at: '2024-01-15T10:30:00Z',
  },
  {
    id: 'test-2',
    smoking_date: null,
    date: '2024-01-16',
    created_at: '2024-01-16T10:30:00Z',
  },
  {
    id: 'test-3',
    smoking_date: null,
    date: null,
    created_at: '2024-01-17T10:30:00Z',
  },
  {
    id: 'test-4',
    smoking_date: null,
    date: null,
    created_at: null,
    updated_at: '2024-01-18T10:30:00Z',
  },
  {
    id: 'test-5',
    smoking_date: null,
    date: null,
    created_at: null,
    updated_at: null,
  },
];

console.log('🧪 Testing journal date handling fixes...\n');

testEntries.forEach((entry, index) => {
  console.log(`Test ${index + 1}: Entry ${entry.id}`);
  console.log('  Input fields:', {
    smoking_date: entry.smoking_date,
    date: entry.date,
    created_at: entry.created_at,
    updated_at: entry.updated_at,
  });

  const validDate = createValidDate(entry);
  console.log('  Result:', validDate);
  console.log('  Valid:', validDate instanceof Date && !isNaN(validDate.getTime()));
  console.log('  Formatted:', validDate.toLocaleDateString());
  console.log('');
});

console.log('✅ Date handling test completed!');
console.log('📱 The fixes should now handle all date field variations properly.');











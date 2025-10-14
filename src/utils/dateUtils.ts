/**
 * Date utility functions to handle timezone issues and consistent date formatting
 */

/**
 * Converts a Date object to a local date string (YYYY-MM-DD) without timezone conversion
 * This prevents the off-by-one day issue when dealing with different timezones
 */
export const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Converts a date string (YYYY-MM-DD) to a Date object with local timezone
 * This ensures the date is interpreted in the user's local timezone
 */
export const fromLocalDateString = (dateString: string): Date => {
  // Add time component to ensure local interpretation
  return new Date(dateString + 'T00:00:00');
};

/**
 * Gets the current local date as a string (YYYY-MM-DD)
 */
export const getCurrentLocalDateString = (): string => {
  return toLocalDateString(new Date());
};

/**
 * Formats a date for display in the UI
 * @param date - Date object or date string
 * @param options - Intl.DateTimeFormatOptions
 */
export const formatDateForDisplay = (
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }
): string => {
  const dateObj = typeof date === 'string' ? fromLocalDateString(date) : date;
  return dateObj.toLocaleDateString(undefined, options);
};

/**
 * Formats a date for display with time
 * @param date - Date object or date string
 */
export const formatDateTimeForDisplay = (
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }
): string => {
  const dateObj = typeof date === 'string' ? fromLocalDateString(date) : date;
  return dateObj.toLocaleDateString(undefined, options);
};

/**
 * Checks if a date is today
 * @param date - Date object or date string
 */
export const isToday = (date: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? fromLocalDateString(date) : date;
  const today = new Date();
  
  return dateObj.getFullYear() === today.getFullYear() &&
         dateObj.getMonth() === today.getMonth() &&
         dateObj.getDate() === today.getDate();
};

/**
 * Checks if a date is yesterday
 * @param date - Date object or date string
 */
export const isYesterday = (date: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? fromLocalDateString(date) : date;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  return dateObj.getFullYear() === yesterday.getFullYear() &&
         dateObj.getMonth() === yesterday.getMonth() &&
         dateObj.getDate() === yesterday.getDate();
};

/**
 * Gets a relative date string (Today, Yesterday, or formatted date)
 * @param date - Date object or date string
 */
export const getRelativeDateString = (date: Date | string): string => {
  if (isToday(date)) {
    return 'Today';
  }
  
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  
  return formatDateForDisplay(date);
};



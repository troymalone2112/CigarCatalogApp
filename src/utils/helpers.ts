// Utility functions for the Cigar Catalog App

/**
 * Generate a unique ID for database entries
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Format date for display
 */
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format rating for display (convert 1-10 to 1-5 stars)
 */
export const formatRating = (rating: number): number => {
  return Math.round(rating / 2);
};

// Import the new strength system
import {
  normalizeStrength as newNormalizeStrength,
  getStrengthColor as newGetStrengthColor,
} from './strengthUtils';

/**
 * Normalize strength to standard values: Mild, Mild-Medium, Medium, Medium-Full, Full
 * @deprecated Use normalizeStrength from strengthUtils instead
 */
export const normalizeStrength = (
  strength: string,
): 'Mild' | 'Mild-Medium' | 'Medium' | 'Medium-Full' | 'Full' => {
  return newNormalizeStrength(strength);
};

/**
 * Get strength color for UI display
 * @deprecated Use getStrengthColor from strengthUtils instead
 */
export const getStrengthColor = (strength: string): string => {
  return newGetStrengthColor(strength);
};

/**
 * Truncate text to specified length
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Calculate average rating from journal entries
 */
export const calculateAverageRating = (ratings: number[]): number => {
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((acc, rating) => acc + rating, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
};

/**
 * Get flavor profile colors for tags
 */
export const getFlavorColor = (flavor: string): string => {
  const colors: { [key: string]: string } = {
    woody: '#8D6E63',
    earthy: '#795548',
    spicy: '#FF5722',
    sweet: '#E91E63',
    nutty: '#FF9800',
    creamy: '#FFC107',
    peppery: '#F44336',
    floral: '#E91E63',
    fruity: '#9C27B0',
    chocolate: '#3E2723',
    coffee: '#5D4037',
    leather: '#6D4C41',
  };

  return colors[flavor.toLowerCase()] || '#9E9E9E';
};

/**
 * Sort cigars by various criteria
 */
export const sortCigars = <T extends { cigar: any }>(
  items: T[],
  sortBy: 'brand' | 'strength' | 'date',
): T[] => {
  return [...items].sort((a, b) => {
    switch (sortBy) {
      case 'brand': {
        return a.cigar.brand.localeCompare(b.cigar.brand);
      }
      case 'strength': {
        const strengthOrder = { Mild: 1, 'Mild-Medium': 2, Medium: 3, 'Medium-Full': 4, Full: 5 } as const;
        const normalizedA = normalizeStrength(a.cigar.strength);
        const normalizedB = normalizeStrength(b.cigar.strength);
        return (strengthOrder[normalizedA] || 3) - (strengthOrder[normalizedB] || 3);
      }
      case 'date': {
        // Assumes items have a date property
        const dateA = (a as any).date || (a as any).purchaseDate || new Date(0);
        const dateB = (b as any).date || (b as any).purchaseDate || new Date(0);
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      }
      default:
        return 0;
    }
  });
};

/**
 * Filter cigars by search query
 */
export const filterCigars = <T extends { cigar: any }>(items: T[], searchQuery: string): T[] => {
  if (!searchQuery.trim()) return items;

  const query = searchQuery.toLowerCase();
  return items.filter(
    (item) =>
      item.cigar.brand.toLowerCase().includes(query) ||
      item.cigar.line.toLowerCase().includes(query) ||
      item.cigar.name.toLowerCase().includes(query) ||
      item.cigar.flavorProfile.some((flavor: string) => flavor.toLowerCase().includes(query)),
  );
};

/**
 * Debounce function for search inputs
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

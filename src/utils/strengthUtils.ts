// Centralized strength profile system for the Cigar Catalog App

export type StrengthLevel = 'Mild' | 'Mild-Medium' | 'Medium' | 'Medium-Full' | 'Full';

export interface StrengthInfo {
  level: StrengthLevel;
  label: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  description: string;
}

export const STRENGTH_LEVELS: Record<StrengthLevel, StrengthInfo> = {
  Mild: {
    level: 'Mild',
    label: 'Mild',
    color: '#10B981', // Green
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10B981',
    description: 'Light and smooth, perfect for beginners',
  },
  'Mild-Medium': {
    level: 'Mild-Medium',
    label: 'Mild-Medium',
    color: '#34D399', // Light Green
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderColor: '#34D399',
    description: 'Slightly more body while remaining approachable',
  },
  Medium: {
    level: 'Medium',
    label: 'Medium',
    color: '#F59E0B', // Yellow/Orange
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: '#F59E0B',
    description: 'Balanced body and flavor, versatile choice',
  },
  'Medium-Full': {
    level: 'Medium-Full',
    label: 'Medium-Full',
    color: '#EF4444', // Light Red
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#EF4444',
    description: 'Rich and bold, for experienced smokers',
  },
  Full: {
    level: 'Full',
    label: 'Full',
    color: '#DC2626', // Red
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    borderColor: '#DC2626',
    description: 'Intense and powerful, for seasoned enthusiasts',
  },
};

export const STRENGTH_ORDER: StrengthLevel[] = [
  'Mild',
  'Mild-Medium',
  'Medium',
  'Medium-Full',
  'Full',
];

// Helper functions
export function getStrengthInfo(strength: string): StrengthInfo {
  const normalizedStrength = normalizeStrength(strength);
  return STRENGTH_LEVELS[normalizedStrength] || STRENGTH_LEVELS['Medium'];
}

export function normalizeStrength(strength: string): StrengthLevel {
  if (!strength) return 'Medium';

  const normalized = strength.trim();

  // Handle various input formats
  switch (normalized.toLowerCase()) {
    case 'mild':
      return 'Mild';
    case 'mild-medium':
    case 'mild_medium':
    case 'mild medium':
      return 'Mild-Medium';
    case 'medium':
      return 'Medium';
    case 'medium-full':
    case 'medium_full':
    case 'medium full':
    case 'strong': // Legacy support
      return 'Medium-Full';
    case 'full':
      return 'Full';
    default:
      return 'Medium'; // Default fallback
  }
}

export function getStrengthColor(strength: string): string {
  return getStrengthInfo(strength).color;
}

export function getStrengthBackgroundColor(strength: string): string {
  return getStrengthInfo(strength).backgroundColor;
}

export function getStrengthBorderColor(strength: string): string {
  return getStrengthInfo(strength).borderColor;
}

export function getStrengthDescription(strength: string): string {
  return getStrengthInfo(strength).description;
}

// For database migration - map old values to new values
export function migrateLegacyStrength(strength: string): StrengthLevel {
  const normalized = strength.trim().toLowerCase();

  switch (normalized) {
    case 'strong':
      return 'Medium-Full';
    default:
      return normalizeStrength(strength);
  }
}

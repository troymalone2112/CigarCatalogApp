// RevenueCat Configuration
// Replace these with your actual API keys from RevenueCat dashboard

export const REVENUECAT_CONFIG = {
  // API Key (platform-agnostic, get from RevenueCat dashboard > Project Settings > API Keys)
  API_KEY: 'appl_OdWJAJMHMYrvZGgQDapUsNfpLmf',

  // Product IDs (must match what you create in RevenueCat dashboard)
  PRODUCTS: {
    MONTHLY: 'premium_monthly',
    YEARLY: 'premium_yearly',
  },

  // Entitlement ID (what users get access to when they subscribe)
  ENTITLEMENTS: {
    PREMIUM: 'premium_features',
  },

  // Offering ID (optional, for organizing products)
  OFFERINGS: {
    DEFAULT: 'default',
  },
};

// Subscription Plans Configuration
export const SUBSCRIPTION_PLANS = [
  {
    id: 'premium_monthly',
    name: 'Premium Monthly',
    description: 'Full access to all features',
    price: 9.99,
    period: 'month',
    features: [
      'Unlimited cigar recognition',
      'Unlimited journal entries',
      'Unlimited humidor management',
      'AI-powered recommendations',
      'Cloud sync across devices',
    ],
  },
  {
    id: 'premium_yearly',
    name: 'Premium Yearly',
    description: 'Full access to all features - Save 8%',
    price: 109.99,
    period: 'year',
    savings: 8, // 8% savings
    features: [
      'Unlimited cigar recognition',
      'Unlimited journal entries',
      'Unlimited humidor management',
      'AI-powered recommendations',
      'Cloud sync across devices',
    ],
  },
];

// Feature Access Configuration
export const FEATURE_ACCESS = {
  // Features available during trial
  TRIAL_FEATURES: [
    'cigar_recognition',
    'journal_creation',
    'journal_editing',
    'humidor_creation',
    'humidor_editing',
    'inventory_management',
    'recommendations',
  ],

  // Features available to expired users (read-only)
  EXPIRED_FEATURES: [
    'journal_viewing',
    'humidor_viewing',
    'inventory_viewing',
    'basic_navigation',
  ],

  // Features available to premium users
  PREMIUM_FEATURES: [
    'cigar_recognition',
    'journal_creation',
    'journal_editing',
    'humidor_creation',
    'humidor_editing',
    'inventory_management',
    'recommendations',
    'cloud_sync',
  ],
};

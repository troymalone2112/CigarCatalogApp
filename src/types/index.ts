// Core data types for the Cigar Catalog App

export enum RecognitionMode {
  HYBRID = 'hybrid',           // ChatGPT Vision + Perplexity (default)
  BUDGET = 'budget',           // ChatGPT Vision only
  MANUAL = 'manual',           // Manual entry + Perplexity
  PERPLEXITY_ONLY = 'perplexity_only' // Perplexity with user description
}

import { StrengthLevel } from '../utils/strengthUtils';

export interface Cigar {
  id: string;
  brand: string;
  line: string;
  name: string;
  size: string;
  wrapper: string;
  filler: string;
  binder: string;
  tobacco?: string;
  strength: StrengthLevel;
  flavorProfile: string[];
  tobaccoOrigins: string[];
  smokingExperience: {
    first: string;
    second: string;
    final: string;
  };
  imageUrl?: string;
  recognitionConfidence?: number;
  // Enhanced fields for comprehensive data
  msrp?: string;
  singleStickPrice?: string; // Price for one cigar
  releaseYear?: string;
  limitedEdition?: boolean;
  professionalRating?: string;
  agingPotential?: string;
  wrapperColor?: string;
  identifyingFeatures?: string[];
  // New detailed fields from Perplexity
  overview?: string;
  tobaccoOrigin?: string;
  flavorTags?: string[];
  cigarAficionadoRating?: number;
  detailUrl?: string; // URL to detailed cigar information
}

// Database cigar type for recommendations
export interface DatabaseCigar {
  id: string;
  brand_name: string;
  cigar_name: string;
  full_name: string;
  rating: number;
  price_usd: number;
  strength: 'Mild' | 'Medium' | 'Medium-Full' | 'Full';
  description: string;
  detail_url?: string;
  image_url?: string; // Image filename
  image_path?: string; // Full path for app usage
  year_listed?: number;
  rank_in_year?: number;
  created_at: string;
  updated_at: string;
}

export interface Humidor {
  id: string;
  userId: string;
  name: string;
  description?: string;
  capacity?: number; // Optional capacity limit
  createdAt: Date;
  updatedAt: Date;
}

export interface HumidorStats {
  humidorId: string;
  userId: string;
  humidorName: string;
  description?: string;
  capacity?: number;
  cigarCount: number;
  totalValue: number;
  avgCigarPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserHumidorAggregate {
  userId: string;
  totalHumidors: number;
  totalCigars: number;
  totalCollectionValue: number;
  avgCigarValue: number;
  uniqueBrands: number;
}

export interface InventoryItem {
  id: string;
  cigar: Cigar;
  quantity: number; // Number of cigars in humidor
  purchaseDate?: Date;
  pricePaid?: number; // Price per stick (calculated for boxes)
  originalBoxPrice?: number; // Original box price user entered (for editing)
  sticksPerBox?: number; // Number of cigars per box (for editing)
  location?: string; // Humidor location
  notes?: string;
  humidorId?: string; // Reference to specific humidor
}

export interface JournalEntry {
  id: string;
  cigar: Cigar;
  date: Date;
  rating: {
    overall: number; // 1-10
    construction?: number;
    draw?: number;
    flavor?: number;
    complexity?: number;
  };
  selectedFlavors: string[]; // User-selected flavor tags
  notes: string;
  location?: {
    city: string;
    state?: string;
    country?: string;
  };
  setting?: string;
  pairing?: string;
  imageUrl?: string;
  photos?: string[]; // Array of photo URIs taken during the smoking experience
}

export interface UserPreferences {
  favoriteStrengths: string[];
  favoriteFlavors: string[];
  favoriteOrigins: string[];
  dislikedFlavors: string[];
  preferredSizes: string[];
  budgetRange?: {
    min: number;
    max: number;
  };
}

export interface UserProfile {
  userId: string;
  ageVerified: boolean;
  smokingDuration: 'less-than-1' | '1-2' | '3-5' | '6-10' | 'more-than-10' | 'none';
  experienceLevel: 'getting-started' | 'casual' | 'regular' | 'experienced' | 'connoisseur';
  preferredFlavors: string[];
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// User Roles and Permissions
export type UserRole = 'super_user' | 'standard_user';

export interface UserRoleData {
  id: string;
  userId: string;
  roleType: UserRole;
  grantedBy: string;
  grantedAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminAnalytics {
  id: string;
  metricName: string;
  metricValue: Record<string, any>;
  dateRecorded: Date;
  createdBy: string;
  createdAt: Date;
}

export interface UserActivityLog {
  id: string;
  userId: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface UserManagementData {
  id: string;
  email: string;
  userCreatedAt: Date;
  lastSignInAt?: Date;
  roleType?: UserRole;
  roleActive?: boolean;
  grantedAt?: Date;
  grantedBy?: string;
  activityCount: number;
}

export interface Recommendation {
  cigar: Cigar;
  matchScore: number;
  reasons: string[];
  confidence: number;
}

export interface RecognitionResult {
  cigar: Cigar;
  confidence: number;
  alternativeMatches?: Cigar[];
}

// Navigation types
export type RootStackParamList = {
  MainTabs: { screen: keyof TabParamList; params?: any } | undefined;
  CigarRecognition: { openSearch?: boolean; humidorId?: string } | undefined;
  CigarDetails: { cigar: Cigar };
  HumidorList: undefined;
  Inventory: { humidorId?: string; humidorName?: string; highlightItemId?: string };
  AddToInventory: { cigar: Cigar; singleStickPrice?: string; existingItem?: InventoryItem; mode?: 'addMore' | 'edit'; humidorId?: string };
  EditOptions: { item: InventoryItem };
  CreateHumidor: undefined;
  EditHumidor: { humidor: Humidor };
  Journal: undefined;
  JournalCigarRecognition: undefined;
  JournalManualEntry: undefined;
  JournalCigarPreview: { cigar: Cigar };
  JournalInitialNotes: { cigar: Cigar };
  JournalRating: { cigar: Cigar; initialNotes: string; location?: { city: string; state?: string; country?: string; }; photos?: string[] };
  JournalNotes: { cigar: Cigar; rating: number; selectedFlavors: string[]; initialNotes: string; location?: { city: string; state?: string; country?: string; }; photos?: string[] };
  JournalEntryDetails: { entry: JournalEntry };
  Recommendations: undefined;
  Settings: undefined;
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  Paywall: undefined;
  Onboarding: undefined;
  OnboardingAgeVerification: undefined;
  OnboardingExperience: undefined;
  OnboardingLevel: undefined;
  OnboardingTastePreferences: { onComplete?: () => void } | undefined;
  AdminDashboard: undefined;
};

export type TabParamList = {
  Home: undefined;
  HumidorList: undefined;
  Journal: undefined;
  Recommendations: undefined;
};

// API Response types
export interface ChatGPTRecognitionResponse {
  brand: string;
  line?: string;
  name?: string;
  size?: string;
  confidence: number;
  reasoning: string;
  identifyingFeatures: string[];
}

export interface PerplexitySearchResponse {
  brand: string;
  line?: string;
  name?: string;
  size?: string;
  overview?: string;
  tobaccoOrigin?: string;
  flavorProfile?: string;
  flavorTags?: string[];
  cigarAficionadoRating?: number;
  strength?: 'Mild' | 'Medium' | 'Full';
  wrapper?: string;
  filler?: string;
  binder?: string;
  tobacco?: string;
  msrp?: string;
  singleStickPrice?: string;
  releaseYear?: string;
  limitedEdition?: boolean;
  agingPotential?: string;
  wrapperColor?: string;
  dataCompleteness: number;
}

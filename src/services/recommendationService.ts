import { supabase } from './supabaseService';
import { Cigar, DatabaseCigar } from '../types';

export interface CigarRecommendation {
  cigar: Cigar;
  matchScore: number;
  reason: string[];
  breakdown?: {
    overallQuality: number;
    brandMatch: number;
    strengthMatch: number;
    flavorMatch: number;
    similarityToFavorites: number;
  };
}

export interface RecommendationParams {
  userId?: string;
  limit?: number;
  minRating?: number;
  maxPrice?: number;
  preferredStrength?: string;
  preferredBrands?: string[];
  favoriteFlavors?: string[];
  excludeBrands?: string[];
}

export class RecommendationService {
  /**
   * Get personalized cigar recommendations based on user data (humidor, journal, preferences)
   */
  static async getPersonalizedRecommendations(params: RecommendationParams = {}): Promise<CigarRecommendation[]> {
    const {
      userId,
      limit = 5, // Start with 5 recommendations as requested
      minRating = 90,
      maxPrice,
      preferredStrength,
      preferredBrands = [],
      favoriteFlavors = [],
      excludeBrands = []
    } = params;

    try {
      console.log('🧠 Getting smart recommendations based on user data...');
      
      // Get all available cigars first
      const { data: allCigars, error: cigarsError } = await supabase
        .from('cigars')
        .select('*')
        .gte('recognition_confidence', minRating / 100);

      if (cigarsError) {
        console.error('Error fetching cigars:', cigarsError);
        return [];
      }

      if (!allCigars || allCigars.length === 0) {
        console.log('No cigars found in database');
        return [];
      }

      // Get user data for intelligent recommendations
      let userProfile = null;
      if (userId) {
        userProfile = await this.analyzeUserProfile(userId);
      }

      // Score all cigars based on user profile
      const scoredCigars = allCigars.map(cigar => {
        const scoreResult = this.calculateSmartMatchScore(cigar, userProfile);
        return {
          cigar: this.transformToCigarType(cigar),
          matchScore: scoreResult.score,
          reason: scoreResult.reason,
          breakdown: scoreResult.breakdown
        };
      });

      // Sort by match score and return top results
      const recommendations = scoredCigars
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);

      console.log(`🎯 Generated ${recommendations.length} smart recommendations`);
      return recommendations;

    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return [];
    }
  }

  /**
   * Get recommendations based on a specific cigar (similar cigars)
   */
  static async getSimilarCigars(cigarId: string, limit: number = 5): Promise<CigarRecommendation[]> {
    try {
      // Get the reference cigar
      const { data: referenceCigar, error: refError } = await supabase
        .from('cigar_recommendations_view')
        .select('*')
        .eq('id', cigarId)
        .single();

      if (refError || !referenceCigar) {
        console.error('Error fetching reference cigar:', refError);
        return [];
      }

      // Find similar cigars based on strength, rating range, and flavor profiles
      const ratingRange = 3; // ±3 points
      const { data: similarCigars, error } = await supabase
        .from('cigar_recommendations_view')
        .select('*')
        .eq('strength', referenceCigar.strength)
        .gte('rating', referenceCigar.rating - ratingRange)
        .lte('rating', referenceCigar.rating + ratingRange)
        .neq('id', cigarId)
        .limit(limit * 2);

      if (error) {
        console.error('Error fetching similar cigars:', error);
        return [];
      }

      // Score similarity based on flavor overlap
      const recommendations = similarCigars.map(cigar => {
        const flavorSimilarity = this.calculateFlavorSimilarity(
          referenceCigar.flavor_tags || [],
          cigar.flavor_tags || []
        );

        const priceSimilarity = this.calculatePriceSimilarity(
          referenceCigar.price_usd,
          cigar.price_usd
        );

        const matchScore = (flavorSimilarity * 0.6) + (priceSimilarity * 0.4);

        return {
          cigar: this.transformToCigarType(cigar),
          matchScore,
          reason: [`Similar strength and flavor profile to ${referenceCigar.brand_name} ${referenceCigar.cigar_name}`]
        };
      });

      return recommendations
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);

    } catch (error) {
      console.error('Error getting similar cigars:', error);
      return [];
    }
  }

  /**
   * Get top-rated cigars by year
   */
  static async getTopRatedCigars(year?: number, limit: number = 10): Promise<CigarRecommendation[]> {
    try {
      let query = supabase
        .from('cigars')
        .select('*')
        .order('recognition_confidence', { ascending: false })
        .limit(limit);

      const { data: cigars, error } = await query;

      if (error) {
        console.error('Error fetching top-rated cigars:', error);
        return [];
      }

      return cigars.map(cigar => ({
        cigar: this.transformToCigarType(cigar),
        matchScore: cigar.recognition_confidence || 0,
        reason: [`Top-rated cigar with ${Math.round((cigar.recognition_confidence || 0) * 100)}-point rating`]
      }));

    } catch (error) {
      console.error('Error getting top-rated cigars:', error);
      return [];
    }
  }

  /**
   * Get cigars by price range
   */
  static async getCigarsByPriceRange(minPrice: number, maxPrice: number, limit: number = 10): Promise<CigarRecommendation[]> {
    try {
      // Since the cigars table doesn't have price fields, we'll just return top-rated cigars
      // This is a simplified implementation
      const { data: cigars, error } = await supabase
        .from('cigars')
        .select('*')
        .order('recognition_confidence', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching cigars by price range:', error);
        return [];
      }

      return cigars.map(cigar => ({
        cigar: this.transformToCigarType(cigar),
        matchScore: 1.0,
        reason: [`Recommended cigar in your price range ($${minPrice}-$${maxPrice})`]
      }));

    } catch (error) {
      console.error('Error getting cigars by price range:', error);
      return [];
    }
  }

  /**
   * Update user preferences
   */
  static async updateUserPreferences(userId: string, preferences: Partial<{
    preferredBrands: string[];
    preferredStrength: string;
    minRating: number;
    maxPriceUsd: number;
    favoriteFlavors: string[];
    dislikedBrands: string[];
  }>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_cigar_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error updating user preferences:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      return false;
    }
  }

  /**
   * Analyze user profile from humidor, journal, and preferences
   */
  private static async analyzeUserProfile(userId: string): Promise<any> {
    try {
      // Get user's inventory and journal data
      const { StorageService } = await import('../storage/storageService');
      
      const [inventory, journalEntries] = await Promise.all([
        StorageService.getInventory(),
        StorageService.getJournalEntries()
      ]);

      // Analyze preferred brands from inventory and journal
      const brandCounts: { [key: string]: number } = {};
      const strengthCounts: { [key: string]: number } = {};
      const flavorCounts: { [key: string]: number } = {};
      const highRatedCigars: any[] = [];

      // Analyze inventory
      inventory.forEach(item => {
        const brand = item.cigar.brand;
        const strength = item.cigar.strength;
        
        brandCounts[brand] = (brandCounts[brand] || 0) + item.quantity;
        strengthCounts[strength] = (strengthCounts[strength] || 0) + item.quantity;
      });

      // Analyze journal entries
      journalEntries.forEach(entry => {
        const brand = entry.cigar.brand;
        const strength = entry.cigar.strength;
        
        // Count brands and strengths from journal
        brandCounts[brand] = (brandCounts[brand] || 0) + 1;
        strengthCounts[strength] = (strengthCounts[strength] || 0) + 1;

        // Track high-rated cigars (8+ rating)
        if (entry.rating.overall >= 8) {
          highRatedCigars.push(entry.cigar);
        }

        // Count selected flavors
        entry.selectedFlavors.forEach(flavor => {
          flavorCounts[flavor] = (flavorCounts[flavor] || 0) + 1;
        });
      });

      // Find top preferences
      const topBrands = Object.entries(brandCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([brand]) => brand);

      const topStrengths = Object.entries(strengthCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 2)
        .map(([strength]) => strength);

      const topFlavors = Object.entries(flavorCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([flavor]) => flavor);

      return {
        topBrands,
        topStrengths,
        topFlavors,
        highRatedCigars,
        inventoryCount: inventory.length,
        journalCount: journalEntries.length,
        averageRating: journalEntries.length > 0 ? 
          journalEntries.reduce((sum, entry) => sum + entry.rating.overall, 0) / journalEntries.length : 0
      };
    } catch (error) {
      console.error('Error analyzing user profile:', error);
      return null;
    }
  }

  /**
   * Calculate smart match score based on user profile
   */
  private static calculateSmartMatchScore(cigar: any, userProfile: any): { score: number; reason: string[]; breakdown: any } {
    const breakdown = {
      overallQuality: 0,
      brandMatch: 0,
      strengthMatch: 0,
      flavorMatch: 0,
      similarityToFavorites: 0
    };
    const reasons: string[] = [];

    if (!userProfile) {
      // No user data, return base score
      const baseScore = Math.round((cigar.recognition_confidence || 0) * 100);
      breakdown.overallQuality = baseScore;
      return {
        score: baseScore,
        reason: ['Based on overall rating'],
        breakdown
      };
    }

    // Overall Quality (30% weight) - Base score from recognition confidence
    const qualityScore = Math.round((cigar.recognition_confidence || 0) * 100 * 0.3);
    breakdown.overallQuality = qualityScore;

    // Brand Match (25% weight)
    let brandScore = 0;
    if (userProfile.topBrands.includes(cigar.brand)) {
      brandScore = 25;
      reasons.push(`You enjoy ${cigar.brand} cigars`);
    }
    breakdown.brandMatch = brandScore;

    // Strength Match (20% weight)
    let strengthScore = 0;
    if (userProfile.topStrengths.includes(cigar.strength)) {
      strengthScore = 20;
      reasons.push(`Matches your preferred ${cigar.strength} strength`);
    }
    breakdown.strengthMatch = strengthScore;

    // Flavor Match (15% weight)
    let flavorScore = 0;
    const cigarFlavors = Array.isArray(cigar.flavor_profile) ? cigar.flavor_profile : [];
    const matchingFlavors = userProfile.topFlavors.filter(flavor => 
      cigarFlavors.some(cigarFlavor => 
        cigarFlavor.toLowerCase().includes(flavor.toLowerCase()) ||
        flavor.toLowerCase().includes(cigarFlavor.toLowerCase())
      )
    );
    
    if (matchingFlavors.length > 0) {
      flavorScore = Math.round((matchingFlavors.length / userProfile.topFlavors.length) * 15);
      reasons.push(`Features your favorite flavors`);
    }
    breakdown.flavorMatch = flavorScore;

    // Similarity to Favorites (10% weight)
    let similarityScore = 0;
    const similarToHighRated = userProfile.highRatedCigars.some(highRated => 
      highRated.brand === cigar.brand || 
      highRated.strength === cigar.strength ||
      (Array.isArray(highRated.flavorProfile) && Array.isArray(cigar.flavor_profile) &&
       highRated.flavorProfile.some(flavor => cigar.flavor_profile.includes(flavor)))
    );
    
    if (similarToHighRated) {
      similarityScore = 10;
      reasons.push('Similar to cigars you rated highly');
    }
    breakdown.similarityToFavorites = similarityScore;

    // Calculate total score (should be 0-100)
    const totalScore = qualityScore + brandScore + strengthScore + flavorScore + similarityScore;

    // Generate reason as array for bullet points
    const reasonArray = reasons.length > 0 ? reasons : ['Recommended based on overall quality'];

    return {
      score: Math.min(totalScore, 100), // Cap at 100%
      reason: reasonArray, 
      breakdown 
    };
  }

  /**
   * Calculate flavor similarity between two cigars
   */
  private static calculateFlavorSimilarity(flavors1: string[], flavors2: string[]): number {
    if (flavors1.length === 0 || flavors2.length === 0) return 0;

    const set1 = new Set(flavors1.map(f => f.toLowerCase()));
    const set2 = new Set(flavors2.map(f => f.toLowerCase()));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Calculate price similarity
   */
  private static calculatePriceSimilarity(price1: number, price2: number): number {
    const diff = Math.abs(price1 - price2);
    const maxPrice = Math.max(price1, price2);
    return Math.max(0, 1 - (diff / maxPrice));
  }

  /**
   * Generate recommendation reason
   */
  private static generateRecommendationReason(cigar: any, matchScore: number): string {
    const reasons = [];

    if (cigar.rating >= 95) {
      reasons.push('Exceptional rating');
    } else if (cigar.rating >= 93) {
      reasons.push('Highly rated');
    }

    if (matchScore > 0.8) {
      reasons.push('matches your preferences');
    }

    if (cigar.year_listed) {
      reasons.push(`Top ${cigar.year_listed} cigar`);
    }

    return reasons.length > 0 ? reasons.join(', ') : 'Recommended cigar';
  }

  /**
   * Transform database record to Cigar type
   */
  private static transformToCigarType(cigar: any): Cigar {
    console.log('🔍 transformToCigarType - raw cigar data:', JSON.stringify(cigar, null, 2));
    console.log('🔍 transformToCigarType - detail_url field:', cigar.detail_url);
    
    const transformedCigar = {
      id: cigar.id,
      brand: cigar.brand || '',
      line: cigar.line || '',
      name: cigar.name || '',
      size: cigar.size || '',
      wrapper: cigar.wrapper || '',
      filler: cigar.filler || '',
      binder: cigar.binder || '',
      tobacco: cigar.tobacco || '',
      strength: cigar.strength as 'Mild' | 'Medium' | 'Strong',
      flavorProfile: Array.isArray(cigar.flavor_profile) ? cigar.flavor_profile : [],
      tobaccoOrigins: Array.isArray(cigar.tobacco_origins) ? cigar.tobacco_origins : [],
      smokingExperience: cigar.smoking_experience || {
        first: '',
        second: '',
        final: ''
      },
      imageUrl: cigar.image_url,
      recognitionConfidence: cigar.recognition_confidence || 0,
      overview: cigar.overview || '',
      tobaccoOrigin: cigar.tobacco_origin || '',
      flavorTags: Array.isArray(cigar.flavor_profile) ? cigar.flavor_profile : [],
      cigarAficionadoRating: Math.round((cigar.recognition_confidence || 0) * 100),
      msrp: cigar.price_usd ? `$${cigar.price_usd}` : '',
      singleStickPrice: cigar.price_usd ? `$${cigar.price_usd}` : '',
      releaseYear: cigar.releaseYear || '',
      professionalRating: `${Math.round((cigar.recognition_confidence || 0) * 100)}/100`,
      detailUrl: cigar.detail_url
    };
    
    console.log('🔍 transformToCigarType - transformed cigar:', JSON.stringify(transformedCigar, null, 2));
    console.log('🔍 transformToCigarType - detailUrl in transformed:', transformedCigar.detailUrl);
    
    return transformedCigar;
  }

  /**
   * Get all cigars from the database
   */
  static async getAllCigars(): Promise<DatabaseCigar[]> {
    try {
      const { data, error } = await supabase
        .from('cigars')
        .select('*')
        .order('rating', { ascending: false });

      if (error) {
        console.error('Error fetching all cigars:', error);
        throw error;
      }

      return data as DatabaseCigar[];
    } catch (error) {
      console.error('Error in getAllCigars:', error);
    return [];
    }
  }

  /**
   * Get cigars based on strength
   */
  static async getCigarsByStrength(strength: string): Promise<DatabaseCigar[]> {
    try {
      const { data, error } = await supabase
        .from('cigars')
        .select('*')
        .eq('strength', strength)
        .order('rating', { ascending: false });

      if (error) {
        console.error(`Error fetching cigars by strength '${strength}':`, error);
        throw error;
      }

      return data as DatabaseCigar[];
    } catch (error) {
      console.error('Error in getCigarsByStrength:', error);
      return [];
    }
  }

  /**
   * Get cigars based on minimum rating
   */
  static async getCigarsByMinRating(minRating: number): Promise<DatabaseCigar[]> {
    try {
      const { data, error } = await supabase
        .from('cigars')
        .select('*')
        .gte('rating', minRating)
        .order('rating', { ascending: false });

      if (error) {
        console.error(`Error fetching cigars by minimum rating '${minRating}':`, error);
        throw error;
      }

      return data as DatabaseCigar[];
    } catch (error) {
      console.error('Error in getCigarsByMinRating:', error);
      return [];
    }
  }
}
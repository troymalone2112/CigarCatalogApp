import AsyncStorage from '@react-native-async-storage/async-storage';
import { InventoryItem, JournalEntry, UserPreferences, Cigar, UserProfile } from '../types';
import { UserManagementService } from '../services/userManagementService';
import { DatabaseService } from '../services/supabaseService';
import { toLocalDateString, fromLocalDateString } from '../utils/dateUtils';

// Base storage keys - will be made user-specific
const BASE_STORAGE_KEYS = {
  INVENTORY: '@cigar_catalog_inventory',
  JOURNAL: '@cigar_catalog_journal',
  PREFERENCES: '@cigar_catalog_preferences',
  RECENT_CIGARS: '@cigar_catalog_recent',
  USER_PROFILE: '@cigar_catalog_user_profile',
};

// Function to get user-specific storage keys
const getUserStorageKeys = (userId: string) => ({
  INVENTORY: `${BASE_STORAGE_KEYS.INVENTORY}_${userId}`,
  JOURNAL: `${BASE_STORAGE_KEYS.JOURNAL}_${userId}`,
  PREFERENCES: `${BASE_STORAGE_KEYS.PREFERENCES}_${userId}`,
  RECENT_CIGARS: `${BASE_STORAGE_KEYS.RECENT_CIGARS}_${userId}`,
  USER_PROFILE: `${BASE_STORAGE_KEYS.USER_PROFILE}_${userId}`,
});

export class StorageService {
  // Current user ID - should be set by AuthContext
  private static currentUserId: string | null = null;

  // Set current user ID (called by AuthContext)
  static setCurrentUser(userId: string | null): void {
    this.currentUserId = userId;
  }

  // Get current user ID
  static getCurrentUserId(): string {
    if (!this.currentUserId) {
      throw new Error('No user logged in. Cannot access user-specific data.');
    }
    return this.currentUserId;
  }

  // Get user-specific storage keys for current user
  private static getStorageKeys() {
    const userId = this.getCurrentUserId();
    return getUserStorageKeys(userId);
  }

  // Inventory Management - Now using Database
  static async getInventory(humidorId?: string): Promise<InventoryItem[]> {
    try {
      const userId = this.getCurrentUserId();
      return await DatabaseService.getInventory(userId, humidorId);
    } catch (error) {
      console.error('Error loading inventory:', error);
      return [];
    }
  }

  static async saveInventoryItem(item: InventoryItem): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      
      // Prepare inventory item for database
      const inventoryData = {
        id: item.id,
        user_id: userId,
        humidor_id: item.humidorId,
        cigar_data: item.cigar,
        quantity: item.quantity,
        purchase_date: item.purchaseDate?.toISOString(),
        price_paid: item.pricePaid,
        original_box_price: item.originalBoxPrice,
        sticks_per_box: item.sticksPerBox,
        location: item.location,
        notes: item.notes,
      };
      
      await DatabaseService.saveInventoryItem(inventoryData);
      
      // Log activity
      await UserManagementService.logUserActivity(
        'save_inventory_item',
        'inventory_item',
        item.id,
        { 
          cigarBrand: item.cigar.brand,
          cigarName: item.cigar.name,
          quantity: item.quantity,
          pricePaid: item.pricePaid,
          humidorId: item.humidorId
        }
      );
    } catch (error) {
      console.error('Error saving inventory item:', error);
      throw error;
    }
  }

  static async removeInventoryItem(itemId: string): Promise<void> {
    try {
      await DatabaseService.deleteInventoryItem(itemId);
    } catch (error) {
      console.error('Error removing inventory item:', error);
      throw error;
    }
  }

  static async updateInventoryQuantity(itemId: string, quantity: number): Promise<void> {
    try {
      console.log('🔄 StorageService: Updating quantity for itemId:', itemId, 'to:', quantity);
      
      // Ensure quantity is never negative
      const validQuantity = Math.max(0, quantity);
      
      await DatabaseService.updateInventoryItem(itemId, { quantity: validQuantity });
      console.log('🔄 StorageService: Updated quantity in database successfully');
    } catch (error) {
      console.error('Error updating inventory quantity:', error);
      throw error;
    }
  }

  // Journal Management
  static async getJournalEntries(): Promise<JournalEntry[]> {
    try {
      const userId = this.getCurrentUserId();
      const { JournalService } = await import('../services/supabaseService');
      const entries = await JournalService.getJournalEntries(userId);
      const mappedEntries = entries.map((entry: any) => ({
        id: entry.id,
        cigar: entry.cigar_data || {
          // Fallback cigar object if cigar_data is null/empty
          id: 'unknown',
          brand: 'Unknown Brand',
          line: 'Unknown Line',
          name: 'Unknown Name',
          strength: 'Medium',
          size: 'Unknown',
          wrapper: 'Unknown',
          filler: 'Unknown',
          binder: 'Unknown',
          tobacco: 'Unknown',
          flavorProfile: [],
          tobaccoOrigins: [],
          smokingExperience: {
            first: 'Unknown',
            second: 'Unknown',
            final: 'Unknown'
          }
        },
        date: fromLocalDateString(entry.smoking_date), // Ensure local date interpretation
        rating: {
          overall: entry.rating_overall || 0,
          draw: entry.rating_draw || 0,
          burn: entry.rating_construction || 0,
          flavor: entry.rating_flavor || 0,
          value: 0,
          complexity: entry.rating_complexity || 0,
        },
        selectedFlavors: entry.selected_flavors ? JSON.parse(entry.selected_flavors) : [],
        location: entry.setting ? { city: entry.setting } : undefined,
        photos: entry.image_url ? [entry.image_url] : undefined,
        notes: entry.notes,
      }));
      
      // Additional client-side sorting to ensure proper order
      const sortedEntries = mappedEntries.sort((a, b) => {
        // Sort by date first (most recent first)
        const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateComparison !== 0) return dateComparison;
        
        // If dates are the same, sort by creation time (most recent first)
        const aCreatedAt = new Date(entries.find(e => e.id === a.id)?.created_at || 0);
        const bCreatedAt = new Date(entries.find(e => e.id === b.id)?.created_at || 0);
        return bCreatedAt.getTime() - aCreatedAt.getTime();
      });
      
      console.log('🔍 Journal entries sorted:', sortedEntries.length, 'entries');
      return sortedEntries;
    } catch (error) {
      console.error('Error loading journal entries:', error);
      return [];
    }
  }

  static async saveJournalEntry(entry: JournalEntry): Promise<void> {
    console.log('🔍 StorageService.saveJournalEntry called with:', entry.cigar?.brand);
    try {
      const userId = this.getCurrentUserId();
      console.log('🔍 User ID:', userId);
      const { JournalService } = await import('../services/supabaseService');
      
      // Generate a proper UUID for the cigar_id since cigars aren't stored in database
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      // Prepare journal entry for database (matching the actual database schema)
      // Fix timezone issue by using local date instead of UTC
      const localDateString = toLocalDateString(entry.date);
      
      console.log('🔍 Journal entry date conversion:', {
        originalDate: entry.date,
        localDateString: localDateString
      });
      
      const journalData = {
        id: entry.id,
        user_id: userId,
        cigar_data: entry.cigar, // Store the complete cigar object
        smoking_date: localDateString, // Use local date to avoid timezone issues
        rating_overall: entry.rating?.overall && entry.rating.overall > 0 ? entry.rating.overall : null,
        rating_construction: entry.rating?.construction && entry.rating.construction > 0 ? entry.rating.construction : null,
        rating_draw: entry.rating?.draw && entry.rating.draw > 0 ? entry.rating.draw : null,
        rating_flavor: entry.rating?.flavor && entry.rating.flavor > 0 ? entry.rating.flavor : null,
        rating_complexity: entry.rating?.complexity && entry.rating.complexity > 0 ? entry.rating.complexity : null,
        notes: entry.notes,
        setting: entry.location?.city || '',
        pairing: entry.location?.state || '',
        image_url: entry.imageUrl || entry.photos?.[0] || null,
        selected_flavors: entry.selectedFlavors ? JSON.stringify(entry.selectedFlavors) : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      await JournalService.saveJournalEntry(journalData);
      
      // Log activity
      try {
        await UserManagementService.logUserActivity(
          'save_journal_entry',
          'journal_entry',
          entry.id,
          { 
            cigarBrand: entry.cigar.brand,
            cigarName: entry.cigar.name,
            rating: entry.rating?.overall,
            selectedFlavors: entry.selectedFlavors
          }
        );
      } catch (logError) {
        console.log('User activity logging failed (non-critical):', logError);
      }
    } catch (error) {
      console.error('Error saving journal entry:', error);
      throw error;
    }
  }

  static async removeJournalEntry(entryId: string): Promise<void> {
    try {
      const { JournalService } = await import('../services/supabaseService');
      
      // Get entry before deletion for logging
      const entries = await this.getJournalEntries();
      const entryToRemove = entries.find(entry => entry.id === entryId);
      
      // Delete from database
      await JournalService.deleteJournalEntry(entryId);
      
      // Log removal activity in the background (non-blocking)
      if (entryToRemove) {
        // Don't await this - let it run in the background
        UserManagementService.logUserActivity(
          'remove_journal_entry',
          'journal_entry',
          entryId,
          { 
            cigarBrand: entryToRemove.cigar.brand,
            cigarName: entryToRemove.cigar.name,
            rating: entryToRemove.rating?.overall
          }
        ).catch(logError => {
          console.log('User activity logging failed (non-critical):', logError);
        });
      }
    } catch (error) {
      console.error('Error removing journal entry:', error);
      throw error;
    }
  }

  // User Preferences
  static async getUserPreferences(): Promise<UserPreferences> {
    try {
      const storageKeys = this.getStorageKeys();
      const data = await AsyncStorage.getItem(storageKeys.PREFERENCES);
      return data ? JSON.parse(data) : {
        favoriteStrengths: [],
        favoriteFlavors: [],
        favoriteOrigins: [],
        dislikedFlavors: [],
        preferredSizes: [],
      };
    } catch (error) {
      console.error('Error loading user preferences:', error);
      return {
        favoriteStrengths: [],
        favoriteFlavors: [],
        favoriteOrigins: [],
        dislikedFlavors: [],
        preferredSizes: [],
      };
    }
  }

  static async saveUserPreferences(preferences: UserPreferences): Promise<void> {
    try {
      const storageKeys = this.getStorageKeys();
      await AsyncStorage.setItem(storageKeys.PREFERENCES, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving user preferences:', error);
      throw error;
    }
  }

  // Recent Cigars (for quick access)
  static async getRecentCigars(): Promise<Cigar[]> {
    try {
      const storageKeys = this.getStorageKeys();
      const data = await AsyncStorage.getItem(storageKeys.RECENT_CIGARS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading recent cigars:', error);
      return [];
    }
  }

  static async addRecentCigar(cigar: Cigar): Promise<void> {
    try {
      const recent = await this.getRecentCigars();
      
      // Remove if already exists
      const filtered = recent.filter(c => c.id !== cigar.id);
      
      // Add to beginning and limit to 20 items
      const updated = [cigar, ...filtered].slice(0, 20);
      
      const storageKeys = this.getStorageKeys();
      await AsyncStorage.setItem(storageKeys.RECENT_CIGARS, JSON.stringify(updated));
    } catch (error) {
      console.error('Error adding recent cigar:', error);
      throw error;
    }
  }

  // Utility methods
  static async clearAllData(): Promise<void> {
    try {
      const storageKeys = this.getStorageKeys();
      await AsyncStorage.multiRemove(Object.values(storageKeys));
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw error;
    }
  }

  static async exportData(): Promise<string> {
    try {
      const [inventory, journal, preferences, recent] = await Promise.all([
        this.getInventory(),
        this.getJournalEntries(),
        this.getUserPreferences(),
        this.getRecentCigars(),
      ]);

      return JSON.stringify({
        inventory,
        journal,
        preferences,
        recent,
        exportDate: new Date().toISOString(),
      }, null, 2);
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  // User Profile Management
  static async getUserProfile(): Promise<UserProfile | null> {
    try {
      const storageKeys = this.getStorageKeys();
      const data = await AsyncStorage.getItem(storageKeys.USER_PROFILE);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  }

  static async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      const storageKeys = this.getStorageKeys();
      await AsyncStorage.setItem(storageKeys.USER_PROFILE, JSON.stringify(profile));
      console.log('✅ User profile saved:', profile);
    } catch (error) {
      console.error('Error saving user profile:', error);
      throw error;
    }
  }

  static async updateUserProfile(updates: Partial<UserProfile>): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) return;
      
      // If onboarding completion is being updated, save to database
      if (updates.onboardingCompleted !== undefined) {
        const { DatabaseService } = await import('../services/supabaseService');
        await DatabaseService.updateProfile(userId, { onboarding_completed: updates.onboardingCompleted });
        return;
      }
      
      // For other updates, use AsyncStorage (legacy support)
      const currentProfile = await this.getUserProfile();
      if (currentProfile) {
        const updatedProfile = { ...currentProfile, ...updates, updatedAt: new Date() };
        await this.saveUserProfile(updatedProfile);
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  static async isOnboardingCompleted(): Promise<boolean> {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        console.log('🔍 No current user ID, returning false for onboarding');
        return false;
      }
      
      console.log('🔍 Checking onboarding status for user:', userId);
      const { DatabaseService } = await import('../services/supabaseService');
      const profile = await DatabaseService.getProfile(userId);
      
      // If profile doesn't have onboarding_completed field, assume they've completed it (existing user)
      if (profile && profile.onboarding_completed === undefined) {
        console.log('🔧 Profile missing onboarding_completed field - assuming existing user, marking as completed');
        try {
          await DatabaseService.updateProfile(userId, { onboarding_completed: true });
          return true;
        } catch (updateError) {
          console.error('❌ Error updating onboarding status:', updateError);
          // If we can't update, assume they've completed onboarding (existing user)
          return true;
        }
      }
      
      const completed = profile?.onboarding_completed || false;
      console.log('✅ Onboarding status result:', completed);
      return completed;
    } catch (error) {
      console.error('❌ Error checking onboarding status:', error);
      // For existing users, if we can't check the status, assume they've completed onboarding
      // This prevents existing users from getting stuck in onboarding
      console.log('🔧 Assuming existing user has completed onboarding due to error');
      return true;
    }
  }

  // Clear current user data (called on logout)
  static async clearCurrentUserData(): Promise<void> {
    try {
      if (this.currentUserId) {
        const storageKeys = getUserStorageKeys(this.currentUserId);
        await AsyncStorage.multiRemove(Object.values(storageKeys));
        console.log('✅ Cleared user data for:', this.currentUserId);
      }
      this.currentUserId = null;
    } catch (error) {
      console.error('Error clearing user data:', error);
      throw error;
    }
  }

  // Inventory Management Functions
  static async saveInventoryItem(item: InventoryItem): Promise<void> {
    console.log('🔍 StorageService.saveInventoryItem called with item:', item.id);
    try {
      const { InventoryService } = await import('../services/supabaseService');
      
      // Convert to database format
      const inventoryData = {
        id: item.id,
        user_id: this.currentUserId,
        humidor_id: item.humidorId,
        cigar_data: item.cigar, // Store the complete cigar object
        quantity: item.quantity,
        price_paid: item.pricePaid || 0,
        original_box_price: item.originalBoxPrice || null,
        sticks_per_box: item.sticksPerBox || null,
        location: item.location || null,
        notes: item.notes || null,
        date_acquired: item.dateAcquired?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        aging_preference_months: item.agingPreferenceMonths || 0,
        length_inches: item.lengthInches || null,
        ring_gauge: item.ringGauge || null,
        vitola: item.vitola || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      await InventoryService.saveInventoryItem(inventoryData);
      
      // Log activity
      try {
        await UserManagementService.logUserActivity(
          'save_inventory_item',
          'inventory_item',
          item.id,
          { 
            cigarBrand: item.cigar.brand,
            cigarLine: item.cigar.line,
            quantity: item.quantity,
            humidorId: item.humidorId
          }
        );
      } catch (logError) {
        console.log('User activity logging failed (non-critical):', logError);
      }
    } catch (error) {
      console.error('Error saving inventory item:', error);
      throw error;
    }
  }

  static async getInventoryItems(humidorId?: string): Promise<InventoryItem[]> {
    try {
      const { InventoryService } = await import('../services/supabaseService');
      return await InventoryService.getInventoryItems(humidorId);
    } catch (error) {
      console.error('Error getting inventory items:', error);
      throw error;
    }
  }

  static async updateInventoryQuantity(itemId: string, newQuantity: number): Promise<void> {
    try {
      const { InventoryService } = await import('../services/supabaseService');
      await InventoryService.updateInventoryQuantity(itemId, newQuantity);
    } catch (error) {
      console.error('Error updating inventory quantity:', error);
      throw error;
    }
  }

  static async removeInventoryItem(itemId: string): Promise<void> {
    try {
      const { InventoryService } = await import('../services/supabaseService');
      
      // Get item before deletion for logging
      const items = await this.getInventoryItems();
      const itemToRemove = items.find(item => item.id === itemId);
      
      // Delete from database
      await InventoryService.removeInventoryItem(itemId);
      
      // Log removal activity
      if (itemToRemove) {
        try {
          await UserManagementService.logUserActivity(
            'remove_inventory_item',
            'inventory_item',
            itemId,
            { 
              cigarBrand: itemToRemove.cigar.brand,
              cigarLine: itemToRemove.cigar.line,
              quantity: itemToRemove.quantity
            }
          );
        } catch (logError) {
          console.log('User activity logging failed (non-critical):', logError);
        }
      }
    } catch (error) {
      console.error('Error removing inventory item:', error);
      throw error;
    }
  }
}

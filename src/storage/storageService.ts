import AsyncStorage from '@react-native-async-storage/async-storage';
import { InventoryItem, JournalEntry, UserPreferences, Cigar, UserProfile } from '../types';
import { UserManagementService } from '../services/userManagementService';
import { DatabaseService } from '../services/supabaseService';

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
      return entries.map((entry: any) => ({
        ...entry,
        date: new Date(entry.date),
        // Map database fields to JournalEntry interface
        cigar: entry.cigar_data,
        rating: entry.rating,
        selectedFlavors: entry.selected_flavors,
        location: entry.location,
        photos: entry.photos,
        notes: entry.notes,
      }));
    } catch (error) {
      console.error('Error loading journal entries:', error);
      return [];
    }
  }

  static async saveJournalEntry(entry: JournalEntry): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      const { JournalService } = await import('../services/supabaseService');
      
      // Prepare journal entry for database
      const journalData = {
        id: entry.id,
        user_id: userId,
        cigar_data: entry.cigar,
        date: entry.date.toISOString(),
        rating: entry.rating,
        selected_flavors: entry.selectedFlavors,
        notes: entry.notes,
        location: entry.location,
        photos: entry.photos,
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
      
      // Log removal activity
      if (entryToRemove) {
        try {
          await UserManagementService.logUserActivity(
            'remove_journal_entry',
            'journal_entry',
            entryId,
            { 
              cigarBrand: entryToRemove.cigar.brand,
              cigarName: entryToRemove.cigar.name,
              rating: entryToRemove.rating?.overall
            }
          );
        } catch (logError) {
          console.log('User activity logging failed (non-critical):', logError);
        }
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
      const profile = await this.getUserProfile();
      return profile?.onboardingCompleted || false;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
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
}

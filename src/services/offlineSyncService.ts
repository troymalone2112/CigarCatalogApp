/**
 * Offline Sync Service
 * Handles syncing of offline journal entries when network is restored
 */

import { JournalCacheService } from './journalCacheService';
import { JournalService } from './supabaseService';
import { JournalEntry } from '../types';

export class OfflineSyncService {
  private static isOnline = true;
  private static syncInProgress = false;

  /**
   * Check if device is online
   */
  static async checkOnlineStatus(): Promise<boolean> {
    try {
      // Simple network check - try to reach a reliable endpoint
      const response = await fetch('https://www.google.com', { 
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      });
      this.isOnline = true;
      return true;
    } catch (error) {
      console.log('📱 Device appears to be offline');
      this.isOnline = false;
      return false;
    }
  }

  /**
   * Sync all pending journal entries
   */
  static async syncPendingEntries(): Promise<void> {
    if (this.syncInProgress) {
      console.log('🔄 Sync already in progress, skipping...');
      return;
    }

    try {
      this.syncInProgress = true;
      console.log('🔄 Starting offline sync...');

      // Check if we're online
      const isOnline = await this.checkOnlineStatus();
      if (!isOnline) {
        console.log('📱 Still offline, skipping sync');
        return;
      }

      // Get all cached entries
      const cachedEntries = await JournalCacheService.getCachedEntries();
      
      // Find entries that need syncing
      const pendingEntries = cachedEntries.filter(entry => 
        entry._pendingSync === true || entry._syncError
      );

      if (pendingEntries.length === 0) {
        console.log('✅ No pending entries to sync');
        return;
      }

      console.log(`🔄 Found ${pendingEntries.length} pending entries to sync`);

      // Sync each pending entry
      for (const entry of pendingEntries) {
        try {
          console.log(`🔄 Syncing entry: ${entry.cigar?.brand} ${entry.cigar?.name}`);
          
          // Prepare journal data for database
          const journalData = {
            id: entry.id,
            user_id: entry.userId,
            cigar_data: entry.cigar,
            smoking_date: entry.date.toISOString(),
            rating_overall: entry.rating?.overall || null,
            rating_construction: entry.rating?.construction || null,
            rating_draw: entry.rating?.draw || null,
            rating_flavor: entry.rating?.flavor || null,
            rating_complexity: entry.rating?.complexity || null,
            notes: entry.notes,
            setting: entry.location?.city || '',
            pairing: entry.location?.state || '',
            image_url: entry.imageUrl || null,
            photos: entry.photos ? JSON.stringify(entry.photos) : null,
            selected_flavors: entry.selectedFlavors ? JSON.stringify(entry.selectedFlavors) : null,
            created_at: entry.date.toISOString(),
            updated_at: new Date().toISOString(),
          };

          // Try to save to database
          await JournalService.saveJournalEntry(journalData);
          
          // Remove pending sync markers
          const syncedEntry = { ...entry };
          delete syncedEntry._pendingSync;
          delete syncedEntry._syncError;
          
          // Update cache with synced entry
          await JournalCacheService.addEntryToCache(syncedEntry);
          
          console.log(`✅ Successfully synced entry: ${entry.cigar?.brand} ${entry.cigar?.name}`);
        } catch (error) {
          console.error(`❌ Failed to sync entry ${entry.id}:`, error);
          // Keep the entry as pending for next sync attempt
        }
      }

      console.log('✅ Offline sync completed');
    } catch (error) {
      console.error('❌ Error during offline sync:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Start automatic sync when app becomes active
   */
  static async startAutoSync(): Promise<void> {
    console.log('🔄 Starting auto-sync service...');
    
    // Initial sync check
    await this.syncPendingEntries();
    
    // Set up periodic sync (every 30 seconds when online)
    setInterval(async () => {
      if (this.isOnline) {
        await this.syncPendingEntries();
      }
    }, 30000);
  }

  /**
   * Force sync all pending entries
   */
  static async forceSync(): Promise<void> {
    console.log('🔄 Force syncing all pending entries...');
    this.syncInProgress = false; // Reset sync lock
    await this.syncPendingEntries();
  }
}

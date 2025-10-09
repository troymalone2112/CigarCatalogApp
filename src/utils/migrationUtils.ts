// Migration utilities for moving from local storage to database
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DatabaseService } from '../services/supabaseService';

// Function to get user-specific storage keys
const getUserStorageKeys = (userId: string) => ({
  INVENTORY: `@cigar_catalog_inventory_${userId}`,
  JOURNAL: `@cigar_catalog_journal_${userId}`,
  PREFERENCES: `@cigar_catalog_preferences_${userId}`,
  RECENT_CIGARS: `@cigar_catalog_recent_${userId}`,
  USER_PROFILE: `@cigar_catalog_user_profile_${userId}`,
});

export const checkMigrationNeeded = async (userId: string): Promise<{
  needsMigration: boolean;
  localItemCount: number;
  dbItemCount: number;
  error?: string;
}> => {
  try {
    const storageKeys = getUserStorageKeys(userId);
    const localInventory = await AsyncStorage.getItem(storageKeys.INVENTORY);
    const localDataExists = localInventory && JSON.parse(localInventory).length > 0;
    
    const dbInventory = await DatabaseService.getInventory(userId);
    const dbDataExists = dbInventory.length > 0;
    
    return {
      needsMigration: localDataExists && !dbDataExists,
      localItemCount: localDataExists ? JSON.parse(localInventory).length : 0,
      dbItemCount: dbInventory.length,
    };
  } catch (error) {
    console.error('Error checking migration status:', error);
    return {
      needsMigration: false,
      localItemCount: 0,
      dbItemCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const migrateLocalDataToDatabase = async (userId: string): Promise<{
  success: boolean;
  migratedCount: number;
  skippedCount: number;
  defaultHumidor?: any;
  error?: string;
}> => {
  console.log('🚀 Starting migration from local storage to database...');
  
  try {
    const storageKeys = getUserStorageKeys(userId);
    
    // 1. Create default humidor if it doesn't exist
    console.log('📦 Creating default humidor...');
    let defaultHumidor;
    try {
      const existingHumidors = await DatabaseService.getHumidors(userId);
      if (existingHumidors.length === 0) {
        defaultHumidor = await DatabaseService.createHumidor(
          userId,
          'Main Humidor',
          'Your default humidor - migrated from local storage'
        );
        console.log('✅ Created default humidor:', defaultHumidor.name);
      } else {
        defaultHumidor = existingHumidors[0];
        console.log('✅ Using existing humidor:', defaultHumidor.name);
      }
    } catch (error) {
      console.error('❌ Error creating default humidor:', error);
      throw error;
    }
    
    // 2. Migrate inventory data
    console.log('📦 Migrating inventory data...');
    try {
      const localInventory = await AsyncStorage.getItem(storageKeys.INVENTORY);
      const inventoryItems = localInventory ? JSON.parse(localInventory) : [];
      
      console.log(`📊 Found ${inventoryItems.length} inventory items to migrate`);
      
      let migratedCount = 0;
      let skippedCount = 0;
      
      for (const item of inventoryItems) {
        try {
          // Check if item already exists in database
          const existingItems = await DatabaseService.getInventory(userId, defaultHumidor.id);
          const exists = existingItems.some(existing => existing.id === item.id);
          
          if (exists) {
            console.log(`⏭️ Skipping existing item: ${item.cigar.brand} ${item.cigar.line}`);
            skippedCount++;
            continue;
          }
          
          // Prepare inventory item for database
          const inventoryData = {
            id: item.id,
            user_id: userId,
            humidor_id: defaultHumidor.id,
            cigar_data: item.cigar,
            quantity: item.quantity,
            purchase_date: item.purchaseDate ? new Date(item.purchaseDate).toISOString() : null,
            price_paid: item.pricePaid || null,
            original_box_price: item.originalBoxPrice || null,
            sticks_per_box: item.sticksPerBox || null,
            location: item.location || null,
            notes: item.notes || null,
          };
          
          await DatabaseService.saveInventoryItem(inventoryData);
          console.log(`✅ Migrated: ${item.cigar.brand} ${item.cigar.line}`);
          migratedCount++;
          
        } catch (itemError) {
          console.error(`❌ Error migrating item ${item.cigar.brand} ${item.cigar.line}:`, itemError);
        }
      }
      
      console.log(`📊 Migration complete: ${migratedCount} migrated, ${skippedCount} skipped`);
      
      // 3. Backup local data (optional - for safety)
      console.log('💾 Creating backup of local data...');
      try {
        const backupData = {
          inventory: localInventory,
          migratedAt: new Date().toISOString(),
          userId: userId,
        };
        
        await AsyncStorage.setItem(
          `@cigar_catalog_backup_${userId}_${Date.now()}`,
          JSON.stringify(backupData)
        );
        console.log('✅ Backup created successfully');
        
      } catch (error) {
        console.error('⚠️ Warning: Could not create backup:', error);
      }
      
      console.log('🎉 Migration completed successfully!');
      return {
        success: true,
        migratedCount,
        skippedCount,
        defaultHumidor,
      };
      
    } catch (error) {
      console.error('❌ Error migrating inventory:', error);
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      migratedCount: 0,
      skippedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Migration Script: Local Storage to Database
// Run this script to migrate your existing AsyncStorage data to the database

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DatabaseService } from './src/services/supabaseService';
import { useAuth } from './src/contexts/AuthContext';

// Function to get user-specific storage keys
const getUserStorageKeys = (userId) => ({
  INVENTORY: `@cigar_catalog_inventory_${userId}`,
  JOURNAL: `@cigar_catalog_journal_${userId}`,
  PREFERENCES: `@cigar_catalog_preferences_${userId}`,
  RECENT_CIGARS: `@cigar_catalog_recent_${userId}`,
  USER_PROFILE: `@cigar_catalog_user_profile_${userId}`,
});

export const migrateLocalDataToDatabase = async (userId) => {
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
            cigar_data: {
              id: item.cigar.id,
              brand: item.cigar.brand,
              line: item.cigar.line,
              name: item.cigar.name,
              size: item.cigar.size,
              wrapper: item.cigar.wrapper,
              filler: item.cigar.filler,
              binder: item.cigar.binder,
              tobacco: item.cigar.tobacco,
              strength: item.cigar.strength,
              flavorProfile: item.cigar.flavorProfile,
              tobaccoOrigins: item.cigar.tobaccoOrigins,
              smokingExperience: item.cigar.smokingExperience,
              imageUrl: item.cigar.imageUrl,
              recognitionConfidence: item.cigar.recognitionConfidence,
              msrp: item.cigar.msrp,
              singleStickPrice: item.cigar.singleStickPrice,
              releaseYear: item.cigar.releaseYear,
              limitedEdition: item.cigar.limitedEdition,
              professionalRating: item.cigar.professionalRating,
              agingPotential: item.cigar.agingPotential,
              wrapperColor: item.cigar.wrapperColor,
              identifyingFeatures: item.cigar.identifyingFeatures,
              overview: item.cigar.overview,
              tobaccoOrigin: item.cigar.tobaccoOrigin,
              flavorTags: item.cigar.flavorTags,
              cigarAficionadoRating: item.cigar.cigarAficionadoRating,
              detailUrl: item.cigar.detailUrl,
            },
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
      
    } catch (error) {
      console.error('❌ Error migrating inventory:', error);
      throw error;
    }
    
    // 3. Backup local data (optional - for safety)
    console.log('💾 Creating backup of local data...');
    try {
      const backupData = {
        inventory: await AsyncStorage.getItem(storageKeys.INVENTORY),
        journal: await AsyncStorage.getItem(storageKeys.JOURNAL),
        preferences: await AsyncStorage.getItem(storageKeys.PREFERENCES),
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
      defaultHumidor,
      migratedCount,
      skippedCount,
    };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Helper function to check if migration is needed
export const checkMigrationStatus = async (userId) => {
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
      error: error.message,
    };
  }
};

export default { migrateLocalDataToDatabase, checkMigrationStatus };

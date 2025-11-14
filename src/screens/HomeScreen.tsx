import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Pressable,
  Dimensions,
  StatusBar,
  ImageBackground,
} from 'react-native';
import { RefreshControl } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RootStackParamList, InventoryItem, TabParamList } from '../types';
import { StorageService } from '../storage/storageService';
import { serializeJournalEntry } from '../utils/journalSerialization';
import SubscriptionBanner from '../components/SubscriptionBanner';
import { useScreenLoading } from '../hooks/useScreenLoading';
import { useAuth } from '../contexts/AuthContext';
import { useAccessControl } from '../hooks/useAccessControl';
import { DashboardCacheService } from '../services/dashboardCacheService';
import { OptimizedHumidorService } from '../services/optimizedHumidorService';
import { AgingAlertService } from '../services/agingAlertService';
import { connectionManager } from '../services/connectionManager';

type HomeScreenNavigationProp = BottomTabNavigationProp<TabParamList, 'Home'> & {
  navigate: (screen: string, params?: any) => void;
};

const { width: screenWidth } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useAuth();
  const { canScan } = useAccessControl();
  const [inventoryCount, setInventoryCount] = useState(0);
  const [journalCount, setJournalCount] = useState(0);
  const [latestJournalEntries, setLatestJournalEntries] = useState<any[]>([]);
  const { loading, setLoading } = useScreenLoading(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // 1) Show cached dashboard instantly if available
      const showCacheThenLoad = async () => {
        try {
          if (user?.id) {
            // Track activity for connection manager
            connectionManager.trackActivity();

            // Ensure connection is fresh (non-blocking)
            connectionManager.ensureFreshConnection().catch(() => {});

            // Load from cache instantly
            const cached = await DashboardCacheService.getCachedDashboardData(user.id);
            if (cached) {
              console.log('📦 Loading from cache - instant display');
              setInventoryCount(cached.inventoryCount);
              setJournalCount(cached.journalCount);
              setLatestJournalEntries(cached.latestJournalEntries);
              setLoading(false); // UI ready immediately
            } else {
              console.log('⚠️ No cache available, will load from network');
              // No cache, show loading state briefly
              setLoading(true);
            }

            // Warm humidor cache in background (non-blocking)
            OptimizedHumidorService.preloadHumidorData(user.id).catch(() => {});
            // Run aging alerts daily (non-blocking)
            AgingAlertService.runDailyCheck(user.id).catch(() => {});
          }
        } catch (error) {
          console.warn('⚠️ Error in showCacheThenLoad:', error);
          setLoading(false);
        }
        
        // 2) Load fresh data in background (never blocks UI)
        if (!isLoadingData && user?.id) {
          loadDashboardData();
        }
      };
      showCacheThenLoad();
    }, [user?.id]),
  );

  const loadDashboardData = async () => {
    if (isLoadingData) {
      console.log('🚨 HomeScreen - Already loading data, skipping...');
      return;
    }

    try {
      setIsLoadingData(true);
      console.log('🔄 HomeScreen - Starting background data refresh');

      // Ensure connection is fresh before loading
      await connectionManager.ensureFreshConnection();

      // Add shorter timeout to prevent hanging (10 seconds instead of 15)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Dashboard data load timeout')), 10000),
      );

      const dataPromise = Promise.all([
        StorageService.getInventory().catch((err) => {
          console.log('⚠️ Inventory load failed:', err);
          return []; // Return empty array on error
        }),
        StorageService.getJournalEntries().catch((err) => {
          console.log('⚠️ Journal load failed:', err);
          return []; // Return empty array on error
        }),
      ]);

      const [inventory, journal] = (await Promise.race([dataPromise, timeoutPromise])) as any[];

      console.log('✅ HomeScreen - Got inventory:', inventory.length, 'journal:', journal.length);

      // Update UI with fresh data
      const totalInventory = inventory.reduce((sum: number, item: any) => sum + item.quantity, 0);
      setInventoryCount(totalInventory);
      setJournalCount(journal.length);

      // Get latest 3 journal entries (already sorted by getJournalEntries, but ensure proper order)
      const sortedJournal = journal.sort((a: any, b: any) => {
        // Sort by date first (most recent first)
        const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateComparison !== 0) return dateComparison;

        // If dates are the same, sort by ID (most recent first - assuming newer entries have higher IDs)
        return b.id.localeCompare(a.id);
      });
      setLatestJournalEntries(sortedJournal.slice(0, 3));
      
      // Cache the fresh results for instant next-launch display
      if (user?.id) {
        try {
          await DashboardCacheService.cacheDashboardData(
            user.id,
            totalInventory,
            journal.length,
            sortedJournal.slice(0, 3),
          );
          console.log('✅ HomeScreen - Fresh data cached');
        } catch (cacheError) {
          console.warn('⚠️ HomeScreen - Cache update failed:', cacheError);
        }
      }
    } catch (error) {
      const msg = String((error as any)?.message || '').toLowerCase();
      if (msg.includes('timeout')) {
        console.warn('⚠️ HomeScreen - Dashboard load timed out; keeping cached/defaults');
        // Don't overwrite cached values on timeout
      } else {
        console.warn('⚠️ HomeScreen - Error loading dashboard data:', error);
        // Only update if we don't have cached values
        if (inventoryCount === 0 && journalCount === 0) {
          setInventoryCount(0);
          setJournalCount(0);
          setLatestJournalEntries([]);
        }
      }
    } finally {
      console.log('✅ HomeScreen - Background refresh complete');
      setIsLoadingData(false);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  const handleCigarRecognition = () => {
    if (canScan()) {
      navigation.navigate('CigarRecognition');
    }
  };

  const handleSearch = () => {
    if (canScan()) {
      navigation.navigate('JournalManualEntry');
    }
  };

  if (loading) {
    console.log('🚨 HomeScreen is in loading state!');
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require('../../assets/tobacco-leaves-bg.jpg')}
      style={styles.container}
      imageStyle={styles.backgroundImage}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Subscription Banner */}
        <SubscriptionBanner />

        {/* Main Actions */}
        <View style={styles.mainActions}>
          <Pressable style={styles.actionButton} onPress={handleCigarRecognition}>
            <Ionicons name="camera" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Scan</Text>
          </Pressable>

          <Pressable style={styles.actionButton} onPress={handleSearch}>
            <Ionicons name="search" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Search</Text>
          </Pressable>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <Pressable
            style={styles.statItem}
            onPress={() => navigation.navigate('MainTabs', { screen: 'HumidorList' })}
          >
            <Text style={styles.statNumber}>{inventoryCount}</Text>
            <Text style={styles.statLabel}>Humidor</Text>
          </Pressable>

          <Pressable
            style={styles.statItem}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Journal' })}
          >
            <Text style={styles.statNumber}>{journalCount}</Text>
            <Text style={styles.statLabel}>Notes</Text>
          </Pressable>
        </View>

        {/* Latest Notes */}
        {latestJournalEntries.length > 0 && (
          <View style={styles.latestJournalSection}>
            <Text style={styles.sectionTitle}>Notes</Text>
            {latestJournalEntries.map((entry, index) => (
              <Pressable
                key={entry.id || index}
                style={styles.journalEntryItem}
                onPress={() =>
                  navigation.navigate('JournalEntryDetails', {
                    entry: serializeJournalEntry(entry),
                  })
                }
              >
                <View style={styles.journalEntryContent}>
                  <Text style={styles.journalEntryBrand}>{entry.cigar.brand}</Text>
                  <Text style={styles.journalEntryLine}>{entry.cigar.line}</Text>
                  <Text style={styles.journalEntryDate}>
                    {new Date(entry.date).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.journalEntryRating}>
                  <Text style={styles.journalRatingText}>{entry.rating.overall}/10</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  backgroundImage: {
    opacity: 0.4,
    resizeMode: 'cover',
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: 30, // Reduced space from header
    paddingBottom: 30, // More space to buttons below
    width: '100%',
    maxWidth: '100%',
  },
  logo: {
    width: Math.min(screenWidth * 0.85, 350), // Responsive: 85% of screen or max 350px
    height: Math.min(screenWidth * 0.425, 175), // Proportional height
    maxWidth: '100%',
  },
  mainActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20, // Reduced spacing
    marginBottom: 15,
    gap: 12,
    width: '100%',
    maxWidth: '100%',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC851F',
    paddingVertical: 12, // Reduced height
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 30,
    gap: 12,
    width: '100%',
    maxWidth: '100%',
  },
  statItem: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 12, // Reduced padding for smaller height
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#555555',
  },
  statNumber: {
    fontSize: 18, // Smaller numbers
    fontWeight: 'bold',
    color: '#DC851F',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12, // Smaller labels
    color: '#CCCCCC', // Match journal entry dates
    fontWeight: '500',
  },
  latestJournalSection: {
    paddingHorizontal: 20,
    marginBottom: 40, // Increased bottom margin for footer spacing
    width: '100%',
    maxWidth: '100%',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#CCCCCC', // Darker than white
    marginBottom: 16,
  },
  journalEntryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#555555',
  },
  journalEntryContent: {
    flex: 1,
  },
  journalEntryBrand: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CCCCCC', // Match sectionTitle color
    marginBottom: 2,
  },
  journalEntryLine: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC851F', // Orange color
    marginBottom: 4,
  },
  journalEntryDate: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  journalEntryRating: {
    backgroundColor: '#DC851F',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  journalRatingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

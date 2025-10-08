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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RootStackParamList, InventoryItem, TabParamList } from '../types';
import { StorageService } from '../storage/storageService';
import SubscriptionBanner from '../components/SubscriptionBanner';

type HomeScreenNavigationProp = BottomTabNavigationProp<TabParamList, 'Home'> & {
  navigate: (screen: string, params?: any) => void;
};

const { width: screenWidth } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [inventoryCount, setInventoryCount] = useState(0);
  const [journalCount, setJournalCount] = useState(0);
  const [latestJournalEntries, setLatestJournalEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const loadDashboardData = async () => {
    try {
      const [inventory, journal] = await Promise.all([
        StorageService.getInventory(),
        StorageService.getJournalEntries(),
      ]);

      setInventoryCount(inventory.reduce((sum, item) => sum + item.quantity, 0));
      setJournalCount(journal.length);
      
      // Get latest 3 journal entries
      const sortedJournal = journal.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setLatestJournalEntries(sortedJournal.slice(0, 3));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCigarRecognition = () => {
    navigation.navigate('CigarRecognition');
  };

  const handleSearch = () => {
    // Navigate to search functionality
    navigation.navigate('CigarRecognition', { openSearch: true });
  };

  if (loading) {
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
      <StatusBar barStyle="light-content" backgroundColor="#343330" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
            onPress={() => navigation.navigate('MainTabs', { screen: 'Inventory' })}
          >
            <Text style={styles.statNumber}>{inventoryCount}</Text>
            <Text style={styles.statLabel}>Humidor</Text>
          </Pressable>
          
          <Pressable 
            style={styles.statItem} 
            onPress={() => navigation.navigate('MainTabs', { screen: 'Journal' })}
          >
            <Text style={styles.statNumber}>{journalCount}</Text>
            <Text style={styles.statLabel}>Journal</Text>
          </Pressable>
        </View>


        {/* Latest Journal Entries */}
        {latestJournalEntries.length > 0 && (
          <View style={styles.latestJournalSection}>
            <Text style={styles.sectionTitle}>Latest Journal Entries</Text>
            {latestJournalEntries.map((entry, index) => (
              <Pressable 
                key={entry.id || index}
                style={styles.journalEntryItem}
                onPress={() => navigation.navigate('JournalEntryDetails', { entry })}
              >
                <View style={styles.journalEntryContent}>
                  <Text style={styles.journalEntryTitle}>
                    {entry.cigar.brand} {entry.cigar.line}
                  </Text>
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

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  backgroundImage: {
    opacity: 0.4,
    resizeMode: 'cover',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '400',
  },
  scrollView: {
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
    paddingBottom: 40,
    minHeight: 190,
  },
  logo: {
    width: 190,
    height: 190,
  },
  mainActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#DC851F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    gap: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#555555',
  },
  statNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFA737',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#CCCCCC',
    fontWeight: '400',
  },
  latestJournalSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CCCCCC',
    marginBottom: 8,
  },
  journalEntryItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#555555',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  journalEntryContent: {
    flex: 1,
  },
  journalEntryTitle: {
    fontSize: 14,
    color: '#CCCCCC',
    fontWeight: '500',
    marginBottom: 2,
  },
  journalEntryDate: {
    fontSize: 12,
    color: '#999',
  },
  journalEntryRating: {
    backgroundColor: '#DC851F',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  journalRatingText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 20,
  },
});
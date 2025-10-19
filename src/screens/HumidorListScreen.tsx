import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { HumidorStackParamList } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useRecognitionFlow } from '../contexts/RecognitionFlowContext';
import { DatabaseService } from '../services/supabaseService';
import { StorageService } from '../storage/storageService';
import { HumidorStats, UserHumidorAggregate, Humidor } from '../types';
import HumidorCapacitySetupModal from '../components/HumidorCapacitySetupModal';
import { useScreenLoading } from '../hooks/useScreenLoading';

type HumidorListScreenNavigationProp = StackNavigationProp<HumidorStackParamList, 'HumidorListMain'>;
type HumidorListScreenRouteProp = RouteProp<HumidorStackParamList, 'HumidorListMain'>;

const { width } = Dimensions.get('window');

export default function HumidorListScreen() {
  const navigation = useNavigation<HumidorListScreenNavigationProp>();
  const route = useRoute<HumidorListScreenRouteProp>();
  const { user } = useAuth();
  
  // Check if we're coming from recognition flow
  const { fromRecognition, cigar, singleStickPrice } = route.params || {};
  console.log('🔍 HumidorList params:', { fromRecognition, cigar: cigar?.brand, singleStickPrice });
  console.log('🔍 Full route params:', route.params);
  const [humidors, setHumidors] = useState<HumidorStats[]>([]);
  const [aggregateStats, setAggregateStats] = useState<UserHumidorAggregate | null>(null);
  const [showCapacitySetup, setShowCapacitySetup] = useState(false);
  const [pendingHumidorData, setPendingHumidorData] = useState<{name: string, description: string} | null>(null);
  const { loading, refreshing, setLoading, setRefreshing } = useScreenLoading(true);
  const hasNavigatedAwayRef = useRef(false);

  const loadHumidorData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('🚀 HumidorListScreen - Starting optimized data load');
      const startTime = Date.now();
      
      // Add timeout wrapper for the database call
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database request timeout')), 10000) // 10 second timeout
      );
      
      const dataPromise = DatabaseService.getHumidorDataOptimized(user.id);
      
      // Race between data loading and timeout
      const { humidors: humidorsList, humidorStats: humidorsWithStats, aggregate: aggregateData, loadTime } = await Promise.race([
        dataPromise,
        timeoutPromise
      ]) as any;
      
      console.log(`⚡ HumidorListScreen - Database queries completed in ${loadTime}ms`);
      
      // If no humidors exist, show capacity setup modal
      if (humidorsList.length === 0) {
        console.log('🔧 No humidors found, showing capacity setup for new user');
        setPendingHumidorData({
          name: 'Main Humidor',
          description: 'Your default humidor'
        });
        setShowCapacitySetup(true);
        setHumidors([]);
        setAggregateStats({
          userId: user.id,
          totalHumidors: 0,
          totalCigars: 0,
          totalCollectionValue: 0,
          avgCigarValue: 0,
          uniqueBrands: 0,
        });
      } else {
          console.log('🔍 Loaded humidor stats:', humidorsWithStats.map(h => ({ 
            name: h.humidorName, 
            description: h.description
          })));
          setHumidors(humidorsWithStats);
          setAggregateStats(aggregateData);
      }
      
      const totalTime = Date.now() - startTime;
      console.log(`✅ HumidorListScreen - Total load time: ${totalTime}ms`);
    } catch (error) {
      console.error('❌ Error loading humidor data:', error);
      
      // Check if it's a timeout error
      if (error?.message?.includes('timeout')) {
        console.log('⏰ Database request timed out, showing empty state');
        setHumidors([]);
        setAggregateStats({
          userId: user.id,
          totalHumidors: 0,
          totalCigars: 0,
          totalCollectionValue: 0,
          avgCigarValue: 0,
          uniqueBrands: 0,
        });
        Alert.alert(
          'Connection Timeout', 
          'Loading is taking longer than expected. Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to load humidor data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadHumidorData();
      
      // If we had completed the add flow and are coming back, clear params
      if (hasNavigatedAwayRef.current && fromRecognition) {
        console.log('🧹 Returning from completed add flow - clearing recognition params');
        navigation.setParams({
          fromRecognition: undefined,
          cigar: undefined,
          singleStickPrice: undefined,
        } as any);
        hasNavigatedAwayRef.current = false;
      }
    }, [loadHumidorData, fromRecognition, navigation])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHumidorData();
    setRefreshing(false);
  }, [loadHumidorData]);

  const handleCreateHumidor = () => {
    navigation.navigate('CreateHumidor');
  };

  const handleCapacitySetup = async (capacity: number | null) => {
    if (!user || !pendingHumidorData) return;

    try {
      console.log('🔧 Creating default humidor with capacity:', capacity);
      const defaultHumidor = await DatabaseService.createHumidor(
        user.id,
        pendingHumidorData.name,
        pendingHumidorData.description,
        capacity
      );
      
      // Refresh stats after creating default humidor
      const updatedStats = await DatabaseService.getHumidorStats(user.id);
      const updatedAggregate = await DatabaseService.getUserHumidorAggregate(user.id);
      
      console.log('🔍 Loaded humidor stats after default creation:', updatedStats.map(h => ({ name: h.humidorName, description: h.description })));
      setHumidors(updatedStats);
      setAggregateStats(updatedAggregate);
    } catch (createError) {
      console.error('❌ Error creating default humidor:', createError);
      Alert.alert('Error', 'Failed to create default humidor. Please try again.');
    } finally {
      setShowCapacitySetup(false);
      setPendingHumidorData(null);
    }
  };

  const handleHumidorPress = (humidor: HumidorStats) => {
    console.log('🔍 Humidor pressed:', humidor.humidorName, 'fromRecognition:', fromRecognition);
    console.log('🔍 Recognition flow check:', { fromRecognition, hasCigar: !!cigar, singleStickPrice });
    if (fromRecognition && cigar && singleStickPrice !== undefined) {
      // Coming from recognition flow - go to AddToInventory with selected humidor
      console.log('🔍 Navigating to AddToInventory with humidor:', humidor.humidorId);
      
      // Mark that we're entering the add flow - this will trigger cleanup when we return
      hasNavigatedAwayRef.current = true;
      
      // Clear params immediately
      navigation.setParams({
        fromRecognition: undefined,
        cigar: undefined,
        singleStickPrice: undefined,
      } as any);
      
      // Navigate with the cigar data
      navigation.navigate('AddToInventory', {
        cigar,
        singleStickPrice,
        humidorId: humidor.humidorId
      });
    } else {
      // Normal flow - go to inventory view
      navigation.navigate('Inventory', { 
        humidorId: humidor.humidorId,
        humidorName: humidor.humidorName 
      });
    }
  };

  const handleEditHumidor = (humidor: HumidorStats) => {
    // Navigate to edit humidor screen
    navigation.navigate('EditHumidor', {
      humidor: {
        id: humidor.humidorId,
        userId: humidor.userId,
        name: humidor.humidorName,
        description: humidor.description,
        capacity: humidor.capacity,
        createdAt: humidor.createdAt,
        updatedAt: humidor.updatedAt,
      }
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCapacity = (current: number, capacity?: number) => {
    if (!capacity) return `${current} cigars`;
    const percentage = (current / capacity) * 100;
    return `${current}/${capacity} (${percentage.toFixed(0)}%)`;
  };

  const getCapacityColor = (current: number, capacity?: number) => {
    if (!capacity) return '#10B981';
    const percentage = (current / capacity) * 100;
    if (percentage >= 90) return '#EF4444';
    if (percentage >= 75) return '#F59E0B';
    return '#10B981';
  };

  const renderHumidorCard = ({ item }: { item: HumidorStats }) => (
    <TouchableOpacity
      style={styles.humidorCard}
      onPress={() => handleHumidorPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.humidorHeader}>
        <View style={styles.humidorTitleContainer}>
          <Text style={styles.humidorName}>{item.humidorName}</Text>
          {item.description && (
            <Text style={styles.humidorDescription}>{item.description}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditHumidor(item)}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color="#DC851F" />
        </TouchableOpacity>
      </View>

      <View style={styles.humidorStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.cigarCount}</Text>
          <Text style={styles.statLabel}>Cigars</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatCurrency(item.totalValue)}</Text>
          <Text style={styles.statLabel}>Value</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatCurrency(item.avgCigarPrice)}</Text>
          <Text style={styles.statLabel}>Avg Price</Text>
        </View>
      </View>

      {item.capacity && (
        <View style={styles.capacityContainer}>
          <View style={styles.capacityBar}>
            <View
              style={[
                styles.capacityFill,
                {
                  width: `${Math.min((item.cigarCount / item.capacity) * 100, 100)}%`,
                  backgroundColor: getCapacityColor(item.cigarCount, item.capacity),
                },
              ]}
            />
          </View>
          <Text style={styles.capacityText}>
            {formatCapacity(item.cigarCount, item.capacity)}
          </Text>
        </View>
      )}

      <View style={styles.humidorFooter}>
        <Ionicons name="chevron-forward" size={16} color="#DC851F" />
      </View>
    </TouchableOpacity>
  );

  const renderLoadingSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {/* Header skeleton */}
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonStat} />
        <View style={styles.skeletonStat} />
        <View style={styles.skeletonStat} />
      </View>
      
      {/* Card skeletons */}
      {[1, 2, 3].map((index) => (
        <View key={index} style={styles.skeletonCard}>
          <View style={styles.skeletonCardHeader}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonEditButton} />
          </View>
          <View style={styles.skeletonCardStats}>
            <View style={styles.skeletonStatItem} />
            <View style={styles.skeletonStatItem} />
            <View style={styles.skeletonStatItem} />
          </View>
          <View style={styles.skeletonCapacityBar} />
        </View>
      ))}
    </View>
  );

  const renderEmptyState = () => {
    if (loading) {
      return renderLoadingSkeleton();
    }
    
    return (
      <View style={styles.emptyState}>
        <Ionicons name="archive-outline" size={80} color="#DC851F" />
        <Text style={styles.emptyTitle}>No Humidors Yet</Text>
        <Text style={styles.emptyText}>
          Create your first humidor to start organizing your cigar collection
        </Text>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateHumidor}>
          <Text style={styles.createButtonText}>Create Humidor</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHeader = () => {
    if (!aggregateStats) return null;

    return (
      <View style={styles.topContentWrapper}>
        {fromRecognition && (
          <View style={styles.recognitionHeader}>
            <Text style={styles.recognitionTitle}>Select Humidor</Text>
            <Text style={styles.recognitionSubtitle}>Choose which humidor to add this cigar to</Text>
          </View>
        )}
        <View style={styles.aggregateStats}>
          <View style={styles.aggregateStat}>
            <Text style={styles.aggregateValue}>{aggregateStats.totalHumidors}</Text>
            <Text style={styles.aggregateLabel}>Humidors</Text>
          </View>
          <View style={styles.aggregateStat}>
            <Text style={styles.aggregateValue}>{aggregateStats.totalCigars}</Text>
            <Text style={styles.aggregateLabel}>Total Cigars</Text>
          </View>
          <View style={styles.aggregateStat}>
            <Text style={styles.aggregateValue}>{formatCurrency(aggregateStats.totalCollectionValue)}</Text>
            <Text style={styles.aggregateLabel}>Collection Value</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ImageBackground
      source={require('../../assets/tobacco-leaves-bg.jpg')}
      style={styles.container}
      imageStyle={styles.backgroundImage}
    >
      {/* Fixed stats section at top */}
      {renderHeader()}
      
      <View style={styles.content}>
        <FlatList
          data={humidors}
          renderItem={renderHumidorCard}
          keyExtractor={(item) => item.humidorId}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#DC851F"
            />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />

        {humidors.length > 0 && (
          <TouchableOpacity style={styles.fab} onPress={handleCreateHumidor}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Capacity Setup Modal */}
      <HumidorCapacitySetupModal
        visible={showCapacitySetup}
        onClose={() => {
          setShowCapacitySetup(false);
          setPendingHumidorData(null);
        }}
        onSave={handleCapacitySetup}
        humidorName={pendingHumidorData?.name || 'Main Humidor'}
      />
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
  content: {
    flex: 1,
    backgroundColor: 'transparent',
    marginTop: -16, // Negative margin to allow cards to scroll under stats
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
    paddingTop: 16, // Add top padding to account for negative margin
  },
  topContentWrapper: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 16, // Keep margin for spacing
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 20, // Add extra padding at top since no margin
    paddingBottom: 16,
    // No border radius or borders for seamless flush design
  },
  aggregateStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  aggregateStat: {
    alignItems: 'center',
    flex: 1,
  },
  aggregateValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#DC851F',
    marginBottom: 4,
  },
  aggregateLabel: {
    fontSize: 12,
    color: '#CCCCCC',
    textAlign: 'center',
  },
  humidorCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  humidorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  humidorTitleContainer: {
    flex: 1,
  },
  humidorName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  humidorDescription: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  editButton: {
    padding: 8,
  },
  humidorStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC851F',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#CCCCCC',
  },
  capacityContainer: {
    marginBottom: 12,
  },
  capacityBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  capacityFill: {
    height: '100%',
    borderRadius: 3,
  },
  capacityText: {
    fontSize: 12,
    color: '#CCCCCC',
    textAlign: 'center',
  },
  humidorFooter: {
    alignItems: 'flex-end',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  createButton: {
    backgroundColor: '#DC851F',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DC851F',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  recognitionHeader: {
    marginBottom: 16,
    alignItems: 'center',
  },
  recognitionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  recognitionSubtitle: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
  },
  // Skeleton loading styles
  skeletonContainer: {
    padding: 16,
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#1a1a1a',
  },
  skeletonStat: {
    flex: 1,
    alignItems: 'center',
    height: 40,
    backgroundColor: '#333333',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  skeletonCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  skeletonCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  skeletonTitle: {
    height: 20,
    width: '60%',
    backgroundColor: '#333333',
    borderRadius: 4,
  },
  skeletonEditButton: {
    height: 20,
    width: 20,
    backgroundColor: '#333333',
    borderRadius: 10,
  },
  skeletonCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  skeletonStatItem: {
    flex: 1,
    height: 30,
    backgroundColor: '#333333',
    borderRadius: 4,
    marginHorizontal: 4,
  },
  skeletonCapacityBar: {
    height: 6,
    backgroundColor: '#333333',
    borderRadius: 3,
  },
});

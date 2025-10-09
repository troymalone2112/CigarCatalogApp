import React, { useState, useEffect, useCallback } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { DatabaseService } from '../services/supabaseService';
import { StorageService } from '../storage/storageService';
import { HumidorStats, UserHumidorAggregate, Humidor } from '../types';

type HumidorListScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HumidorList'>;

const { width } = Dimensions.get('window');

export default function HumidorListScreen() {
  const navigation = useNavigation<HumidorListScreenNavigationProp>();
  const { user } = useAuth();
  const [humidors, setHumidors] = useState<HumidorStats[]>([]);
  const [aggregateStats, setAggregateStats] = useState<UserHumidorAggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHumidorData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load humidors from database
      const humidorsList = await DatabaseService.getHumidors(user.id);
      
      // If no humidors exist, create a default one
      if (humidorsList.length === 0) {
        const defaultHumidor = await DatabaseService.createHumidor(
          user.id,
          'Main Humidor',
          'Your default humidor'
        );
        humidorsList.push(defaultHumidor);
      }
      
      // Get humidor statistics from database
      const humidorsWithStats = await DatabaseService.getHumidorStats(user.id);
      
      // Get aggregate statistics from database
      const aggregateData = await DatabaseService.getUserHumidorAggregate(user.id);

      setHumidors(humidorsWithStats);
      setAggregateStats(aggregateData);
    } catch (error) {
      console.error('Error loading humidor data:', error);
      Alert.alert('Error', 'Failed to load humidor data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadHumidorData();
    }, [loadHumidorData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHumidorData();
    setRefreshing(false);
  }, [loadHumidorData]);

  const handleCreateHumidor = () => {
    navigation.navigate('CreateHumidor');
  };

  const handleHumidorPress = (humidor: HumidorStats) => {
    navigation.navigate('Inventory', { 
      humidorId: humidor.humidorId,
      humidorName: humidor.humidorName 
    });
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

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="archive-outline" size={80} color="#DC851F" />
          <Text style={styles.emptyTitle}>Loading...</Text>
        </View>
      );
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
      {/* Full width stats section outside content wrapper */}
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a', // Solid background to cover any gaps
  },
  backgroundImage: {
    opacity: 0.4,
    resizeMode: 'cover',
  },
  content: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    paddingTop: 0, // No top padding to allow flush header
  },
  topContentWrapper: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0, // Remove bottom margin to eliminate gap
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 20, // Add extra padding at top since no margin
    paddingBottom: 16, // Add bottom padding instead of margin
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
});

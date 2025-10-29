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
  Pressable,
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
import { useScreenLoading } from '../hooks/useScreenLoading';
import { useAccessControl } from '../hooks/useAccessControl';
import { clearHumidorCache } from '../services/humidorCacheService';
import { OptimizedHumidorService } from '../services/optimizedHumidorService';

type HumidorListScreenNavigationProp = StackNavigationProp<HumidorStackParamList, 'HumidorListMain'>;
type HumidorListScreenRouteProp = RouteProp<HumidorStackParamList, 'HumidorListMain'>;

const { width } = Dimensions.get('window');

export default function HumidorListScreen() {
  const navigation = useNavigation<HumidorListScreenNavigationProp>();
  const route = useRoute<HumidorListScreenRouteProp>();
  const { user } = useAuth();
  const { canAddToHumidor } = useAccessControl();
  
  // Get recognition flow parameters
  const { fromRecognition, cigar, singleStickPrice, humidorName } = route.params || {};
  console.log('🔍 HumidorList params:', { fromRecognition, cigar: cigar?.brand, singleStickPrice, humidorName });
  console.log('🔍 Full route params:', route.params);
  console.log('🔍 Route name:', route.name);
  
  const [humidors, setHumidors] = useState<HumidorStats[]>([]);
  const [aggregateStats, setAggregateStats] = useState<UserHumidorAggregate | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const { loading, refreshing, setLoading, setRefreshing } = useScreenLoading(true);
  // Show success message when coming from successful cigar addition
  useEffect(() => {
    if (!fromRecognition && cigar) {
      setShowSuccessMessage(true);
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [fromRecognition, cigar]);

  const loadHumidorData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      console.log('🚀 Loading optimized humidor data for user:', user.id);
      
      // Use OptimizedHumidorService for much faster loading with caching
      const { OptimizedHumidorService } = await import('../services/optimizedHumidorService');
      
      const optimizedData = await OptimizedHumidorService.getOptimizedHumidorData(
        user.id,
        {
          useCache: true,
          progressCallback: (stage, progress) => {
            console.log(`📊 Loading progress: ${stage} (${progress}%)`);
          }
        }
      );
      
      console.log(`✅ Optimized humidor data loaded in ${optimizedData.loadTime}ms from ${optimizedData.source}`);
      console.log(`📊 Loaded ${optimizedData.humidors.length} humidors, ${optimizedData.humidorStats.length} with stats`);
      
      setHumidors(optimizedData.humidorStats);
      setAggregateStats(optimizedData.aggregate);
      
      // Show success message if data was loaded from cache (instant loading feedback)
      if (optimizedData.source === 'cache' && optimizedData.loadTime < 100) {
        console.log('⚡ Lightning-fast cache load!');
      }
      
    } catch (error) {
      console.error('❌ Error loading optimized humidor data:', error);
      
      // Fallback: Try progressive loading - show basic humidors first
      try {
        console.log('🆘 Attempting progressive fallback loading...');
        const { OptimizedHumidorService } = await import('../services/optimizedHumidorService');
        
        const basicHumidors = await OptimizedHumidorService.getBasicHumidors(user.id);
        console.log(`⚠️ Fallback loaded ${basicHumidors.length} basic humidors`);
        
        // Show basic humidors without stats
        setHumidors([]);
        setAggregateStats({
          userId: user.id,
          totalHumidors: basicHumidors.length,
          totalCigars: 0,
          totalCollectionValue: 0,
          avgCigarValue: 0,
          uniqueBrands: 0,
        });
        
        // Try to load stats in background
        OptimizedHumidorService.getStatsForHumidors(
          user.id, 
          basicHumidors.map(h => h.id)
        ).then(stats => {
          console.log('📊 Background stats loaded:', stats.length);
          if (stats.length > 0) {
            setHumidors(stats);
          }
        }).catch(statsError => {
          console.warn('⚠️ Background stats load failed:', statsError);
        });
        
      } catch (fallbackError) {
        console.error('❌ All fallback strategies failed:', fallbackError);
        
        // Final fallback - empty state
        setHumidors([]);
        setAggregateStats({
          userId: user.id,
          totalHumidors: 0,
          totalCigars: 0,
          totalCollectionValue: 0,
          avgCigarValue: 0,
          uniqueBrands: 0,
        });
        
        Alert.alert('Error', 'Failed to load humidor data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      console.log('🔍 HumidorListScreen focused - loading data...');
      loadHumidorData();
    }, [loadHumidorData])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      console.log('🔄 Force refreshing humidor data...');
      
      // Force refresh with cache bypass for pull-to-refresh
      const { OptimizedHumidorService } = await import('../services/optimizedHumidorService');
      const refreshedData = await OptimizedHumidorService.refreshHumidorData(user?.id || '');
      
      console.log(`✅ Force refresh completed in ${refreshedData.loadTime}ms from fresh database`);
      
      setHumidors(refreshedData.humidorStats);
      setAggregateStats(refreshedData.aggregate);
      
    } catch (error) {
      console.error('❌ Force refresh failed:', error);
      // Fallback to regular load if optimized refresh fails
      await loadHumidorData();
    } finally {
      setRefreshing(false);
    }
  }, [loadHumidorData, user]);

  const handleHumidorPress = (humidor: HumidorStats) => {
    console.log('🔍 Recognition flow check:', { fromRecognition, hasCigar: !!cigar, singleStickPrice });
    
    if (fromRecognition && cigar && singleStickPrice !== undefined) {
      // Coming from recognition flow - check access before adding to humidor
      if (canAddToHumidor()) {
        console.log('🚀 Navigating to AddToInventory with recognition flow');
        navigation.navigate('AddToInventory', {
          cigar,
          singleStickPrice,
          humidorId: humidor.humidorId
        });
      }
    } else {
      // Normal flow - go to inventory view (viewing is always allowed)
      console.log('🚀 Navigating to Inventory (normal flow)');
      navigation.navigate('Inventory', { 
        humidorId: humidor.humidorId,
        humidorName: humidor.humidorName
      });
    }
  };

  const handleAddHumidor = () => {
    navigation.navigate('CreateHumidor');
  };

  const handleHumidorMenu = (humidor: HumidorStats) => {
    console.log('🔧 Opening menu for humidor:', humidor.humidorName);
    
    Alert.alert(
      humidor.humidorName,
      'What would you like to do?',
      [
        {
          text: 'Edit',
          onPress: () => {
            console.log('✏️ Navigating to edit humidor:', humidor.humidorId);
            // Navigate to edit screen with humidor data
            navigation.navigate('EditHumidor', {
              humidor: {
                id: humidor.humidorId,
                name: humidor.humidorName,
                description: humidor.description,
                capacity: humidor.capacity,
                userId: humidor.userId,
                createdAt: new Date(), // Mock value, not used in edit screen
                updatedAt: new Date(), // Mock value, not used in edit screen
              }
            });
          }
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            console.log('🗑️ Delete requested for humidor:', humidor.humidorName);
            handleDeleteHumidor(humidor);
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const handleDeleteHumidor = (humidor: HumidorStats) => {
    Alert.alert(
      'Delete Humidor',
      `Are you sure you want to delete "${humidor.humidorName}"? This action cannot be undone and will remove all cigars from this humidor.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Deleting humidor:', humidor.humidorId);
              
              // Show loading state
              setLoading(true);
              
              // Delete the humidor
              await DatabaseService.deleteHumidor(humidor.humidorId);
              console.log('✅ Humidor deleted successfully');

              // Clear cache to ensure deleted humidor is removed from the list
              console.log('🗑️ Clearing humidor cache after deletion...');
              if (user) {
                await Promise.all([
                  clearHumidorCache(user.id),
                  OptimizedHumidorService.clearCache(user.id)
                ]);
                console.log('✅ Cache cleared, deleted humidor will be removed from list');
              }

              // Refresh the list
              await loadHumidorData();
              
            } catch (error) {
              console.error('❌ Error deleting humidor:', error);
              Alert.alert('Error', 'Failed to delete humidor. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return '#EF4444'; // Red
    if (percentage >= 70) return '#F59E0B'; // Yellow
    return '#10B981'; // Green
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ImageBackground 
          source={require('../../assets/tobacco-leaves-bg.jpg')}
          style={styles.backgroundImage}
          imageStyle={styles.tobaccoBackgroundImage}
        >
          <View style={styles.loadingContent}>
            <Text style={styles.loadingText}>Loading humidors...</Text>
          </View>
        </ImageBackground>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ImageBackground 
        source={require('../../assets/tobacco-leaves-bg.jpg')}
        style={styles.backgroundImage}
        imageStyle={styles.tobaccoBackgroundImage}
      >
        {/* Recognition Flow Header */}
        {fromRecognition && cigar && (
          <View style={styles.recognitionHeader}>
            <View style={styles.recognitionHeaderContent}>
              <View style={styles.recognitionHeaderText}>
                <Text style={styles.recognitionHeaderTitle}>Select Humidor</Text>
                <Text style={styles.recognitionHeaderSubtitle}>
                  Choose which humidor to add "{cigar.brand}" to
                </Text>
              </View>
            </View>
          </View>
        )}


        {/* Summary Statistics - Direct text on dark background */}
        {aggregateStats && (
          <View style={styles.summaryStats}>
            <View style={[styles.statItem, { flex: 0.8 }]}>
              <Text style={styles.statNumber}>{aggregateStats.totalHumidors}</Text>
              <Text style={styles.statLabel}>Humidors</Text>
            </View>
            <View style={[styles.statItem, { flex: 0.8 }]}>
              <Text style={styles.statNumber}>{aggregateStats.totalCigars}</Text>
              <Text style={styles.statLabel}>Total Cigars</Text>
            </View>
            <View style={[styles.statItem, { flex: 1.2 }]}>
              <Text style={styles.statNumber}>{formatCurrency(aggregateStats.totalCollectionValue)}</Text>
              <Text style={styles.statLabel}>Value</Text>
            </View>
          </View>
        )}

        {/* Success Message - Show when coming from successful cigar addition */}
        {showSuccessMessage && cigar && (
          <View style={styles.successMessage}>
            <View style={styles.successContent}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <View style={styles.successText}>
                <Text style={styles.successTitle}>Cigar Added Successfully!</Text>
                <Text style={styles.successSubtitle}>
                  "{cigar.brand}" has been added to your "{humidorName || 'humidor'}"
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Humidor Cards */}
        {humidors.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="archive-outline" size={64} color="#666" />
            <Text style={styles.emptyTitle}>No Humidors Yet</Text>
            <Text style={styles.emptySubtitle}>Create your first humidor to start organizing your collection</Text>
            <TouchableOpacity style={styles.createButton} onPress={handleAddHumidor}>
              <Text style={styles.createButtonText}>Create Humidor</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={humidors}
            keyExtractor={(item) => item.humidorId}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.humidorCard}
                onPress={() => handleHumidorPress(item)}
              >
                <View style={styles.humidorHeader}>
                  <View style={styles.humidorInfo}>
                    <Text style={styles.humidorName}>{item.humidorName}</Text>
                    <Text style={styles.humidorDescription}>{item.description}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.menuButton}
                    onPress={(e) => {
                      e.stopPropagation(); // Prevent card press
                      handleHumidorMenu(item);
                    }}
                  >
                    <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                <View style={styles.humidorMetrics}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricNumber}>{item.cigarCount || 0}</Text>
                    <Text style={styles.metricLabel}>Cigars</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricNumber}>{formatCurrency(item.totalValue || 0)}</Text>
                    <Text style={styles.metricLabel}>Value</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricNumber}>{formatCurrency(item.avgCigarPrice || 0)}</Text>
                    <Text style={styles.metricLabel}>Avg Price</Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressSection}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          width: `${Math.min((item.cigarCount || 0) / (item.capacity || 1000) * 100, 100)}%`,
                          backgroundColor: getProgressColor((item.cigarCount || 0) / (item.capacity || 1000) * 100)
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {item.cigarCount || 0}/{item.capacity || 1000} ({Math.round((item.cigarCount || 0) / (item.capacity || 1000) * 100)}%)
                  </Text>
                </View>

                <View style={styles.humidorFooter}>
                  <View style={styles.footerSpacer} />
                  <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#DC851F"
              />
            }
            contentContainerStyle={styles.listContent}
          />
        )}

        {/* Floating Action Button - Positioned correctly at bottom right */}
        <TouchableOpacity style={styles.fab} onPress={handleAddHumidor}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  backgroundImage: {
    flex: 1,
  },
  tobaccoBackgroundImage: {
    opacity: 0.4,
    resizeMode: 'cover',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'System',
  },
  // Removed header styles - stats bar flows directly from top
  // Summary Statistics - Direct text on dark background (no containers)
  summaryStats: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20, // Much less top space
    paddingBottom: 12, // Compact but visible
    backgroundColor: '#1a1a1a', // Dark background
    justifyContent: 'space-around', // More room for Value column
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    justifyContent: 'center', // Center vertically
    flex: 1,
    minWidth: 0, // Prevent wrapping
  },
  statNumber: {
    fontSize: 22, // Larger numbers
    fontWeight: 'bold',
    color: '#DC851F',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12, // Larger labels
    color: '#FFFFFF',
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 32,
  },
  createButton: {
    backgroundColor: '#DC851F',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16, // Buffer between stats bar and first humidor
    paddingBottom: 100,
  },
  humidorCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#555555',
  },
  humidorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  humidorInfo: {
    flex: 1,
  },
  humidorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  humidorDescription: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  menuButton: {
    padding: 4,
  },
  humidorMetrics: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8, // Reduced gap
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0, // Prevent wrapping
  },
  metricNumber: {
    fontSize: 16, // Smaller to prevent wrapping
    fontWeight: 'bold',
    color: '#DC851F',
    marginBottom: 2,
    textAlign: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  progressSection: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#333333',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  humidorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerSpacer: {
    flex: 1,
  },
  // Floating Action Button - Positioned correctly at bottom right
  fab: {
    position: 'absolute',
    bottom: 10, // Moved down
    right: 10, // Moved right
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
    shadowRadius: 8,
  },
  // Recognition Flow Header Styles
  recognitionHeader: {
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#DC851F',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 8,
  },
  recognitionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recognitionHeaderText: {
    flex: 1,
  },
  recognitionHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  recognitionHeaderSubtitle: {
    fontSize: 14,
    color: '#DC851F',
    fontWeight: '500',
  },
  // Success Message Styles
  successMessage: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 8,
  },
  successContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  successText: {
    marginLeft: 12,
    flex: 1,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
});
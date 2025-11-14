import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  TextInput,
  ImageBackground,
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { HumidorStackParamList, InventoryItem, Humidor, RootStackParamList } from '../types';
import { StorageService } from '../storage/storageService';
import { DatabaseService } from '../services/supabaseService';
import { useAuth } from '../contexts/AuthContext';
import { normalizeStrength } from '../utils/helpers';
import { getStrengthInfo } from '../utils/strengthUtils';
import { InventoryCacheService } from '../services/inventoryCacheService';

type InventoryScreenNavigationProp = StackNavigationProp<HumidorStackParamList, 'Inventory'>;
type InventoryScreenRouteProp = RouteProp<HumidorStackParamList, 'Inventory'>;

export default function InventoryScreen() {
  const navigation = useNavigation<InventoryScreenNavigationProp>();
  const rootNavigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<InventoryScreenRouteProp>();
  const { user } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const isLoadingRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [forceUpdate, setForceUpdate] = useState(0);
const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
const [currentHumidor, setCurrentHumidor] = useState<Humidor | null>(null);
const [availableHumidors, setAvailableHumidors] = useState<Humidor[]>([]);
const [humidorName, setHumidorName] = useState<string>('');
  const flatListRef = useRef<FlatList>(null);
  const highlightAnimation = useRef(new Animated.Value(0)).current;
  const processedHighlightId = useRef<string | null>(null);
const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasInventoryRef = useRef(false);

  useEffect(() => {
    hasInventoryRef.current = inventory.length > 0;
  }, [inventory.length]);

  useEffect(() => {
    isLoadingRef.current = isLoadingData;
  }, [isLoadingData]);

  const loadInventory = useCallback(async () => {
    if (!user || isLoadingRef.current) return;
    
    try {
      setIsLoadingData(true);
      isLoadingRef.current = true;
      
      // Load humidors first
      const humidors = await DatabaseService.getHumidors(user.id);
      setAvailableHumidors(humidors);
      
      // Determine which humidor to show
      const targetHumidorId = route.params?.humidorId;
      let selectedHumidor: Humidor | null = null;
      
      if (targetHumidorId) {
        selectedHumidor = humidors.find(h => h.id === targetHumidorId) || null;
      } else if (humidors.length > 0) {
        selectedHumidor = humidors[0]; // Default to first humidor
      }
      
      setCurrentHumidor(selectedHumidor);
      setHumidorName(route.params?.humidorName || selectedHumidor?.name || '');
      
      // Load inventory for the selected humidor
      const items = await StorageService.getInventory(selectedHumidor?.id);
      console.log('✅ Loaded inventory items:', items.length);
      
      // Update state
      setInventory(items);
      setFilteredInventory(items);
      setErrorMessage(null);
      
      // Cache the fresh results
      if (user.id) {
        await InventoryCacheService.cacheInventory(user.id, items, selectedHumidor?.id);
      }
      
      // Check if we need to highlight an item after loading inventory
      const highlightId = route?.params?.highlightItemId;
      if (highlightId && highlightId !== processedHighlightId.current) {
        console.log('🎯 Triggering highlight after inventory load:', highlightId);
        processedHighlightId.current = highlightId;
        triggerHighlight(highlightId, items);
      }
    } catch (error) {
      console.error('❌ Error loading inventory:', error);
      if (!hasInventoryRef.current) {
        setErrorMessage('Unable to load inventory. Please check your connection and refresh.');
      }
    } finally {
      setIsLoadingData(false);
      isLoadingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;

      // 1) Load from cache instantly if available
      const loadFromCacheThenRefresh = async () => {
        try {
          const targetHumidorId = route.params?.humidorId;
          
          // Try to load from cache first
          const cachedData = await InventoryCacheService.getCachedInventory(
            user.id,
            targetHumidorId,
          );

          if (cachedData) {
            console.log('📦 Loading inventory from cache - instant display');
            setInventory(cachedData.items);
            setFilteredInventory(cachedData.items);
            setLoading(false); // UI ready immediately
            
            // Try to load humidor info from cache or quick load
            if (targetHumidorId) {
              // Try to get humidor name from cache or quick load
              DatabaseService.getHumidors(user.id)
                .then((humidors) => {
                  const selectedHumidor = humidors.find(h => h.id === targetHumidorId);
                  if (selectedHumidor) {
                    setCurrentHumidor(selectedHumidor);
                    setHumidorName(route.params?.humidorName || selectedHumidor.name || '');
                  }
                })
                .catch(() => {
                  // Non-critical, will load in background refresh
                });
            }
          } else {
            console.log('⚠️ No cache available, will load from network');
            setLoading(true);
          }
        } catch (cacheError) {
          console.warn('⚠️ Cache check failed, will load from network:', cacheError);
          setLoading(true);
        }

        // 2) Load fresh data in background (never blocks UI)
        if (!isLoadingData) {
          loadInventory();
        }
      };

      loadFromCacheThenRefresh();
    }, [user?.id, route.params?.humidorId, loadInventory])
  );


  const handleAddCigar = () => {
    rootNavigation.navigate('CigarRecognition', { humidorId: currentHumidor?.id });
  };



  const triggerHighlight = (itemId: string, items: InventoryItem[]) => {
    console.log('🎯 Setting highlighted item:', itemId);
    setHighlightedItemId(itemId);
    
    // Start highlight animation
    Animated.sequence([
      Animated.timing(highlightAnimation, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }),
      Animated.timing(highlightAnimation, {
        toValue: 0,
        duration: 2000,
        useNativeDriver: false,
      }),
    ]).start(() => {
      console.log('🎯 Highlight animation completed');
      setHighlightedItemId(null);
    });

    // Scroll to the highlighted item after a short delay
    setTimeout(() => {
      const itemIndex = items.findIndex(item => item.id === itemId);
      console.log('🔍 Item index found:', itemIndex);
      if (itemIndex !== -1 && flatListRef.current) {
        flatListRef.current.scrollToIndex({
          index: itemIndex,
          animated: true,
          viewPosition: 0.5, // Center the item in the view
        });
      }
    }, 100);

    // Clear the route parameter after animation starts to prevent re-triggering
    setTimeout(() => {
      navigation.setParams({ highlightItemId: undefined });
      processedHighlightId.current = null;
    }, 100);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Clear cache and force refresh
    if (user?.id) {
      const targetHumidorId = route.params?.humidorId;
      await InventoryCacheService.clearInventoryCache(user.id, targetHumidorId);
    }
    await loadInventory();
  };

  const filterInventory = () => {
    const filtered = inventory.filter(item =>
      item.cigar.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.cigar.line.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.cigar.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setFilteredInventory(filtered);
  };

  useEffect(() => {
    filterInventory();
  }, [inventory, searchQuery]);

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    try {
      console.log('🔄 Updating quantity for item:', itemId, 'to:', newQuantity);
      
      // Update local state immediately for instant UI feedback
      setInventory(prevInventory => 
        prevInventory.map(item => 
          item.id === itemId 
            ? { ...item, quantity: Math.max(0, newQuantity) }
            : item
        )
      );
      
      // Also update filtered inventory if it exists
      setFilteredInventory(prevFiltered => 
        prevFiltered.map(item => 
          item.id === itemId 
            ? { ...item, quantity: Math.max(0, newQuantity) }
            : item
        )
      );
      
      // Update database in background
      await StorageService.updateInventoryQuantity(itemId, newQuantity);
      console.log('✅ Quantity updated successfully');
    } catch (error) {
      console.error('Error updating quantity:', error);
      setErrorMessage('Unable to update quantity right now. Please try again.');
      await loadInventory();
    }
  };

  const deleteItem = async (itemId: string) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to remove this cigar from your humidor?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.removeInventoryItem(itemId);
              await loadInventory();
            } catch (error) {
              console.error('Error deleting item:', error);
              setErrorMessage('Unable to delete that cigar right now. Please try again.');
            }
          },
        },
      ]
    );
  };

  const editItem = (item: InventoryItem) => {
    navigation.navigate('EditOptions', {
      item: item
    });
  };

  const renderInventoryItem = ({ item }: { item: InventoryItem }) => {
    const isHighlighted = highlightedItemId === item.id;
    console.log('🎨 Rendering item:', item.id, 'highlighted:', isHighlighted, 'highlightedItemId:', highlightedItemId);
    
    const animatedStyle = {
      borderColor: highlightAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: ['#333333', '#A16207'],
      }),
      borderWidth: highlightAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 3],
      }),
      transform: [{
        scale: highlightAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.02],
        }),
      }],
    };

    return (
      <Animated.View style={[styles.inventoryCard, isHighlighted && animatedStyle]}>
      <TouchableOpacity
        style={styles.cardContent}
        onPress={() => navigation.navigate('CigarDetails', { cigar: item.cigar, inventoryItemId: item.id })}
        activeOpacity={1}
      >
        {/* Main content area */}
        <View style={styles.mainContent}>
          <View style={styles.cigarInfo}>
            {/* Full width brand and cigar name */}
            <Text style={styles.cigarBrand}>{item.cigar.brand || 'Unknown Brand'}</Text>
            <Text style={styles.cigarName}>
              {item.cigar.name && item.cigar.name !== 'Unknown Name' 
                ? item.cigar.name 
                : (item.cigar.line || 'Unknown Cigar')}
            </Text>
            
            <View style={styles.detailsRow}>
              {item.cigar.strength && String(item.cigar.strength).trim() ? (
                <View style={[styles.strengthBadge, getStrengthBadgeStyle(item.cigar.strength)]}>
                  <Text style={[styles.strengthText, { color: getStrengthInfo(item.cigar.strength || 'Medium')?.color || '#999' }]}>
                    {String(normalizeStrength(item.cigar.strength) || 'Medium')}
                  </Text>
                </View>
              ) : null}
              {item.cigar.cigarAficionadoRating ? (
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingText}>{String(item.cigar.cigarAficionadoRating || 0)}/100</Text>
                </View>
              ) : null}
              {item.location && String(item.location).trim() ? (
                <Text style={styles.locationText}>📍 {String(item.location)}</Text>
              ) : null}
            </View>

            {item.purchaseDate && (
              <Text style={styles.purchaseDate}>
                Added: {new Date(item.purchaseDate).toLocaleDateString()}
              </Text>
            )}
          </View>

          <View style={styles.imageContainer}>
            {item.cigar.imageUrl && 
             item.cigar.imageUrl !== 'placeholder' && 
             /^https?:\/\//i.test(item.cigar.imageUrl) ? (
              <Image source={{ uri: item.cigar.imageUrl }} style={styles.cigarImage} />
            ) : (
              <Image
                source={require('../../assets/cigar-placeholder.jpg')}
                style={styles.cigarImage}
              />
            )}
          </View>
        </View>

        {/* Bottom row with quantity controls and action buttons */}
        <View style={styles.bottomRow}>
          <View style={styles.quantitySection}>
            <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => updateQuantity(item.id, item.quantity - 1)}
                >
                  <Ionicons name="remove" size={16} color="#DC851F" />
                </TouchableOpacity>
              
              <Text style={styles.quantityText}>{item.quantity}</Text>
              
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => updateQuantity(item.id, item.quantity + 1)}
                >
                  <Ionicons name="add" size={16} color="#DC851F" />
                </TouchableOpacity>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteItem(item.id)}
            >
              <Ionicons name="trash-outline" size={16} color="#dc3545" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editButton}
              onPress={() => editItem(item)}
            >
              <Ionicons name="pencil-outline" size={16} color="#DC851F" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
      </Animated.View>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="archive-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>Your humidor is empty</Text>
      <Text style={styles.emptySubtitle}>
        Start by identifying a cigar with a picture or searching
      </Text>
    </View>
  );

  const totalCigars = inventory.reduce((sum, item) => sum + item.quantity, 0);
  
  // Calculate total value - this will be reactive to inventory changes
  const totalValue = useMemo(() => {
    const value = inventory.reduce((sum, item) => {
      let itemValue = 0;
      
      if (item.pricePaid && item.quantity) {
        // Use price paid × quantity (this is the correct calculation)
        itemValue = item.pricePaid * item.quantity;
      }
      
      console.log('💰 Calculating item value:', itemValue, 'for', item.cigar.brand, 'qty:', item.quantity, 'price paid:', item.pricePaid);
      return sum + itemValue;
    }, 0);
    
    console.log('💰 Total value calculated:', value, 'for', inventory.length, 'items', 'forceUpdate:', forceUpdate);
    return value;
  }, [inventory, forceUpdate]);

  const getStrengthBadgeStyle = (strength: string) => {
    const strengthInfo = getStrengthInfo(strength);
    return {
      backgroundColor: strengthInfo.backgroundColor,
      borderColor: strengthInfo.borderColor,
    };
  };

  const renderListHeader = () => (
    <View style={styles.topContentWrapper}>
      <View style={styles.headerStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{inventory.length}</Text>
          <Text style={styles.statLabel}>Types</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>${totalValue.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Value</Text>
        </View>
        {currentHumidor?.capacity && (
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {Math.round(
                (inventory.reduce((sum, item) => sum + item.quantity, 0) /
                  currentHumidor.capacity) *
                  100,
              )}
              %
            </Text>
            <Text style={styles.statLabel}>Capacity</Text>
          </View>
        )}
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {errorMessage && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={18} color="#DC851F" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      enabled={Platform.OS !== 'web'}
    >
      <ImageBackground
        source={require('../../assets/tobacco-leaves-bg.jpg')}
        style={styles.fullScreenBackground}
        imageStyle={styles.tobaccoBackgroundImage}
      >
        <View style={styles.container}>
          <View style={styles.stickyHeader}>{renderListHeader()}</View>
          <FlatList
            ref={flatListRef}
            data={filteredInventory}
            renderItem={renderInventoryItem}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={EmptyState}
            showsVerticalScrollIndicator={false}
            onScrollToIndexFailed={(info) => {
              console.log('Scroll to index failed:', info);
            }}
          />

          <TouchableOpacity style={styles.fab} onPress={handleAddCigar}>
            <Ionicons name="add" size={24} color="#CCCCCC" />
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#DC851F" />
            <Text style={styles.loadingText}>Loading humidor...</Text>
          </View>
        )}
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  fullScreenBackground: {
    flex: 1,
    backgroundColor: '#0a0a0a', // Fallback color
  },
  tobaccoBackgroundImage: {
    opacity: 0.4, // Increased opacity to make the background more prominent
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Let tobacco background show through
  },
  list: {
    flex: 1,
  },
  topContentWrapper: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    padding: 16,
    paddingTop: 20, // Add extra padding at top since no margin
  },
  stickyHeader: {
    backgroundColor: '#1a1a1a',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333333',
    zIndex: 2,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFA737',
  },
  statLabel: {
    fontSize: 12,
    color: '#CCCCCC',
    marginTop: 4,
  },
  searchSection: {
    // No background, padding, or border - handled by topContentWrapper
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#444444',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#999',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 140,
  },
  inventoryCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#555555',
  },
  cardContent: {
    padding: 16,
  },
  mainContent: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  cigarImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cigarInfo: {
    flex: 1,
    marginRight: 12,
    justifyContent: 'flex-start',
  },
  imageContainer: {
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  cigarBrand: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CCCCCC',
    textAlign: 'left',
  },
  cigarLine: {
    fontSize: 12,
    color: '#FFA737',
    marginTop: 2,
    textAlign: 'left',
  },
  cigarName: {
    fontSize: 12,
    color: '#FFA737',
    marginTop: 2,
    fontWeight: '400',
    textAlign: 'left',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  strengthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
  },
  ratingBadge: {
    backgroundColor: '#DC851F',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  ratingText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  locationText: {
    fontSize: 12,
    color: '#999',
  },
  purchaseDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  quantitySection: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333333',
    borderRadius: 16,
    paddingHorizontal: 4,
  },
  quantityButton: {
    padding: 8,
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#CCCCCC',
    marginHorizontal: 8,
    minWidth: 20,
    textAlign: 'center',
  },
  deleteButton: {
    padding: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#CCCCCC',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginTop: 12,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 10, 0.65)',
  },
  addButton: {
    backgroundColor: '#DC851F',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
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
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'flex-end',
  },
  editButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#333333',
    minHeight: 36,
    minWidth: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(220, 133, 31, 0.15)',
    borderWidth: 1,
    borderColor: '#DC851F',
    gap: 8,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 13,
    flex: 1,
  },
});

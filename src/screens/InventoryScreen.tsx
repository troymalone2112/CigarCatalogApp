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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, InventoryItem, TabParamList, Humidor } from '../types';
import { StorageService } from '../storage/storageService';
import { DatabaseService } from '../services/supabaseService';
import { useAuth } from '../contexts/AuthContext';
import { normalizeStrength } from '../utils/helpers';
import { getStrengthInfo } from '../utils/strengthUtils';

type InventoryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Inventory'>;
type InventoryScreenRouteProp = RouteProp<RootStackParamList, 'Inventory'>;

export default function InventoryScreen() {
  const navigation = useNavigation<InventoryScreenNavigationProp>();
  const route = useRoute<InventoryScreenRouteProp>();
  const { user } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [forceUpdate, setForceUpdate] = useState(0);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [currentHumidor, setCurrentHumidor] = useState<Humidor | null>(null);
  const [availableHumidors, setAvailableHumidors] = useState<Humidor[]>([]);
  const [showHumidorSelector, setShowHumidorSelector] = useState(false);
  const [humidorName, setHumidorName] = useState<string>('');
  const flatListRef = useRef<FlatList>(null);
  const highlightAnimation = useRef(new Animated.Value(0)).current;
  const processedHighlightId = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadInventory();
    }, [route.params?.humidorId])
  );

  const handleHumidorSelect = async (humidor: Humidor) => {
    setCurrentHumidor(humidor);
    setHumidorName(humidor.name);
    setShowHumidorSelector(false);
    
    // Load inventory for the selected humidor
    const items = await StorageService.getInventory(humidor.id);
    setInventory(items);
    setFilteredInventory(items);
  };

  const handleAddCigar = () => {
    navigation.navigate('CigarRecognition', { humidorId: currentHumidor?.id });
  };


  const loadInventory = async () => {
    if (!user) return;
    
    try {
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
      console.log('📦 Loaded inventory items:', items.length);
      console.log('📦 Inventory data:', items);
      setInventory(items);
      setFilteredInventory(items);
      console.log('📦 State updated with new inventory');
      
      // Check if we need to highlight an item after loading inventory
      const highlightId = route?.params?.highlightItemId || route?.params?.params?.highlightItemId;
      if (highlightId && highlightId !== processedHighlightId.current) {
        console.log('🎯 Triggering highlight after inventory load:', highlightId);
        processedHighlightId.current = highlightId;
        triggerHighlight(highlightId, items);
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
      Alert.alert('Error', 'Failed to load inventory');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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

  const onRefresh = () => {
    setRefreshing(true);
    loadInventory();
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
      await StorageService.updateInventoryQuantity(itemId, newQuantity);
      console.log('✅ Quantity updated successfully');
      await loadInventory();
      console.log('🔄 Inventory reloaded after quantity update');
      // Force a re-render
      setForceUpdate(prev => prev + 1);
      console.log('🔄 Force update triggered');
    } catch (error) {
      console.error('Error updating quantity:', error);
      Alert.alert('Error', 'Failed to update quantity');
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
              Alert.alert('Error', 'Failed to delete item');
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
        onPress={() => navigation.navigate('CigarDetails', { cigar: item.cigar })}
      >
        {/* Main content area */}
        <View style={styles.mainContent}>
          <View style={styles.cigarInfo}>
            {/* Full width brand and cigar name */}
            <Text style={styles.cigarBrand}>{item.cigar.brand}</Text>
            <Text style={styles.cigarName}>
              {item.cigar.name && item.cigar.name !== 'Unknown Name' 
                ? item.cigar.name 
                : item.cigar.line}
            </Text>
            
            <View style={styles.detailsRow}>
              <View style={[styles.strengthBadge, getStrengthBadgeStyle(item.cigar.strength)]}>
                <Text style={[styles.strengthText, { color: getStrengthInfo(item.cigar.strength).color }]}>
                  {normalizeStrength(item.cigar.strength)}
                </Text>
              </View>
              {item.cigar.cigarAficionadoRating && (
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingText}>{item.cigar.cigarAficionadoRating}/100</Text>
                </View>
              )}
              {item.location && (
                <Text style={styles.locationText}>📍 {item.location}</Text>
              )}
            </View>

            {item.purchaseDate && (
              <Text style={styles.purchaseDate}>
                Added: {new Date(item.purchaseDate).toLocaleDateString()}
              </Text>
            )}
          </View>

          <View style={styles.imageContainer}>
            {item.cigar.imageUrl ? (
              <Image source={{ uri: item.cigar.imageUrl }} style={styles.cigarImage} />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="image-outline" size={40} color="#ccc" />
              </View>
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

  return (
    <ImageBackground 
      source={require('../../assets/tobacco-leaves-bg.jpg')}
      style={styles.fullScreenBackground}
      imageStyle={styles.tobaccoBackgroundImage}
    >
      <View style={styles.container}>
        {/* Combined Stats and Search Container */}
        <View style={styles.topContentWrapper}>
          <View style={styles.headerStats}>
            {availableHumidors.length > 1 && (
              <TouchableOpacity
                style={styles.humidorSwitchButton}
                onPress={() => setShowHumidorSelector(true)}
              >
                <Ionicons name="swap-horizontal" size={16} color="#DC851F" />
              </TouchableOpacity>
            )}
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{inventory.length}</Text>
              <Text style={styles.statLabel}>Types</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                ${totalValue.toFixed(0)}
              </Text>
              <Text style={styles.statLabel}>Value</Text>
            </View>
            {currentHumidor?.capacity && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {Math.round((inventory.reduce((sum, item) => sum + item.quantity, 0) / currentHumidor.capacity) * 100)}%
                </Text>
                <Text style={styles.statLabel}>Capacity</Text>
              </View>
            )}
          </View>
          
          {/* Search Bar */}
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
        </View>

        {/* Inventory List */}
        <FlatList
          ref={flatListRef}
          data={filteredInventory}
          renderItem={renderInventoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={EmptyState}
          showsVerticalScrollIndicator={false}
          onScrollToIndexFailed={(info) => {
            // Fallback if scrollToIndex fails
            console.log('Scroll to index failed:', info);
          }}
        />

        {/* Floating Action Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddCigar}
        >
          <Ionicons name="add" size={24} color="#CCCCCC" />
        </TouchableOpacity>

        {/* Humidor Selector Modal */}
        {showHumidorSelector && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Humidor</Text>
                <TouchableOpacity
                  onPress={() => setShowHumidorSelector(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#DC851F" />
                </TouchableOpacity>
              </View>
              
              <FlatList
                data={availableHumidors}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.humidorOption,
                      currentHumidor?.id === item.id && styles.selectedHumidorOption
                    ]}
                    onPress={() => handleHumidorSelect(item)}
                  >
                    <View style={styles.humidorOptionContent}>
                      <Text style={[
                        styles.humidorOptionText,
                        currentHumidor?.id === item.id && styles.selectedHumidorOptionText
                      ]}>
                        {item.name}
                      </Text>
                      {item.description && (
                        <Text style={styles.humidorOptionDescription}>
                          {item.description}
                        </Text>
                      )}
                    </View>
                    {currentHumidor?.id === item.id && (
                      <Ionicons name="checkmark" size={20} color="#DC851F" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
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
  topContentWrapper: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
    padding: 16,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  humidorSwitchButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(220, 133, 31, 0.1)',
    zIndex: 1,
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
    padding: 16,
    paddingBottom: 100, // Add extra padding to prevent FAB from obscuring last card
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
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#333333',
    minHeight: 36,
    minWidth: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    maxHeight: '70%',
    minWidth: '80%',
    borderWidth: 1,
    borderColor: '#DC851F',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalCloseButton: {
    padding: 8,
  },
  humidorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  selectedHumidorOption: {
    backgroundColor: 'rgba(220, 133, 31, 0.2)',
    borderWidth: 1,
    borderColor: '#DC851F',
  },
  humidorOptionContent: {
    flex: 1,
    marginRight: 12,
  },
  humidorOptionText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 2,
  },
  selectedHumidorOptionText: {
    color: '#DC851F',
  },
  humidorOptionDescription: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 18,
  },
});

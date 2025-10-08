import React, { useState, useLayoutEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  Image
} from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, InventoryItem } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { StorageService } from '../storage/storageService';

type AddToInventoryScreenRouteProp = RouteProp<RootStackParamList, 'AddToInventory'>;
type AddToInventoryScreenNavigationProp = StackNavigationProp<RootStackParamList>;

interface Props {
  route: AddToInventoryScreenRouteProp;
}

export default function AddToInventoryScreen({ route }: Props) {
  const navigation = useNavigation<AddToInventoryScreenNavigationProp>();
  const { cigar, singleStickPrice, existingItem, mode } = route.params;

  useLayoutEffect(() => {
    console.log('Setting header options for AddToInventoryScreen');
    navigation.setOptions({
      headerTintColor: '#FFFFFF',
      headerTitleStyle: {
        fontWeight: '600',
        fontSize: 16,
        color: '#FFFFFF',
      },
      headerStyle: {
        backgroundColor: '#0a0a0a',
      },
    });
  }, [navigation]);
  
  const [inventoryQuantity, setInventoryQuantity] = useState(mode === 'addMore' ? 1 : (existingItem?.quantity || 1));
  const [boxQuantity, setBoxQuantity] = useState(1);
  const [priceType, setPriceType] = useState<'stick' | 'box'>(
    mode === 'addMore' ? 'stick' : (existingItem?.originalBoxPrice && existingItem?.sticksPerBox ? 'box' : 'stick')
  );
  const [pricePaid, setPricePaid] = useState(() => {
    if (mode === 'addMore') {
      return '';
    }
    // Don't pre-fill with singleStickPrice - let user enter their own price
    if (existingItem?.originalBoxPrice) {
      return existingItem.originalBoxPrice.toString();
    }
    if (existingItem?.pricePaid) {
      return existingItem.pricePaid.toString();
    }
    return '';
  });
  const [sticksInBox, setSticksInBox] = useState(''); // Start empty - let user enter their own value
  const [location, setLocation] = useState(existingItem?.location || '');
  const [notes, setNotes] = useState(existingItem?.notes || '');

  const handleSave = async () => {
    try {
      // Calculate quantity and per-stick price based on price type
      let totalQuantity: number;
      let perStickPrice: number | undefined;
      const unit = priceType === 'stick' ? 'sticks' : 'boxes';
      
      if (pricePaid && pricePaid.trim() !== '') {
        const priceValue = parseFloat(pricePaid.replace('$', ''));
        
        if (isNaN(priceValue) || priceValue <= 0) {
          throw new Error('Please enter a valid price');
        }
        
        if (priceType === 'stick') {
          // Single stick pricing: store per-stick price directly
          if (inventoryQuantity <= 0) {
            throw new Error('Please enter a valid quantity (at least 1)');
          }
          totalQuantity = inventoryQuantity;
          perStickPrice = priceValue;
        } else {
          // Box pricing: calculate per-stick price and total quantity
          const sticksPerBox = parseInt(sticksInBox) || 20;
          const numberOfBoxes = boxQuantity;
          
          if (isNaN(sticksPerBox) || sticksPerBox <= 0) {
            throw new Error('Please enter a valid number of sticks per box');
          }
          
          if (numberOfBoxes <= 0) {
            throw new Error('Please enter a valid number of boxes');
          }
          
          // Calculate per-stick price: box price ÷ sticks per box
          perStickPrice = Math.round((priceValue / sticksPerBox) * 100) / 100;
          
          // Calculate total quantity: number of boxes × sticks per box
          totalQuantity = numberOfBoxes * sticksPerBox;
        }
      } else if (existingItem?.pricePaid) {
        perStickPrice = existingItem.pricePaid;
        totalQuantity = existingItem.quantity;
      } else {
        // Allow adding without price - set to 0 for new items
        if (priceType === 'stick') {
          if (inventoryQuantity <= 0) {
            throw new Error('Please enter a valid quantity (at least 1)');
          }
          totalQuantity = inventoryQuantity;
          perStickPrice = 0; // No price provided
        } else {
          // Box pricing without price
          const sticksPerBox = parseInt(sticksInBox) || 20;
          const numberOfBoxes = boxQuantity;
          
          if (isNaN(sticksPerBox) || sticksPerBox <= 0) {
            throw new Error('Please enter a valid number of sticks per box');
          }
          
          if (numberOfBoxes <= 0) {
            throw new Error('Please enter a valid number of boxes');
          }
          
          totalQuantity = numberOfBoxes * sticksPerBox;
          perStickPrice = 0; // No price provided
        }
      }
      
      console.log('💰 Per-stick price calculated:', perStickPrice);
      console.log('💰 Total quantity:', totalQuantity);
      console.log('💰 Price type:', priceType);
      console.log('💰 Sticks in box:', sticksInBox);

      // Create or update inventory item
      let inventoryItem: InventoryItem;
      
      if (mode === 'addMore' && existingItem) {
        // Add More mode: merge with existing item
        const existingTotalValue = (existingItem.pricePaid || 0) * existingItem.quantity;
        const newTotalValue = (perStickPrice || 0) * totalQuantity;
        const combinedQuantity = existingItem.quantity + totalQuantity;
        const averagePricePerStick = Math.round(((existingTotalValue + newTotalValue) / combinedQuantity) * 100) / 100;
        
        inventoryItem = {
          ...existingItem,
          quantity: combinedQuantity,
          pricePaid: averagePricePerStick,
          // Keep original box data if it was a box purchase
          originalBoxPrice: existingItem.originalBoxPrice,
          sticksPerBox: existingItem.sticksPerBox,
        };
      } else {
        // Edit mode or new item: replace/create
        inventoryItem = {
          id: existingItem?.id || `${cigar.brand}-${cigar.line}-${cigar.name}-${Date.now()}`,
          cigar: cigar,
          quantity: totalQuantity,
          purchaseDate: existingItem?.purchaseDate || new Date(),
          pricePaid: perStickPrice,
          originalBoxPrice: priceType === 'box' ? parseFloat(pricePaid.replace('$', '')) : undefined,
          sticksPerBox: priceType === 'box' ? parseInt(sticksInBox) : undefined,
          location: location.trim() || undefined,
          notes: notes.trim() || undefined,
        };
      }

      // Save to storage
      await StorageService.saveInventoryItem(inventoryItem);
      console.log('✅ Saved inventory item:', inventoryItem);
      
      // Add to recent cigars only if it's a new item
      if (!existingItem) {
        await StorageService.addRecentCigar(cigar);
        console.log('✅ Added to recent cigars:', cigar.brand, cigar.line);
      }

      let action: string;
      let displayQuantity: string;
      
      if (mode === 'addMore') {
        action = 'Added more';
        displayQuantity = priceType === 'stick' ? `${totalQuantity} cigars` : `${boxQuantity} boxes (${totalQuantity} cigars)`;
      } else if (existingItem) {
        action = 'Updated';
        displayQuantity = priceType === 'stick' ? `${totalQuantity} cigars` : `${boxQuantity} boxes (${totalQuantity} cigars)`;
      } else {
        action = 'Added';
        displayQuantity = priceType === 'stick' ? `${totalQuantity} cigars` : `${boxQuantity} boxes (${totalQuantity} cigars)`;
      }
      
      // Navigate back to MainTabs and then to Inventory tab immediately
      navigation.navigate('MainTabs', { 
        screen: 'Inventory',
        params: { 
          highlightItemId: inventoryItem.id 
        }
      });
    } catch (error) {
      console.error('Error saving to inventory:', error);
      Alert.alert('Error', 'Failed to save cigar to inventory. Please try again.');
    }
  };


  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {cigar.imageUrl && cigar.imageUrl !== 'placeholder' ? (
            <Image source={{ uri: cigar.imageUrl }} style={styles.cigarImage} />
          ) : (
            <Image source={require('../../assets/cigar-placeholder.jpg')} style={styles.cigarImage} />
          )}
          <Text style={styles.subtitle}>{cigar.brand} {cigar.line}</Text>
        </View>
      </View>

      <View style={styles.form}>
        {/* Price Type Selection */}
        <View style={styles.section}>
          <View style={styles.priceTypeSelector}>
            <TouchableOpacity 
              style={[styles.priceTypeButton, priceType === 'stick' && styles.priceTypeButtonActive]}
              onPress={() => {
                setPriceType('stick');
                // If we have existing item with calculated pricePaid, show that instead of original box price
                if (existingItem?.pricePaid && existingItem.pricePaid !== parseFloat(pricePaid)) {
                  setPricePaid(existingItem.pricePaid.toString());
                }
              }}
            >
              <Text style={[styles.priceTypeText, priceType === 'stick' && styles.priceTypeTextActive]}>
                Per Stick
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.priceTypeButton, priceType === 'box' && styles.priceTypeButtonActive]}
              onPress={() => {
                setPriceType('box');
                // If we have existing item with original box price, show that
                if (existingItem?.originalBoxPrice) {
                  setPricePaid(existingItem.originalBoxPrice.toString());
                }
              }}
            >
              <Text style={[styles.priceTypeText, priceType === 'box' && styles.priceTypeTextActive]}>
                Box Price
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quantity Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {priceType === 'stick' ? 'Number of Sticks' : 'Number of Boxes'}
          </Text>
          <View style={styles.quantityControls}>
            <TouchableOpacity 
              style={styles.quantityButton} 
              onPress={() => {
                if (priceType === 'stick') {
                  setInventoryQuantity(Math.max(1, inventoryQuantity - 1));
                } else {
                  setBoxQuantity(Math.max(1, boxQuantity - 1));
                }
              }}
            >
              <Ionicons name="remove" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.quantityText}>
              {priceType === 'stick' ? inventoryQuantity : boxQuantity}
            </Text>
            <TouchableOpacity 
              style={styles.quantityButton} 
              onPress={() => {
                if (priceType === 'stick') {
                  setInventoryQuantity(inventoryQuantity + 1);
                } else {
                  setBoxQuantity(boxQuantity + 1);
                }
              }}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Pricing Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {priceType === 'stick' ? 'Price Per Stick' : 'Box Price'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={priceType === 'stick' ? 'Enter price you paid per stick (e.g., 12.50)' : 'Enter total box price you paid (e.g., 250.00)'}
            placeholderTextColor="#999"
            value={pricePaid}
            onChangeText={setPricePaid}
            keyboardType="numeric"
          />
          
          {priceType === 'box' && (
            <View style={styles.boxDetailsSection}>
              <Text style={styles.sectionTitle}>Sticks in Box</Text>
              <TextInput
                style={styles.input}
                placeholder="Number of cigars in box (e.g., 20)"
                placeholderTextColor="#999"
                value={sticksInBox}
                onChangeText={setSticksInBox}
                keyboardType="numeric"
              />
              
              {/* Price Per Stick Display */}
              {pricePaid && sticksInBox && !isNaN(parseFloat(pricePaid)) && !isNaN(parseInt(sticksInBox)) && (
                <View style={styles.calculatedPriceContainer}>
                  <Text style={styles.calculatedPriceLabel}>Price Per Stick:</Text>
                  <Text style={styles.calculatedPriceValue}>
                    ${(parseFloat(pricePaid) / parseInt(sticksInBox)).toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Location Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <TextInput
            style={styles.input}
            placeholder="Humidor location (e.g., Top Shelf, Drawer 1)"
            placeholderTextColor="#999"
            value={location}
            onChangeText={setLocation}
          />
        </View>

        {/* Notes Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Additional notes about this cigar..."
            placeholderTextColor="#999"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cigarImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  placeholderImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CCCCCC',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#FFA737',
    flex: 1,
  },
  form: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  boxDetailsSection: {
    marginTop: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CCCCCC',
    marginBottom: 12,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333333',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  quantityButton: {
    backgroundColor: '#DC851F',
    borderRadius: 6,
    padding: 8,
    marginHorizontal: 12,
  },
  quantityText: {
    fontSize: 12,
    color: '#CCCCCC',
    fontWeight: '400',
    minWidth: 40,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#333333',
    borderRadius: 8,
    padding: 12,
    fontSize: 12,
    color: '#999999',
    borderWidth: 1,
    borderColor: '#555555',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#333333',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '400',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#DC851F',
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  priceTypeSelector: {
    flexDirection: 'row',
    backgroundColor: '#333333',
    borderRadius: 8,
    padding: 4,
  },
  priceTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  priceTypeButtonActive: {
    backgroundColor: '#DC851F',
  },
  priceTypeText: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '400',
  },
  priceTypeTextActive: {
    color: '#CCCCCC',
    fontWeight: '600',
  },
  calculatedPriceContainer: {
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calculatedPriceLabel: {
    fontSize: 12,
    color: '#FFA737',
    fontWeight: '400',
  },
  calculatedPriceValue: {
    fontSize: 12,
    color: '#CCCCCC',
    fontWeight: '400',
  },
});

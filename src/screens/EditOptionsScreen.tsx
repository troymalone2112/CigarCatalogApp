import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { RouteProp, useNavigation, StackNavigationProp } from '@react-navigation/native';
import { RootStackParamList, InventoryItem, HumidorStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';

type EditOptionsScreenRouteProp = RouteProp<HumidorStackParamList, 'EditOptions'>;
type EditOptionsScreenNavigationProp = StackNavigationProp<HumidorStackParamList>;

interface Props {
  route: EditOptionsScreenRouteProp;
}

export default function EditOptionsScreen({ route }: Props) {
  const navigation = useNavigation<EditOptionsScreenNavigationProp>();
  const { item } = route.params;

  const handleAddMore = () => {
    navigation.navigate('AddToInventory', {
      cigar: item.cigar,
      singleStickPrice: undefined, // Don't pre-populate for add more
      existingItem: item,
      mode: 'addMore', // Pass mode to distinguish from edit
    });
  };

  const handleEdit = () => {
    // Determine the price to show for editing
    let priceToShow: string | undefined;

    if (item.originalBoxPrice && item.sticksPerBox) {
      // This was originally a box purchase
      priceToShow = `$${item.originalBoxPrice}`;
    } else if (item.pricePaid) {
      // This was a single stick purchase
      priceToShow = `$${item.pricePaid}`;
    }

    navigation.navigate('AddToInventory', {
      cigar: item.cigar,
      singleStickPrice: priceToShow,
      existingItem: item,
      mode: 'edit', // Pass mode to distinguish from add more
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {item.cigar.imageUrl ? (
            <Image source={{ uri: item.cigar.imageUrl }} style={styles.cigarImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="image-outline" size={24} color="#999" />
            </View>
          )}
          <Text style={styles.subtitle}>
            {item.cigar.brand} {item.cigar.line}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Current Entry Info */}
        <View style={styles.currentInfo}>
          <Text style={styles.currentInfoTitle}>Current Entry</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Quantity:</Text>
            <Text style={styles.infoValue}>{item.quantity} cigars</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Price per stick:</Text>
            <Text style={styles.infoValue}>${item.pricePaid?.toFixed(2) || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total value:</Text>
            <Text style={styles.infoValue}>
              ${((item.pricePaid || 0) * item.quantity).toFixed(2)}
            </Text>
          </View>
          {item.location && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location:</Text>
              <Text style={styles.infoValue}>{item.location}</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleAddMore}>
            <Ionicons name="add" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Add More Cigars</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
            <Ionicons name="create" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Edit Entry</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
  subtitle: {
    fontSize: 12,
    color: '#FFA737',
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  currentInfo: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  currentInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CCCCCC',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999999',
  },
  infoValue: {
    fontSize: 12,
    color: '#CCCCCC',
    fontWeight: '400',
  },
  actionButtons: {
    gap: 16,
  },
  actionButton: {
    backgroundColor: '#DC851F',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  buttonIcon: {
    marginRight: 4,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

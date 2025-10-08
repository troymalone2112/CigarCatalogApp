import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  ImageBackground,
  Animated,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, JournalEntry, TabParamList } from '../types';
import { StorageService } from '../storage/storageService';
import { normalizeStrength } from '../utils/helpers';

type JournalScreenNavigationProp = StackNavigationProp<RootStackParamList>;
type JournalScreenRouteProp = RouteProp<TabParamList, 'Journal'>;

export default function JournalScreen() {
  const navigation = useNavigation<JournalScreenNavigationProp>();
  const route = useRoute<JournalScreenRouteProp>();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const highlightAnimation = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [])
  );

  const loadEntries = async () => {
    try {
      const journalEntries = await StorageService.getJournalEntries();
      setEntries(journalEntries);
      
      // Check if we need to highlight a specific entry
      if (route.params?.highlightItemId) {
        const targetId = route.params.highlightItemId;
        console.log('🎯 Highlighting journal entry:', targetId);
        triggerHighlight(targetId, journalEntries);
        // Clear the parameter after highlighting
        navigation.setParams({ highlightItemId: undefined });
      }
    } catch (error) {
      console.error('Error loading journal entries:', error);
      Alert.alert('Error', 'Failed to load journal entries');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const triggerHighlight = (itemId: string, items: JournalEntry[]) => {
    console.log('🎯 Setting highlighted journal entry:', itemId);
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
      console.log('🔍 Journal entry index found:', itemIndex);
      if (itemIndex !== -1 && flatListRef.current) {
        flatListRef.current.scrollToIndex({
          index: itemIndex,
          animated: true,
          viewPosition: 0.5, // Center the item in the view
        });
      }
    }, 100);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadEntries();
  };

  const deleteEntry = async (entryId: string) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this journal entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.removeJournalEntry(entryId);
              await loadEntries();
            } catch (error) {
              console.error('Error deleting journal entry:', error);
              Alert.alert('Error', 'Failed to delete journal entry');
            }
          },
        },
      ]
    );
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating / 2);
    const hasHalfStar = rating % 2 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={i} name="star" size={16} color="#DAA520" />);
    }
    if (hasHalfStar) {
      stars.push(<Ionicons key="half" name="star-half" size={16} color="#DAA520" />);
    }
    for (let i = stars.length; i < 5; i++) {
      stars.push(<Ionicons key={i} name="star-outline" size={16} color="#DAA520" />);
    }
    return stars;
  };

  const getStrengthColor = (strength: string) => {
    const normalizedStrength = normalizeStrength(strength);
    switch (normalizedStrength) {
      case 'Mild': return '#4CAF50';
      case 'Medium': return '#FF9800';
      case 'Strong': return '#F44336';
      default: return '#666';
    }
  };

  const renderJournalEntry = ({ item }: { item: JournalEntry }) => {
    const isHighlighted = highlightedItemId === item.id;
    const animatedStyle = isHighlighted ? {
      transform: [{
        scale: highlightAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.05],
        }),
      }],
      shadowOpacity: highlightAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.8],
      }),
      shadowRadius: highlightAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [4, 12],
      }),
    } : {};

    return (
      <Animated.View style={animatedStyle}>
        <Pressable
          style={({ pressed }) => [
            styles.entryCard,
            pressed && styles.entryCardPressed
          ]}
          onPress={() => navigation.navigate('JournalEntryDetails', { entry: item })}
        >
      <View style={styles.entryHeader}>
        <View style={styles.entryInfo}>
          <View style={styles.entryTitleRow}>
            <Text style={styles.cigarBrand}>{item.cigar.brand}</Text>
            <View style={styles.strengthContainer}>
              <View style={[styles.strengthPill, { backgroundColor: getStrengthColor(item.cigar.strength) }]}>
                <Text style={styles.strengthText}>{normalizeStrength(item.cigar.strength)}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.cigarLine}>{item.cigar.line}</Text>
          <Text style={styles.entryDate}>{item.date.toLocaleDateString()}</Text>
        </View>
        {item.imageUrl && (
          <Image source={{ uri: item.imageUrl }} style={styles.entryImage} />
        )}
      </View>

      <View style={styles.ratingSection}>
        <View style={styles.overallRating}>
          <Text style={styles.ratingLabel}>Rating</Text>
          <Text style={styles.ratingValue}>{item.rating.overall}/10</Text>
        </View>
      </View>

      {item.selectedFlavors && item.selectedFlavors.length > 0 && (
        <View style={styles.flavorsSection}>
          <View style={styles.flavorsContainer}>
            {item.selectedFlavors.slice(0, 3).map((flavor, index) => (
              <View key={index} style={styles.flavorChip}>
                <Text style={styles.flavorChipText}>{flavor}</Text>
              </View>
            ))}
            {item.selectedFlavors.length > 3 && (
              <Text style={styles.moreFlavorsText}>+{item.selectedFlavors.length - 3} more</Text>
            )}
          </View>
        </View>
      )}

      <Text style={styles.entryNotes} numberOfLines={2}>
        {item.notes}
      </Text>

      {item.location && (
        <View style={styles.locationSection}>
          <Ionicons name="location" size={14} color="#7C2D12" />
          <Text style={styles.locationText}>
            {item.location.city}{item.location.state ? `, ${item.location.state}` : ''}
          </Text>
        </View>
      )}

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={(e) => {
            e.stopPropagation();
            deleteEntry(item.id);
          }}
        >
          <Ionicons name="trash-outline" size={16} color="#dc3545" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={(e) => {
            e.stopPropagation();
            navigation.navigate('JournalEntryDetails', { entry: item });
          }}
        >
          <Ionicons name="pencil-outline" size={16} color="#DC851F" />
        </TouchableOpacity>
      </View>
        </Pressable>
      </Animated.View>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="book-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>Journal</Text>
      <Text style={styles.emptySubtitle}>
        Start recording your cigar experiences
      </Text>
    </View>
  );

  return (
    <ImageBackground 
      source={require('../../assets/tobacco-leaves-bg.jpg')}
      style={styles.fullScreenBackground}
      imageStyle={styles.tobaccoBackgroundImage}
    >
      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={entries}
          renderItem={renderJournalEntry}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={EmptyState}
          showsVerticalScrollIndicator={false}
        />

        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CigarRecognition')}
        >
          <Ionicons name="add" size={24} color="#CCCCCC" />
        </TouchableOpacity>
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
  listContainer: {
    padding: 16,
  },
  entryCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#555555',
  },
  entryCardPressed: {
    backgroundColor: '#2a2a2a', // Slightly lighter when pressed
    transform: [{ scale: 0.98 }], // Subtle scale down effect
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  entryInfo: {
    flex: 1,
  },
  entryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cigarBrand: {
    fontSize: 14,
    fontWeight: '500',
    color: '#CCCCCC',
    flex: 1,
  },
  photoIcon: {
    marginLeft: 4,
  },
  cigarLine: {
    fontSize: 12,
    color: '#FFA737',
    marginTop: 2,
  },
  entryDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  entryImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  ratingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  overallRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingLabel: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFA737',
  },
  strengthContainer: {
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 12,
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
  editButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#333333',
    minHeight: 36,
    minWidth: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  strengthPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  strengthText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  flavorsSection: {
    marginTop: 8,
    marginBottom: 12,
  },
  flavorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  flavorChip: {
    backgroundColor: '#FFA737',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  flavorChipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  moreFlavorsText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  starsContainer: {
    flexDirection: 'row',
  },
  entryNotes: {
    fontSize: 12,
    color: '#999',
    lineHeight: 14,
    marginBottom: 8,
  },
  entrySetting: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    marginTop: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CCCCCC',
    marginTop: 24,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 32,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});

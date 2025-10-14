import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity,
  ImageBackground 
} from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList, HumidorStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { getStrengthInfo } from '../utils/strengthUtils';
import StrengthButton from '../components/StrengthButton';

type CigarDetailsScreenRouteProp = RouteProp<HumidorStackParamList, 'CigarDetails'>;

interface Props {
  route: CigarDetailsScreenRouteProp;
}

export default function CigarDetailsScreen({ route }: Props) {
  const navigation = useNavigation();
  const { cigar } = route.params;

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

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.resultCard}>
            {/* Main content area with image on right */}
            <View style={styles.mainContent}>
              <View style={styles.cigarInfo}>
                {/* Cigar Title */}
                <Text style={styles.resultTitle}>
                  {cigar.brand}
                </Text>
                <Text style={styles.resultSubtitle}>
                  {cigar.name && cigar.name !== 'Unknown Name' 
                    ? cigar.name 
                    : cigar.line}
                </Text>
                
                {/* Strength Badge */}
                {cigar.strength && (
                  <View style={styles.flavorTags}>
                    <View style={[styles.flavorTag, { backgroundColor: getStrengthInfo(cigar.strength).color }]}>
                      <Text style={styles.flavorText}>{getStrengthInfo(cigar.strength).label}</Text>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.imageContainer}>
                {/* Cigar Image */}
                {cigar.imageUrl && cigar.imageUrl !== 'placeholder' ? (
                  <Image source={{ uri: cigar.imageUrl }} style={styles.cigarImage} />
                ) : (
                  <Image source={require('../../assets/cigar-placeholder.jpg')} style={styles.cigarImage} />
                )}
              </View>
            </View>

            {/* Cigar Description */}
            {cigar.overview && (
              <Text style={styles.cigarDescription}>
                {cigar.overview}
              </Text>
            )}

            {/* Flavor Profile Section */}
            {((cigar.flavorTags && cigar.flavorTags.length > 0) || 
              (cigar.flavorProfile && cigar.flavorProfile.length > 0)) && (
              <View style={styles.flavorSection}>
                <Text style={styles.sectionTitle}>Flavor Profile</Text>
                <View style={styles.flavorTags}>
                  {(cigar.flavorTags || cigar.flavorProfile || []).map((flavor, index) => (
                    <View key={index} style={styles.flavorTag}>
                      <Text style={styles.flavorText}>{flavor}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Details Grid */}
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Strength</Text>
                <Text style={styles.detailValue}>{cigar.strength}</Text>
              </View>
            </View>

            {/* Tobacco Section */}
            {(cigar.tobacco || cigar.wrapper) && (
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Tobacco</Text>
                  <Text style={styles.detailValue}>
                    {cigar.tobacco || cigar.wrapper}
                  </Text>
                </View>
              </View>
            )}

            {/* Box Pricing */}
            {cigar.msrp && (
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Box Price</Text>
                  <Text style={styles.detailValue}>
                    {cigar.msrp.split('\n').map((line, index) => (
                      <Text key={index}>
                        {line.trim()}
                        {index < cigar.msrp.split('\n').length - 1 && '\n'}
                      </Text>
                    ))}
                  </Text>
                </View>
              </View>
            )}

            {/* Stick Pricing */}
            {cigar.singleStickPrice && (
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Per Stick</Text>
                  <Text style={styles.detailValue}>
                    {cigar.singleStickPrice.split('\n').map((line, index) => (
                      <Text key={index}>
                        {line.trim()}
                        {index < cigar.singleStickPrice.split('\n').length - 1 && '\n'}
                      </Text>
                    ))}
                  </Text>
                </View>
              </View>
            )}

            {/* Additional Details */}
            {cigar.releaseYear && (
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Release Year</Text>
                  <Text style={styles.detailValue}>{cigar.releaseYear}</Text>
                </View>
              </View>
            )}

            {cigar.cigarAficionadoRating && (
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Cigar Aficionado Rating</Text>
                  <Text style={styles.detailValue}>{cigar.cigarAficionadoRating}/100</Text>
                </View>
              </View>
            )}

            {cigar.agingPotential && (
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Aging Potential</Text>
                  <Text style={styles.detailValue}>{cigar.agingPotential}</Text>
                </View>
              </View>
            )}

          </View>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  fullScreenBackground: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  tobaccoBackgroundImage: {
    opacity: 0.25,
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  resultCard: {
    backgroundColor: '#1a1a1a',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  cigarImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    alignSelf: 'center',
    marginBottom: 16,
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  mainContent: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  cigarInfo: {
    flex: 1,
    marginRight: 12,
  },
  imageContainer: {
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CCCCCC',
    textAlign: 'left',
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#FFA737',
    textAlign: 'left',
    marginBottom: 8,
  },
  strengthBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
    borderWidth: 1,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cigarDescription: {
    fontSize: 14,
    color: '#999',
    textAlign: 'left',
    marginBottom: 16,
    paddingHorizontal: 0,
    lineHeight: 20,
  },
  flavorSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#CCCCCC',
    marginBottom: 12,
  },
  flavorTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  flavorTag: {
    backgroundColor: '#FFA737',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  flavorText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  detailsGrid: {
    marginBottom: 16,
  },
  detailItem: {
    width: '100%',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 18,
    color: '#CCCCCC',
    marginBottom: 4,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 16,
    color: '#999',
    fontWeight: '400',
  },
});

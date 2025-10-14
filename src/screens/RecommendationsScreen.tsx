import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  ImageBackground,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Recommendation } from '../types';
import { RecommendationService, CigarRecommendation } from '../services/recommendationService';
import { useAuth } from '../contexts/AuthContext';
import { getStrengthInfo } from '../utils/strengthUtils';

export default function RecommendationsScreen() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'similar' | 'explore' | 'budget'>('all');

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      
      console.log('🧪 Loading cigar recommendations...');
      
      // Get personalized recommendations (this will use the database and user data)
      const cigarRecs = await RecommendationService.getPersonalizedRecommendations({
        userId: user?.id,
        limit: 5, // Start with 5 recommendations as requested
        minRating: 90
      });
      
      // Convert CigarRecommendation to Recommendation format
      const recs: Recommendation[] = cigarRecs.map(cigarRec => ({
        cigar: cigarRec.cigar,
        matchScore: cigarRec.matchScore, // Now this is already 0-100%
        reasons: cigarRec.reason, // reason is now already an array
        confidence: cigarRec.matchScore / 100 // Convert to 0-1 scale for compatibility
      }));
      
      setRecommendations(recs);
    } catch (error) {
      console.error('Error loading recommendations:', error);
      // Fallback to top-rated cigars if personalized recommendations fail
      try {
        console.log('🔄 Falling back to top-rated cigars...');
        const fallbackCigarRecs = await RecommendationService.getTopRatedCigars(undefined, 12);
        const fallbackRecs: Recommendation[] = fallbackCigarRecs.map(cigarRec => ({
          cigar: cigarRec.cigar,
          matchScore: cigarRec.matchScore,
          reasons: cigarRec.reason, // reason is now already an array
          confidence: cigarRec.matchScore / 100
        }));
        setRecommendations(fallbackRecs);
      } catch (fallbackError) {
        console.error('Error loading fallback recommendations:', fallbackError);
        setRecommendations([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecommendations();
    setRefreshing(false);
  };

  const filteredRecommendations = recommendations.filter(rec => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'similar') return rec.matchScore >= 80;
    if (selectedFilter === 'explore') return rec.matchScore >= 60 && rec.matchScore < 80;
    if (selectedFilter === 'budget') return rec.cigar.singleStickPrice && parseFloat(rec.cigar.singleStickPrice.replace('$', '')) <= 15;
    return true;
  });

  const getFilterButtonStyle = (filter: string) => ({
    ...styles.filterButton,
    backgroundColor: selectedFilter === filter ? '#DC851F' : '#333333',
  });

  const getFilterTextStyle = (filter: string) => ({
    ...styles.filterButtonText,
    color: selectedFilter === filter ? '#FFFFFF' : '#CCCCCC',
  });

  // Function to handle opening cigar URL
  const handleLearnMore = async (cigar: any) => {
    try {
      console.log('🔍 handleLearnMore - cigar object:', JSON.stringify(cigar, null, 2));
      console.log('🔍 handleLearnMore - detailUrl:', cigar.detailUrl);
      console.log('🔍 handleLearnMore - url:', cigar.url);
      
      // Check if cigar has a URL
      if (!cigar.detailUrl && !cigar.url) {
        console.log('❌ No URL found for cigar:', cigar.name);
        Alert.alert(
          'No Information Available',
          'Sorry, no detailed information is available for this cigar at the moment.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Use detailUrl first, then fallback to url
      const url = cigar.detailUrl || cigar.url;
      
      // Check if URL is valid
      if (!url || !url.startsWith('http')) {
        Alert.alert(
          'Invalid URL',
          'Sorry, the link for this cigar is not available.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Open the URL in the device's default browser
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'Cannot Open Link',
          'Sorry, we cannot open this link on your device.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert(
        'Error',
        'Sorry, there was an error opening the link.',
        [{ text: 'OK' }]
      );
    }
  };

  // Static image mapping for cigar images
  const getCigarImageSource = (imageUrl: string | undefined) => {
    if (!imageUrl) {
      return require('../../assets/cigar-placeholder.jpg');
    }

    // Static mapping of image filenames to require statements
    const imageMap: { [key: string]: any } = {
      // 2024 cigars
      '01_my_father_judge_grand_robusto.jpeg': require('../../assets/Cigar_Images/01_my_father_judge_grand_robusto.jpeg'),
      '02_montecristo_1935_anniversary_nicaragua_espeso.jpeg': require('../../assets/Cigar_Images/02_montecristo_1935_anniversary_nicaragua_espeso.jpeg'),
      '05_partagas_linea_maestra_maestro.jpeg': require('../../assets/Cigar_Images/05_partagas_linea_maestra_maestro.jpeg'),
      '06_oliva_serie_v_melanio_maduro_torpedo.jpg': require('../../assets/Cigar_Images/06_oliva_serie_v_melanio_maduro_torpedo.jpg'),
      '08_cohiba_maduro_5_magicos.jpeg': require('../../assets/Cigar_Images/08_cohiba_maduro_5_magicos.jpeg'),
      '10_brick_house_churchill.jpeg': require('../../assets/Cigar_Images/10_brick_house_churchill.jpeg'),
      '11_la_aroma_de_cuba_pasion_box_pressed_torpedo.jpeg': require('../../assets/Cigar_Images/11_la_aroma_de_cuba_pasion_box_pressed_torpedo.jpeg'),
      '14_casa_magna_colorado_xv_anniversary.jpeg': require('../../assets/Cigar_Images/14_casa_magna_colorado_xv_anniversary.jpeg'),
      '15_romeo_y_julieta_wide_churchhill.jpg': require('../../assets/Cigar_Images/15_romeo_y_julieta_wide_churchhill.jpg'),
      '16_perdomo_30th_anniversary_sun_grown_epicure.jpeg': require('../../assets/Cigar_Images/16_perdomo_30th_anniversary_sun_grown_epicure.jpeg'),
      '19_herrera_esteli_norteno_lonsdale.jpeg': require('../../assets/Cigar_Images/19_herrera_esteli_norteno_lonsdale.jpeg'),
      '23_warped_corto_x52.jpeg': require('../../assets/Cigar_Images/23_warped_corto_x52.jpeg'),
      '25_tatuaje_reserva_a_uno.jpeg': require('../../assets/Cigar_Images/25_tatuaje_reserva_a_uno.jpeg'),
      // 2023 cigars
      '2023_01_fuente_fuente_opusx_reserva_dchateau.jpeg': require('../../assets/Cigar_Images/2023_01_fuente_fuente_opusx_reserva_dchateau.jpeg'),
      '2023_02_padron_serie_1926_no_48_maduro.jpeg': require('../../assets/Cigar_Images/2023_02_padron_serie_1926_no_48_maduro.jpeg'),
      '2023_05_ep_carrillo_allegiance_confidant.jpeg': require('../../assets/Cigar_Images/2023_05_ep_carrillo_allegiance_confidant.jpeg'),
      '2023_06_partagas_serie_p_no_2.jpeg': require('../../assets/Cigar_Images/2023_06_partagas_serie_p_no_2.jpeg'),
      '2023_07_blackened_cigars_m81_drew_estate_corona.jpeg': require('../../assets/Cigar_Images/2023_07_blackened_cigars_m81_drew_estate_corona.jpeg'),
      '2023_08_alec_bradley_prensado_torpedo.jpeg': require('../../assets/Cigar_Images/2023_08_alec_bradley_prensado_torpedo.jpeg'),
      '2023_09_la_aroma_de_cuba_mi_amor_belicoso.jpeg': require('../../assets/Cigar_Images/2023_09_la_aroma_de_cuba_mi_amor_belicoso.jpeg'),
      '2023_10_el_pulpo_belicoso_grande.jpeg': require('../../assets/Cigar_Images/2023_10_el_pulpo_belicoso_grande.jpeg'),
      // Alternative naming
      'Casa_Magna_Colorado_XV_Anniversary.jpeg': require('../../assets/Cigar_Images/Casa_Magna_Colorado_XV_Anniversary.jpeg'),
      'Cohiba_Maduro_5_Magicos.jpeg': require('../../assets/Cigar_Images/Cohiba_Maduro_5_Magicos.jpeg'),
      'Herrera_Esteli_Norteno_Lonsdale.jpeg': require('../../assets/Cigar_Images/Herrera_Esteli_Norteno_Lonsdale.jpeg'),
      'La_Aroma_de_Cuba_Pasion_Box-Pressed Torpedo.jpeg': require('../../assets/Cigar_Images/La_Aroma_de_Cuba_Pasion_Box-Pressed Torpedo.jpeg'),
      'Partagas_Linea_Maestra_Maestro.jpeg': require('../../assets/Cigar_Images/Partagas_Linea_Maestra_Maestro.jpeg'),
      'Perdomo_30th_Anniversary_Sun Grown_Epicure.jpeg': require('../../assets/Cigar_Images/Perdomo_30th_Anniversary_Sun Grown_Epicure.jpeg'),
      'Rocky_Patel_Conviction_Toro.jpeg': require('../../assets/Cigar_Images/Rocky_Patel_Conviction_Toro.jpeg'),
      'Tatuaje_Reserva_A_Uno.jpeg': require('../../assets/Cigar_Images/Tatuaje_Reserva_A_Uno.jpeg'),
      'Warped_Corto_X52.jpeg': require('../../assets/Cigar_Images/Warped_Corto_X52.jpeg'),
      '601_La_Bomba_Warhead_X.jpg': require('../../assets/Cigar_Images/601_La_Bomba_Warhead_X.jpg'),
      // New images added
      'alec-bradley-prensado-lost-art-gordo.jpg': require('../../assets/Cigar_Images/alec-bradley-prensado-lost-art-gordo.jpg'),
      'alec-bradley_black_market_churchill.jpg': require('../../assets/Cigar_Images/alec-bradley_black_market_churchill.jpg'),
      'Arturo-Fuente-Hemingway-Between-the-Lines.jpg': require('../../assets/Cigar_Images/Arturo-Fuente-Hemingway-Between-the-Lines.jpg'),
      'Arturo-Fuente-Hemingway.jpg': require('../../assets/Cigar_Images/Arturo-Fuente-Hemingway.jpg'),
      'Arturo-fuente-opusx.jpg': require('../../assets/Cigar_Images/Arturo-fuente-opusx.jpg'),
      'arturo-fuente-rare-pink-vintage.jpg': require('../../assets/Cigar_Images/arturo-fuente-rare-pink-vintage.jpg'),
      'arturo-fuente-don-carlos-eye-of-the-shark.jpg': require('../../assets/Cigar_Images/arturo-fuente-don-carlos-eye-of-the-shark.jpg'),
      'ASHTON-Vsg-ENCHANTMENT.jpg': require('../../assets/Cigar_Images/ASHTON-Vsg-ENCHANTMENT.jpg'),
      'Ashton-Virgin-Sun-Grown-Illusion.jpg': require('../../assets/Cigar_Images/Ashton-Virgin-Sun-Grown-Illusion.jpg'),
      'C.A.O- BRAZILIA-GOL.jpg': require('../../assets/Cigar_Images/C.A.O- BRAZILIA-GOL.jpg'),
      'Davidoff-Millennium-Blend-Robusto.jpg': require('../../assets/Cigar_Images/Davidoff-Millennium-Blend-Robusto.jpg'),
      'Davidoff-Nicaragua-Diadema.jpg': require('../../assets/Cigar_Images/Davidoff-Nicaragua-Diadema.jpg'),
      'DrewEstate-Liga-Privad-No.9-Belicoso.jpg': require('../../assets/Cigar_Images/DrewEstate-Liga-Privad-No.9-Belicoso.jpg'),
      'E.P.-Carrillo-Encore-Celestial.jpg': require('../../assets/Cigar_Images/E.P.-Carrillo-Encore-Celestial.jpg'),
      'E.P.-Carrillo-Pledge-Apogee.jpg': require('../../assets/Cigar_Images/E.P.-Carrillo-Pledge-Apogee.jpg'),
      'Espinosa-Knuckle-Sandwich-Habano-Corona-Gorda-R.jpg': require('../../assets/Cigar_Images/Espinosa-Knuckle-Sandwich-Habano-Corona-Gorda-R.jpg'),
      'foreign-Affair-By-Luciano-Cigars-Corona.jpg': require('../../assets/Cigar_Images/foreign-Affair-By-Luciano-Cigars-Corona.jpg'),
      'Fuente-Fuente-OpusX-Reserva-dChateau.jpg': require('../../assets/Cigar_Images/Fuente-Fuente-OpusX-Reserva-dChateau.jpg'),
      'H-Upmann-0No.2.jpg': require('../../assets/Cigar_Images/H-Upmann-0No.2.jpg'),
      'H-Upmann-Magnum-56.jpg': require('../../assets/Cigar_Images/H-Upmann-Magnum-56.jpg'),
      'Hoyo-de-Monterrey-Elegantes.jpg': require('../../assets/Cigar_Images/Hoyo-de-Monterrey-Elegantes.jpg'),
      'Illusione-Rothchildes.jpg': require('../../assets/Cigar_Images/Illusione-Rothchildes.jpg'),
      'Illusione-Allegria-Robusto.jpg': require('../../assets/Cigar_Images/Illusione-Allegria-Robusto.jpg'),
      'Joya-de-Nicaragua-Antano-1970-Churchill.jpg': require('../../assets/Cigar_Images/Joya-de-Nicaragua-Antano-1970-Churchill.jpg'),
      'Long-Live-The-Queen-Ace-of-Hearts.jpg': require('../../assets/Cigar_Images/Long-Live-The-Queen-Ace-of-Hearts.jpg'),
      'New-World-Dorado-Robusto.jpg': require('../../assets/Cigar_Images/New-World-Dorado-Robusto.jpg'),
      'Olmec-Claro-Corona-Gorda.jpg': require('../../assets/Cigar_Images/Olmec-Claro-Corona-Gorda.jpg'),
      'Ozgener-Family-Cigars-Bosphorus-B52.jpg': require('../../assets/Cigar_Images/Ozgener-Family-Cigars-Bosphorus-B52.jpg'),
      'Padron-1964-Anniversary-Series-Principe.jpg': require('../../assets/Cigar_Images/Padron-1964-Anniversary-Series-Principe.jpg'),
      'Rafael-Gonzalez-Corona-de-Lonsdale.jpg': require('../../assets/Cigar_Images/Rafael-Gonzalez-Corona-de-Lonsdale.jpg'),
      'San-Cristobal-Clasico.jpg': require('../../assets/Cigar_Images/San-Cristobal-Clasico.jpg'),
      'Trinidad-Espiritu-Series-No.-1-Belicoso.jpg': require('../../assets/Cigar_Images/Trinidad-Espiritu-Series-No.-1-Belicoso.jpg'),
      'West-Tampa-Red-Robusto.jpg': require('../../assets/Cigar_Images/West-Tampa-Red-Robusto.jpg'),
      // Rocky Patel replacements
      'rocky-patel-sixty-six.jpg': require('../../assets/Cigar_Images/rocky-patel-sixty-six.jpg'),
      'Rocky-Patel-A.L.R-Second-Edition-Toro.jpg': require('../../assets/Cigar_Images/Rocky-Patel-A.L.R-Second-Edition-Toro.jpg'),
    };

    // Return the mapped image or placeholder if not found
    return imageMap[imageUrl] || require('../../assets/cigar-placeholder.jpg');
  };

  const renderRecommendationCard = (recommendation: Recommendation) => {

    return (
      <TouchableOpacity key={recommendation.cigar.id} style={styles.recommendationCard}>
        {/* Cigar Image - Now at the top */}
        <View style={[
          styles.imageContainer,
          !recommendation.cigar.imageUrl && styles.placeholderImageContainer
        ]}>
          <Image 
            source={getCigarImageSource(recommendation.cigar.imageUrl)} 
            style={styles.cigarImage}
            resizeMode={recommendation.cigar.imageUrl ? "contain" : "cover"}
          />
        </View>

        {/* Header content moved below image */}
        <View style={styles.cardHeader}>
          <View style={styles.cigarInfo}>
            <Text style={styles.cigarBrand}>{recommendation.cigar.brand}</Text>
            <Text style={styles.cigarName}>{recommendation.cigar.line}</Text>
            <View style={[styles.strengthBadge, {
              backgroundColor: getStrengthInfo(recommendation.cigar.strength).backgroundColor,
              borderColor: getStrengthInfo(recommendation.cigar.strength).borderColor,
              borderWidth: 1,
            }]}>
              <Text style={[styles.strengthBadgeText, {
                color: getStrengthInfo(recommendation.cigar.strength).color,
              }]}>{recommendation.cigar.strength}</Text>
            </View>
          </View>
          
          <View style={styles.matchScoreContainer}>
            <Text style={styles.matchScore}>{recommendation.matchScore}%</Text>
            <Text style={styles.matchLabel}>Match</Text>
            {recommendation.matchScore >= 70 && (
              <Text style={styles.highMatchBadge}>🎯 High Match</Text>
            )}
          </View>
        </View>

        <View style={styles.cardContent}>
        <View style={styles.cigarDetails}>
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Price:</Text>
            <Text style={styles.sectionValue}>
              {recommendation.cigar.singleStickPrice || recommendation.cigar.msrp || 'Price not available'}
            </Text>
          </View>
        </View>

        <View style={styles.reasonsContainer}>
          <Text style={styles.reasonsTitle}>Why we recommend this:</Text>
          {recommendation.reasons.map((reason, index) => (
            <Text key={index} style={styles.reasonText}>• {reason}</Text>
          ))}
        </View>

        <View style={styles.flavorSection}>
          <Text style={styles.flavorSectionTitle}>Flavor Profile</Text>
          <View style={styles.flavorTags}>
            {recommendation.cigar.flavorProfile.map((flavor, index) => (
              <View key={index} style={styles.flavorTag}>
                <Text style={styles.flavorTagText}>{flavor}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleLearnMore(recommendation.cigar)}
        >
          <Ionicons name="information-circle-outline" size={16} color="#DC851F" />
          <Text style={styles.actionButtonText}>Learn More</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="bulb-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>Building Your Recommendations</Text>
      <Text style={styles.emptySubtitle}>
        We're analyzing your preferences to suggest perfect cigars for you. 
        Start by adding some cigars to your humidor and journal to get personalized recommendations.
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
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Recommendations</Text>
          <Text style={styles.headerSubtitle}>Curated just for you</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#DC851F" />
            <Text style={styles.loadingText}>Finding your perfect cigars...</Text>
          </View>
        ) : (
          <>
            <View style={styles.filterContainer}>
              <TouchableOpacity 
                style={getFilterButtonStyle('all')}
                onPress={() => setSelectedFilter('all')}
              >
                <Text style={getFilterTextStyle('all')}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={getFilterButtonStyle('similar')}
                onPress={() => setSelectedFilter('similar')}
              >
                <Text style={getFilterTextStyle('similar')}>Similar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={getFilterButtonStyle('explore')}
                onPress={() => setSelectedFilter('explore')}
              >
                <Text style={getFilterTextStyle('explore')}>Explore</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={getFilterButtonStyle('budget')}
                onPress={() => setSelectedFilter('budget')}
              >
                <Text style={getFilterTextStyle('budget')}>Budget</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#DC851F"
                />
              }
            >
              {filteredRecommendations.length === 0 ? (
                <EmptyState />
              ) : (
                <View style={styles.recommendationsContainer}>
                  {filteredRecommendations.map(renderRecommendationCard)}
                </View>
              )}
            </ScrollView>
          </>
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  fullScreenBackground: {
    flex: 1,
  },
  tobaccoBackgroundImage: {
    opacity: 0.1,
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CCCCCC',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#FFA737',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: '#999999',
    marginTop: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#333333',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#CCCCCC',
  },
  scrollView: {
    flex: 1,
  },
  recommendationsContainer: {
    padding: 16,
  },
  recommendationCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cigarInfo: {
    flex: 1,
  },
  cigarBrand: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CCCCCC',
    marginBottom: 2,
  },
  cigarName: {
    fontSize: 12,
    color: '#FFA737',
  },
  matchScoreContainer: {
    alignItems: 'center',
    backgroundColor: '#DC851F',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchScore: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  matchLabel: {
    fontSize: 8,
    color: '#FFFFFF',
  },
  highMatchBadge: {
    fontSize: 8,
    color: '#FFD700',
    fontWeight: '600',
    marginTop: 2,
  },
  imageContainer: {
    width: '100%',
    height: 240, // Double the size from 120 to 240
    marginBottom: 12, // Only bottom margin since it's at the top
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF', // White background for cigar images
  },
  placeholderImageContainer: {
    backgroundColor: '#2a2a2a', // Dark background for placeholder images
  },
  cigarImage: {
    width: '100%',
    height: '100%',
  },
  cardContent: {
    marginBottom: 16,
  },
  cigarDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999999',
  },
  detailValue: {
    fontSize: 12,
    color: '#CCCCCC',
    fontWeight: '500',
  },
  detailSection: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#CCCCCC',
    marginBottom: 4,
  },
  sectionValue: {
    fontSize: 12,
    color: '#999999',
  },
  strengthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  strengthBadgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  reasonsContainer: {
    marginBottom: 12,
  },
  reasonsTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#CCCCCC',
    marginBottom: 6,
  },
  reasonText: {
    fontSize: 10,
    color: '#999999',
    marginBottom: 2,
    lineHeight: 14,
  },
  flavorSection: {
    marginBottom: 12,
  },
  flavorSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CCCCCC',
    marginBottom: 6,
  },
  flavorTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
  },
  flavorTag: {
    backgroundColor: '#FFA737',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  flavorTagText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333333',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#DC851F',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CCCCCC',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 18,
  },
});
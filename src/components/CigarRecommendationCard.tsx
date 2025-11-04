import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Cigar } from '../types';
import { CigarImageService } from '../services/cigarImageService';

interface CigarRecommendationCardProps {
  cigar: Cigar;
  matchScore?: number;
  reason?: string;
  onPress?: () => void;
  showImage?: boolean;
}

export default function CigarRecommendationCard({
  cigar,
  matchScore,
  reason,
  onPress,
  showImage = true,
}: CigarRecommendationCardProps) {
  const imageSource = CigarImageService.getCigarImageSource(cigar);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.card}>
        {showImage && (
          <View style={styles.imageContainer}>
            <Image source={imageSource} style={styles.cigarImage} resizeMode="cover" />
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.brandName}>{cigar.brand}</Text>
            {matchScore && (
              <View style={styles.scoreContainer}>
                <Text style={styles.scoreText}>{Math.round(matchScore * 100)}%</Text>
              </View>
            )}
          </View>

          <Text style={styles.cigarName}>{cigar.line}</Text>

          <View style={styles.details}>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Rating:</Text>
              <Text style={styles.value}>{cigar.cigarAficionadoRating}/100</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Strength:</Text>
              <Text style={styles.value}>{cigar.strength}</Text>
            </View>

            {cigar.msrp && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>Price:</Text>
                <Text style={styles.value}>{cigar.msrp}</Text>
              </View>
            )}
          </View>

          {reason && <Text style={styles.reason}>{reason}</Text>}

          {cigar.overview && (
            <Text style={styles.description} numberOfLines={3}>
              {cigar.overview}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  imageContainer: {
    height: 120,
    backgroundColor: '#2a2a2a',
  },
  cigarImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC851F',
    flex: 1,
    marginRight: 8,
  },
  scoreContainer: {
    backgroundColor: '#DC851F',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 50,
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cigarName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  details: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: '#AAAAAA',
    fontWeight: '500',
  },
  value: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  reason: {
    fontSize: 12,
    color: '#DC851F',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  description: {
    fontSize: 12,
    color: '#CCCCCC',
    lineHeight: 16,
  },
});

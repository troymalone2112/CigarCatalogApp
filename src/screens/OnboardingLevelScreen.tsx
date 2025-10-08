import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ImageBackground,
  ScrollView
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';

type OnboardingLevelNavigationProp = StackNavigationProp<RootStackParamList, 'OnboardingLevel'>;
type OnboardingLevelRouteProp = RouteProp<RootStackParamList, 'OnboardingLevel'>;

const experienceLevels = [
  { 
    key: 'getting-started', 
    title: 'Just Getting Started', 
    description: 'New to cigars, want to learn the basics and discover what you like' 
  },
  { 
    key: 'casual', 
    title: 'Casual Smoker', 
    description: 'Smoke occasionally, know a few favorites and basic preferences' 
  },
  { 
    key: 'regular', 
    title: 'Regular Smoker', 
    description: 'Smoke regularly, understand different types and brands' 
  },
  { 
    key: 'experienced', 
    title: 'Experienced Enthusiast', 
    description: 'Deep knowledge of brands, regions, and aging techniques' 
  },
  { 
    key: 'connoisseur', 
    title: 'Cigar Connoisseur', 
    description: 'Expert level, can identify complex flavor profiles and nuances' 
  },
];

export default function OnboardingLevelScreen() {
  const navigation = useNavigation<OnboardingLevelNavigationProp>();
  const route = useRoute<OnboardingLevelRouteProp>();
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  const handleContinue = () => {
    if (selectedLevel) {
      // Store the selection and move to next screen
      navigation.navigate('OnboardingTastePreferences', { 
        smokingDuration: route.params?.smokingDuration,
        experienceLevel: selectedLevel 
      });
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSkip = () => {
    navigation.navigate('MainTabs', { screen: 'Home' });
  };

  return (
    <ImageBackground 
      source={require('../../assets/tobacco-leaves-bg.jpg')}
      style={styles.fullScreenBackground}
      imageStyle={styles.tobaccoBackgroundImage}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#CCCCCC" />
          </TouchableOpacity>
          
          <View style={styles.progressIndicator}>
            <Text style={styles.progressText}>3 of 4</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '75%' }]} />
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="star" size={80} color="#DC851F" />
          </View>
          
          <Text style={styles.title}>Experience Level</Text>
          
          <Text style={styles.subtitle}>
            Do you consider yourself:
          </Text>

          <View style={styles.optionsContainer}>
            {experienceLevels.map((level) => (
              <TouchableOpacity
                key={level.key}
                style={[
                  styles.optionButton,
                  selectedLevel === level.key && styles.optionButtonSelected
                ]}
                onPress={() => setSelectedLevel(level.key)}
              >
                <View style={styles.optionContent}>
                  <Text style={[
                    styles.optionTitle,
                    selectedLevel === level.key && styles.optionTitleSelected
                  ]}>
                    {level.title}
                  </Text>
                  <Text style={[
                    styles.optionDescription,
                    selectedLevel === level.key && styles.optionDescriptionSelected
                  ]}>
                    {level.description}
                  </Text>
                </View>
                <Ionicons 
                  name={selectedLevel === level.key ? "checkmark-circle" : "ellipse-outline"} 
                  size={24} 
                  color={selectedLevel === level.key ? "#DC851F" : "#999999"} 
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.continueButton, !selectedLevel && styles.continueButtonDisabled]} 
            onPress={handleContinue}
            disabled={!selectedLevel}
          >
            <Text style={[styles.continueButtonText, !selectedLevel && styles.continueButtonTextDisabled]}>
              Continue
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  progressIndicator: {
    flex: 1,
    alignItems: 'center',
  },
  progressText: {
    color: '#999',
    fontSize: 14,
    marginBottom: 8,
  },
  progressBar: {
    width: 100,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#DC851F',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#A16207',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  optionsContainer: {
    width: '100%',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555555',
    marginBottom: 12,
  },
  optionButtonSelected: {
    borderColor: '#DC851F',
    backgroundColor: '#2a1a0a',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    color: '#CCCCCC',
    fontWeight: '600',
    marginBottom: 4,
  },
  optionTitleSelected: {
    color: '#CCCCCC',
  },
  optionDescription: {
    fontSize: 14,
    color: '#999',
    lineHeight: 18,
  },
  optionDescriptionSelected: {
    color: '#A16207',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  continueButton: {
    backgroundColor: '#DC851F',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  continueButtonDisabled: {
    backgroundColor: '#999999',
    opacity: 0.7,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  continueButtonTextDisabled: {
    color: '#666',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#DC851F',
    fontSize: 14,
    fontWeight: '400',
  },
});


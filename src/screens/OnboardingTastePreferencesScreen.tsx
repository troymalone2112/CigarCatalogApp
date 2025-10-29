import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ImageBackground,
  ScrollView,
  Alert
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, UserProfile } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { StorageService } from '../storage/storageService';
import { useAuth } from '../contexts/AuthContext';

type OnboardingTastePreferencesNavigationProp = StackNavigationProp<RootStackParamList, 'OnboardingTastePreferences'>;
type OnboardingTastePreferencesRouteProp = RouteProp<RootStackParamList, 'OnboardingTastePreferences'>;

const flavorOptions = [
  { key: 'woody', label: 'Woody', icon: 'leaf', description: 'Cedar, Oak, Hickory' },
  { key: 'spicy', label: 'Spicy', icon: 'flame', description: 'Pepper, Cinnamon, Clove' },
  { key: 'sweet', label: 'Sweet', icon: 'candy', description: 'Chocolate, Caramel, Vanilla' },
  { key: 'nutty', label: 'Nutty', icon: 'ellipse', description: 'Almond, Walnut, Pecan' },
  { key: 'earthy', label: 'Earthy', icon: 'leaf-outline', description: 'Leather, Coffee, Tobacco' },
  { key: 'fruity', label: 'Fruity', icon: 'nutrition', description: 'Cherry, Citrus, Berry' },
  { key: 'creamy', label: 'Creamy', icon: 'water', description: 'Butter, Cream, Smooth' },
  { key: 'bold', label: 'Bold', icon: 'flash', description: 'Full-bodied, Strong, Intense' },
];

export default function OnboardingTastePreferencesScreen() {
  const navigation = useNavigation<OnboardingTastePreferencesNavigationProp>();
  const route = useRoute<OnboardingTastePreferencesRouteProp>();
  const { user } = useAuth();
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);

  const handleFlavorToggle = (flavorKey: string) => {
    setSelectedFlavors(prev => {
      if (prev.includes(flavorKey)) {
        return prev.filter(f => f !== flavorKey);
      } else {
        return [...prev, flavorKey];
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedFlavors(flavorOptions.map(f => f.key));
  };

  const handleClearAll = () => {
    setSelectedFlavors([]);
  };

  const handleFinish = async () => {
    console.log('🔄 Finish Setup button pressed - completing onboarding...');
    
    try {
      if (!user) {
        console.error('❌ No user found');
        Alert.alert('Error', 'No user logged in. Please log in again.');
        return;
      }

      console.log('🔍 Finishing onboarding for user:', user.id);
      
      // Create user profile
      const userProfile: UserProfile = {
        userId: user.id, // Use actual user ID from auth
        ageVerified: true,
        smokingDuration: route.params?.smokingDuration || 'newbie',
        experienceLevel: route.params?.experienceLevel || 'getting-started',
        preferredFlavors: selectedFlavors,
        onboardingCompleted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log('💾 Saving user profile to database...');
      // Save to storage
      await StorageService.saveUserProfile(userProfile);
      console.log('✅ User profile saved successfully');
      
      // Call the completion handler if provided
      if (route.params?.onComplete) {
        console.log('📞 Calling onComplete handler...');
        route.params.onComplete();
      } else {
        console.error('❌ No onComplete handler found - using fallback navigation');
        // Fallback navigation using reset to ensure clean state
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs', params: { screen: 'Home' } }],
        });
      }
    } catch (error) {
      console.error('❌ Error saving user profile:', error);
      
      // Production fix: Don't block user on database errors
      console.log('🆘 Profile save failed, attempting fallback completion...');
      
      // Try to mark onboarding as completed at minimum
      try {
        await StorageService.updateUserProfile({ onboardingCompleted: true });
        console.log('✅ Minimal onboarding completion saved');
      } catch (updateError) {
        console.error('❌ Even minimal update failed:', updateError);
      }
      
      // Still try to complete onboarding
      if (route.params?.onComplete) {
        console.log('📞 Calling onComplete handler (fallback)...');
        route.params.onComplete();
      } else {
        console.log('🔀 Using direct navigation fallback...');
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs', params: { screen: 'Home' } }],
        });
      }
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSkip = async () => {
    console.log('🔄 Skip button pressed on taste preferences...');
    
    try {
      // Mark onboarding as completed when skipping
      console.log('💾 Marking onboarding as completed...');
      await StorageService.updateUserProfile({ onboardingCompleted: true });
      console.log('✅ Onboarding marked as completed');
      
      // Use the onComplete callback if available, otherwise fall back to navigation
      if (route.params?.onComplete) {
        console.log('📞 Calling onComplete handler...');
        route.params.onComplete();
      } else {
        console.log('🔀 Using fallback navigation...');
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs', params: { screen: 'Home' } }],
        });
      }
    } catch (error) {
      console.error('❌ Error in handleSkip:', error);
      
      // Fallback: still try to complete onboarding
      if (route.params?.onComplete) {
        console.log('📞 Calling onComplete handler (fallback)...');
        route.params.onComplete();
      } else {
        console.log('🔀 Using direct navigation fallback...');
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs', params: { screen: 'Home' } }],
        });
      }
    }
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
            <Text style={styles.progressText}>3 of 3</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '100%' }]} />
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="heart" size={80} color="#DC851F" />
          </View>
          
          <Text style={styles.title}>Taste Preferences</Text>
          
          <Text style={styles.subtitle}>
            Select your preferred flavor profiles:
          </Text>

          <View style={styles.controlsContainer}>
            <TouchableOpacity style={styles.controlButton} onPress={handleSelectAll}>
              <Text style={styles.controlButtonText}>Select All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={handleClearAll}>
              <Text style={styles.controlButtonText}>Clear All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.flavorsContainer}>
            {flavorOptions.map((flavor) => (
              <TouchableOpacity
                key={flavor.key}
                style={[
                  styles.flavorButton,
                  selectedFlavors.includes(flavor.key) && styles.flavorButtonSelected
                ]}
                onPress={() => handleFlavorToggle(flavor.key)}
              >
                <Ionicons 
                  name={flavor.icon as any} 
                  size={24} 
                  color={selectedFlavors.includes(flavor.key) ? '#DC851F' : '#999999'} 
                />
                <Text style={[
                  styles.flavorLabel,
                  selectedFlavors.includes(flavor.key) && styles.flavorLabelSelected
                ]}>
                  {flavor.label}
                </Text>
                <Text style={[
                  styles.flavorDescription,
                  selectedFlavors.includes(flavor.key) && styles.flavorDescriptionSelected
                ]}>
                  {flavor.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedFlavors.length === 0 && (
            <View style={styles.noneSelectedContainer}>
              <TouchableOpacity 
                style={styles.noneSelectedButton}
                onPress={() => setSelectedFlavors(['none'])}
              >
                <Text style={styles.noneSelectedText}>None of the above</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.finishButton} 
            onPress={handleFinish}
          >
            <Text style={styles.finishButtonText}>Finish Setup</Text>
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
    position: 'relative',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 68, // paddingTop (60) + padding (20) - button padding adjustment
    padding: 8,
    zIndex: 1,
  },
  progressIndicator: {
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
    marginBottom: 24,
    lineHeight: 24,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 12,
  },
  controlButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#333',
    borderRadius: 20,
  },
  controlButtonText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '500',
  },
  flavorsContainer: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  flavorButton: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#555555',
    minHeight: 120,
    justifyContent: 'center',
  },
  flavorButtonSelected: {
    borderColor: '#DC851F',
    backgroundColor: '#2a1a0a',
  },
  flavorLabel: {
    fontSize: 16,
    color: '#CCCCCC',
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  flavorLabelSelected: {
    color: '#CCCCCC',
  },
  flavorDescription: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
  },
  flavorDescriptionSelected: {
    color: '#A16207',
  },
  noneSelectedContainer: {
    width: '100%',
    marginTop: 16,
  },
  noneSelectedButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  noneSelectedText: {
    color: '#CCCCCC',
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  finishButton: {
    backgroundColor: '#DC851F',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  finishButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
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

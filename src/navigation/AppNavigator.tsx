import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ImageBackground } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { TabParamList, RootStackParamList, HumidorStackParamList, JournalStackParamList, RecommendationsStackParamList } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { StorageService } from '../storage/storageService';

// Import screens (we'll create these next)
import HomeScreen from '../screens/HomeScreen';
import HumidorListScreen from '../screens/HumidorListScreen';
import InventoryScreen from '../screens/InventoryScreen';
import JournalScreen from '../screens/JournalScreen';
import RecommendationsScreen from '../screens/RecommendationsScreen';
import EnhancedCigarRecognitionScreen from '../screens/EnhancedCigarRecognitionScreen';
import CigarDetailsScreen from '../screens/CigarDetailsScreen';
import AddToInventoryScreen from '../screens/AddToInventoryScreen';
import EditOptionsScreen from '../screens/EditOptionsScreen';
import AddJournalEntryScreen from '../screens/AddJournalEntryScreen';
import JournalEntryDetailsScreen from '../screens/JournalEntryDetailsScreen';
import JournalCigarRecognitionScreen from '../screens/JournalCigarRecognitionScreen';
import JournalManualEntryScreen from '../screens/JournalManualEntryScreen';
import JournalInitialNotesScreen from '../screens/JournalInitialNotesScreen';
import JournalRatingScreen from '../screens/JournalRatingScreen';
import JournalNotesScreen from '../screens/JournalNotesScreen';
import NewJournalEntryScreen from '../screens/NewJournalEntryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import PaywallScreen from '../screens/PaywallScreen';
import OnboardingAgeVerificationScreen from '../screens/OnboardingAgeVerificationScreen';
import OnboardingExperienceScreen from '../screens/OnboardingExperienceScreen';
import OnboardingLevelScreen from '../screens/OnboardingLevelScreen';
import OnboardingTastePreferencesScreen from '../screens/OnboardingTastePreferencesScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import CreateHumidorScreen from '../screens/CreateHumidorScreen';
import EditHumidorScreen from '../screens/EditHumidorScreen';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

// Create separate Stack Navigators for each tab
const HumidorStack = createStackNavigator<HumidorStackParamList>();
const JournalStack = createStackNavigator<JournalStackParamList>();
const RecommendationsStack = createStackNavigator<RecommendationsStackParamList>();

// Custom Header Component for Home
const CustomHeader = ({ title }: { title?: string }) => {
  const { user, profile, signOut } = useAuth();
  
  const userName = profile?.full_name || "User";
  const userInitials = userName.split(' ').map(name => name[0]).join('').toUpperCase();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <View style={headerStyles.container}>
      <View style={headerStyles.userSection}>
        <View style={headerStyles.initialsCircle}>
          <Text style={headerStyles.initialsText}>{userInitials}</Text>
        </View>
        <Text style={headerStyles.userName}>{userName}</Text>
      </View>
      <TouchableOpacity onPress={handleLogout} style={headerStyles.logoutButton}>
        <Ionicons name="log-out-outline" size={24} color="#DC851F" />
      </TouchableOpacity>
    </View>
  );
};

// Custom Header Component for Tab Screens with Back Arrow
const TabHeader = ({ title, onBackPress }: { title: string; onBackPress: () => void }) => {
  return (
    <View style={headerStyles.tabHeaderContainer}>
      <TouchableOpacity onPress={onBackPress} style={headerStyles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={headerStyles.tabHeaderTitle}>{title}</Text>
      <View style={headerStyles.headerSpacer} />
    </View>
  );
};

const headerStyles = StyleSheet.create({
  container: {
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50, // Account for status bar
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  initialsCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DC851F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  initialsText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '400',
  },
  userName: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '400',
  },
  logoutButton: {
    padding: 8,
  },
  tabHeaderContainer: {
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  tabHeaderTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  backButton: {
    padding: 8,
  },
});

// Humidor Stack Navigator
function HumidorStackNavigator() {
  return (
    <HumidorStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0a0a0a',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 16,
          color: '#FFFFFF',
        },
        headerBackTitleVisible: false,
        headerBackTitle: '',
      }}
    >
      <HumidorStack.Screen 
        name="HumidorListMain" 
        component={HumidorListScreen} 
        options={({ navigation }) => ({
          header: () => (
            <TabHeader 
              title="My Humidors" 
              onBackPress={() => navigation.goBack()} 
            />
          ),
        })}
      />
      <HumidorStack.Screen 
        name="Inventory" 
        component={InventoryScreen}
        options={({ route, navigation }) => ({
          title: route.params?.humidorName || 'Humidor',
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '400',
            fontSize: 14,
            color: '#FFFFFF',
          },
        })}
      />
      <HumidorStack.Screen 
        name="AddToInventory" 
        component={AddToInventoryScreen}
        options={({ route }) => ({
          title: route.params?.existingItem ? 'Update Entry' : 'Add to Humidor',
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '400',
            fontSize: 14,
            color: '#FFFFFF',
          },
        })}
      />
      <HumidorStack.Screen 
        name="CigarDetails" 
        component={CigarDetailsScreen}
        options={{
          title: 'Cigar Details',
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '400',
            fontSize: 14,
            color: '#FFFFFF',
          },
        }}
      />
      <HumidorStack.Screen 
        name="EditOptions" 
        component={EditOptionsScreen}
        options={{
          title: 'Manage Cigar',
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '400',
            fontSize: 14,
            color: '#FFFFFF',
          },
        }}
      />
      <HumidorStack.Screen 
        name="CreateHumidor" 
        component={CreateHumidorScreen}
        options={{
          title: 'Create Humidor',
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '400',
            fontSize: 14,
            color: '#FFFFFF',
          },
        }}
      />
      <HumidorStack.Screen 
        name="EditHumidor" 
        component={EditHumidorScreen}
        options={{
          title: 'Edit Humidor',
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '400',
            fontSize: 14,
            color: '#FFFFFF',
          },
        }}
      />
    </HumidorStack.Navigator>
  );
}

// Journal Stack Navigator
function JournalStackNavigator() {
  return (
    <JournalStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0a0a0a',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 16,
          color: '#FFFFFF',
        },
        headerBackTitleVisible: false,
        headerBackTitle: '',
      }}
    >
      <JournalStack.Screen 
        name="Journal" 
        component={JournalScreen} 
        options={({ navigation }) => ({
          header: () => (
            <TabHeader 
              title="Smoking Journal" 
              onBackPress={() => navigation.goBack()} 
            />
          ),
        })}
      />
      <JournalStack.Screen 
        name="JournalCigarRecognition" 
        component={JournalCigarRecognitionScreen}
        options={({ navigation }) => ({
          header: () => (
            <TabHeader 
              title="Identify Cigar" 
              onBackPress={() => navigation.goBack()} 
            />
          ),
        })}
      />
      <JournalStack.Screen 
        name="JournalManualEntry" 
        component={JournalManualEntryScreen}
        options={({ navigation }) => ({
          header: () => (
            <TabHeader 
              title="Search by Name" 
              onBackPress={() => navigation.goBack()} 
            />
          ),
        })}
      />
      <JournalStack.Screen 
        name="JournalInitialNotes" 
        component={JournalInitialNotesScreen}
        options={({ navigation }) => ({
          header: () => (
            <TabHeader 
              title="Start Entry" 
              onBackPress={() => navigation.goBack()} 
            />
          ),
        })}
      />
      <JournalStack.Screen 
        name="JournalRating" 
        component={JournalRatingScreen}
        options={({ navigation }) => ({
          header: () => (
            <TabHeader 
              title="Rate Your Experience" 
              onBackPress={() => navigation.goBack()} 
            />
          ),
        })}
      />
      <JournalStack.Screen 
        name="JournalNotes" 
        component={JournalNotesScreen}
        options={({ navigation }) => ({
          header: () => (
            <TabHeader 
              title="Final Notes" 
              onBackPress={() => navigation.goBack()} 
            />
          ),
        })}
      />
      <JournalStack.Screen 
        name="JournalEntryDetails" 
        component={JournalEntryDetailsScreen}
        options={{
          title: 'Journal Entry',
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '400',
            fontSize: 14,
            color: '#FFFFFF',
          },
        }}
      />
    </JournalStack.Navigator>
  );
}

// Recommendations Stack Navigator
function RecommendationsStackNavigator() {
  return (
    <RecommendationsStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0a0a0a',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 16,
          color: '#FFFFFF',
        },
        headerBackTitleVisible: false,
        headerBackTitle: '',
      }}
    >
      <RecommendationsStack.Screen 
        name="Recommendations" 
        component={RecommendationsScreen} 
        options={({ navigation }) => ({
          header: () => (
            <TabHeader 
              title="Recommendations" 
              onBackPress={() => navigation.goBack()} 
            />
          ),
        })}
      />
      <RecommendationsStack.Screen 
        name="CigarDetails" 
        component={CigarDetailsScreen}
        options={{
          title: 'Cigar Details',
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '400',
            fontSize: 14,
            color: '#FFFFFF',
          },
        }}
      />
    </RecommendationsStack.Navigator>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'HumidorList') {
            iconName = focused ? 'archive' : 'archive-outline';
          } else if (route.name === 'Journal') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'Recommendations') {
            iconName = focused ? 'star' : 'star-outline';
          } else {
            iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#DC851F',
        tabBarInactiveTintColor: '#999999',
        tabBarStyle: {
          backgroundColor: '#0a0a0a',
          borderTopColor: '#333333',
        },
        headerStyle: {
          backgroundColor: '#0a0a0a',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 16,
          color: '#FFFFFF',
        },
        headerBackTitleVisible: false,
        headerBackTitle: '',
        headerBackButtonDisplayMode: 'default',
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ 
          header: () => <CustomHeader />,
        }}
      />
      <Tab.Screen 
        name="HumidorList" 
        component={HumidorStackNavigator} 
        options={{
          title: 'Humidor',
          headerShown: false,
        }}
      />
      <Tab.Screen 
        name="Journal" 
        component={JournalStackNavigator} 
        options={{
          title: 'Journal',
          headerShown: false,
        }}
      />
      <Tab.Screen 
        name="Recommendations" 
        component={RecommendationsStackNavigator} 
        options={{
          title: 'Recommendations',
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
}

// Loading Screen Component
const LoadingScreen = () => (
  <ImageBackground 
    source={require('../../assets/tobacco-leaves-bg.jpg')}
    style={styles.loadingContainer}
    imageStyle={styles.loadingBackgroundImage}
  >
    <View style={styles.loadingContent}>
      <ActivityIndicator size="large" color="#DC851F" />
      <Text style={styles.loadingText}>Loading your cigar collection...</Text>
    </View>
  </ImageBackground>
);

// Auth Stack Navigator
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}

// Onboarding Stack Navigator
function OnboardingStack({ onComplete }: { onComplete: () => void }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="OnboardingAgeVerification" 
        component={OnboardingAgeVerificationScreen}
        initialParams={{ onComplete }}
      />
      <Stack.Screen name="OnboardingExperience" component={OnboardingExperienceScreen} />
      <Stack.Screen name="OnboardingLevel" component={OnboardingLevelScreen} />
      <Stack.Screen 
        name="OnboardingTastePreferences" 
        component={OnboardingTastePreferencesScreen}
        options={{
          title: 'Taste Preferences'
        }}
        initialParams={{ onComplete }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading, profile, refreshProfile } = useAuth();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [onboardingCheckComplete, setOnboardingCheckComplete] = useState(false);

  // Check onboarding status when user or profile changes
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (user && profile) {
        try {
          console.log('🔍 Checking onboarding status for user:', user.id);
          console.log('🔍 Profile onboarding_completed:', profile.onboarding_completed);
          
          // Use the profile data directly from AuthContext instead of making another database call
          const completed = profile.onboarding_completed || false;
          console.log('✅ Onboarding status from profile:', completed);
          setOnboardingCompleted(completed);
          setOnboardingCheckComplete(true); // Only mark complete when we have both user and profile
        } catch (error) {
          console.error('❌ Error checking onboarding status:', error);
          setOnboardingCompleted(false); // Default to false on error
          setOnboardingCheckComplete(true);
        }
      } else if (user && !profile) {
        // User exists but profile hasn't loaded yet, wait for it
        console.log('⏳ Waiting for profile to load...');
        setOnboardingCompleted(null);
        // Don't mark check as complete yet - we're still waiting for profile
      } else {
        setOnboardingCompleted(null);
        setOnboardingCheckComplete(false); // Reset when no user
      }
    };

    // Set a timeout to prevent infinite loading on onboarding check
    const onboardingTimeout = setTimeout(() => {
      console.log('⏰ Onboarding check timeout - forcing completion');
      setOnboardingCompleted(false); // Default to false
      setOnboardingCheckComplete(true);
    }, 5000); // 5 second timeout for onboarding check

    checkOnboardingStatus().finally(() => {
      clearTimeout(onboardingTimeout);
    });

    return () => clearTimeout(onboardingTimeout);
  }, [user, profile]); // Watch both user and profile

  // Function to mark onboarding as completed
  const handleOnboardingComplete = async () => {
    try {
      console.log('🔍 Completing onboarding...');
      await StorageService.updateUserProfile({ onboardingCompleted: true });
      
      // Refresh the profile in AuthContext to get updated onboarding status
      await refreshProfile();
      
      setOnboardingCompleted(true);
      console.log('✅ Onboarding marked as completed');
    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
    }
  };

  // Show loading screen while auth is loading or while we're determining onboarding status
  if (loading || (user && !onboardingCheckComplete)) {
    console.log('🔄 Showing loading screen - loading:', loading, 'user:', !!user, 'onboardingCheckComplete:', onboardingCheckComplete);
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {user ? (
        // Check if onboarding is needed
        !onboardingCompleted ? (
          <OnboardingStack onComplete={handleOnboardingComplete} />
        ) : (
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#0a0a0a',
            },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: {
              fontWeight: '400',
              fontSize: 14,
              color: '#FFFFFF',
            },
            headerBackTitleVisible: false,
            headerBackTitle: '',
          }}
        >
        <Stack.Screen 
          name="MainTabs" 
          component={TabNavigator} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="CigarRecognition" 
          component={EnhancedCigarRecognitionScreen}
          options={({ navigation }) => ({
            header: () => (
              <TabHeader 
                title="Identify Cigar" 
                onBackPress={() => navigation.goBack()} 
              />
            ),
          })}
        />
        <Stack.Screen 
          name="NewJournalEntry" 
          component={NewJournalEntryScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{ 
            title: 'Settings',
            headerTintColor: '#FFFFFF',
            headerTitleStyle: {
              fontWeight: '400',
              fontSize: 14,
              color: '#FFFFFF',
            },
          }}
        />
        <Stack.Screen 
          name="AdminDashboard" 
          component={AdminDashboardScreen}
          options={{ 
            title: 'Admin Dashboard',
            headerTintColor: '#FFFFFF',
            headerTitleStyle: {
              fontWeight: '600',
              fontSize: 16,
              color: '#FFFFFF',
            },
            headerStyle: {
              backgroundColor: '#0a0a0a',
            },
          }}
        />
        <Stack.Screen 
          name="Paywall" 
          component={PaywallScreen}
          options={{ 
            title: 'Upgrade to Premium',
            presentation: 'modal',
          }}
        />
        </Stack.Navigator>
        )
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingBackgroundImage: {
    opacity: 0.4,
    resizeMode: 'cover',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 10, 0.8)',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '400',
  },
});

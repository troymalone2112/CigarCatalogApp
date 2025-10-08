import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { TabParamList, RootStackParamList } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { StorageService } from '../storage/storageService';

// Import screens (we'll create these next)
import HomeScreen from '../screens/HomeScreen';
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
import SettingsScreen from '../screens/SettingsScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import PaywallScreen from '../screens/PaywallScreen';
import OnboardingAgeVerificationScreen from '../screens/OnboardingAgeVerificationScreen';
import OnboardingExperienceScreen from '../screens/OnboardingExperienceScreen';
import OnboardingLevelScreen from '../screens/OnboardingLevelScreen';
import OnboardingTastePreferencesScreen from '../screens/OnboardingTastePreferencesScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

// Custom Header Component for Home
const CustomHeader = ({ title }: { title?: string }) => {
  const { user, profile, signOut } = useAuth();
  
  const userName = profile?.full_name || user?.email || "User";
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
});

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Inventory') {
            iconName = focused ? 'archive' : 'archive-outline';
          } else if (route.name === 'Journal') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'Recommendations') {
            iconName = focused ? 'star' : 'star-outline';
          } else {
            iconName = 'circle';
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
        name="Inventory" 
        component={InventoryScreen} 
        options={({ navigation }) => ({
          title: 'Humidor',
          header: () => (
            <TabHeader 
              title="My Humidor" 
              onBackPress={() => navigation.navigate('Home')} 
            />
          ),
        })}
      />
      <Tab.Screen 
        name="Journal" 
        component={JournalScreen} 
        options={({ navigation }) => ({
          header: () => (
            <TabHeader 
              title="Smoking Journal" 
              onBackPress={() => navigation.navigate('Home')} 
            />
          ),
        })}
      />
      <Tab.Screen 
        name="Recommendations" 
        component={RecommendationsScreen} 
        options={({ navigation }) => ({
          header: () => (
            <TabHeader 
              title="Recommendations" 
              onBackPress={() => navigation.navigate('Home')} 
            />
          ),
        })}
      />
    </Tab.Navigator>
  );
}

// Loading Screen Component
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#7C2D12" />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
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
      <Stack.Screen name="OnboardingAgeVerification" component={OnboardingAgeVerificationScreen} />
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
  const { user, loading } = useAuth();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  // Check onboarding status when user changes
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (user) {
        try {
          const completed = await StorageService.isOnboardingCompleted();
          setOnboardingCompleted(completed);
        } catch (error) {
          console.error('Error checking onboarding status:', error);
          setOnboardingCompleted(false);
        }
      } else {
        setOnboardingCompleted(null);
      }
    };

    checkOnboardingStatus();
  }, [user]);

  // Function to mark onboarding as completed
  const handleOnboardingComplete = async () => {
    try {
      await StorageService.updateUserProfile({ onboardingCompleted: true });
      setOnboardingCompleted(true);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  if (loading || (user && onboardingCompleted === null)) {
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
            headerBackButtonDisplayMode: 'default',
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
        <Stack.Screen 
          name="AddToInventory" 
          component={AddToInventoryScreen}
          options={{ 
            title: 'Add to Humidor',
            headerTintColor: '#FFFFFF',
            headerTitleStyle: {
              fontWeight: '400',
              fontSize: 14,
              color: '#FFFFFF',
            },
          }}
        />
        <Stack.Screen 
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
        <Stack.Screen 
          name="AddJournalEntry" 
          component={AddJournalEntryScreen}
          options={{ 
            title: 'New Journal Entry',
            headerTintColor: '#FFFFFF',
            headerTitleStyle: {
              fontWeight: '400',
              fontSize: 14,
              color: '#FFFFFF',
            },
          }}
        />
        <Stack.Screen 
          name="JournalCigarRecognition" 
          component={JournalCigarRecognitionScreen}
          options={{ 
            title: 'Identify Cigar',
            headerTintColor: '#FFFFFF',
            headerTitleStyle: {
              fontWeight: '400',
              fontSize: 14,
              color: '#FFFFFF',
            },
          }}
        />
        <Stack.Screen 
          name="JournalManualEntry" 
          component={JournalManualEntryScreen}
          options={{ 
            title: 'Search',
            headerTintColor: '#FFFFFF',
            headerTitleStyle: {
              fontWeight: '400',
              fontSize: 14,
              color: '#FFFFFF',
            },
          }}
        />
        <Stack.Screen 
          name="JournalInitialNotes" 
          component={JournalInitialNotesScreen}
          options={{ 
            title: 'Start Entry',
            headerTintColor: '#FFFFFF',
            headerTitleStyle: {
              fontWeight: '400',
              fontSize: 14,
              color: '#FFFFFF',
            },
          }}
        />
        <Stack.Screen 
          name="JournalRating" 
          component={JournalRatingScreen}
          options={{ 
            title: 'Rate & Review',
            headerTintColor: '#FFFFFF',
            headerTitleStyle: {
              fontWeight: '400',
              fontSize: 14,
              color: '#FFFFFF',
            },
          }}
        />
        <Stack.Screen 
          name="JournalNotes" 
          component={JournalNotesScreen}
          options={{ 
            title: 'Final Notes',
            headerTintColor: '#FFFFFF',
            headerTitleStyle: {
              fontWeight: '400',
              fontSize: 14,
              color: '#FFFFFF',
            },
          }}
        />
        <Stack.Screen 
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  loadingText: {
    color: '#CCCCCC',
    fontSize: 16,
    marginTop: 16,
  },
});

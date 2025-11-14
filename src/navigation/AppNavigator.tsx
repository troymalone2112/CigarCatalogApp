import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { shareCigar } from '../utils/shareUtils';
import { serializeJournalEntry } from '../utils/journalSerialization';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import {
  TabParamList,
  RootStackParamList,
  HumidorStackParamList,
  JournalStackParamList,
  RecommendationsStackParamList,
} from '../types';
import { useAuth } from '../contexts/AuthContext';
import { StorageService } from '../storage/storageService';
import { Api } from '../services/api';
import { preloadBackgroundImage } from '../services/backgroundImageService';
import CachedBackgroundImage from '../components/CachedBackgroundImage';

// Import screens (we'll create these next)
import HomeScreen from '../screens/HomeScreen';
import HumidorListScreen from '../screens/HumidorListScreen';
import InventoryScreen from '../screens/InventoryScreen';
import JournalScreen from '../screens/JournalScreen';
import StatsScreen from '../screens/StatsScreen';
import { NotificationService, AppNotification } from '../services/notificationService';
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
import ProfileScreen from '../screens/ProfileScreen';
import ManageSubscriptionScreen from '../screens/ManageSubscriptionScreen';
import OpenSourceLicensesScreen from '../screens/OpenSourceLicensesScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import PaywallScreen from '../screens/PaywallScreen';
import OnboardingAgeVerificationScreen from '../screens/OnboardingAgeVerificationScreen';
import OnboardingExperienceScreen from '../screens/OnboardingExperienceScreen';
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
  const navigation = useNavigation();
  const [showInbox, setShowInbox] = React.useState(false);
  const [unread, setUnread] = React.useState(0);
  const [inbox, setInbox] = React.useState<AppNotification[]>([]);

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!user) return;
      const count = await NotificationService.getUnreadCount(user.id);
      if (mounted) setUnread(count);
    };
    load();
    let cleanup: (() => void) | undefined;
    try {
      const maybeSubscribe: any = (NotificationService as any).subscribe;
      if (typeof maybeSubscribe === 'function') {
        cleanup = maybeSubscribe(async (changedUserId: string) => {
          if (!user || changedUserId !== user.id) return;
          const count = await NotificationService.getUnreadCount(user.id);
          setUnread(count);
        });
      } else {
        // Fallback: poll unread count briefly (lightweight)
        const interval = setInterval(async () => {
          if (!user) return;
          const count = await NotificationService.getUnreadCount(user.id);
          setUnread(count);
        }, 4000);
        cleanup = () => clearInterval(interval);
      }
    } catch {
      // ignore
    }
    return () => {
      mounted = false;
      if (cleanup) cleanup();
    };
  }, [user]);

  const toggleInbox = async () => {
    if (!user) return;
    const items = await NotificationService.list(user.id);
    setInbox(items);
    setShowInbox((s) => !s);
    if (unread > 0) {
      await NotificationService.markAllRead(user.id);
      setUnread(0);
    }
  };

  const userName = profile?.full_name || 'User';
  const userInitials = userName
    .split(' ')
    .map((name) => name[0])
    .join('')
    .toUpperCase();

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
      <View style={{ flexDirection: 'row' }}>
        <View>
          <TouchableOpacity onPress={toggleInbox} style={headerStyles.profileButton}>
            <Ionicons name="notifications-outline" size={22} color="#DC851F" />
            {unread > 0 && <View style={headerStyles.dot} />}
          </TouchableOpacity>
          {showInbox && (
            <View style={headerStyles.inboxContainer}>
              <View style={headerStyles.inboxHeader}>
                <Text style={headerStyles.inboxTitle}>Notifications</Text>
              </View>
              <ScrollView style={{ maxHeight: 220 }}>
                {inbox.length === 0 && (
                  <Text style={headerStyles.inboxEmpty}>No notifications yet</Text>
                )}
                {inbox.map((n) => (
                  <TouchableOpacity
                    key={n.id}
                    style={headerStyles.inboxItem}
                    onPress={async () => {
                      setShowInbox(false);
                      // Navigate based on notification type
                      if (n.type === 'inventory_add') {
                        const cigar = n.data?.cigar;
                        if (cigar) {
                          navigation.navigate('MainTabs' as never, {
                            screen: 'HumidorList',
                            params: { screen: 'CigarDetails', params: { cigar } },
                          } as never);
                        } else if (n.data?.humidorId) {
                          navigation.navigate('MainTabs' as never, {
                            screen: 'HumidorList',
                            params: { screen: 'Inventory', params: { humidorId: n.data.humidorId } },
                          } as never);
                        }
                      } else if (n.type === 'journal_saved') {
                        const entry = n.data?.entry;
                        if (entry) {
                          navigation.navigate(
                            'JournalEntryDetails' as never,
                            { entry: serializeJournalEntry(entry) } as never,
                          );
                        } else if (n.data?.journalEntryId) {
                          try {
                            const { StorageService } = await import('../storage/storageService');
                            const all = await StorageService.getJournalEntries();
                            const found = all.find((e: any) => e.id === n.data.journalEntryId);
                            if (found) {
                              navigation.navigate(
                                'JournalEntryDetails' as never,
                                { entry: serializeJournalEntry(found) } as never,
                              );
                            } else {
                              navigation.navigate('MainTabs' as never, { screen: 'Journal' } as never);
                            }
                          } catch {
                            navigation.navigate('MainTabs' as never, { screen: 'Journal' } as never);
                          }
                        }
                      }
                    }}
                  >
                <Text style={headerStyles.inboxItemTitle}>
                  {n.type === 'journal_saved'
                    ? n.title
                        ?.replace(/Journal Entry/gi, 'Note')
                        ?.replace(/Journal/gi, 'Notes')
                    : n.title}
                </Text>
                <Text style={headerStyles.inboxItemMsg}>
                  {n.type === 'journal_saved'
                    ? n.message?.replace(/Journal/gi, 'Notes')
                    : n.message}
                </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Stats' as never)}
          style={headerStyles.profileButton}
        >
          <Ionicons name="bar-chart-outline" size={22} color="#DC851F" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile' as never)}
          style={headerStyles.profileButton}
        >
          <Ionicons name="person-outline" size={24} color="#DC851F" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Custom Header Component for Tab Screens with Back Arrow
const TabHeader = ({
  title,
  onBackPress,
  onRightPress,
  rightIconName,
}: {
  title: string;
  onBackPress: () => void;
  onRightPress?: () => void;
  rightIconName?: keyof typeof Ionicons.glyphMap;
}) => {
  return (
    <View style={headerStyles.tabHeaderContainer}>
      <TouchableOpacity onPress={onBackPress} style={headerStyles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={headerStyles.tabHeaderTitle}>
        {title === 'Smoking Journal' ? 'Notes' : title}
      </Text>
      {onRightPress ? (
        <TouchableOpacity onPress={onRightPress} style={headerStyles.backButton}>
          <Ionicons name={rightIconName || 'share-social-outline'} size={22} color="#FFFFFF" />
        </TouchableOpacity>
      ) : (
        <View style={headerStyles.headerSpacer} />
      )}
    </View>
  );
};

const headerStyles = StyleSheet.create({
  container: {
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 20,
    paddingVertical: 8,
    paddingTop: 0, // No top padding - extend to top edge
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    // Extend into safe area on web/iOS
    marginTop: 0,
    // Ensure black background extends into safe area
    ...(Platform.OS === 'web' && {
      position: 'relative',
      zIndex: 1000,
    }),
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
  profileButton: {
    padding: 8,
  },
  dot: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC851F',
  },
  inboxContainer: {
    position: 'absolute',
    right: 0,
    top: 44,
    width: 260,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderColor: '#333333',
    borderWidth: 1,
    padding: 8,
    zIndex: 1000,
  },
  inboxHeader: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  inboxTitle: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '600',
  },
  inboxEmpty: {
    color: '#999999',
    fontSize: 12,
    padding: 8,
  },
  inboxItem: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  inboxItemTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  inboxItemMsg: {
    color: '#BBBBBB',
    fontSize: 12,
  },
  tabHeaderContainer: {
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 20,
    paddingVertical: 8,
    paddingTop: 0, // No top padding - extend to top edge
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    marginTop: 0,
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
        cardStyle: {
          backgroundColor: '#0a0a0a',
        },
      }}
    >
      <HumidorStack.Screen
        name="HumidorListMain"
        component={HumidorListScreen}
        options={({ navigation }) => ({
          header: () => <TabHeader title="My Humidors" onBackPress={() => navigation.goBack()} />,
        })}
      />
      <HumidorStack.Screen
        name="Inventory"
        component={InventoryScreen}
        options={({ route, navigation }) => ({
          header: () => (
            <TabHeader
              title={route.params?.humidorName || 'Humidor'}
              onBackPress={() => navigation.goBack()}
            />
          ),
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
        options={({ navigation, route }) => ({
          header: () => (
            <TabHeader
              title="Cigar Details"
              onBackPress={() => navigation.goBack()}
              onRightPress={async () => {
                try {
                  // Support both direct cigar param and inventory item wrapping cigar data
                  const cigarParam: any = route.params?.cigar ?? route.params?.item;
                  const cigarToShare = cigarParam?.cigar ?? cigarParam;
                  if (!cigarToShare) {
                    Alert.alert('Unable to share', 'Cigar details are missing.');
                    return;
                  }
                  await shareCigar({ cigar: cigarToShare });
                } catch (error) {
                  console.error('Error sharing cigar:', error);
                  Alert.alert('Unable to share', 'Please try again.');
                }
              }}
              rightIconName="share-social-outline"
            />
          ),
        })}
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
        name="JournalHome"
        component={JournalScreen}
        options={({ navigation }) => ({
          header: () => (
            <TabHeader title="Notes" onBackPress={() => navigation.goBack()} />
          ),
        })}
      />
      <JournalStack.Screen
        name="JournalCigarRecognition"
        component={JournalCigarRecognitionScreen}
        options={({ navigation }) => ({
          header: () => (
            <TabHeader title="Identify Cigar" onBackPress={() => navigation.goBack()} />
          ),
        })}
      />
      <JournalStack.Screen
        name="JournalManualEntry"
        component={JournalManualEntryScreen}
        options={({ navigation }) => ({
          header: () => (
            <TabHeader title="Search by Name" onBackPress={() => navigation.goBack()} />
          ),
        })}
      />
      <JournalStack.Screen
        name="JournalInitialNotes"
        component={JournalInitialNotesScreen}
        options={({ navigation }) => ({
          header: () => <TabHeader title="Start Entry" onBackPress={() => navigation.goBack()} />,
        })}
      />
      <JournalStack.Screen
        name="JournalRating"
        component={JournalRatingScreen}
        options={({ navigation }) => ({
          header: () => (
            <TabHeader title="Rate Your Experience" onBackPress={() => navigation.goBack()} />
          ),
        })}
      />
      <JournalStack.Screen
        name="JournalNotes"
        component={JournalNotesScreen}
        options={({ navigation }) => ({
          header: () => <TabHeader title="Final Notes" onBackPress={() => navigation.goBack()} />,
        })}
      />
      <JournalStack.Screen
        name="JournalEntryDetails"
        component={JournalEntryDetailsScreen}
        options={({ navigation, route }) => ({
          header: () => (
            <TabHeader
              title="Journal Entry"
              onBackPress={() => navigation.goBack()}
              onRightPress={async () => {
                try {
                  const entry: any = route.params?.entry;
                  if (!entry) {
                    Alert.alert('Unable to share', 'Journal entry details are missing.');
                    return;
                  }

                  const brand = entry.cigar?.brand || 'Unknown Brand';
                  const name = entry.cigar?.name || entry.cigar?.line || '';
                  const rating =
                    entry.rating?.overall && entry.rating.overall > 0
                      ? `Rating: ${entry.rating.overall}/10`
                      : '';
                  const flavors =
                    Array.isArray(entry.selectedFlavors) && entry.selectedFlavors.length > 0
                      ? `Flavors: ${entry.selectedFlavors.join(', ')}`
                      : '';
                  const notes = entry.notes ? `Notes: ${entry.notes}` : '';
                  const dateValue = entry.date ? new Date(entry.date) : null;
                  const dateText =
                    dateValue && !Number.isNaN(dateValue.getTime())
                      ? `Date: ${dateValue.toLocaleDateString()}`
                      : '';
                  const locationParts = [
                    entry.location?.city,
                    entry.location?.state,
                    entry.location?.country,
                  ].filter(Boolean);
                  const location =
                    locationParts.length > 0 ? `Location: ${locationParts.join(', ')}` : '';

                  const message = [
                    brand && name ? `${brand} ${name}` : brand || name,
                    dateText,
                    rating,
                    flavors,
                    notes,
                    location,
                  ]
                    .filter(Boolean)
                    .join('\n');

                  await shareCigar({
                    cigar: {
                      brand,
                      name,
                      line: entry.cigar?.line,
                      imageUrl: entry.imageUrl || entry.cigar?.imageUrl,
                      strength: entry.cigar?.strength,
                      overview: entry.notes,
                    },
                    message,
                  });
                } catch (error) {
                  console.error('Error sharing journal entry:', error);
                  Alert.alert('Unable to share', 'Please try again.');
                }
              }}
              rightIconName="share-social-outline"
            />
          ),
        })}
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
            <TabHeader title="Recommendations" onBackPress={() => navigation.goBack()} />
          ),
        })}
      />
      <RecommendationsStack.Screen
        name="CigarDetails"
        component={CigarDetailsScreen}
        options={({ navigation, route }) => ({
          header: () => (
            <TabHeader
              title="Cigar Details"
              onBackPress={() => navigation.goBack()}
              onRightPress={async () => {
                try {
                  const cigarParam: any = route.params?.cigar ?? route.params?.item;
                  const cigarToShare = cigarParam?.cigar ?? cigarParam;
                  if (!cigarToShare) {
                    Alert.alert('Unable to share', 'Cigar details are missing.');
                    return;
                  }
                  await shareCigar({ cigar: cigarToShare });
                } catch (error) {
                  console.error('Error sharing cigar:', error);
                  Alert.alert('Unable to share', 'Please try again.');
                }
              }}
              rightIconName="share-social-outline"
            />
          ),
        })}
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
            iconName = focused ? 'bulb' : 'bulb-outline';
          } else {
            iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={20} color={color} style={{ marginBottom: -4 }} />;
        },
        tabBarLabel: ({ focused, color }) => {
          let labelText = route.name;
          if (route.name === 'HumidorList') {
            labelText = 'Humidor';
          } else if (route.name === 'Recommendations') {
            labelText = 'Discover';
          }
          return (
            <Text
              style={{
                color: focused ? '#DC851F' : '#999999',
                fontSize: 11,
                marginTop: -12, // Larger negative margin to move label up
                lineHeight: 11,
                paddingTop: 0,
              }}
            >
              {labelText}
            </Text>
          );
        },
        tabBarActiveTintColor: '#DC851F',
        tabBarInactiveTintColor: '#999999',
        tabBarStyle: {
          backgroundColor: '#0a0a0a',
          borderTopColor: '#333333',
          paddingBottom: 0, // No bottom padding - extend to bottom
          paddingTop: 8, // Add top padding to space icons from top edge
          height: 68, // Increased height to accommodate top padding
          marginBottom: 0,
          position: 'absolute',
          bottom: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 0, // No vertical padding
          marginBottom: 0,
          marginTop: -8, // Reduced negative margin since we have paddingTop now
          justifyContent: 'center', // Center content
          alignItems: 'center',
          height: 50, // Slightly increased to accommodate padding
        },
        tabBarIconStyle: {
          marginBottom: 0, // No margin - labels should be right below icons
        },
        tabBarLabelStyle: {
          marginTop: -8, // Larger negative margin to move labels up closer to icons
          marginBottom: 0, // No bottom margin
          fontSize: 11, // Smaller font to fit better
          paddingBottom: 0, // No padding on label
          lineHeight: 12, // Tighter line height
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
          headerShown: false, // Hide tab header, let stack handle headers
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            navigation.navigate('HumidorList', {
              screen: 'HumidorListMain',
              params: undefined,
            } as never);
          },
        })}
      />
      <Tab.Screen
        name="Journal"
        component={JournalStackNavigator}
        options={{
          title: 'Notes',
          headerShown: false,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            navigation.navigate('Journal', {
              screen: 'JournalHome',
            } as never);
          },
        })}
      />
      <Tab.Screen
        name="Recommendations"
        component={RecommendationsStackNavigator}
        options={{
          title: 'Recommendations',
          headerShown: false,
        }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate('Recommendations', {
              screen: 'Recommendations',
            } as never);
          },
        })}
      />
    </Tab.Navigator>
  );
}

// Loading Screen Component
const LoadingScreen = () => (
  <CachedBackgroundImage style={styles.loadingContainer} imageStyle={styles.loadingBackgroundImage}>
    <View style={styles.loadingContent}>
      <ActivityIndicator size="large" color="#DC851F" />
      <Text style={styles.loadingText}>Loading your cigar collection...</Text>
    </View>
  </CachedBackgroundImage>
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
      <Stack.Screen
        name="OnboardingExperience"
        component={OnboardingExperienceScreen}
        initialParams={{ onComplete }}
      />
      <Stack.Screen
        name="OnboardingTastePreferences"
        component={OnboardingTastePreferencesScreen}
        options={{
          title: 'Taste Preferences',
        }}
        initialParams={{ onComplete }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading, profile, subscriptionStatus, subscriptionLoading, refreshProfile } =
    useAuth();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [onboardingCheckComplete, setOnboardingCheckComplete] = useState(false);

  // Preload background image on app start
  useEffect(() => {
    preloadBackgroundImage();
  }, []);

  // Check onboarding status when user or profile changes
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (user && profile) {
        try {
          console.log('🔍 Checking onboarding status for user:', user.id);
          console.log('🔍 Profile onboarding_completed:', profile.onboarding_completed);

          // IMPORTANT: Check explicitly for true, don't default to false
          // If it's null/undefined, it means the user hasn't completed onboarding yet
          const completed = profile.onboarding_completed === true;
          console.log('✅ Onboarding status from profile:', completed);
          setOnboardingCompleted(completed);
          setOnboardingCheckComplete(true); // Only mark complete when we have both user and profile
        } catch (error) {
          console.warn('⚠️ Error checking onboarding status (non-fatal):', error);
          // On error, check database directly as a fallback
          if (user) {
            try {
              const profileData = await Api.profiles.get(user.id);
              const completed = profileData?.onboarding_completed === true;
              console.log('✅ Onboarding status from database fallback:', completed);
              setOnboardingCompleted(completed);
            } catch (dbError) {
              console.warn('⚠️ Database fallback also failed:', dbError);
              setOnboardingCompleted(false); // Only default to false if everything fails
            }
          }
          setOnboardingCheckComplete(true);
        }
      } else if (user && !profile) {
        // User exists but profile hasn't loaded yet, wait for it
        console.log('⏳ Waiting for profile to load...');

        // Check if profile exists in database
        try {
          const { DatabaseService } = await import('../services/supabaseService');
          const profileData = await DatabaseService.getProfile(user.id);

          if (profileData) {
            console.log('✅ Found profile in database, setting onboarding status');
            const completed = profileData.onboarding_completed === true;
            setOnboardingCompleted(completed);
          } else {
            console.log('🔍 No profile found - user needs onboarding');
            setOnboardingCompleted(false);
          }
          setOnboardingCheckComplete(true);
        } catch (error) {
          console.warn('⚠️ Error checking profile in database:', error);
          console.log('🔧 Defaulting to onboarding required');
          setOnboardingCompleted(false);
          setOnboardingCheckComplete(true);
        }
      } else {
        setOnboardingCompleted(null);
        setOnboardingCheckComplete(false); // Reset when no user
      }
    };

    checkOnboardingStatus();
  }, [user, profile]); // Watch both user and profile

  // Function to mark onboarding as completed
  const handleOnboardingComplete = async () => {
    try {
      console.log('🔍 Completing onboarding...');

      if (!user) {
        console.error('❌ No user found when completing onboarding');
        return;
      }

      // Update the database directly to ensure it's persisted
      await StorageService.updateUserProfile({ onboardingCompleted: true });
      console.log('✅ Onboarding status saved to database');

      // Refresh the profile in AuthContext to get updated onboarding status
      await refreshProfile();
      console.log('✅ Profile refreshed from database');

      // Set local state immediately to show main app
      setOnboardingCompleted(true);
      console.log('✅ Onboarding marked as completed locally');

      // Double-check the profile was actually updated
      const updatedProfile = await Api.profiles.get(user.id);
      console.log(
        '🔍 Verification - Profile onboarding_completed:',
        updatedProfile?.onboarding_completed,
      );

      if (updatedProfile?.onboarding_completed !== true) {
        console.error('⚠️ Warning: Profile was not updated correctly in database!');
        // Try one more time
        await Api.profiles.update(user.id, { onboarding_completed: true });
        console.log('✅ Second attempt to update profile completed');
      }
    } catch (error) {
      console.warn('⚠️ Error completing onboarding:', error);
      // Even on error, try to set it locally so user isn't stuck
      setOnboardingCompleted(true);
    }
  };

  // Progressive loading - show app UI as soon as we have basic auth info
  if (loading) {
    console.log('🔄 Showing loading screen - auth still loading');
    return <LoadingScreen />;
  }

  // Log subscription status for debugging
  if (subscriptionStatus) {
    console.log('💎 Subscription status in AppNavigator:', {
      hasAccess: subscriptionStatus.hasAccess,
      isPremium: subscriptionStatus.isPremium,
      isTrialActive: subscriptionStatus.isTrialActive,
      status: subscriptionStatus.status,
      subscriptionLoading,
    });
  }

  // If we have a user but onboarding check isn't complete, show the app with a loading state
  // This prevents the app from being completely blocked while checking onboarding status
  if (user && !onboardingCheckComplete) {
    console.log('🔄 User found but onboarding check in progress - showing app with loading state');
    // We'll let the onboarding check complete in the background
    // The user will see the main app, and onboarding will be handled by the screens themselves
  }

  return (
    <NavigationContainer>
      {user ? (
        // Only show onboarding when the check is complete and explicitly false
        onboardingCheckComplete && onboardingCompleted === false ? (
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
            name="Stats"
            component={StatsScreen}
            options={({ navigation }) => ({
              header: () => (
                <TabHeader title="Your Stats" onBackPress={() => navigation.goBack()} />
              ),
            })}
          />
            <Stack.Screen
              name="CigarRecognition"
              component={EnhancedCigarRecognitionScreen}
              options={({ navigation }) => ({
                header: () => (
                  <TabHeader title="Identify Cigar" onBackPress={() => navigation.goBack()} />
                ),
              })}
            />
            <Stack.Screen
              name="NewJournalEntry"
              component={NewJournalEntryScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="JournalEntryDetails"
              component={JournalEntryDetailsScreen}
              options={({ navigation }) => ({
                header: () => (
                  <TabHeader title="Journal Entry" onBackPress={() => navigation.goBack()} />
                ),
              })}
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
              name="Profile"
              component={ProfileScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ManageSubscription"
              component={ManageSubscriptionScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="OpenSourceLicenses"
              component={OpenSourceLicensesScreen}
              options={{
                title: 'Open Source Licenses',
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

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { UserManagementService } from '../services/userManagementService';
import { 
  UserManagementData, 
  AdminAnalytics, 
  UserActivityLog,
  UserRole 
} from '../types';

type AdminDashboardNavigationProp = {
  navigate: (screen: string, params?: any) => void;
};

export default function AdminDashboardScreen() {
  const navigation = useNavigation<AdminDashboardNavigationProp>();
  const { user, isSuperUser, canAccessAdmin } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    superUsers: 0,
    standardUsers: 0,
    activeUsers: 0,
    newUsersThisMonth: 0,
  });
  const [recentUsers, setRecentUsers] = useState<UserManagementData[]>([]);
  const [recentActivity, setRecentActivity] = useState<UserActivityLog[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics[]>([]);

  useEffect(() => {
    if (!canAccessAdmin) {
      Alert.alert('Access Denied', 'You do not have permission to access this area.');
      navigation.navigate('MainTabs', { screen: 'Home' });
      return;
    }
    
    loadAdminData();
  }, [canAccessAdmin]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadUserStatistics(),
        loadRecentUsers(),
        loadRecentActivity(),
        loadAnalytics()
      ]);
    } catch (error) {
      console.error('Error loading admin data:', error);
      Alert.alert('Error', 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAdminData();
    setRefreshing(false);
  };

  const loadUserStatistics = async () => {
    try {
      const stats = await UserManagementService.getUserStatistics();
      setUserStats(stats);
    } catch (error) {
      console.error('Error loading user statistics:', error);
    }
  };

  const loadRecentUsers = async () => {
    try {
      const users = await UserManagementService.getUserManagementData();
      setRecentUsers(users.slice(0, 10)); // Show last 10 users
    } catch (error) {
      console.error('Error loading recent users:', error);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const activity = await UserManagementService.getUserActivityLogs(undefined, undefined, undefined, 20);
      setRecentActivity(activity);
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const analyticsData = await UserManagementService.getAnalytics(undefined, undefined, undefined);
      setAnalytics(analyticsData.slice(0, 10)); // Show last 10 analytics entries
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const handleUserRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      const success = await UserManagementService.updateUserRole(userId, newRole);
      if (success) {
        // Refresh the user list without popup
        await loadRecentUsers();
      } else {
        Alert.alert('Error', 'Failed to update user role');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      Alert.alert('Error', 'Failed to update user role');
    }
  };

  const StatCard = ({ title, value, icon, color }: {
    title: string;
    value: number;
    icon: string;
    color: string;
  }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon as any} size={24} color={color} />
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  const UserRow = ({ userData }: { userData: UserManagementData }) => (
    <View style={styles.userRow}>
      <View style={styles.userInfo}>
        <Text style={styles.userEmail}>{userData.email}</Text>
        <Text style={styles.userDate}>
          Joined: {new Date(userData.userCreatedAt).toLocaleDateString()}
        </Text>
        <Text style={styles.userActivity}>
          Activity: {userData.activityCount} actions
        </Text>
      </View>
      <View style={styles.userActions}>
        {userData.roleType && (
          <View style={[
            styles.roleBadge,
            { backgroundColor: UserManagementService.getRoleBadgeColor(userData.roleType) }
          ]}>
            <Text style={styles.roleBadgeText}>
              {UserManagementService.formatUserRole(userData.roleType)}
            </Text>
          </View>
        )}
        {userData.roleType === 'standard_user' && (
          <TouchableOpacity
            style={styles.promoteButton}
            onPress={() => handleUserRoleChange(userData.id, 'super_user')}
          >
            <Text style={styles.promoteButtonText}>Promote</Text>
          </TouchableOpacity>
        )}
        {userData.roleType === 'super_user' && userData.id !== user?.id && (
          <TouchableOpacity
            style={styles.demoteButton}
            onPress={() => handleUserRoleChange(userData.id, 'standard_user')}
          >
            <Text style={styles.demoteButtonText}>Demote</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (!canAccessAdmin) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC851F" />
        <Text style={styles.loadingText}>Loading admin dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Statistics Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Statistics</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Users"
              value={userStats.totalUsers}
              icon="people"
              color="#DC851F"
            />
            <StatCard
              title="Super Users"
              value={userStats.superUsers}
              icon="shield-checkmark"
              color="#FFA737"
            />
            <StatCard
              title="Standard Users"
              value={userStats.standardUsers}
              icon="person"
              color="#999999"
            />
            <StatCard
              title="New This Month"
              value={userStats.newUsersThisMonth}
              icon="trending-up"
              color="#4CAF50"
            />
          </View>
        </View>

        {/* Recent Users */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Users</Text>
          {recentUsers.map((userData) => (
            <UserRow key={userData.id} userData={userData} />
          ))}
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {recentActivity.map((activity) => (
            <View key={activity.id} style={styles.activityRow}>
              <View style={styles.activityInfo}>
                <Text style={styles.activityAction}>{activity.action}</Text>
                <Text style={styles.activityResource}>
                  {activity.resourceType}: {activity.resourceId || 'N/A'}
                </Text>
                <Text style={styles.activityDate}>
                  {new Date(activity.createdAt).toLocaleString()}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Analytics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Analytics</Text>
          {analytics.map((analytic) => (
            <View key={analytic.id} style={styles.analyticsRow}>
              <Text style={styles.analyticsMetric}>{analytic.metricName}</Text>
              <Text style={styles.analyticsDate}>
                {new Date(analytic.dateRecorded).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#CCCCCC',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 16,
  },
  headerSpacer: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statTitle: {
    fontSize: 14,
    color: '#999999',
  },
  userRow: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userDate: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 2,
  },
  userActivity: {
    fontSize: 12,
    color: '#999999',
  },
  userActions: {
    alignItems: 'flex-end',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  promoteButton: {
    backgroundColor: '#DC851F',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  promoteButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  demoteButton: {
    backgroundColor: '#666666',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  demoteButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  activityRow: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  activityInfo: {
    flex: 1,
  },
  activityAction: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  activityResource: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 2,
  },
  activityDate: {
    fontSize: 12,
    color: '#999999',
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  analyticsMetric: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  analyticsDate: {
    fontSize: 12,
    color: '#999999',
  },
});







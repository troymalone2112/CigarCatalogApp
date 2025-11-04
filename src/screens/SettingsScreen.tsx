import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { RevenueCatTest } from '../components/RevenueCatTest';

type SettingsScreenNavigationProp = {
  navigate: (screen: string, params?: any) => void;
};

export default function SettingsScreen() {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { user, userRole, isSuperUser, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleAdminAccess = () => {
    navigation.navigate('AdminDashboard');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* User Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>User Role</Text>
            <View style={styles.roleContainer}>
              <View
                style={[styles.roleBadge, { backgroundColor: isSuperUser ? '#DC851F' : '#999999' }]}
              >
                <Text style={styles.roleBadgeText}>
                  {isSuperUser ? 'Super User' : 'Standard User'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Admin Section */}
        {isSuperUser && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Administration</Text>

            <TouchableOpacity style={styles.actionCard} onPress={handleAdminAccess}>
              <View style={styles.actionContent}>
                <Ionicons name="shield-checkmark" size={24} color="#DC851F" />
                <View style={styles.actionText}>
                  <Text style={styles.actionTitle}>Admin Dashboard</Text>
                  <Text style={styles.actionSubtitle}>Manage users and view analytics</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999999" />
            </TouchableOpacity>
          </View>
        )}

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>

          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionContent}>
              <Ionicons name="notifications" size={24} color="#999999" />
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Notifications</Text>
                <Text style={styles.actionSubtitle}>Manage notification preferences</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionContent}>
              <Ionicons name="privacy" size={24} color="#999999" />
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Privacy</Text>
                <Text style={styles.actionSubtitle}>Privacy settings and data control</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Profile' as never)}
          >
            <View style={styles.actionContent}>
              <Ionicons name="person" size={24} color="#999999" />
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Profile</Text>
                <Text style={styles.actionSubtitle}>Manage your account and subscription</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionContent}>
              <Ionicons name="help-circle" size={24} color="#999999" />
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Help & Support</Text>
                <Text style={styles.actionSubtitle}>Get help and contact support</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999999" />
          </TouchableOpacity>
        </View>

        {/* RevenueCat Test (Development Only) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Development</Text>
          <RevenueCatTest />
        </View>

        {/* Sign Out */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutCard} onPress={handleSignOut}>
            <Ionicons name="log-out" size={24} color="#dc3545" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#999999',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  roleContainer: {
    flexDirection: 'row',
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  actionCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    marginLeft: 12,
  },
  actionTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#999999',
  },
  signOutCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  signOutText: {
    fontSize: 16,
    color: '#dc3545',
    fontWeight: '500',
    marginLeft: 8,
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { checkMigrationNeeded, migrateLocalDataToDatabase } from '../utils/migrationUtils';

interface MigrationScreenProps {
  onMigrationComplete: () => void;
}

export default function MigrationScreen({ onMigrationComplete }: MigrationScreenProps) {
  const { user } = useAuth();
  const [migrationStatus, setMigrationStatus] = useState<any>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkMigrationStatus();
  }, []);

  const checkMigrationStatus = async () => {
    if (!user) return;

    try {
      const status = await checkMigrationNeeded(user.id);
      setMigrationStatus(status);
    } catch (error) {
      console.error('Error checking migration status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMigration = async () => {
    if (!user) return;

    setIsMigrating(true);
    try {
      const result = await migrateLocalDataToDatabase(user.id);
      
      if (result.success) {
        Alert.alert(
          'Migration Complete!',
          `Successfully migrated ${result.migratedCount} cigars to your database. Your data is now synced across all devices!`,
          [
            {
              text: 'Continue',
              onPress: onMigrationComplete,
            },
          ]
        );
      } else {
        Alert.alert(
          'Migration Failed',
          `Error: ${result.error}`,
          [
            {
              text: 'Try Again',
              onPress: handleMigration,
            },
            {
              text: 'Continue Anyway',
              onPress: onMigrationComplete,
              style: 'cancel',
            },
          ]
        );
      }
    } catch (error) {
      console.error('Migration error:', error);
      Alert.alert(
        'Migration Error',
        'An unexpected error occurred during migration.',
        [
          {
            text: 'Try Again',
            onPress: handleMigration,
          },
          {
            text: 'Continue Anyway',
            onPress: onMigrationComplete,
            style: 'cancel',
          },
        ]
      );
    } finally {
      setIsMigrating(false);
    }
  };

  const handleSkipMigration = () => {
    Alert.alert(
      'Skip Migration?',
      'Your cigar data will remain stored locally on this device only. You can migrate later from Settings.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Skip',
          onPress: onMigrationComplete,
        },
      ]
    );
  };

  if (loading) {
    return (
      <ImageBackground
        source={require('../../assets/tobacco-leaves-bg.jpg')}
        style={styles.container}
        imageStyle={styles.backgroundImage}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC851F" />
          <Text style={styles.loadingText}>Checking your data...</Text>
        </View>
      </ImageBackground>
    );
  }

  if (!migrationStatus?.needsMigration) {
    // No migration needed, proceed to app
    onMigrationComplete();
    return null;
  }

  return (
    <ImageBackground
      source={require('../../assets/tobacco-leaves-bg.jpg')}
      style={styles.container}
      imageStyle={styles.backgroundImage}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="cloud-upload-outline" size={80} color="#DC851F" />
        </View>

        <Text style={styles.title}>Upgrade Your Data Storage</Text>
        
        <Text style={styles.description}>
          We found {migrationStatus.localItemCount} cigars stored locally on your device. 
          Upgrade to cloud storage to sync your collection across all devices and keep it safe.
        </Text>

        <View style={styles.benefitsContainer}>
          <View style={styles.benefit}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.benefitText}>Sync across all devices</Text>
          </View>
          <View style={styles.benefit}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.benefitText}>Automatic backup & recovery</Text>
          </View>
          <View style={styles.benefit}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.benefitText}>Faster performance</Text>
          </View>
          <View style={styles.benefit}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.benefitText}>Future features & analytics</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleMigration}
            disabled={isMigrating}
          >
            {isMigrating ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" style={styles.buttonSpinner} />
                <Text style={styles.primaryButtonText}>Migrating...</Text>
              </>
            ) : (
              <>
                <Ionicons name="cloud-upload" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.primaryButtonText}>Migrate to Cloud Storage</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleSkipMigration}
            disabled={isMigrating}
          >
            <Text style={styles.secondaryButtonText}>Skip for Now</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.note}>
          Your local data will be safely backed up before migration.
        </Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    opacity: 0.4,
    resizeMode: 'cover',
  },
  content: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 10, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  iconContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  benefitsContainer: {
    alignSelf: 'stretch',
    marginBottom: 40,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
  },
  buttonContainer: {
    alignSelf: 'stretch',
    marginBottom: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#DC851F',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(220, 133, 31, 0.3)',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#DC851F',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonSpinner: {
    marginRight: 8,
  },
  note: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AddJournalEntryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Journal Entry</Text>
      <Text style={styles.subtitle}>Journal entry form coming soon!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

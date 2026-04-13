import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  color?: string;
  subtitle?: string;
}

export function StatCard({ label, value, icon, color = '#6366F1', subtitle }: StatCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text variant="labelMedium" style={styles.label}>
          {label}
        </Text>
        <Text variant="headlineLarge" style={[styles.value, { color }]}>
          {value}
        </Text>
        {subtitle && (
          <Text variant="bodySmall" style={styles.subtitle}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flex: 1,
    minWidth: 150,
  },
  content: {
    alignItems: 'flex-start',
  },
  label: {
    color: '#6B7280',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 8,
  },
  value: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#9CA3AF',
  },
});

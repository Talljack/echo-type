import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/layout/Screen';
import { MvpNoticeCard } from '@/components/ui/MvpNoticeCard';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useListenStore } from '@/stores/useListenStore';

export default function ListenScreen() {
  const { colors, getModuleColors } = useAppTheme();
  const listenColors = getModuleColors('listen');
  const getTotalListenTime = useListenStore((state) => state.getTotalListenTime);
  const insets = useSafeAreaInsets();

  const totalMinutes = Math.floor(getTotalListenTime() / 60);

  return (
    <Screen scrollable>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header with gradient */}
        <LinearGradient colors={listenColors.gradient} style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}>
          <View style={styles.header}>
            <MaterialCommunityIcons name="headphones" size={40} color="#FFFFFF" />
            <Text variant="headlineMedium" style={styles.title}>
              Listen
            </Text>
            <View style={styles.stats}>
              <Text variant="bodyMedium" style={styles.statsText}>
                Total: {totalMinutes} minutes
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <MvpNoticeCard
            title="Listen from your library"
            body="Choose a saved text from Library to start listening practice. Recent session stats stay here."
          />

          <Button
            mode="contained"
            onPress={() => router.push('/(tabs)/library')}
            style={[styles.button, { backgroundColor: listenColors.primary }]}
            labelStyle={{ color: '#FFFFFF' }}
          >
            Choose from Library
          </Button>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  header: {
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
    color: '#FFFFFF',
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
  },
  statsText: {
    color: '#FFFFFF',
    opacity: 0.9,
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 140,
  },
  button: {
    marginTop: 8,
    borderRadius: 12,
  },
});

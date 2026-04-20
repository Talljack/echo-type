import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAppTheme } from '@/contexts/ThemeContext';
import type { ReviewForecastCounts } from '@/lib/dashboard-time';
import { haptics } from '@/lib/haptics';
import { fontFamily } from '@/theme/typography';

interface ReviewForecastCardProps {
  counts: ReviewForecastCounts;
  animationDelay?: number;
}

export function ReviewForecastCard({ counts, animationDelay = 1150 }: ReviewForecastCardProps) {
  const { colors } = useAppTheme();
  const router = useRouter();

  return (
    <Animated.View entering={FadeInDown.delay(animationDelay)} style={styles.wrap}>
      <Pressable
        onPress={() => {
          void haptics.light();
          router.push('/review');
        }}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.row}>
            <View style={styles.lead}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
                <MaterialCommunityIcons name="calendar-clock" size={22} color={colors.onPrimary} />
              </View>
              <View>
                <Text variant="titleSmall" style={[styles.title, { color: colors.onPrimary }]}>
                  Upcoming Reviews
                </Text>
                <Text variant="bodySmall" style={styles.subtitle}>
                  FSRS forecast
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color="rgba(255,255,255,0.85)" />
          </View>
          <View style={styles.statsRow}>
            <Text variant="bodyMedium" style={[styles.forecastText, { color: colors.onPrimary }]}>
              Today: {counts.today}
            </Text>
            <Text style={[styles.sep, { color: 'rgba(255,255,255,0.5)' }]}>|</Text>
            <Text variant="bodyMedium" style={[styles.forecastText, { color: colors.onPrimary }]}>
              Tomorrow: {counts.tomorrow}
            </Text>
            <Text style={[styles.sep, { color: 'rgba(255,255,255,0.5)' }]}>|</Text>
            <Text variant="bodyMedium" style={[styles.forecastText, { color: colors.onPrimary }]}>
              This Week: {counts.thisWeek}
            </Text>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  gradient: {
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  lead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderCurve: 'continuous',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: fontFamily.heading,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.82)',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  forecastText: {
    fontFamily: fontFamily.heading,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  sep: {
    fontWeight: '500',
  },
});

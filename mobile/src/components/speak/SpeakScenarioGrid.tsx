import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAppTheme } from '@/contexts/ThemeContext';
import { getCategoryCardGradient, type Scenario } from '@/lib/scenarios';
import { fontFamily } from '@/theme/typography';

interface SpeakScenarioGridProps {
  title: string;
  scenarios: Scenario[];
  onScenarioPress: (scenarioId: string) => void;
}

function difficultyBadgeStyle(difficulty: Scenario['difficulty']) {
  switch (difficulty) {
    case 'beginner':
      return { bg: 'rgba(255,255,255,0.22)', border: 'rgba(255,255,255,0.45)' };
    case 'intermediate':
      return { bg: 'rgba(255,255,255,0.18)', border: 'rgba(255,255,255,0.4)' };
    case 'advanced':
      return { bg: 'rgba(255,255,255,0.15)', border: 'rgba(255,255,255,0.38)' };
  }
}

export function SpeakScenarioGrid({ title, scenarios, onScenarioPress }: SpeakScenarioGridProps) {
  const { colors, isDark } = useAppTheme();

  return (
    <View>
      <Text style={[styles.sectionTitle, { color: colors.onBackground, fontFamily: fontFamily.heading }]}>{title}</Text>
      <View style={styles.grid}>
        {scenarios.map((scenario, index) => {
          const badge = difficultyBadgeStyle(scenario.difficulty);
          const gradient = getCategoryCardGradient(scenario.category, isDark);

          return (
            <Animated.View key={scenario.id} entering={FadeInDown.delay(120 + index * 25)}>
              <Pressable
                onPress={() => onScenarioPress(scenario.id)}
                style={({ pressed }) => [pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}
              >
                <LinearGradient colors={gradient} style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text style={styles.emoji}>{scenario.emoji}</Text>
                    <View style={[styles.difficultyPill, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                      <Text
                        style={[styles.difficultyText, { color: colors.onPrimary, fontFamily: fontFamily.bodyMedium }]}
                      >
                        {scenario.difficulty}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[styles.cardTitle, { color: colors.onPrimary, fontFamily: fontFamily.heading }]}
                    numberOfLines={2}
                  >
                    {scenario.title}
                  </Text>
                  <Text
                    style={[styles.cardDesc, { color: 'rgba(255,255,255,0.9)', fontFamily: fontFamily.body }]}
                    numberOfLines={3}
                  >
                    {scenario.description}
                  </Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 20,
    marginBottom: 14,
  },
  grid: {
    gap: 14,
  },
  card: {
    borderRadius: 24,
    padding: 18,
    minHeight: 160,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  emoji: {
    fontSize: 26,
  },
  difficultyPill: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  difficultyText: {
    fontSize: 12,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
});

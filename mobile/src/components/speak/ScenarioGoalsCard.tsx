import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import { fontFamily } from '@/theme/typography';

interface ScenarioGoalsCardProps {
  title: string;
  subtitle?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  goalsLabel: string;
  goals: string[];
  expanded: boolean;
  onToggle: () => void;
}

const difficultyTint = {
  beginner: '#22C55E',
  intermediate: '#F59E0B',
  advanced: '#EF4444',
} as const;

export function ScenarioGoalsCard({
  title,
  subtitle,
  difficulty,
  goalsLabel,
  goals,
  expanded,
  onToggle,
}: ScenarioGoalsCardProps) {
  const { colors, getModuleColors } = useAppTheme();
  const speakColors = getModuleColors('speak');

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.header,
          { backgroundColor: colors.surface, borderColor: colors.border },
          pressed && { opacity: 0.85 },
        ]}
      >
        <View style={styles.headerMain}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primaryContainer }]}>
            <MaterialCommunityIcons name="flag-checkered" size={18} color={speakColors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.onSurface, fontFamily: fontFamily.heading }]} numberOfLines={1}>
              {title}
            </Text>
            <Text
              style={[styles.subtitle, { color: colors.onSurfaceSecondary, fontFamily: fontFamily.body }]}
              numberOfLines={1}
            >
              {subtitle || goalsLabel}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.difficultyPill, { backgroundColor: `${difficultyTint[difficulty]}18` }]}>
            <Text
              style={[styles.difficultyText, { color: difficultyTint[difficulty], fontFamily: fontFamily.bodyMedium }]}
            >
              {difficulty}
            </Text>
          </View>
          <MaterialCommunityIcons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={colors.onSurfaceSecondary}
          />
        </View>
      </Pressable>

      {expanded ? (
        <View style={[styles.body, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
          <Text style={[styles.bodyLabel, { color: colors.onSurfaceSecondary, fontFamily: fontFamily.bodyMedium }]}>
            {goalsLabel}
          </Text>
          {goals.map((goal, index) => (
            <View key={`${goal}-${index}`} style={styles.goalRow}>
              <Text style={[styles.goalBullet, { color: speakColors.primary }]}>•</Text>
              <Text style={[styles.goalText, { color: colors.onSurface, fontFamily: fontFamily.body }]}>{goal}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  header: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
  },
  headerRight: {
    alignItems: 'center',
    gap: 6,
  },
  difficultyPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  difficultyText: {
    fontSize: 11,
    textTransform: 'capitalize',
  },
  body: {
    marginTop: 8,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
  },
  bodyLabel: {
    fontSize: 12,
  },
  goalRow: {
    flexDirection: 'row',
    gap: 8,
  },
  goalBullet: {
    fontSize: 18,
    lineHeight: 20,
  },
  goalText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});

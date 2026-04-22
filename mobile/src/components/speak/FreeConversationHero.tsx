import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import { fontFamily } from '@/theme/typography';

interface FreeConversationHeroProps {
  title: string;
  subtitle: string;
  helperLabel: string;
  topics: readonly string[];
  onPress: () => void;
  onTopicPress: (topic: string) => void;
}

export function FreeConversationHero({
  title,
  subtitle,
  helperLabel,
  topics,
  onPress,
  onTopicPress,
}: FreeConversationHeroProps) {
  const { colors, getModuleColors } = useAppTheme();
  const speakColors = getModuleColors('speak');

  return (
    <View>
      <Pressable style={({ pressed }) => [styles.heroWrap, pressed && styles.heroPressed]} onPress={onPress}>
        <LinearGradient colors={speakColors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons name="microphone-message" size={28} color={colors.onPrimary} />
            </View>
            <View style={styles.heroText}>
              <Text style={[styles.heroTitle, { color: colors.onPrimary, fontFamily: fontFamily.headingBold }]}>
                {title}
              </Text>
              <Text style={[styles.heroSubtitle, { color: colors.onPrimary }]}>{subtitle}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={26} color={colors.onPrimary} />
          </View>
        </LinearGradient>
      </Pressable>

      <Text style={[styles.helperLabel, { color: colors.onSurfaceSecondary, fontFamily: fontFamily.bodyMedium }]}>
        {helperLabel}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topicsRow}>
        {topics.map((topic) => (
          <Pressable
            key={topic}
            onPress={() => onTopicPress(topic)}
            style={({ pressed }) => [
              styles.topicChip,
              { backgroundColor: colors.surface, borderColor: colors.borderLight },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={[styles.topicChipText, { color: colors.onSurface, fontFamily: fontFamily.bodyMedium }]}>
              {topic}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: {
    marginBottom: 14,
  },
  heroPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  hero: {
    borderRadius: 24,
    padding: 20,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
    minWidth: 0,
  },
  heroTitle: {
    fontSize: 22,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.92,
  },
  helperLabel: {
    fontSize: 13,
    marginBottom: 10,
  },
  topicsRow: {
    gap: 10,
    paddingBottom: 2,
  },
  topicChip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  topicChipText: {
    fontSize: 14,
  },
});

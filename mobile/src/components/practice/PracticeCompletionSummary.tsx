import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { RatingButtons } from '@/components/practice/RatingButtons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { type Rating } from '@/lib/fsrs';
import { haptics } from '@/lib/haptics';
import type { ModuleName } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

export interface PracticeCompletionStats {
  duration: number;
  accuracy?: number;
  wpm?: number;
  wordsCount?: number;
  errors?: number;
  pronunciationScore?: number;
  messagesCount?: number;
  replayCount?: number;
}

export type PracticeModule = Extract<ModuleName, 'listen' | 'read' | 'write' | 'speak'>;

export type RatingIntervalsMap = {
  [Rating.Again]: string;
  [Rating.Hard]: string;
  [Rating.Good]: string;
  [Rating.Easy]: string;
};

export interface PracticeCompletionSummaryProps {
  module: PracticeModule;
  stats: PracticeCompletionStats;
  onTryAgain?: () => void;
  onGoBack: () => void;
  ratingIntervals?: RatingIntervalsMap | null;
  onRate?: (rating: Rating) => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.max(0, seconds % 60);
  if (m <= 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function moduleTitle(module: PracticeModule): string {
  switch (module) {
    case 'listen':
      return 'Listening complete!';
    case 'read':
      return 'Reading complete!';
    case 'write':
      return 'Typing complete!';
    case 'speak':
      return 'Great conversation!';
    default:
      return 'Session complete!';
  }
}

function moduleSubtitle(module: PracticeModule): string {
  switch (module) {
    case 'listen':
      return 'You stayed with the audio — nice focus.';
    case 'read':
      return 'Shadow reading builds muscle memory.';
    case 'write':
      return 'Every keystroke counts toward fluency.';
    case 'speak':
      return 'Real turns with the AI — keep the streak going.';
    default:
      return 'Well done!';
  }
}

export function PracticeCompletionSummary({
  module,
  stats,
  onTryAgain,
  onGoBack,
  ratingIntervals,
  onRate,
}: PracticeCompletionSummaryProps) {
  const { colors, getModuleColors } = useAppTheme();
  const mod = getModuleColors(module);

  const { centerDisplay, centerSuffix, centerLabel, statItems } = useMemo(() => {
    const items: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string }[] = [];

    let display = '100';
    let suffix = '%';
    let label = 'Score';

    switch (module) {
      case 'write': {
        const acc = stats.accuracy ?? 0;
        display = String(Math.round(acc));
        suffix = '%';
        label = 'Accuracy';
        items.push(
          { icon: 'speedometer', label: 'WPM', value: String(stats.wpm ?? 0) },
          { icon: 'percent', label: 'Accuracy', value: `${Math.round(acc)}%` },
          { icon: 'timer-outline', label: 'Time', value: formatDuration(stats.duration) },
          { icon: 'alert-circle-outline', label: 'Errors', value: String(stats.errors ?? 0) },
        );
        break;
      }
      case 'read': {
        const pr = stats.pronunciationScore;
        display = pr != null ? String(Math.round(pr)) : '100';
        suffix = '%';
        label = pr != null ? 'Pronunciation' : 'Complete';
        items.push(
          { icon: 'timer-outline', label: 'Duration', value: formatDuration(stats.duration) },
          { icon: 'format-letter-case', label: 'Words read', value: String(stats.wordsCount ?? 0) },
          {
            icon: 'microphone-variant',
            label: 'Pronunciation',
            value: pr != null ? `${Math.round(pr)}%` : '—',
          },
        );
        break;
      }
      case 'listen': {
        display = '100';
        suffix = '%';
        label = 'Complete';
        items.push(
          { icon: 'timer-outline', label: 'Duration', value: formatDuration(stats.duration) },
          { icon: 'ear-hearing', label: 'Words heard', value: String(stats.wordsCount ?? 0) },
          { icon: 'replay', label: 'Replay count', value: String(stats.replayCount ?? 0) },
        );
        break;
      }
      case 'speak': {
        const msgs = stats.messagesCount ?? 0;
        display = String(msgs);
        suffix = '';
        label = 'Messages';
        items.push(
          { icon: 'message-text-outline', label: 'Messages', value: String(msgs) },
          { icon: 'timer-outline', label: 'Duration', value: formatDuration(stats.duration) },
        );
        break;
      }
      default:
        break;
    }

    return { centerDisplay: display, centerSuffix: suffix, centerLabel: label, statItems: items };
  }, [module, stats]);

  const showRatings = Boolean(ratingIntervals && onRate);

  const goBack = () => {
    void haptics.light();
    onGoBack();
  };

  const tryAgain = () => {
    void haptics.medium();
    onTryAgain?.();
  };

  return (
    <Animated.View entering={FadeInDown.duration(380).springify()} style={styles.outer}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
            shadowColor: colors.onSurface,
          },
        ]}
      >
        <LinearGradient colors={mod.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <MaterialCommunityIcons name="party-popper" size={28} color={colors.onPrimary} style={styles.headerIcon} />
          <Text variant="titleLarge" style={[styles.headerTitle, { color: colors.onPrimary }]}>
            {moduleTitle(module)}
          </Text>
          <Text variant="bodyMedium" style={[styles.headerSubtitle, { color: colors.onPrimary }]}>
            {moduleSubtitle(module)}
          </Text>
        </LinearGradient>

        <View style={styles.body}>
          <View
            style={[
              styles.scoreRing,
              {
                borderColor: mod.primary,
                backgroundColor: colors.surfaceVariant,
              },
            ]}
          >
            <Text variant="displaySmall" style={[styles.scoreValue, { color: mod.primary }]}>
              {centerDisplay}
              {centerSuffix}
            </Text>
            <Text variant="labelMedium" style={[styles.scoreCaption, { color: colors.onSurfaceVariant }]}>
              {centerLabel}
            </Text>
          </View>

          <View style={styles.statGrid}>
            {statItems.map((row) => (
              <View
                key={row.label}
                style={[styles.statCell, { backgroundColor: colors.surfaceVariant, borderColor: colors.borderLight }]}
              >
                <MaterialCommunityIcons name={row.icon} size={22} color={mod.primary} />
                <Text variant="labelSmall" style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
                  {row.label}
                </Text>
                <Text variant="titleMedium" style={[styles.statValue, { color: colors.onSurface }]}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.buttons}>
            {onTryAgain ? (
              <Pressable
                onPress={tryAgain}
                style={({ pressed }) => [pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] }]}
              >
                <Button mode="contained" buttonColor={mod.primary} textColor={colors.onPrimary} style={styles.btn}>
                  Try Again
                </Button>
              </Pressable>
            ) : null}
            <Pressable
              onPress={goBack}
              style={({ pressed }) => [pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] }]}
            >
              <Button mode="outlined" textColor={mod.primary} style={[styles.btn, { borderColor: mod.primary }]}>
                Back to Library
              </Button>
            </Pressable>
          </View>

          {showRatings && ratingIntervals && onRate ? (
            <RatingButtons onRate={onRate} intervals={ratingIntervals} />
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 20,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    alignItems: 'center',
  },
  headerIcon: {
    marginBottom: 8,
    opacity: 0.95,
  },
  headerTitle: {
    fontFamily: fontFamily.headingBold,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSubtitle: {
    marginTop: 6,
    textAlign: 'center',
    opacity: 0.92,
    lineHeight: 20,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  scoreRing: {
    width: 132,
    height: 132,
    borderRadius: 9999,
    borderCurve: 'continuous',
    borderWidth: 4,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  scoreValue: {
    fontFamily: fontFamily.headingBold,
    fontWeight: '700',
  },
  scoreCaption: {
    marginTop: 2,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
    justifyContent: 'center',
  },
  statCell: {
    width: '47%',
    minWidth: 148,
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 4,
  },
  statLabel: {
    marginTop: 2,
  },
  statValue: {
    fontWeight: '700',
    fontFamily: fontFamily.heading,
  },
  buttons: {
    gap: 10,
    marginBottom: 12,
    width: '100%',
  },
  btn: {
    borderRadius: 14,
    borderCurve: 'continuous',
    width: '100%',
  },
});

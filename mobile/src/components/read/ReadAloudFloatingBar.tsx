import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, ProgressBar, Surface, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/contexts/ThemeContext';
import { fontFamily } from '@/theme/typography';

interface ReadAloudFloatingBarProps {
  isPlaying: boolean;
  progress: number;
  currentSentence: number;
  totalSentences: number;
  onToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export function ReadAloudFloatingBar({
  isPlaying,
  progress,
  currentSentence,
  totalSentences,
  onToggle,
  onPrev,
  onNext,
}: ReadAloudFloatingBarProps) {
  const { colors, getModuleColors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const readColors = getModuleColors('read');

  const sentenceLabel = useMemo(() => {
    if (totalSentences <= 0) return 'Read aloud';
    return `Sentence ${Math.max(1, currentSentence + 1)} / ${totalSentences}`;
  }, [currentSentence, totalSentences]);

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <Surface
        elevation={4}
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
            bottom: Math.max(insets.bottom, 12) + 12,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.labelRow}>
            <MaterialCommunityIcons name="volume-high" size={18} color={readColors.primary} />
            <Text variant="labelLarge" style={[styles.title, { color: colors.onSurface }]}>
              {sentenceLabel}
            </Text>
          </View>
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
            {Math.round(progress * 100)}%
          </Text>
        </View>

        <ProgressBar
          progress={Math.min(1, Math.max(0, progress))}
          color={readColors.primary}
          style={[styles.progress, { backgroundColor: colors.surfaceVariant }]}
        />

        <View style={styles.controls}>
          <IconButton
            icon="skip-previous"
            mode="contained-tonal"
            size={20}
            onPress={onPrev}
            containerColor={colors.surfaceVariant}
            iconColor={readColors.primary}
          />
          <IconButton
            icon={isPlaying ? 'stop' : 'play'}
            mode="contained"
            size={24}
            onPress={onToggle}
            containerColor={readColors.primary}
            iconColor={colors.onPrimary}
          />
          <IconButton
            icon="skip-next"
            mode="contained-tonal"
            size={20}
            onPress={onNext}
            containerColor={colors.surfaceVariant}
            iconColor={readColors.primary}
          />
        </View>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderWidth: 1,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: fontFamily.bodyMedium,
  },
  progress: {
    height: 6,
    borderRadius: 999,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});

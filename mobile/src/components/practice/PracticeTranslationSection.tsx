import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import type { SentenceTranslation } from '@/services/translation-api';
import { fontFamily } from '@/theme/typography';

interface PracticeTranslationSectionProps {
  translations: SentenceTranslation[] | null;
  isLoading: boolean;
  error: string | null;
  loadingLabel: string;
  retryLabel: string;
  onRetry: () => void;
}

export function PracticeTranslationSection({
  translations,
  isLoading,
  error,
  loadingLabel,
  retryLabel,
  onRetry,
}: PracticeTranslationSectionProps) {
  const { colors } = useAppTheme();

  if (isLoading) {
    return (
      <View style={styles.stateRow}>
        <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
          {loadingLabel}
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.stateColumn}>
        <Text variant="bodySmall" style={{ color: colors.error }}>
          {error}
        </Text>
        <Button mode="text" compact onPress={onRetry}>
          {retryLabel}
        </Button>
      </View>
    );
  }

  if (!translations?.length) {
    return null;
  }

  return (
    <View style={styles.container}>
      {translations.map((entry, index) => (
        <View key={`${entry.original}-${index}`} style={styles.block}>
          <Text variant="bodyLarge" style={[styles.original, { color: colors.onSurface }]}>
            {entry.original}
          </Text>
          <Text variant="bodyMedium" style={[styles.translation, { color: colors.primary }]}>
            {entry.translation}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
    marginTop: 14,
  },
  block: {
    gap: 6,
  },
  original: {
    lineHeight: 28,
    fontFamily: fontFamily.body,
  },
  translation: {
    lineHeight: 24,
    fontFamily: fontFamily.body,
  },
  stateRow: {
    marginTop: 14,
  },
  stateColumn: {
    marginTop: 14,
    alignItems: 'flex-start',
  },
});

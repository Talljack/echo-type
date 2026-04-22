import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button, IconButton, Text, useTheme } from 'react-native-paper';
import { useI18n } from '@/hooks/useI18n';
import { useTranslation } from '@/hooks/useTranslation';

interface TranslationOverlayProps {
  text: string;
  visible: boolean;
  onDismiss: () => void;
}

export function TranslationOverlay({ text, visible, onDismiss }: TranslationOverlayProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const { translation, isLoading, error, translate, clear } = useTranslation();

  useEffect(() => {
    if (visible && text) {
      translate(text);
    }
    if (!visible) {
      clear();
    }
  }, [visible, text, translate, clear]);

  if (!visible) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceVariant }]}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="translate" size={18} color={theme.colors.primary} />
        <Text variant="labelMedium" style={[styles.label, { color: theme.colors.primary }]}>
          {t('listen.showTranslation')}
        </Text>
        <IconButton icon="close" size={16} onPress={onDismiss} style={styles.closeButton} />
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 8 }}>
            {t('read.translating')}
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.errorWrap}>
          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
            {error}
          </Text>
          <Button mode="text" compact onPress={() => void translate(text)} textColor={theme.colors.primary}>
            {t('read.retry')}
          </Button>
        </View>
      )}

      {translation && (
        <View style={styles.translationGroup}>
          {translation.sentenceTranslations?.length ? (
            translation.sentenceTranslations.map((entry, index) => (
              <View key={`${entry.original}-${index}`} style={styles.translationRow}>
                <Text variant="bodySmall" style={[styles.originalText, { color: theme.colors.onSurfaceVariant }]}>
                  {entry.original}
                </Text>
                <Text variant="bodyMedium" style={[styles.translationText, { color: theme.colors.onSurface }]}>
                  {entry.translation}
                </Text>
              </View>
            ))
          ) : (
            <Text variant="bodyMedium" style={[styles.translationText, { color: theme.colors.onSurface }]}>
              {translation.itemTranslation}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    marginLeft: 6,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    margin: -8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  errorWrap: {
    gap: 6,
  },
  translationGroup: {
    gap: 12,
  },
  translationRow: {
    gap: 4,
  },
  originalText: {
    lineHeight: 18,
  },
  translationText: {
    lineHeight: 22,
  },
});

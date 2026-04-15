import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';
import { useTranslation } from '@/hooks/useTranslation';

interface TranslationOverlayProps {
  text: string;
  visible: boolean;
  onDismiss: () => void;
}

export function TranslationOverlay({ text, visible, onDismiss }: TranslationOverlayProps) {
  const theme = useTheme();
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
          Translation
        </Text>
        <IconButton icon="close" size={16} onPress={onDismiss} style={styles.closeButton} />
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 8 }}>
            Translating...
          </Text>
        </View>
      )}

      {error && (
        <Text variant="bodySmall" style={{ color: theme.colors.error }}>
          {error}
        </Text>
      )}

      {translation && (
        <Text variant="bodyMedium" style={[styles.translationText, { color: theme.colors.onSurface }]}>
          {translation.itemTranslation}
        </Text>
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
  translationText: {
    lineHeight: 22,
  },
});

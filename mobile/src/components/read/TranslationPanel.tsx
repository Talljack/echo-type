import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, IconButton, Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import {
  cacheTranslation,
  getCachedTranslation,
  type TranslationResult,
  translateText,
} from '@/services/translation-api';

interface TranslationPanelProps {
  selectedText: string;
  targetLang: string;
  context?: string;
  onClose: () => void;
  onAddToVocabulary?: (word: string, meaning: string, example?: string) => void;
}

export function TranslationPanel({
  selectedText,
  targetLang,
  context,
  onClose,
  onAddToVocabulary,
}: TranslationPanelProps) {
  const { colors, isDark } = useAppTheme();
  const borderMuted = colors.surfaceVariant;

  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedText) {
      loadTranslation();
    }
  }, [selectedText, targetLang]);

  const loadTranslation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check cache first
      const cached = await getCachedTranslation(selectedText, targetLang);

      if (cached) {
        setTranslation(cached);
        setIsLoading(false);
        return;
      }

      // Fetch from API
      const result = await translateText(selectedText, targetLang, context);
      setTranslation(result);

      // Cache the result
      await cacheTranslation(selectedText, targetLang, result);
    } catch (err) {
      console.error('Translation failed:', err);
      setError(err instanceof Error ? err.message : 'Translation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToVocabulary = () => {
    if (translation && onAddToVocabulary) {
      onAddToVocabulary(selectedText, translation.itemTranslation, translation.exampleSentence || undefined);
    }
  };

  if (!selectedText) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { borderBottomColor: borderMuted }]}>
        <Text variant="labelMedium" style={[styles.headerText, { color: colors.onSurfaceSecondary }]}>
          Translation
        </Text>
        <IconButton icon="close" size={20} onPress={onClose} />
      </View>

      <View style={styles.content}>
        {/* Original Text */}
        <Text variant="bodyMedium" style={[styles.originalText, { color: colors.onSurfaceSecondary }]}>
          {selectedText}
        </Text>

        <View style={[styles.divider, { backgroundColor: borderMuted }]} />

        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text variant="bodySmall" style={{ color: colors.onSurfaceSecondary }}>
              Translating...
            </Text>
          </View>
        )}

        {/* Error State */}
        {error && (
          <Text variant="bodyMedium" style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
        )}

        {/* Translation Result */}
        {translation && !isLoading && (
          <>
            <Text variant="bodyLarge" style={[styles.translationText, { color: colors.onSurface }]}>
              {translation.itemTranslation}
            </Text>

            {/* Pronunciation (IPA) */}
            {translation.pronunciation && (
              <Text variant="bodySmall" style={[styles.pronunciation, { color: colors.primary }]}>
                /{translation.pronunciation}/
              </Text>
            )}

            {/* Example Sentence */}
            {translation.exampleSentence && (
              <View style={[styles.exampleContainer, { backgroundColor: colors.surfaceVariant }]}>
                <Text variant="labelSmall" style={[styles.exampleLabel, { color: colors.onSurfaceSecondary }]}>
                  Example:
                </Text>
                <Text variant="bodySmall" style={[styles.exampleText, { color: colors.onSurface }]}>
                  {translation.exampleSentence}
                </Text>
                {translation.exampleTranslation && (
                  <Text variant="bodySmall" style={[styles.exampleTranslation, { color: colors.onSurfaceSecondary }]}>
                    {translation.exampleTranslation}
                  </Text>
                )}
              </View>
            )}

            {/* Add to Vocabulary Button */}
            {onAddToVocabulary && (
              <Button mode="contained" icon="plus" onPress={handleAddToVocabulary} style={styles.addButton}>
                Add to Vocabulary
              </Button>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  headerText: {
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  originalText: {
    marginBottom: 12,
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {},
  translationText: {
    fontWeight: '500',
    marginBottom: 8,
  },
  pronunciation: {
    fontStyle: 'italic',
    marginBottom: 12,
  },
  exampleContainer: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  exampleLabel: {
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  exampleText: {
    marginBottom: 4,
  },
  exampleTranslation: {
    fontStyle: 'italic',
  },
  addButton: {
    marginTop: 12,
  },
});

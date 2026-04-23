import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { fontFamily } from '@/theme/typography';
import type { Content } from '@/types/content';

interface PracticeRecommendationSectionProps {
  title: string;
  emptyLabel: string;
  generatingLabel: string;
  retryLabel: string;
  goToSettingsLabel: string;
  content: Content;
  onSelect: (contentId: string) => void;
}

export function PracticeRecommendationSection({
  title,
  emptyLabel,
  generatingLabel,
  retryLabel,
  goToSettingsLabel,
  content,
  onSelect,
}: PracticeRecommendationSectionProps) {
  const { colors, getModuleColors } = useAppTheme();
  const libraryItems = useLibraryStore((s) => s.contents);
  const addContent = useLibraryStore((s) => s.addContent);
  const settings = useSettingsStore((s) => s.settings);
  const { recommendations, isLoading, error, fetchRecommendations } = useRecommendations();
  const aiColors = getModuleColors('library');

  useEffect(() => {
    if (!settings.enableRecommendations || !content.text) return;
    const timer = setTimeout(() => {
      void fetchRecommendations(content.text, content.type, settings.recommendationCount);
    }, 900);
    return () => clearTimeout(timer);
  }, [content.text, content.type, fetchRecommendations, settings.enableRecommendations, settings.recommendationCount]);

  if (!settings.enableRecommendations) {
    return null;
  }

  const handleSelect = (index: number) => {
    const item = recommendations[index];
    if (!item) return;
    const existing = libraryItems.find(
      (candidate) =>
        candidate.title.trim().toLowerCase() === item.title.trim().toLowerCase() &&
        candidate.text.trim() === item.text.trim(),
    );

    if (existing) {
      onSelect(existing.id);
      return;
    }

    const now = Date.now();
    const nextContent: Content = {
      id: `rec_${now}_${Math.random().toString(36).slice(2, 8)}`,
      title: item.title,
      type: item.type,
      content: item.text,
      text: item.text,
      language: content.language,
      difficulty: content.difficulty,
      tags: [item.relation],
      source: 'ai-generated',
      createdAt: now,
      updatedAt: now,
      isStarred: false,
      progress: 0,
      fsrsCard: content.fsrsCard,
    };
    addContent(nextContent);
    onSelect(nextContent.id);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.iconWrap, { backgroundColor: aiColors.background }]}>
            <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color={aiColors.primary} />
          </View>
          <Text variant="titleMedium" style={[styles.title, { color: colors.onSurface }]}>
            {title}
          </Text>
        </View>
        {recommendations.length > 0 ? (
          <Text variant="labelSmall" style={[styles.count, { color: colors.onSurfaceSecondary }]}>
            {recommendations.length}
          </Text>
        ) : null}
      </View>

      {isLoading ? (
        <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Text style={[styles.emptyText, { color: colors.onSurfaceSecondary }]}>{generatingLabel}</Text>
        </View>
      ) : error ? (
        <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Text style={[styles.emptyText, { color: colors.error }]}>{error}</Text>
          <View style={styles.errorActions}>
            <Button mode="text" compact onPress={() => void fetchRecommendations(content.text, content.type)}>
              {retryLabel}
            </Button>
            {error.toLowerCase().includes('configured') || error.toLowerCase().includes('api key') ? (
              <Text variant="bodySmall" style={{ color: colors.onSurfaceSecondary }}>
                {goToSettingsLabel}
              </Text>
            ) : null}
          </View>
        </View>
      ) : recommendations.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Text style={[styles.emptyText, { color: colors.onSurfaceSecondary }]}>{emptyLabel}</Text>
          <Button mode="text" compact onPress={() => void fetchRecommendations(content.text, content.type)}>
            {retryLabel}
          </Button>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {recommendations.map((item, index) => (
            <Pressable
              key={`${item.title}-${index}`}
              onPress={() => handleSelect(index)}
              hitSlop={10}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.borderLight },
                pressed && { opacity: 0.88 },
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: aiColors.background }]}>
                <MaterialCommunityIcons name="star-four-points-outline" size={18} color={aiColors.primary} />
              </View>
              <Text numberOfLines={2} style={[styles.cardTitle, { color: colors.onSurface }]}>
                {item.title}
              </Text>
              <Text style={[styles.badge, { color: aiColors.primary }]}>{item.relation}</Text>
              <Text numberOfLines={3} style={[styles.cardBody, { color: colors.onSurfaceSecondary }]}>
                {item.text}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  title: {
    fontFamily: fontFamily.heading,
  },
  count: {
    fontFamily: fontFamily.bodyMedium,
  },
  row: {
    gap: 12,
    paddingBottom: 4,
  },
  card: {
    width: 240,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    marginBottom: 6,
    fontFamily: fontFamily.bodyMedium,
  },
  badge: {
    fontSize: 12,
    marginBottom: 8,
    textTransform: 'capitalize',
    fontFamily: fontFamily.bodyMedium,
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fontFamily.body,
  },
  empty: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fontFamily.body,
  },
  errorActions: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
});

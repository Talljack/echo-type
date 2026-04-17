import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Appbar, Chip, Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import { getWordBook, loadWordBookItems } from '@/lib/wordbooks';
import { fontFamily } from '@/theme/typography';
import type { WordItem } from '@/types/wordbook';

export default function WordbookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, getModuleColors } = useAppTheme();
  const vocabColors = getModuleColors('vocabulary');

  const book = id ? getWordBook(id) : undefined;
  const [items, setItems] = useState<WordItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      setLoading(true);
      loadWordBookItems(id).then((loaded) => {
        setItems(loaded);
        setLoading(false);
      });
    }
  }, [id]);

  if (!book) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text variant="headlineSmall" style={{ color: colors.onSurface, padding: 20 }}>
          Wordbook not found
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={vocabColors.gradient} style={styles.headerGradient}>
        <Appbar.Header style={styles.appbar}>
          <Appbar.BackAction onPress={() => router.back()} color={colors.onPrimary} />
          <Appbar.Content
            title={book.name}
            titleStyle={[styles.headerTitle, { color: colors.onPrimary, fontFamily: fontFamily.heading }]}
          />
        </Appbar.Header>
        <View style={styles.headerInfo}>
          <Text style={styles.headerEmoji}>{book.emoji}</Text>
          <Text style={[styles.headerDesc, { color: colors.onPrimary, fontFamily: fontFamily.body }]}>
            {book.description}
          </Text>
          <View style={styles.headerMeta}>
            <Chip style={styles.headerChip} textStyle={[styles.headerChipText, { color: colors.onPrimary }]}>
              {book.difficulty}
            </Chip>
            <Text style={[styles.headerCount, { color: colors.onPrimary }]}>{items.length} words</Text>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
            Loading words...
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => `${item.title}-${index}`}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.wordCard,
                { backgroundColor: colors.surface },
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <View style={styles.wordContent}>
                <Text style={[styles.wordTitle, { color: colors.onSurface, fontFamily: fontFamily.heading }]}>
                  {item.title}
                </Text>
                {item.text !== item.title && (
                  <Text style={[styles.wordExample, { color: colors.onSurfaceSecondary }]} numberOfLines={2}>
                    {item.text}
                  </Text>
                )}
              </View>
              <MaterialCommunityIcons name="volume-high" size={20} color={vocabColors.primary} />
            </Pressable>
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingBottom: 20,
  },
  appbar: {
    backgroundColor: 'transparent',
    elevation: 0,
  },
  headerTitle: {
    fontWeight: '600',
  },
  headerInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  headerDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    opacity: 0.92,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerChipText: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  headerCount: {
    fontSize: 14,
    opacity: 0.92,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  wordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 6,
    borderCurve: 'continuous',
  },
  wordContent: {
    flex: 1,
  },
  wordTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  wordExample: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
});

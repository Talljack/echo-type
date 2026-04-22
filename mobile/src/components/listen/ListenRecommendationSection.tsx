import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import { fontFamily } from '@/theme/typography';
import type { Content } from '@/types/content';

interface ListenRecommendationSectionProps {
  title: string;
  emptyLabel: string;
  items: Content[];
  onSelect: (contentId: string) => void;
}

export function ListenRecommendationSection({ title, emptyLabel, items, onSelect }: ListenRecommendationSectionProps) {
  const { colors, getModuleColors } = useAppTheme();
  const listenColors = getModuleColors('listen');

  return (
    <View>
      <Text style={[styles.title, { color: colors.onSurface }]}>{title}</Text>
      {items.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Text style={[styles.emptyText, { color: colors.onSurfaceSecondary, fontFamily: fontFamily.body }]}>
            {emptyLabel}
          </Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => onSelect(item.id)}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.borderLight },
                pressed && { opacity: 0.88 },
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: listenColors.background }]}>
                <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color={listenColors.primary} />
              </View>
              <Text
                style={[styles.cardTitle, { color: colors.onSurface, fontFamily: fontFamily.bodyMedium }]}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              <Text style={[styles.cardMeta, { color: colors.onSurfaceSecondary, fontFamily: fontFamily.body }]}>
                {item.type} · {item.difficulty}
              </Text>
              <Text
                style={[styles.cardText, { color: colors.onSurfaceSecondary, fontFamily: fontFamily.body }]}
                numberOfLines={3}
              >
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
  title: {
    fontSize: 20,
    fontFamily: fontFamily.heading,
    marginBottom: 12,
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
  },
  cardMeta: {
    fontSize: 12,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  cardText: {
    fontSize: 13,
    lineHeight: 19,
  },
  empty: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

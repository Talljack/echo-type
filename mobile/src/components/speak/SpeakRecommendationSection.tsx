import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { fontFamily } from '@/theme/typography';

interface RecommendationCard {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  colors: readonly [string, string];
  onPress: () => void;
}

interface SpeakRecommendationSectionProps {
  title: string;
  cards: RecommendationCard[];
}

export function SpeakRecommendationSection({ title, cards }: SpeakRecommendationSectionProps) {
  return (
    <View>
      <Text style={styles.title}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {cards.map((card) => (
          <Pressable
            key={card.key}
            onPress={card.onPress}
            style={({ pressed }) => [styles.cardWrap, pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] }]}
          >
            <LinearGradient colors={[...card.colors]} style={styles.card}>
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons name={card.icon} size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardSubtitle} numberOfLines={2}>
                {card.subtitle}
              </Text>
            </LinearGradient>
          </Pressable>
        ))}
      </ScrollView>
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
  cardWrap: {
    width: 220,
  },
  card: {
    borderRadius: 22,
    padding: 16,
    minHeight: 140,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: fontFamily.bodyMedium,
    marginBottom: 8,
  },
  cardSubtitle: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fontFamily.body,
  },
});

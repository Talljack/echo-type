import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { fontFamily } from '@/theme/typography';

interface ContinuationCard {
  key: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
  colors: readonly [string, string];
  onPress: () => void;
}

interface ListenContinuationSectionProps {
  title: string;
  cards: ContinuationCard[];
}

export function ListenContinuationSection({ title, cards }: ListenContinuationSectionProps) {
  return (
    <View>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.list}>
        {cards.map((card) => (
          <Pressable
            key={card.key}
            onPress={card.onPress}
            style={({ pressed }) => [pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}
          >
            <LinearGradient colors={[...card.colors]} style={styles.card}>
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons name={card.icon} size={20} color="#FFFFFF" />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {card.description}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontFamily: fontFamily.heading,
    marginBottom: 12,
  },
  list: {
    gap: 12,
  },
  card: {
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: fontFamily.bodyMedium,
    marginBottom: 4,
  },
  cardDesc: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fontFamily.body,
  },
});

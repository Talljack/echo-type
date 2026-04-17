import { MaterialCommunityIcons } from '@expo/vector-icons';
import { type Href, router } from 'expo-router';
import { type ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/contexts/ThemeContext';
import { haptics } from '@/lib/haptics';
import { moduleColors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: IconName;
  iconColor: string;
  iconBg: string;
  route: Href;
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'library',
    title: 'Library',
    subtitle: 'Manage your learning content',
    icon: 'bookshelf',
    iconColor: moduleColors.library.primary,
    iconBg: moduleColors.library.background,
    route: '/(tabs)/library' as Href,
  },
  {
    id: 'vocabulary',
    title: 'Vocabulary',
    subtitle: 'Review flashcards & spaced repetition',
    icon: 'card-text-outline',
    iconColor: moduleColors.vocabulary.primary,
    iconBg: moduleColors.vocabulary.background,
    route: '/(tabs)/vocabulary' as Href,
  },
  {
    id: 'wordbooks',
    title: 'Wordbooks',
    subtitle: 'Browse vocabulary collections',
    icon: 'book-open-page-variant',
    iconColor: moduleColors.ai.primary,
    iconBg: moduleColors.ai.background,
    route: '/wordbooks' as Href,
  },
  {
    id: 'chat',
    title: 'AI Tutor',
    subtitle: 'Practice with your AI language tutor',
    icon: 'robot',
    iconColor: moduleColors.ai.primary,
    iconBg: moduleColors.ai.background,
    route: '/chat' as Href,
  },
  {
    id: 'review',
    title: 'Review',
    subtitle: 'Daily spaced repetition review',
    icon: 'cards',
    iconColor: '#34C759',
    iconBg: '#E8F8EC',
    route: '/review' as Href,
  },
  {
    id: 'settings',
    title: 'Settings',
    subtitle: 'Theme, AI provider, language & more',
    icon: 'cog-outline',
    iconColor: '#8E8E93',
    iconBg: '#F2F2F7',
    route: '/(tabs)/settings' as Href,
  },
];

export default function MoreScreen() {
  const { colors } = useAppTheme();

  const handlePress = (item: MenuItem) => {
    void haptics.light();
    router.push(item.route);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.onBackground }]}>More</Text>
        </View>

        <View style={styles.menuList}>
          {MENU_ITEMS.map((item, index) => (
            <Animated.View key={item.id} entering={FadeInDown.delay(100 + index * 50)}>
              <Pressable
                style={({ pressed }) => [
                  styles.menuItem,
                  { backgroundColor: colors.surface },
                  pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
                ]}
                onPress={() => handlePress(item)}
              >
                <View style={[styles.menuIcon, { backgroundColor: item.iconBg }]}>
                  <MaterialCommunityIcons name={item.icon} size={24} color={item.iconColor} />
                </View>
                <View style={styles.menuText}>
                  <Text style={[styles.menuTitle, { color: colors.onSurface }]}>{item.title}</Text>
                  <Text style={[styles.menuSubtitle, { color: colors.onSurfaceSecondary }]}>{item.subtitle}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={colors.onSurfaceSecondary} />
              </Pressable>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 140,
  },
  header: {
    paddingVertical: 20,
  },
  title: {
    fontFamily: fontFamily.headingBold,
    fontWeight: '700',
    fontSize: 34,
    letterSpacing: 0.4,
  },
  menuList: {
    gap: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderCurve: 'continuous',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontFamily: fontFamily.heading,
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 18,
  },
});

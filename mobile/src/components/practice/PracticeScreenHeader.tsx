import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import { fontFamily } from '@/theme/typography';

type PracticeModule = 'listen' | 'read' | 'speak' | 'write';

interface PracticeScreenHeaderProps {
  title: string;
  subtitle: string;
  currentModule: PracticeModule;
  contentId: string;
  backFallbackRoute: '/(tabs)/listen' | '/(tabs)/read' | '/(tabs)/speak' | '/(tabs)/write';
  textColor?: string;
}

const MODULES: Array<{
  key: PracticeModule;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}> = [
  { key: 'listen', label: 'Listen', icon: 'headphones' },
  { key: 'read', label: 'Read', icon: 'book-open-variant' },
  { key: 'speak', label: 'Speak', icon: 'message-text-outline' },
  { key: 'write', label: 'Write', icon: 'keyboard-outline' },
];

function buildRoute(module: PracticeModule, contentId: string) {
  if (module === 'speak') {
    return { pathname: '/practice/speak/conversation', params: { contentId } } as const;
  }
  return `/practice/${module}/${contentId}` as const;
}

export function PracticeScreenHeader({
  title,
  subtitle,
  currentModule,
  contentId,
  backFallbackRoute,
  textColor = '#FFFFFF',
}: PracticeScreenHeaderProps) {
  const { colors, getModuleColors } = useAppTheme();

  return (
    <>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace(backFallbackRoute);
            }
          }}
          color={textColor}
        />
        <Appbar.Content title={title} titleStyle={[styles.headerTitle, { color: textColor }]} />
      </Appbar.Header>

      <View style={styles.info}>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: textColor }]}>
          {subtitle}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.moduleRow}
          style={styles.moduleScroll}
        >
          {MODULES.map((module) => {
            const isActive = module.key === currentModule;
            const moduleColors = getModuleColors(module.key);
            return (
              <Pressable
                key={module.key}
                onPress={() => {
                  const route = buildRoute(module.key, contentId);
                  if (typeof route === 'string') {
                    router.push(route);
                  } else {
                    router.push(route);
                  }
                }}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.moduleChip,
                  {
                    backgroundColor: isActive ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.12)',
                    borderColor: isActive ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.16)',
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.moduleIconWrap,
                    { backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : `${moduleColors.background}33` },
                  ]}
                >
                  <MaterialCommunityIcons name={module.icon} size={16} color={textColor} />
                </View>
                <Text
                  variant="labelMedium"
                  style={[styles.moduleLabel, { color: textColor }, isActive && styles.moduleLabelActive]}
                >
                  {module.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  appbar: {
    backgroundColor: 'transparent',
    elevation: 0,
  },
  headerTitle: {
    fontFamily: fontFamily.headingBold,
    fontWeight: '600',
  },
  info: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    opacity: 0.88,
  },
  moduleScroll: {
    marginHorizontal: -2,
  },
  moduleRow: {
    gap: 8,
    paddingHorizontal: 2,
  },
  moduleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  moduleIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleLabel: {
    fontFamily: fontFamily.bodyMedium,
  },
  moduleLabelActive: {
    fontWeight: '700',
  },
});

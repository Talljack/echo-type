import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { Divider, Text } from 'react-native-paper';
import { Card } from '@/components/ui/Card';
import { useAppTheme } from '@/contexts/ThemeContext';
import { haptics } from '@/lib/haptics';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { fontFamily } from '@/theme/typography';

const UI_LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'zh', label: '中文 (Chinese)' },
  { id: 'ja', label: '日本語 (Japanese)' },
  { id: 'ko', label: '한국어 (Korean)' },
] as const;

export function LanguageSection() {
  const { colors } = useAppTheme();
  const { settings, updateSettings } = useSettingsStore();

  return (
    <Card variant="elevated" padding={0}>
      <View style={styles.headerRow}>
        <View style={styles.settingInfo}>
          <View style={[styles.iconContainer, { backgroundColor: colors.surfaceVariant }]}>
            <MaterialCommunityIcons name="web" size={22} color={colors.primary} />
          </View>
          <View style={styles.settingText}>
            <Text variant="bodyLarge" style={[styles.title, { color: colors.onSurface }]}>
              Interface Language
            </Text>
            <Text variant="bodySmall" style={[styles.subtitle, { color: colors.onSurfaceSecondary }]}>
              App menus and labels
            </Text>
          </View>
        </View>
      </View>

      <Divider style={{ backgroundColor: colors.borderLight }} />

      {UI_LANGUAGES.map((lang, index) => {
        const selected = lang.id === settings.language;
        return (
          <View key={lang.id}>
            {index > 0 && <Divider style={{ backgroundColor: colors.borderLight }} />}
            <Pressable
              style={({ pressed }) => [styles.optionRow, pressed && { backgroundColor: colors.pressed }]}
              onPress={() => {
                void haptics.tap();
                void updateSettings({ language: lang.id });
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              <Text
                variant="bodyLarge"
                style={[styles.optionLabel, { color: colors.onSurface, fontFamily: fontFamily.body }]}
              >
                {lang.label}
              </Text>
              {selected ? (
                <MaterialCommunityIcons name="check" size={22} color={colors.primary} />
              ) : (
                <View style={styles.checkPlaceholder} />
              )}
            </Pressable>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 60,
  },
  settingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderCurve: 'continuous',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamily.bodyMedium,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    marginTop: 2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  optionLabel: {
    flex: 1,
  },
  checkPlaceholder: {
    width: 22,
    height: 22,
  },
});

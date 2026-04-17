import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Divider, Switch, Text } from 'react-native-paper';
import { Card } from '@/components/ui/Card';
import { useAppTheme } from '@/contexts/ThemeContext';
import { haptics } from '@/lib/haptics';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { fontFamily } from '@/theme/typography';

const TARGET_LANGS = ['zh', 'ja', 'ko', 'es', 'fr', 'de', 'pt', 'ru'] as const;
type TargetLang = (typeof TARGET_LANGS)[number];

const TARGET_LANG_LABELS: Record<TargetLang, string> = {
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  ru: 'Russian',
};

function isTargetLang(value: string): value is TargetLang {
  return (TARGET_LANGS as readonly string[]).includes(value);
}

export function TranslationSection() {
  const { colors } = useAppTheme();
  const { settings, updateSettings } = useSettingsStore();
  const [targetLangExpanded, setTargetLangExpanded] = useState(false);

  const currentLang: TargetLang | '' = isTargetLang(settings.translationTargetLang)
    ? settings.translationTargetLang
    : '';
  const langLabel = currentLang ? TARGET_LANG_LABELS[currentLang] : 'Select language';

  const toggleTargetLangList = () => {
    void haptics.light();
    setTargetLangExpanded((v) => !v);
  };

  return (
    <Card variant="elevated" padding={0}>
      <Pressable
        style={styles.settingItem}
        onPress={toggleTargetLangList}
        accessibilityRole="button"
        accessibilityLabel="Select translation target language"
        accessibilityState={{ expanded: targetLangExpanded }}
      >
        <View style={styles.settingInfo}>
          <View style={[styles.settingIconContainer, { backgroundColor: colors.surfaceVariant }]}>
            <MaterialCommunityIcons name="translate" size={22} color={colors.primary} />
          </View>
          <View style={styles.settingText}>
            <Text variant="bodyLarge" style={[styles.title, { color: colors.onSurface }]}>
              Target language
            </Text>
            <Text variant="bodySmall" style={[styles.subtitle, { color: colors.onSurfaceSecondary }]}>
              {langLabel}
            </Text>
          </View>
        </View>
        <MaterialCommunityIcons
          name={targetLangExpanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={colors.onSurfaceSecondary}
        />
      </Pressable>

      {targetLangExpanded && (
        <View style={styles.langList}>
          {TARGET_LANGS.map((code, index) => {
            const selected = settings.translationTargetLang === code;
            return (
              <View key={code}>
                {index > 0 && <Divider style={{ backgroundColor: colors.borderLight }} />}
                <Pressable
                  style={({ pressed }) => [styles.optionRow, pressed && { backgroundColor: colors.pressed }]}
                  onPress={() => {
                    void haptics.tap();
                    void updateSettings({ translationTargetLang: code });
                    setTargetLangExpanded(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Text
                    variant="bodyLarge"
                    style={[styles.optionLabel, { color: colors.onSurface, fontFamily: fontFamily.body }]}
                  >
                    {TARGET_LANG_LABELS[code]}
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
        </View>
      )}

      <Divider style={{ backgroundColor: colors.borderLight }} />

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <View style={[styles.settingIconContainer, { backgroundColor: colors.surfaceVariant }]}>
            <MaterialCommunityIcons name="headphones" size={22} color={colors.primary} />
          </View>
          <View style={styles.settingText}>
            <Text variant="bodyLarge" style={[styles.title, { color: colors.onSurface }]}>
              Listen
            </Text>
            <Text variant="bodySmall" style={[styles.subtitle, { color: colors.onSurfaceSecondary }]}>
              Show translation in Listen
            </Text>
          </View>
        </View>
        <Switch
          value={settings.showListenTranslation}
          onValueChange={(showListenTranslation) => {
            void haptics.tap();
            updateSettings({ showListenTranslation });
          }}
        />
      </View>

      <Divider style={{ backgroundColor: colors.borderLight }} />

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <View style={[styles.settingIconContainer, { backgroundColor: colors.surfaceVariant }]}>
            <MaterialCommunityIcons name="book-open-page-variant" size={22} color={colors.primary} />
          </View>
          <View style={styles.settingText}>
            <Text variant="bodyLarge" style={[styles.title, { color: colors.onSurface }]}>
              Read
            </Text>
            <Text variant="bodySmall" style={[styles.subtitle, { color: colors.onSurfaceSecondary }]}>
              Show translation in Read
            </Text>
          </View>
        </View>
        <Switch
          value={settings.showReadTranslation}
          onValueChange={(showReadTranslation) => {
            void haptics.tap();
            updateSettings({ showReadTranslation });
          }}
        />
      </View>

      <Divider style={{ backgroundColor: colors.borderLight }} />

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <View style={[styles.settingIconContainer, { backgroundColor: colors.surfaceVariant }]}>
            <MaterialCommunityIcons name="microphone" size={22} color={colors.primary} />
          </View>
          <View style={styles.settingText}>
            <Text variant="bodyLarge" style={[styles.title, { color: colors.onSurface }]}>
              Speak
            </Text>
            <Text variant="bodySmall" style={[styles.subtitle, { color: colors.onSurfaceSecondary }]}>
              Show translation in Speak
            </Text>
          </View>
        </View>
        <Switch
          value={settings.showSpeakTranslation}
          onValueChange={(showSpeakTranslation) => {
            void haptics.tap();
            updateSettings({ showSpeakTranslation });
          }}
        />
      </View>

      <Divider style={{ backgroundColor: colors.borderLight }} />

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <View style={[styles.settingIconContainer, { backgroundColor: colors.surfaceVariant }]}>
            <MaterialCommunityIcons name="keyboard-outline" size={22} color={colors.primary} />
          </View>
          <View style={styles.settingText}>
            <Text variant="bodyLarge" style={[styles.title, { color: colors.onSurface }]}>
              Write
            </Text>
            <Text variant="bodySmall" style={[styles.subtitle, { color: colors.onSurfaceSecondary }]}>
              Show translation in Write
            </Text>
          </View>
        </View>
        <Switch
          value={settings.showWriteTranslation}
          onValueChange={(showWriteTranslation) => {
            void haptics.tap();
            updateSettings({ showWriteTranslation });
          }}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 60,
  },
  settingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIconContainer: {
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
  langList: {
    paddingBottom: 4,
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

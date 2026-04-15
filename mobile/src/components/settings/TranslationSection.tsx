import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Divider, Menu, Switch, Text, useTheme } from 'react-native-paper';
import { Card } from '@/components/ui/Card';
import { useSettingsStore } from '@/stores/useSettingsStore';

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
  const theme = useTheme();
  const { settings, updateSettings } = useSettingsStore();
  const [langMenuVisible, setLangMenuVisible] = useState(false);

  const currentLang: TargetLang | '' = isTargetLang(settings.translationTargetLang)
    ? settings.translationTargetLang
    : '';
  const langLabel = currentLang ? TARGET_LANG_LABELS[currentLang] : 'Select language';

  return (
    <Card variant="elevated" padding={0}>
      <Menu
        visible={langMenuVisible}
        onDismiss={() => setLangMenuVisible(false)}
        anchor={
          <Pressable
            style={styles.settingItem}
            onPress={() => setLangMenuVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Select translation target language"
          >
            <View style={styles.settingInfo}>
              <View style={[styles.settingIconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                <MaterialCommunityIcons name="translate" size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.settingText}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                  Target language
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {langLabel}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-down" size={24} color={theme.colors.onSurfaceVariant} />
          </Pressable>
        }
      >
        {TARGET_LANGS.map((code) => (
          <Menu.Item
            key={code}
            onPress={() => {
              void updateSettings({ translationTargetLang: code });
              setLangMenuVisible(false);
            }}
            title={TARGET_LANG_LABELS[code]}
            leadingIcon={settings.translationTargetLang === code ? 'check' : undefined}
          />
        ))}
      </Menu>

      <Divider />

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <View style={[styles.settingIconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
            <MaterialCommunityIcons name="headphones" size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.settingText}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
              Listen
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Show translation in Listen
            </Text>
          </View>
        </View>
        <Switch
          value={settings.showListenTranslation}
          onValueChange={(showListenTranslation) => updateSettings({ showListenTranslation })}
        />
      </View>

      <Divider />

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <View style={[styles.settingIconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
            <MaterialCommunityIcons name="book-open-page-variant" size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.settingText}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
              Read
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Show translation in Read
            </Text>
          </View>
        </View>
        <Switch
          value={settings.showReadTranslation}
          onValueChange={(showReadTranslation) => updateSettings({ showReadTranslation })}
        />
      </View>

      <Divider />

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <View style={[styles.settingIconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
            <MaterialCommunityIcons name="microphone" size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.settingText}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
              Speak
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Show translation in Speak
            </Text>
          </View>
        </View>
        <Switch
          value={settings.showSpeakTranslation}
          onValueChange={(showSpeakTranslation) => updateSettings({ showSpeakTranslation })}
        />
      </View>

      <Divider />

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <View style={[styles.settingIconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
            <MaterialCommunityIcons name="keyboard-outline" size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.settingText}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
              Write
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Show translation in Write
            </Text>
          </View>
        </View>
        <Switch
          value={settings.showWriteTranslation}
          onValueChange={(showWriteTranslation) => updateSettings({ showWriteTranslation })}
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
});

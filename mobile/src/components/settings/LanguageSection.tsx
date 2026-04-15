import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Menu, Text, useTheme } from 'react-native-paper';
import { Card } from '@/components/ui/Card';
import { useSettingsStore } from '@/stores/useSettingsStore';

const UI_LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'zh', label: '中文 (Chinese)' },
  { id: 'ja', label: '日本語 (Japanese)' },
  { id: 'ko', label: '한국어 (Korean)' },
];

export function LanguageSection() {
  const theme = useTheme();
  const { settings, updateSettings } = useSettingsStore();
  const [menuVisible, setMenuVisible] = useState(false);

  const selectedLang = UI_LANGUAGES.find((l) => l.id === settings.language);

  return (
    <Card variant="elevated" padding={0}>
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <Pressable style={styles.settingItem} onPress={() => setMenuVisible(true)}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                <MaterialCommunityIcons name="web" size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.settingText}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                  Interface Language
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {selectedLang?.label || 'English'}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-down" size={24} color={theme.colors.onSurfaceVariant} />
          </Pressable>
        }
      >
        {UI_LANGUAGES.map((lang) => (
          <Menu.Item
            key={lang.id}
            onPress={() => {
              void updateSettings({ language: lang.id });
              setMenuVisible(false);
            }}
            title={lang.label}
            leadingIcon={lang.id === settings.language ? 'check' : undefined}
          />
        ))}
      </Menu>
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
  iconContainer: {
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

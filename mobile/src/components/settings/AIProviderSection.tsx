import { MaterialCommunityIcons } from '@expo/vector-icons';
import { type ComponentProps, useState } from 'react';
import { Pressable, TextInput as RNTextInput, StyleSheet, View } from 'react-native';
import { Divider, Text } from 'react-native-paper';
import { Card } from '@/components/ui/Card';
import { useAppTheme } from '@/contexts/ThemeContext';
import { haptics } from '@/lib/haptics';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { fontFamily } from '@/theme/typography';

export const AI_PROVIDER_IDS = ['openai', 'anthropic', 'deepseek', 'groq', 'openrouter', 'custom'] as const;
export type AIProviderId = (typeof AI_PROVIDER_IDS)[number];

const AI_PROVIDER_LABELS: Record<AIProviderId, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  deepseek: 'DeepSeek',
  groq: 'Groq',
  openrouter: 'OpenRouter',
  custom: 'Custom',
};

type MciName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const AI_PROVIDER_ICONS: Record<AIProviderId, MciName> = {
  openai: 'robot-outline',
  anthropic: 'brain',
  deepseek: 'lightning-bolt-outline',
  groq: 'flash',
  openrouter: 'cloud-outline',
  custom: 'cog-outline',
};

/** Default API base URLs aligned with web `PROVIDER_REGISTRY` (mobile AI client). */
const AI_PROVIDER_BASE_URLS: Record<Exclude<AIProviderId, 'custom'>, string> = {
  openai: 'https://api.openai.com',
  anthropic: 'https://api.anthropic.com',
  deepseek: 'https://api.deepseek.com',
  groq: 'https://api.groq.com',
  openrouter: 'https://openrouter.ai',
};

function isProviderId(value: string): value is AIProviderId {
  return (AI_PROVIDER_IDS as readonly string[]).includes(value);
}

export function AIProviderSection() {
  const { colors } = useAppTheme();
  const { settings, updateSettings } = useSettingsStore();
  const [providerListExpanded, setProviderListExpanded] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const currentProvider: AIProviderId | '' = isProviderId(settings.aiProvider) ? settings.aiProvider : '';
  const providerLabel = currentProvider ? AI_PROVIDER_LABELS[currentProvider] : 'Select provider';

  const handleSelectProvider = (id: AIProviderId) => {
    void haptics.tap();
    const baseUrl = id === 'custom' ? '' : AI_PROVIDER_BASE_URLS[id];
    void updateSettings({ aiProvider: id, aiBaseUrl: baseUrl });
    setProviderListExpanded(false);
  };

  const toggleProviderList = () => {
    void haptics.light();
    setProviderListExpanded((v) => !v);
  };

  const inputSurface = {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
    borderCurve: 'continuous' as const,
  };

  return (
    <Card variant="elevated" padding={0}>
      <Pressable
        style={styles.settingItem}
        onPress={toggleProviderList}
        accessibilityRole="button"
        accessibilityLabel="Select AI provider"
        accessibilityState={{ expanded: providerListExpanded }}
      >
        <View style={styles.settingInfo}>
          <View style={[styles.settingIconContainer, { backgroundColor: colors.surfaceVariant }]}>
            <MaterialCommunityIcons name="robot-outline" size={22} color={colors.primary} />
          </View>
          <View style={styles.settingText}>
            <Text variant="bodyLarge" style={[styles.title, { color: colors.onSurface }]}>
              AI Provider
            </Text>
            <Text variant="bodySmall" style={[styles.subtitle, { color: colors.onSurfaceSecondary }]}>
              {providerLabel}
            </Text>
          </View>
        </View>
        <MaterialCommunityIcons
          name={providerListExpanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={colors.onSurfaceSecondary}
        />
      </Pressable>

      {providerListExpanded && (
        <View style={styles.providerList}>
          {AI_PROVIDER_IDS.map((id, index) => {
            const selected = currentProvider === id;
            return (
              <View key={id}>
                {index > 0 && <Divider style={{ backgroundColor: colors.borderLight }} />}
                <Pressable
                  style={({ pressed }) => [styles.providerRow, pressed && { backgroundColor: colors.pressed }]}
                  onPress={() => handleSelectProvider(id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <View style={[styles.providerIconWrap, { backgroundColor: colors.surfaceVariant }]}>
                    <MaterialCommunityIcons name={AI_PROVIDER_ICONS[id]} size={20} color={colors.primary} />
                  </View>
                  <Text
                    variant="bodyLarge"
                    style={[styles.providerLabel, { color: colors.onSurface, fontFamily: fontFamily.body }]}
                  >
                    {AI_PROVIDER_LABELS[id]}
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

      <View style={styles.inputBlock}>
        <Text variant="labelLarge" style={[styles.fieldLabel, { color: colors.onSurfaceSecondary }]}>
          API Key
        </Text>
        <View style={[styles.iosInputWrap, inputSurface]}>
          <RNTextInput
            value={settings.aiApiKey}
            onChangeText={(aiApiKey) => updateSettings({ aiApiKey })}
            secureTextEntry={!showApiKey}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="sk-…"
            placeholderTextColor={colors.onSurfaceSecondary}
            style={[styles.iosInput, { color: colors.onSurface, fontFamily: fontFamily.body }]}
          />
          <Pressable
            onPress={() => {
              void haptics.tap();
              setShowApiKey((v) => !v);
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={showApiKey ? 'Hide API key' : 'Show API key'}
          >
            <MaterialCommunityIcons
              name={showApiKey ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={colors.onSurfaceSecondary}
            />
          </Pressable>
        </View>
      </View>

      <Divider style={{ backgroundColor: colors.borderLight }} />

      <View style={styles.inputBlock}>
        <Text variant="labelLarge" style={[styles.fieldLabel, { color: colors.onSurfaceSecondary }]}>
          Model
        </Text>
        <View style={[styles.iosInputWrap, styles.iosInputSingle, inputSurface]}>
          <RNTextInput
            value={settings.aiModel}
            onChangeText={(aiModel) => updateSettings({ aiModel })}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="e.g. gpt-4o-mini"
            placeholderTextColor={colors.onSurfaceSecondary}
            style={[styles.iosInput, { color: colors.onSurface, fontFamily: fontFamily.body }]}
          />
        </View>
      </View>

      {currentProvider === 'custom' && (
        <>
          <Divider style={{ backgroundColor: colors.borderLight }} />
          <View style={styles.inputBlock}>
            <Text variant="labelLarge" style={[styles.fieldLabel, { color: colors.onSurfaceSecondary }]}>
              Base URL
            </Text>
            <View style={[styles.iosInputWrap, styles.iosInputSingle, inputSurface]}>
              <RNTextInput
                value={settings.aiBaseUrl}
                onChangeText={(aiBaseUrl) => updateSettings({ aiBaseUrl })}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="https://…"
                placeholderTextColor={colors.onSurfaceSecondary}
                style={[styles.iosInput, { color: colors.onSurface, fontFamily: fontFamily.body }]}
              />
            </View>
          </View>
        </>
      )}
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
  providerList: {
    paddingBottom: 4,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  providerIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderCurve: 'continuous',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  providerLabel: {
    flex: 1,
  },
  checkPlaceholder: {
    width: 22,
    height: 22,
  },
  inputBlock: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  fieldLabel: {
    fontFamily: fontFamily.bodyMedium,
    marginBottom: 8,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  iosInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    minHeight: 48,
  },
  iosInputSingle: {
    paddingVertical: 0,
  },
  iosInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    paddingRight: 8,
  },
});

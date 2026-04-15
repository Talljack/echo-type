import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Divider, Menu, Text, TextInput, useTheme } from 'react-native-paper';
import { Card } from '@/components/ui/Card';
import { useSettingsStore } from '@/stores/useSettingsStore';

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
  const theme = useTheme();
  const { settings, updateSettings } = useSettingsStore();
  const [providerMenuVisible, setProviderMenuVisible] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const currentProvider: AIProviderId | '' = isProviderId(settings.aiProvider) ? settings.aiProvider : '';
  const providerLabel = currentProvider ? AI_PROVIDER_LABELS[currentProvider] : 'Select provider';

  const handleSelectProvider = (id: AIProviderId) => {
    const baseUrl = id === 'custom' ? '' : AI_PROVIDER_BASE_URLS[id];
    void updateSettings({ aiProvider: id, aiBaseUrl: baseUrl });
    setProviderMenuVisible(false);
  };

  return (
    <Card variant="elevated" padding={0}>
      <Menu
        visible={providerMenuVisible}
        onDismiss={() => setProviderMenuVisible(false)}
        anchor={
          <Pressable
            style={styles.settingItem}
            onPress={() => setProviderMenuVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Select AI provider"
          >
            <View style={styles.settingInfo}>
              <View style={[styles.settingIconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                <MaterialCommunityIcons name="robot-outline" size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.settingText}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                  AI Provider
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {providerLabel}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-down" size={24} color={theme.colors.onSurfaceVariant} />
          </Pressable>
        }
      >
        {AI_PROVIDER_IDS.map((id) => (
          <Menu.Item
            key={id}
            onPress={() => handleSelectProvider(id)}
            title={AI_PROVIDER_LABELS[id]}
            leadingIcon={currentProvider === id ? 'check' : undefined}
          />
        ))}
      </Menu>

      <Divider />

      <View style={styles.inputBlock}>
        <TextInput
          mode="outlined"
          label="API Key"
          value={settings.aiApiKey}
          onChangeText={(aiApiKey) => updateSettings({ aiApiKey })}
          secureTextEntry={!showApiKey}
          autoCapitalize="none"
          autoCorrect={false}
          right={
            <TextInput.Icon
              icon={showApiKey ? 'eye-off' : 'eye'}
              onPress={() => setShowApiKey((v) => !v)}
              forceTextInputFocus={false}
            />
          }
        />
      </View>

      <Divider />

      <View style={styles.inputBlock}>
        <TextInput
          mode="outlined"
          label="Model"
          value={settings.aiModel}
          onChangeText={(aiModel) => updateSettings({ aiModel })}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="e.g. gpt-4o-mini"
        />
      </View>

      {currentProvider === 'custom' && (
        <>
          <Divider />
          <View style={styles.inputBlock}>
            <TextInput
              mode="outlined"
              label="Base URL"
              value={settings.aiBaseUrl}
              onChangeText={(aiBaseUrl) => updateSettings({ aiBaseUrl })}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="https://..."
            />
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  inputBlock: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});

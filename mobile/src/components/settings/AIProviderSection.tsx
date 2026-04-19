import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, TextInput as RNTextInput, StyleSheet, View } from 'react-native';
import { Divider, Text } from 'react-native-paper';
import { Card } from '@/components/ui/Card';
import { useAppTheme } from '@/contexts/ThemeContext';
import {
  AI_PROVIDER_DESCRIPTIONS,
  AI_PROVIDER_GROUP_ORDER,
  AI_PROVIDER_ICONS,
  AI_PROVIDER_LABELS,
  AI_PROVIDER_MODEL_PLACEHOLDERS,
  type AIProviderId,
  aiChatBaseUrlRequired,
  aiProviderRequiresApiKey,
  defaultBaseUrlForProvider,
  isAiProviderId,
} from '@/lib/ai-providers';
import { haptics } from '@/lib/haptics';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { fontFamily } from '@/theme/typography';

export { AI_PROVIDER_IDS, type AIProviderId } from '@/lib/ai-providers';

export function AIProviderSection() {
  const { colors } = useAppTheme();
  const { settings, updateSettings } = useSettingsStore();
  const [providerListExpanded, setProviderListExpanded] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const currentProvider: AIProviderId | '' = isAiProviderId(settings.aiProvider) ? settings.aiProvider : '';
  const providerLabel = currentProvider ? AI_PROVIDER_LABELS[currentProvider] : 'Select provider';
  const modelPlaceholder =
    currentProvider && currentProvider !== 'custom'
      ? AI_PROVIDER_MODEL_PLACEHOLDERS[currentProvider]
      : 'e.g. gpt-4o-mini';

  const handleSelectProvider = (id: AIProviderId) => {
    void haptics.tap();
    const baseUrl = defaultBaseUrlForProvider(id);
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

  const showBaseUrlField = currentProvider !== '' && aiChatBaseUrlRequired(currentProvider);
  const apiKeyOptional = currentProvider === 'ollama';

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
          {AI_PROVIDER_GROUP_ORDER.map((group, groupIndex) => (
            <View key={group.label}>
              {groupIndex > 0 && <Divider style={{ backgroundColor: colors.borderLight }} />}
              <Text
                variant="labelSmall"
                style={[styles.groupLabel, { color: colors.onSurfaceSecondary, fontFamily: fontFamily.bodyMedium }]}
              >
                {group.label}
              </Text>
              {group.ids.map((id, index) => {
                const selected = currentProvider === id;
                const isFirstInGroup = index === 0;
                return (
                  <View key={id}>
                    {!isFirstInGroup && <Divider style={{ backgroundColor: colors.borderLight }} />}
                    <Pressable
                      style={({ pressed }) => [styles.providerRow, pressed && { backgroundColor: colors.pressed }]}
                      onPress={() => handleSelectProvider(id)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                    >
                      <View style={[styles.providerIconWrap, { backgroundColor: colors.surfaceVariant }]}>
                        <MaterialCommunityIcons name={AI_PROVIDER_ICONS[id]} size={20} color={colors.primary} />
                      </View>
                      <View style={styles.providerTextCol}>
                        <Text
                          variant="bodyLarge"
                          style={[styles.providerLabel, { color: colors.onSurface, fontFamily: fontFamily.body }]}
                        >
                          {AI_PROVIDER_LABELS[id]}
                        </Text>
                        <Text
                          variant="bodySmall"
                          style={[styles.providerDesc, { color: colors.onSurfaceSecondary }]}
                          numberOfLines={2}
                        >
                          {AI_PROVIDER_DESCRIPTIONS[id]}
                        </Text>
                      </View>
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
          ))}
        </View>
      )}

      <Divider style={{ backgroundColor: colors.borderLight }} />

      <View style={styles.inputBlock}>
        <Text variant="labelLarge" style={[styles.fieldLabel, { color: colors.onSurfaceSecondary }]}>
          {apiKeyOptional ? 'API Key (optional)' : 'API Key'}
        </Text>
        <View style={[styles.iosInputWrap, inputSurface]}>
          <RNTextInput
            value={settings.aiApiKey}
            onChangeText={(aiApiKey) => updateSettings({ aiApiKey })}
            secureTextEntry={!showApiKey}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={apiKeyOptional ? 'Leave empty for local Ollama' : 'sk-…'}
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
        {currentProvider === 'ollama' && (
          <Text variant="bodySmall" style={[styles.helperNote, { color: colors.onSurfaceSecondary }]}>
            Ollama runs locally. Make sure the Ollama server is running.
          </Text>
        )}
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
            placeholder={modelPlaceholder}
            placeholderTextColor={colors.onSurfaceSecondary}
            style={[styles.iosInput, { color: colors.onSurface, fontFamily: fontFamily.body }]}
          />
        </View>
      </View>

      {showBaseUrlField && (
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
                placeholder={
                  currentProvider === 'doubao'
                    ? 'https://… (from Volcengine Ark console)'
                    : currentProvider === 'ollama'
                      ? 'http://localhost:11434'
                      : 'https://…'
                }
                placeholderTextColor={colors.onSurfaceSecondary}
                style={[styles.iosInput, { color: colors.onSurface, fontFamily: fontFamily.body }]}
              />
            </View>
            {currentProvider === 'doubao' && (
              <Text variant="bodySmall" style={[styles.helperNote, { color: colors.onSurfaceSecondary }]}>
                Paste the base URL from your Volcengine Ark OpenAI-compatible endpoint.
              </Text>
            )}
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
  groupLabel: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontSize: 11,
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
  providerTextCol: {
    flex: 1,
    marginRight: 8,
  },
  providerLabel: {
    marginBottom: 2,
  },
  providerDesc: {
    fontFamily: fontFamily.body,
    lineHeight: 18,
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
  helperNote: {
    marginTop: 8,
    fontFamily: fontFamily.body,
    lineHeight: 18,
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

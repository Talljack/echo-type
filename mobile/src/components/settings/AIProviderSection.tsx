import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, TextInput as RNTextInput, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Divider, Modal, Portal, Text } from 'react-native-paper';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAppTheme } from '@/contexts/ThemeContext';
import {
  AI_PROVIDER_DESCRIPTIONS,
  AI_PROVIDER_GROUP_ORDER,
  AI_PROVIDER_ICONS,
  AI_PROVIDER_LABELS,
  type AIProviderId,
  aiChatBaseUrlRequired,
  aiProviderRequiresApiKey,
  defaultBaseUrlForProvider,
  getDefaultModelForProvider,
  getStaticModelsForProvider,
  isAiProviderConfigReady,
} from '@/lib/ai-providers';
import { haptics } from '@/lib/haptics';
import { fetchProviderModels } from '@/services/provider-api';
import { useAiProviderStore } from '@/stores/useAiProviderStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { fontFamily } from '@/theme/typography';

const API_KEY_HELP_URLS: Record<AIProviderId, string | null> = {
  openai: 'https://platform.openai.com/api-keys',
  anthropic: 'https://console.anthropic.com/settings/keys',
  deepseek: 'https://platform.deepseek.com/api_keys',
  google: 'https://aistudio.google.com/apikey',
  groq: 'https://console.groq.com/keys',
  openrouter: 'https://openrouter.ai/keys',
  ollama: null,
  glm: 'https://open.bigmodel.cn/usercenter/proj-mgmt/apikeys',
  kimi: 'https://platform.moonshot.cn/console/api-keys',
  qwen: 'https://bailian.console.aliyun.com/',
  doubao: 'https://console.volcengine.com/ark',
  siliconflow: 'https://cloud.siliconflow.cn/account/ak',
  mistral: 'https://console.mistral.ai/api-keys/',
  custom: null,
};

export { AI_PROVIDER_IDS, type AIProviderId } from '@/lib/ai-providers';

type StatusState =
  | { tone: 'success'; text: string }
  | { tone: 'error'; text: string }
  | { tone: 'info'; text: string }
  | null;

function isValidationFailure(message?: string): boolean {
  return (
    typeof message === 'string' &&
    /(401|403|unauthorized|forbidden|invalid|api key required|responded 4)/i.test(message)
  );
}

export function AIProviderSection() {
  const { colors } = useAppTheme();
  const { settings } = useSettingsStore();
  const {
    providers,
    activeProviderId,
    setActiveProvider,
    setAuth,
    clearAuth,
    setSelectedModel,
    setDynamicModels,
    setBaseUrl,
    migrateLegacySettings,
  } = useAiProviderStore();
  const [providerListExpanded, setProviderListExpanded] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [draftApiKey, setDraftApiKey] = useState('');
  const [status, setStatus] = useState<StatusState>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);

  useEffect(() => {
    migrateLegacySettings(settings);
  }, [migrateLegacySettings, settings]);

  const currentProvider = activeProviderId;
  const currentConfig = providers[currentProvider];
  const providerLabel = AI_PROVIDER_LABELS[currentProvider];
  const showBaseUrlField = aiChatBaseUrlRequired(currentProvider);
  const apiKeyOptional = currentProvider === 'ollama';
  const providerConnected = isAiProviderConfigReady(currentConfig);
  const staticModels = useMemo(() => getStaticModelsForProvider(currentProvider), [currentProvider]);
  const availableModels = currentConfig.dynamicModels.length > 0 ? currentConfig.dynamicModels : staticModels;
  const selectedModel = availableModels.find((model) => model.id === currentConfig.selectedModelId) ??
    availableModels[0] ?? {
      id: getDefaultModelForProvider(currentProvider) || 'model',
      name: getDefaultModelForProvider(currentProvider) || 'Model',
    };
  const maskedKey = currentConfig.auth.apiKey
    ? `${currentConfig.auth.apiKey.slice(0, 8)}••••${currentConfig.auth.apiKey.slice(-4)}`
    : '';

  const inputSurface = {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
    borderCurve: 'continuous' as const,
  };

  const resetTransientState = () => {
    setDraftApiKey('');
    setShowApiKey(false);
    setStatus(null);
  };

  const handleSelectProvider = (id: AIProviderId) => {
    void haptics.tap();
    setActiveProvider(id);
    if (!providers[id]) {
      setBaseUrl(id, defaultBaseUrlForProvider(id));
    }
    setProviderListExpanded(false);
    resetTransientState();
  };

  const openApiKeyHelp = () => {
    const url = API_KEY_HELP_URLS[currentProvider];
    if (!url) return;
    void Linking.openURL(url);
  };

  const applyConnectedModels = (models: { id: string; name: string }[]) => {
    setDynamicModels(currentProvider, models);
    const preferredModel = models.find((model) => model.id === currentConfig.selectedModelId) ?? models[0];
    if (preferredModel) {
      setSelectedModel(currentProvider, preferredModel.id);
    }
  };

  const handleConnect = async () => {
    const apiKey =
      draftApiKey.trim() || currentConfig.auth.apiKey?.trim() || (currentProvider === 'ollama' ? 'ollama' : '');
    const baseUrl = currentConfig.baseUrl.trim();

    if (aiProviderRequiresApiKey(currentProvider) && !apiKey) {
      setStatus({ tone: 'error', text: 'API key is required before connecting.' });
      return;
    }
    if (showBaseUrlField && !baseUrl) {
      setStatus({ tone: 'error', text: 'Base URL is required for this provider.' });
      return;
    }

    setStatus(null);
    setIsConnecting(true);
    try {
      const result = await fetchProviderModels({
        providerId: currentProvider,
        apiKey,
        baseUrl,
      });
      if (result.unavailable || isValidationFailure(result.error)) {
        setStatus({ tone: 'error', text: result.error || 'Unable to validate this provider right now.' });
        return;
      }

      setAuth(currentProvider, { type: 'api-key', apiKey });
      applyConnectedModels(result.models.length > 0 ? result.models : staticModels);
      setDraftApiKey('');
      setStatus({
        tone: result.fallback ? 'info' : 'success',
        text: result.fallback
          ? result.error || 'Connected. Using the fallback model list for now.'
          : 'Connected successfully.',
      });
    } catch (error) {
      setStatus({ tone: 'error', text: error instanceof Error ? error.message : 'Failed to connect provider.' });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRefreshModels = async () => {
    const apiKey = currentConfig.auth.apiKey?.trim() || (currentProvider === 'ollama' ? 'ollama' : '');
    if (!apiKey && aiProviderRequiresApiKey(currentProvider)) return;

    setStatus(null);
    setIsRefreshingModels(true);
    try {
      const result = await fetchProviderModels({
        providerId: currentProvider,
        apiKey,
        baseUrl: currentConfig.baseUrl.trim(),
      });
      if (result.unavailable) {
        setStatus({ tone: 'error', text: result.error || 'Unable to refresh the model list right now.' });
        return;
      }
      applyConnectedModels(result.models.length > 0 ? result.models : staticModels);
      setStatus({
        tone: result.fallback ? 'info' : 'success',
        text: result.fallback ? result.error || 'Using the fallback model list.' : 'Model list refreshed.',
      });
    } catch (error) {
      setStatus({ tone: 'error', text: error instanceof Error ? error.message : 'Failed to refresh models.' });
    } finally {
      setIsRefreshingModels(false);
    }
  };

  const handleDisconnect = () => {
    void haptics.warning();
    clearAuth(currentProvider);
    setDynamicModels(currentProvider, []);
    setStatus({ tone: 'info', text: 'Disconnected. The provider config is now inactive.' });
    setDraftApiKey('');
  };

  return (
    <>
      <Card variant="elevated" padding={0}>
        <Pressable
          style={styles.settingItem}
          onPress={() => {
            void haptics.light();
            setProviderListExpanded((value) => !value);
          }}
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
          <View style={styles.headerBadges}>
            {providerConnected ? (
              <View style={[styles.connectedBadge, { backgroundColor: `${colors.success}18` }]}>
                <MaterialCommunityIcons name="check-circle" size={12} color={colors.success} />
                <Text style={[styles.connectedBadgeText, { color: colors.success }]}>Connected</Text>
              </View>
            ) : null}
            <MaterialCommunityIcons
              name={providerListExpanded ? 'chevron-up' : 'chevron-down'}
              size={22}
              color={colors.onSurfaceSecondary}
            />
          </View>
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
                  const connected = isAiProviderConfigReady(providers[id]);
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
                          <View style={styles.providerTitleRow}>
                            <Text
                              variant="bodyLarge"
                              style={[styles.providerLabel, { color: colors.onSurface, fontFamily: fontFamily.body }]}
                            >
                              {AI_PROVIDER_LABELS[id]}
                            </Text>
                            {connected ? (
                              <Text style={[styles.providerConnectedInline, { color: colors.success }]}>Connected</Text>
                            ) : null}
                          </View>
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
          <View style={styles.labelRow}>
            <Text variant="labelLarge" style={[styles.fieldLabel, { color: colors.onSurfaceSecondary }]}>
              {apiKeyOptional ? 'API Key (optional)' : 'API Key'}
            </Text>
            {maskedKey && !draftApiKey ? (
              <Text style={[styles.inlineMuted, { color: colors.onSurfaceSecondary }]}>{maskedKey}</Text>
            ) : null}
          </View>
          <View style={[styles.iosInputWrap, inputSurface]}>
            <RNTextInput
              value={draftApiKey}
              onChangeText={setDraftApiKey}
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
                setShowApiKey((value) => !value);
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
          {API_KEY_HELP_URLS[currentProvider] ? (
            <Pressable onPress={openApiKeyHelp} style={styles.helperLink}>
              <MaterialCommunityIcons name="open-in-new" size={14} color={colors.primary} />
              <Text style={[styles.helperLinkText, { color: colors.primary }]}>Get API key</Text>
            </Pressable>
          ) : null}
          {currentProvider === 'ollama' ? (
            <Text variant="bodySmall" style={[styles.helperNote, { color: colors.onSurfaceSecondary }]}>
              Ollama runs locally. Tap Connect after the local server is available.
            </Text>
          ) : null}
        </View>

        {showBaseUrlField ? (
          <>
            <Divider style={{ backgroundColor: colors.borderLight }} />
            <View style={styles.inputBlock}>
              <Text variant="labelLarge" style={[styles.fieldLabel, { color: colors.onSurfaceSecondary }]}>
                Base URL
              </Text>
              <View style={[styles.iosInputWrap, styles.iosInputSingle, inputSurface]}>
                <RNTextInput
                  value={currentConfig.baseUrl}
                  onChangeText={(value) => setBaseUrl(currentProvider, value)}
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
            </View>
          </>
        ) : null}

        <Divider style={{ backgroundColor: colors.borderLight }} />

        <View style={styles.inputBlock}>
          <View style={styles.labelRow}>
            <Text variant="labelLarge" style={[styles.fieldLabel, { color: colors.onSurfaceSecondary }]}>
              Model
            </Text>
            {providerConnected ? (
              <Pressable
                onPress={() => void handleRefreshModels()}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Refresh model list"
              >
                {isRefreshingModels ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <MaterialCommunityIcons name="refresh" size={18} color={colors.primary} />
                )}
              </Pressable>
            ) : null}
          </View>
          <Pressable
            onPress={() => {
              void haptics.light();
              setShowModelSelector(true);
            }}
            style={({ pressed }) => [styles.selectorButton, inputSurface, pressed && { opacity: 0.92 }]}
            accessibilityRole="button"
            accessibilityLabel="Select AI model"
          >
            <Text
              numberOfLines={1}
              style={[styles.selectorValue, { color: colors.onSurface, fontFamily: fontFamily.body }]}
            >
              {selectedModel.name || selectedModel.id || getDefaultModelForProvider(currentProvider)}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color={colors.onSurfaceSecondary} />
          </Pressable>
          <Text variant="bodySmall" style={[styles.helperNote, { color: colors.onSurfaceSecondary }]}>
            {providerConnected
              ? currentConfig.dynamicModels.length > 0
                ? 'Loaded from provider.'
                : 'Using the fallback model list.'
              : 'Choose a model now, then tap Connect to validate the provider.'}
          </Text>
        </View>

        {status ? (
          <>
            <Divider style={{ backgroundColor: colors.borderLight }} />
            <View
              style={[
                styles.statusBanner,
                {
                  backgroundColor:
                    status.tone === 'success'
                      ? `${colors.success}14`
                      : status.tone === 'error'
                        ? `${colors.error}14`
                        : `${colors.primary}14`,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={
                  status.tone === 'success' ? 'check-circle' : status.tone === 'error' ? 'alert-circle' : 'information'
                }
                size={16}
                color={
                  status.tone === 'success' ? colors.success : status.tone === 'error' ? colors.error : colors.primary
                }
              />
              <Text
                variant="bodySmall"
                style={[
                  styles.statusText,
                  {
                    color:
                      status.tone === 'success'
                        ? colors.success
                        : status.tone === 'error'
                          ? colors.error
                          : colors.primary,
                  },
                ]}
              >
                {status.text}
              </Text>
            </View>
          </>
        ) : null}

        <Divider style={{ backgroundColor: colors.borderLight }} />

        <View style={styles.actionsBlock}>
          {!providerConnected ? (
            <Button
              mode="contained"
              onPress={handleConnect}
              loading={isConnecting}
              disabled={isConnecting}
              style={styles.primaryAction}
            >
              Connect
            </Button>
          ) : (
            <View style={styles.actionRow}>
              <Button
                mode="contained"
                onPress={handleConnect}
                loading={isConnecting}
                disabled={isConnecting || !draftApiKey.trim()}
                style={styles.flexAction}
              >
                Update Key
              </Button>
              <Button mode="outlined" onPress={handleDisconnect} style={styles.flexAction}>
                Disconnect
              </Button>
            </View>
          )}
        </View>
      </Card>

      <Portal>
        <Modal
          visible={showModelSelector}
          onDismiss={() => setShowModelSelector(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: colors.surface }]}
        >
          <View style={styles.modalHeader}>
            <Text variant="headlineSmall" style={[styles.modalTitle, { color: colors.onSurface }]}>
              Select Model
            </Text>
            <Pressable onPress={() => setShowModelSelector(false)} hitSlop={12}>
              <MaterialCommunityIcons name="close" size={22} color={colors.onSurfaceSecondary} />
            </Pressable>
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalList}>
            {availableModels.map((model) => {
              const selected = model.id === currentConfig.selectedModelId;
              return (
                <Pressable
                  key={model.id}
                  onPress={() => {
                    void haptics.tap();
                    setSelectedModel(currentProvider, model.id);
                    setShowModelSelector(false);
                  }}
                  style={[
                    styles.modelRow,
                    {
                      backgroundColor: colors.surfaceVariant,
                      borderColor: selected ? colors.primary : colors.borderLight,
                    },
                  ]}
                >
                  <View style={styles.modelTextCol}>
                    <Text variant="bodyLarge" style={{ color: colors.onSurface, fontFamily: fontFamily.bodyMedium }}>
                      {model.name}
                    </Text>
                    <Text variant="bodySmall" style={{ color: colors.onSurfaceSecondary }}>
                      {model.id}
                    </Text>
                  </View>
                  {selected ? <MaterialCommunityIcons name="check" size={20} color={colors.primary} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Modal>
      </Portal>
    </>
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
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  connectedBadgeText: {
    fontSize: 11,
    fontFamily: fontFamily.bodyMedium,
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
  providerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  providerLabel: {},
  providerConnectedInline: {
    fontSize: 11,
    fontFamily: fontFamily.bodyMedium,
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
  actionsBlock: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  flexAction: {
    flex: 1,
  },
  primaryAction: {
    borderRadius: 12,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontFamily: fontFamily.bodyMedium,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  inlineMuted: {
    fontSize: 12,
    fontFamily: fontFamily.body,
  },
  helperNote: {
    marginTop: 8,
    fontFamily: fontFamily.body,
    lineHeight: 18,
  },
  helperLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  helperLinkText: {
    fontSize: 13,
    fontFamily: fontFamily.bodyMedium,
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
  selectorButton: {
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorValue: {
    flex: 1,
    fontSize: 16,
    paddingRight: 8,
  },
  statusBanner: {
    marginHorizontal: 16,
    marginVertical: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  statusText: {
    flex: 1,
    lineHeight: 18,
  },
  modal: {
    margin: 20,
    borderRadius: 20,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
  },
  modalTitle: {
    fontFamily: fontFamily.heading,
  },
  modalScroll: {
    maxHeight: 420,
  },
  modalList: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 10,
  },
  modelRow: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modelTextCol: {
    flex: 1,
    marginRight: 12,
  },
});

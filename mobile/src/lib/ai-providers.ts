import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { Settings } from '@/types';

/** Must match `ProviderId` entries in `src/lib/providers.ts` for `/api/chat`. */
export const AI_PROVIDER_IDS = [
  'openai',
  'anthropic',
  'deepseek',
  'google',
  'groq',
  'openrouter',
  'ollama',
  'glm',
  'kimi',
  'qwen',
  'doubao',
  'siliconflow',
  'mistral',
  'custom',
] as const;

export type AIProviderId = (typeof AI_PROVIDER_IDS)[number];
export interface AIProviderModel {
  id: string;
  name: string;
  description?: string;
}

export interface AIProviderAuthState {
  type: 'none' | 'api-key';
  apiKey?: string;
}

export interface AIProviderConfig {
  providerId: AIProviderId;
  auth: AIProviderAuthState;
  selectedModelId: string;
  baseUrl: string;
  dynamicModels: AIProviderModel[];
}

type MciName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export const AI_PROVIDER_LABELS: Record<AIProviderId, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  deepseek: 'DeepSeek',
  google: 'Google AI',
  groq: 'Groq',
  openrouter: 'OpenRouter',
  ollama: 'Ollama',
  glm: 'GLM / Zhipu',
  kimi: 'Kimi / Moonshot',
  qwen: 'Qwen / Tongyi',
  doubao: 'Doubao / Volcengine',
  siliconflow: 'SiliconFlow',
  mistral: 'Mistral',
  custom: 'Custom Provider',
};

export const AI_PROVIDER_DESCRIPTIONS: Record<AIProviderId, string> = {
  openai: 'GPT-4o, GPT-4o-mini',
  anthropic: 'Claude 3.5 Sonnet, Claude 3 Haiku',
  deepseek: 'DeepSeek V3, DeepSeek R1',
  google: 'Gemini 2.0, Gemini 1.5',
  groq: 'Llama 3, Mixtral (fast inference)',
  openrouter: 'Multi-model gateway',
  ollama: 'Local models (requires server)',
  glm: 'GLM-4, ChatGLM',
  kimi: 'Moonshot v1',
  qwen: 'Qwen 2.5, Qwen Max',
  doubao: 'Doubao Pro, Doubao Lite',
  siliconflow: 'Multi-model API',
  mistral: 'Mistral Large, Codestral',
  custom: 'Any OpenAI-compatible API',
};

export const AI_PROVIDER_ICONS: Record<AIProviderId, MciName> = {
  openai: 'brain',
  anthropic: 'robot',
  deepseek: 'magnify',
  google: 'google',
  groq: 'lightning-bolt',
  openrouter: 'router-network',
  ollama: 'server-network',
  glm: 'translate-variant',
  kimi: 'moon-waning-crescent',
  qwen: 'cloud',
  doubao: 'fire',
  siliconflow: 'chip',
  mistral: 'weather-windy',
  custom: 'tune-variant',
};

/** Origins aligned with web `PROVIDER_REGISTRY` + mobile overrides (e.g. SiliconFlow .cn, Moonshot .cn). */
export const AI_PROVIDER_DEFAULT_BASE_URLS: Record<Exclude<AIProviderId, 'custom' | 'doubao'>, string> = {
  openai: 'https://api.openai.com',
  anthropic: 'https://api.anthropic.com',
  deepseek: 'https://api.deepseek.com',
  google: 'https://generativelanguage.googleapis.com',
  groq: 'https://api.groq.com',
  openrouter: 'https://openrouter.ai',
  ollama: 'http://localhost:11434',
  glm: 'https://open.bigmodel.cn',
  kimi: 'https://api.moonshot.cn',
  qwen: 'https://dashscope.aliyuncs.com',
  siliconflow: 'https://api.siliconflow.cn',
  mistral: 'https://api.mistral.ai',
};

export const AI_PROVIDER_MODEL_PLACEHOLDERS: Record<Exclude<AIProviderId, 'custom'>, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-sonnet-20241022',
  deepseek: 'deepseek-chat',
  google: 'gemini-2.0-flash',
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'openai/gpt-4o',
  ollama: 'llama3.2',
  glm: 'glm-4-plus',
  kimi: 'moonshot-v1-8k',
  qwen: 'qwen-turbo',
  doubao: 'ep-…',
  siliconflow: 'deepseek-ai/DeepSeek-V3',
  mistral: 'mistral-large-latest',
};

export const AI_PROVIDER_STATIC_MODELS: Record<AIProviderId, AIProviderModel[]> = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'o4-mini', name: 'o4-mini' },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-5-20251001', name: 'Claude Sonnet 4.5' },
    { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
  ],
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek Chat' },
    { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner' },
  ],
  google: [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
    { id: 'gemini-2.5-flash-preview', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-pro-preview', name: 'Gemini 2.5 Pro' },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
  ],
  openrouter: [
    { id: 'openai/gpt-4o', name: 'OpenAI GPT-4o' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
    { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash' },
  ],
  ollama: [
    { id: 'llama3.2', name: 'Llama 3.2' },
    { id: 'qwen2.5', name: 'Qwen 2.5' },
    { id: 'mistral', name: 'Mistral' },
  ],
  glm: [
    { id: 'glm-4-plus', name: 'GLM-4 Plus' },
    { id: 'glm-4-air', name: 'GLM-4 Air' },
  ],
  kimi: [
    { id: 'moonshot-v1-8k', name: 'Moonshot v1 8K' },
    { id: 'moonshot-v1-32k', name: 'Moonshot v1 32K' },
  ],
  qwen: [
    { id: 'qwen-turbo', name: 'Qwen Turbo' },
    { id: 'qwen-plus', name: 'Qwen Plus' },
    { id: 'qwen-max', name: 'Qwen Max' },
  ],
  doubao: [{ id: 'ep-default', name: 'Doubao Endpoint' }],
  siliconflow: [
    { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3' },
    { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B' },
  ],
  mistral: [
    { id: 'mistral-large-latest', name: 'Mistral Large' },
    { id: 'codestral-latest', name: 'Codestral' },
  ],
  custom: [{ id: 'custom-model', name: 'Custom model' }],
};

export const AI_PROVIDER_GROUP_ORDER: { label: string; ids: AIProviderId[] }[] = [
  {
    label: 'International',
    ids: ['openai', 'anthropic', 'google', 'deepseek', 'groq', 'openrouter', 'mistral'],
  },
  {
    label: 'Chinese',
    ids: ['glm', 'kimi', 'qwen', 'doubao', 'siliconflow'],
  },
  { label: 'Local', ids: ['ollama'] },
  { label: 'Other', ids: ['custom'] },
];

export function isAiProviderId(value: string): value is AIProviderId {
  return (AI_PROVIDER_IDS as readonly string[]).includes(value);
}

export function aiProviderRequiresApiKey(id: AIProviderId): boolean {
  return id !== 'ollama';
}

export function aiChatBaseUrlRequired(id: AIProviderId): boolean {
  return id === 'custom' || id === 'doubao' || id === 'ollama';
}

export function getDefaultModelForProvider(id: AIProviderId): string {
  return AI_PROVIDER_MODEL_PLACEHOLDERS[id === 'custom' ? 'openai' : id] ?? AI_PROVIDER_STATIC_MODELS[id][0]?.id ?? '';
}

export function getStaticModelsForProvider(id: AIProviderId): AIProviderModel[] {
  return AI_PROVIDER_STATIC_MODELS[id];
}

export function createDefaultAiProviderConfig(id: AIProviderId): AIProviderConfig {
  return {
    providerId: id,
    auth: { type: 'none' },
    selectedModelId: getDefaultModelForProvider(id),
    baseUrl: defaultBaseUrlForProvider(id),
    dynamicModels: [],
  };
}

export function isAiProviderConfigReady(
  config?: Pick<AIProviderConfig, 'providerId' | 'auth' | 'baseUrl'> | null,
): boolean {
  if (!config) return false;
  const { providerId, auth, baseUrl } = config;
  if (aiProviderRequiresApiKey(providerId) && !auth.apiKey?.trim()) return false;
  if (providerId === 'doubao' && !baseUrl.trim()) return false;
  if (providerId === 'custom' && !baseUrl.trim()) return false;
  return auth.type === 'api-key';
}

export function buildLegacyProviderConfig(
  settings: Pick<Settings, 'aiProvider' | 'aiApiKey' | 'aiBaseUrl' | 'aiModel'>,
) {
  const id = settings.aiProvider?.trim();
  if (!id || !isAiProviderId(id)) return null;
  return {
    providerId: id,
    auth: settings.aiApiKey.trim()
      ? { type: 'api-key' as const, apiKey: settings.aiApiKey.trim() }
      : { type: 'none' as const },
    selectedModelId: settings.aiModel.trim() || getDefaultModelForProvider(id),
    baseUrl: settings.aiBaseUrl.trim() || defaultBaseUrlForProvider(id),
    dynamicModels: [],
  } satisfies AIProviderConfig;
}

export function resolveAiProviderConfig(
  providerConfig: AIProviderConfig | null | undefined,
  settings?: Pick<Settings, 'aiProvider' | 'aiApiKey' | 'aiBaseUrl' | 'aiModel'>,
): AIProviderConfig | null {
  if (providerConfig && isAiProviderConfigReady(providerConfig)) {
    return providerConfig;
  }
  return settings ? buildLegacyProviderConfig(settings) : null;
}

export function isAiChatConfigured(settings: Pick<Settings, 'aiProvider' | 'aiApiKey' | 'aiBaseUrl'>): boolean {
  const id = settings.aiProvider?.trim();
  if (!id || !isAiProviderId(id)) return false;
  if (aiProviderRequiresApiKey(id) && !settings.aiApiKey?.trim()) return false;
  if (id === 'doubao' && !settings.aiBaseUrl?.trim()) return false;
  if (id === 'custom' && !settings.aiBaseUrl?.trim()) return false;
  return true;
}

export function defaultBaseUrlForProvider(id: AIProviderId): string {
  if (id === 'custom' || id === 'doubao') return '';
  return AI_PROVIDER_DEFAULT_BASE_URLS[id];
}

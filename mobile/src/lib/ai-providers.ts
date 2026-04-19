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

// Provider registry — sourced from models.dev (https://github.com/sst/models.dev)

import enProviderMessages from '@/lib/i18n/messages/providers/en.json';
import zhProviderMessages from '@/lib/i18n/messages/providers/zh.json';
import type { InterfaceLanguage } from '@/stores/language-store';

export type AuthMethod = 'oauth' | 'api-key';

export interface ProviderModel {
  id: string;
  name: string;
  description?: string;
  contextWindow?: number;
  isDefault?: boolean;
}

export interface ProviderModelRecommendation {
  modelId: string;
  rank: number;
  score: number;
  reason: string;
  label: 'Recommended';
}

export interface OAuthConfig {
  clientId: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  usePKCE: boolean;
  extraParams?: Record<string, string>;
}

export interface ProviderDefinition {
  id: string;
  name: string;
  description: string;
  authMethods: AuthMethod[];
  oauth?: OAuthConfig;
  apiKeyPlaceholder: string;
  apiKeyHelpUrl: string;
  envKey: string;
  headerKey: string;
  /** npm package identifier from models.dev */
  sdkPackage: string;
  /** Base URL origin (e.g. https://api.anthropic.com) */
  baseUrl?: string;
  /** Whether baseUrl is user-configurable */
  baseUrlEditable?: boolean;
  /** Default API path (e.g. /v1/messages, /v1/chat/completions) */
  apiPath?: string;
  /** No API key required (local providers like Ollama) */
  noKeyRequired?: boolean;
  models: ProviderModel[];
}

export type ProviderId =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'deepseek'
  | 'groq'
  | 'mistral'
  | 'xai'
  | 'togetherai'
  | 'cohere'
  | 'perplexity'
  | 'cerebras'
  | 'deepinfra'
  | 'zai'
  | 'minimax'
  | 'moonshotai'
  | 'glm'
  | 'kimi'
  | 'qwen'
  | 'doubao'
  | 'siliconflow'
  | 'fireworks'
  | 'openrouter'
  | 'ollama'
  | 'lmstudio';

export interface ProviderAuthState {
  type: 'none' | 'api-key' | 'oauth';
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface ProviderConfig {
  providerId: ProviderId;
  auth: ProviderAuthState;
  selectedModelId: string;
  /** Optional per-capability model overrides */
  modelOverrides?: Record<string, string>;
  /** User-editable base URL */
  baseUrl?: string;
  /** User-editable API path override */
  apiPath?: string;
  /** Dynamically fetched models from provider API */
  dynamicModels?: ProviderModel[];
  /** Cached LLM-evaluated recommendations for the current model list */
  modelRecommendations?: ProviderModelRecommendation[];
  /** Stable key for the model list used to compute cached recommendations */
  modelRecommendationKey?: string;
  /** Skip dynamic model fetching, use static list only */
  noModelApi?: boolean;
  /** Per-provider max output tokens override (falls back to global setting) */
  maxTokens?: number;
}

const PROVIDER_UI_MESSAGES = {
  en: enProviderMessages,
  zh: zhProviderMessages,
} as const satisfies Record<InterfaceLanguage, typeof enProviderMessages>;

type ProviderMessageMap = Record<string, string>;

function getCanonicalProviderMessages(providerId: ProviderId) {
  return PROVIDER_UI_MESSAGES.en.providers[providerId];
}

function getCanonicalProviderCopy(
  providerId: ProviderId,
): Pick<ProviderDefinition, 'description' | 'apiKeyPlaceholder'> {
  const { description, apiKeyPlaceholder } = getCanonicalProviderMessages(providerId);
  return { description, apiKeyPlaceholder };
}

function withCanonicalModelDescription(providerId: ProviderId, model: ProviderModel): ProviderModel {
  const description = (getCanonicalProviderMessages(providerId).models as ProviderMessageMap)[model.id];
  return description ? { ...model, description } : model;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const PROVIDER_REGISTRY: Record<ProviderId, ProviderDefinition> = {
  // ── Frontier cloud providers ──────────────────────────────────────────────

  openai: {
    id: 'openai',
    name: 'OpenAI',
    ...getCanonicalProviderCopy('openai'),
    authMethods: ['oauth', 'api-key'],
    oauth: {
      clientId: process.env.NEXT_PUBLIC_OPENAI_CLIENT_ID ?? '',
      authUrl: 'https://auth.openai.com/oauth/authorize',
      tokenUrl: 'https://auth.openai.com/oauth/token',
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      usePKCE: true,
      extraParams: { codex_cli_simplified_flow: 'true', id_token_add_organizations: 'true' },
    },
    apiKeyHelpUrl: 'https://platform.openai.com/api-keys',
    envKey: 'OPENAI_API_KEY',
    headerKey: 'x-openai-key',
    sdkPackage: '@ai-sdk/openai',
    baseUrl: 'https://api.openai.com',
    baseUrlEditable: true,
    apiPath: '/v1/chat/completions',
    models: [
      withCanonicalModelDescription('openai', {
        id: 'gpt-4o',
        name: 'GPT-4o',
        contextWindow: 128000,
        isDefault: true,
      }),
      withCanonicalModelDescription('openai', { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000 }),
      withCanonicalModelDescription('openai', { id: 'o4-mini', name: 'o4-mini', contextWindow: 200000 }),
      withCanonicalModelDescription('openai', { id: 'o3', name: 'o3', contextWindow: 200000 }),
    ],
  },

  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    ...getCanonicalProviderCopy('anthropic'),
    authMethods: ['api-key'],
    apiKeyHelpUrl: 'https://console.anthropic.com/settings/keys',
    envKey: 'ANTHROPIC_API_KEY',
    headerKey: 'x-anthropic-key',
    sdkPackage: '@ai-sdk/anthropic',
    baseUrl: 'https://api.anthropic.com',
    baseUrlEditable: true,
    apiPath: '/v1/messages',
    models: [
      withCanonicalModelDescription('anthropic', {
        id: 'claude-sonnet-4-5-20251001',
        name: 'Claude Sonnet 4.5',
        contextWindow: 200000,
        isDefault: true,
      }),
      withCanonicalModelDescription('anthropic', {
        id: 'claude-opus-4-6',
        name: 'Claude Opus 4.6',
        contextWindow: 200000,
      }),
      withCanonicalModelDescription('anthropic', {
        id: 'claude-haiku-4-5-20251001',
        name: 'Claude Haiku 4.5',
        contextWindow: 200000,
      }),
    ],
  },

  google: {
    id: 'google',
    name: 'Google',
    ...getCanonicalProviderCopy('google'),
    authMethods: ['oauth', 'api-key'],
    oauth: {
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '',
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: ['https://www.googleapis.com/auth/generative-language'],
      usePKCE: true,
    },
    apiKeyHelpUrl: 'https://aistudio.google.com/apikey',
    envKey: 'GOOGLE_API_KEY',
    headerKey: 'x-google-key',
    sdkPackage: '@ai-sdk/google',
    baseUrl: 'https://generativelanguage.googleapis.com',
    baseUrlEditable: true,
    apiPath: '/v1beta/models/{model}:generateContent',
    models: [
      withCanonicalModelDescription('google', {
        id: 'gemini-2.5-flash-preview',
        name: 'Gemini 2.5 Flash',
        contextWindow: 1048576,
        isDefault: true,
      }),
      withCanonicalModelDescription('google', {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        contextWindow: 1048576,
      }),
      withCanonicalModelDescription('google', {
        id: 'gemini-2.5-pro-preview',
        name: 'Gemini 2.5 Pro',
        contextWindow: 2097152,
      }),
    ],
  },

  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    ...getCanonicalProviderCopy('deepseek'),
    authMethods: ['api-key'],
    apiKeyHelpUrl: 'https://platform.deepseek.com/api_keys',
    envKey: 'DEEPSEEK_API_KEY',
    headerKey: 'x-deepseek-key',
    sdkPackage: '@ai-sdk/openai-compatible',
    baseUrl: 'https://api.deepseek.com',
    baseUrlEditable: true,
    apiPath: '/v1/chat/completions',
    models: [
      withCanonicalModelDescription('deepseek', {
        id: 'deepseek-chat',
        name: 'DeepSeek V3',
        contextWindow: 64000,
        isDefault: true,
      }),
      withCanonicalModelDescription('deepseek', {
        id: 'deepseek-reasoner',
        name: 'DeepSeek R1',
        contextWindow: 64000,
      }),
    ],
  },

  xai: {
    id: 'xai',
    name: 'xAI',
    ...getCanonicalProviderCopy('xai'),
    authMethods: ['api-key'],
    apiKeyHelpUrl: 'https://console.x.ai',
    envKey: 'XAI_API_KEY',
    headerKey: 'x-xai-key',
    sdkPackage: '@ai-sdk/xai',
    baseUrl: 'https://api.x.ai',
    baseUrlEditable: true,
    apiPath: '/v1/chat/completions',
    models: [
      withCanonicalModelDescription('xai', { id: 'grok-3', name: 'Grok 3', contextWindow: 131072, isDefault: true }),
      withCanonicalModelDescription('xai', { id: 'grok-3-mini', name: 'Grok 3 Mini', contextWindow: 131072 }),
      withCanonicalModelDescription('xai', { id: 'grok-2-1212', name: 'Grok 2', contextWindow: 131072 }),
    ],
  },

  // ── Fast inference ────────────────────────────────────────────────────────

  groq: {
    id: 'groq',
    name: 'Groq',
    ...getCanonicalProviderCopy('groq'),
    authMethods: ['api-key'],
    apiKeyHelpUrl: 'https://console.groq.com/keys',
    envKey: 'GROQ_API_KEY',
    headerKey: 'x-groq-key',
    sdkPackage: '@ai-sdk/groq',
    baseUrl: 'https://api.groq.com',
    baseUrlEditable: true,
    apiPath: '/openai/v1/chat/completions',
    models: [
      withCanonicalModelDescription('groq', {
        id: 'llama-3.3-70b-versatile',
        name: 'Llama 3.3 70B',
        contextWindow: 128000,
        isDefault: true,
      }),
      withCanonicalModelDescription('groq', {
        id: 'llama-3.1-8b-instant',
        name: 'Llama 3.1 8B',
        contextWindow: 128000,
      }),
      withCanonicalModelDescription('groq', { id: 'gemma2-9b-it', name: 'Gemma 2 9B', contextWindow: 8192 }),
      withCanonicalModelDescription('groq', { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', contextWindow: 32768 }),
    ],
  },

  cerebras: {
    id: 'cerebras',
    name: 'Cerebras',
    ...getCanonicalProviderCopy('cerebras'),
    authMethods: ['api-key'],
    apiKeyHelpUrl: 'https://cloud.cerebras.ai',
    envKey: 'CEREBRAS_API_KEY',
    headerKey: 'x-cerebras-key',
    sdkPackage: '@ai-sdk/cerebras',
    baseUrl: 'https://api.cerebras.ai',
    baseUrlEditable: true,
    apiPath: '/v1/chat/completions',
    models: [
      withCanonicalModelDescription('cerebras', {
        id: 'llama3.1-70b',
        name: 'Llama 3.1 70B',
        contextWindow: 128000,
        isDefault: true,
      }),
      withCanonicalModelDescription('cerebras', { id: 'llama3.1-8b', name: 'Llama 3.1 8B', contextWindow: 128000 }),
    ],
  },

  // ── Specialty providers ───────────────────────────────────────────────────

  mistral: {
    id: 'mistral',
    name: 'Mistral',
    ...getCanonicalProviderCopy('mistral'),
    authMethods: ['api-key'],
    apiKeyHelpUrl: 'https://console.mistral.ai/api-keys',
    envKey: 'MISTRAL_API_KEY',
    headerKey: 'x-mistral-key',
    sdkPackage: '@ai-sdk/mistral',
    baseUrl: 'https://api.mistral.ai',
    baseUrlEditable: true,
    apiPath: '/v1/chat/completions',
    models: [
      withCanonicalModelDescription('mistral', {
        id: 'mistral-large-latest',
        name: 'Mistral Large',
        contextWindow: 128000,
        isDefault: true,
      }),
      withCanonicalModelDescription('mistral', {
        id: 'mistral-small-latest',
        name: 'Mistral Small',
        contextWindow: 128000,
      }),
      withCanonicalModelDescription('mistral', {
        id: 'codestral-latest',
        name: 'Codestral',
        contextWindow: 256000,
      }),
    ],
  },

  cohere: {
    id: 'cohere',
    name: 'Cohere',
    ...getCanonicalProviderCopy('cohere'),
    authMethods: ['api-key'],
    apiKeyHelpUrl: 'https://dashboard.cohere.com/api-keys',
    envKey: 'COHERE_API_KEY',
    headerKey: 'x-cohere-key',
    sdkPackage: '@ai-sdk/cohere',
    baseUrl: 'https://api.cohere.ai',
    baseUrlEditable: true,
    apiPath: '/v1/chat',
    models: [
      withCanonicalModelDescription('cohere', {
        id: 'command-r-plus',
        name: 'Command R+',
        contextWindow: 128000,
        isDefault: true,
      }),
      withCanonicalModelDescription('cohere', { id: 'command-r', name: 'Command R', contextWindow: 128000 }),
    ],
  },

  perplexity: {
    id: 'perplexity',
    name: 'Perplexity',
    ...getCanonicalProviderCopy('perplexity'),
    authMethods: ['api-key'],
    apiKeyHelpUrl: 'https://www.perplexity.ai/settings/api',
    envKey: 'PERPLEXITY_API_KEY',
    headerKey: 'x-perplexity-key',
    sdkPackage: '@ai-sdk/perplexity',
    baseUrl: 'https://api.perplexity.ai',
    baseUrlEditable: true,
    apiPath: '/chat/completions',
    models: [
      withCanonicalModelDescription('perplexity', {
        id: 'sonar-pro',
        name: 'Sonar Pro',
        contextWindow: 200000,
        isDefault: true,
      }),
      withCanonicalModelDescription('perplexity', { id: 'sonar', name: 'Sonar', contextWindow: 200000 }),
    ],
  },

  togetherai: {
    id: 'togetherai',
    name: 'Together AI',
    ...getCanonicalProviderCopy('togetherai'),
    authMethods: ['api-key'],
    apiKeyHelpUrl: 'https://api.together.xyz/settings/api-keys',
    envKey: 'TOGETHER_API_KEY',
    headerKey: 'x-together-key',
    sdkPackage: '@ai-sdk/togetherai',
    baseUrl: 'https://api.together.xyz',
    baseUrlEditable: true,
    apiPath: '/v1/chat/completions',
    models: [
      withCanonicalModelDescription('togetherai', {
        id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        name: 'Llama 3.3 70B Turbo',
        contextWindow: 128000,
        isDefault: true,
      }),
      withCanonicalModelDescription('togetherai', {
        id: 'deepseek-ai/DeepSeek-R1',
        name: 'DeepSeek R1',
        contextWindow: 65536,
      }),
      withCanonicalModelDescription('togetherai', {
        id: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        name: 'Mixtral 8x7B',
        contextWindow: 32768,
      }),
    ],
  },

  deepinfra: {
    id: 'deepinfra',
    name: 'Deep Infra',
    ...getCanonicalProviderCopy('deepinfra'),
    authMethods: ['api-key'],
    apiKeyHelpUrl: 'https://deepinfra.com/dash/api_keys',
    envKey: 'DEEPINFRA_API_KEY',
    headerKey: 'x-deepinfra-key',
    sdkPackage: '@ai-sdk/deepinfra',
    baseUrl: 'https://api.deepinfra.com',
    baseUrlEditable: true,
    apiPath: '/v1/openai/chat/completions',
    models: [
      { id: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B', contextWindow: 128000, isDefault: true },
      { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1', contextWindow: 65536 },
    ],
  },
  fireworks: {
    id: 'fireworks',
    name: 'Fireworks AI',
    ...getCanonicalProviderCopy('fireworks'),
    authMethods: ['api-key'],
    apiKeyHelpUrl: 'https://fireworks.ai/account/api-keys',
    envKey: 'FIREWORKS_API_KEY',
    headerKey: 'x-fireworks-key',
    sdkPackage: '@ai-sdk/openai-compatible',
    baseUrl: 'https://api.fireworks.ai',
    baseUrlEditable: true,
    apiPath: '/inference/v1/chat/completions',
    models: [
      {
        id: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
        name: 'Llama 3.3 70B',
        contextWindow: 131072,
        isDefault: true,
      },
      { id: 'accounts/fireworks/models/deepseek-r1', name: 'DeepSeek R1', contextWindow: 65536 },
    ],
  },

  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    ...getCanonicalProviderCopy('openrouter'),
    authMethods: ['api-key'],
    apiKeyHelpUrl: 'https://openrouter.ai/keys',
    envKey: 'OPENROUTER_API_KEY',
    headerKey: 'x-openrouter-key',
    sdkPackage: '@ai-sdk/openai-compatible',
    baseUrl: 'https://openrouter.ai',
    baseUrlEditable: true,
    apiPath: '/api/v1/chat/completions',
    models: [
      { id: 'openai/gpt-4o', name: 'GPT-4o (via OR)', contextWindow: 128000, isDefault: true },
      { id: 'anthropic/claude-sonnet-4-5', name: 'Claude Sonnet 4.5 (via OR)', contextWindow: 200000 },
      { id: 'google/gemini-2.5-flash-preview', name: 'Gemini 2.5 Flash (via OR)', contextWindow: 1048576 },
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (via OR)', contextWindow: 65536 },
    ],
  },

  // ── Chinese providers ─────────────────────────────────────────────────────

  zai: {
    id: 'zai',
    name: 'Z.AI (GLM)',
    ...getCanonicalProviderCopy('zai'),
    authMethods: ['api-key'],
    apiKeyHelpUrl: 'https://z.ai/manage-apikey',
    envKey: 'ZAI_API_KEY',
    headerKey: 'x-zai-key',
    sdkPackage: '@ai-sdk/openai-compatible',
    baseUrl: 'https://api.z.ai',
    baseUrlEditable: true,
    apiPath: '/api/coding/paas/v4/chat/completions',
    models: [
      withCanonicalModelDescription('zai', { id: 'glm-4.5', name: 'GLM-4.5', contextWindow: 128000, isDefault: true }),
      withCanonicalModelDescription('zai', { id: 'glm-4.5-air', name: 'GLM-4.5 Air', contextWindow: 128000 }),
      withCanonicalModelDescription('zai', { id: 'glm-4.6', name: 'GLM-4.6', contextWindow: 128000 }),
      withCanonicalModelDescription('zai', { id: 'glm-4.7', name: 'GLM-4.7', contextWindow: 200000 }),
      withCanonicalModelDescription('zai', { id: 'glm-4.7-flash', name: 'GLM-4.7 Flash', contextWindow: 200000 }),
    ],
  },
  minimax: {
    id: 'minimax',
    name: 'MiniMax',
    ...getCanonicalProviderCopy('minimax'),
    authMethods: ['api-key'],
    apiKeyHelpUrl: 'https://platform.minimax.io/user-center/basic-information/interface-key',
    envKey: 'MINIMAX_API_KEY',
    headerKey: 'x-minimax-key',
    sdkPackage: '@ai-sdk/openai-compatible',
    baseUrl: 'https://api.minimax.io',
    baseUrlEditable: true,
    apiPath: '/v1/chat/completions',
    models: [
      withCanonicalModelDescription('minimax', {
        id: 'MiniMax-M2',
        name: 'MiniMax M2',
        contextWindow: 1000000,
        isDefault: true,
      }),
      withCanonicalModelDescription('minimax', {
        id: 'MiniMax-Text-01',
        name: 'MiniMax Text-01',
        contextWindow: 1000000,
      }),
    ],
  },

  moonshotai: {
    id: 'moonshotai',
    name: 'Moonshot AI (Kimi)',
    ...getCanonicalProviderCopy('moonshotai'),
    authMethods: ['api-key'],
    apiKeyHelpUrl: 'https://platform.moonshot.ai/console/api-keys',
    envKey: 'MOONSHOT_API_KEY',
    headerKey: 'x-moonshot-key',
    sdkPackage: '@ai-sdk/openai-compatible',
    baseUrl: 'https://api.moonshot.ai',
    baseUrlEditable: true,
    apiPath: '/v1/chat/completions',
    models: [
      withCanonicalModelDescription('moonshotai', {
        id: 'kimi-k2-0711-preview',
        name: 'Kimi K2',
        contextWindow: 131072,
        isDefault: true,
      }),
      withCanonicalModelDescription('moonshotai', {
        id: 'moonshot-v1-128k',
        name: 'Moonshot 128K',
        contextWindow: 131072,
      }),
      withCanonicalModelDescription('moonshotai', {
        id: 'moonshot-v1-32k',
        name: 'Moonshot 32K',
        contextWindow: 32768,
      }),
    ],
  },

  /** Zhipu / BigModel OpenAI-compatible endpoint (distinct from Z.AI `api.z.ai`). */
  glm: {
    id: 'glm',
    name: 'GLM / Zhipu',
    ...getCanonicalProviderCopy('glm'),
    authMethods: ['api-key'],
    apiKeyHelpUrl: 'https://open.bigmodel.cn/',
    envKey: 'ZHIPU_API_KEY',
    headerKey: 'x-glm-key',
    sdkPackage: '@ai-sdk/openai-compatible',
    baseUrl: 'https://open.bigmodel.cn',
    baseUrlEditable: true,
    apiPath: '/api/paas/v4/chat/completions',
    models: [
      withCanonicalModelDescription('glm', {
        id: 'glm-4-plus',
        name: 'GLM-4 Plus',
        contextWindow: 128000,
        isDefault: true,
      }),
      withCanonicalModelDescription('glm', { id: 'glm-4-air', name: 'GLM-4 Air', contextWindow: 128000 }),
    ],
  },

  /** Moonshot China endpoint (`api.moonshot.cn`). */
  kimi: {
    id: 'kimi',
    name: 'Kimi / Moonshot',
    ...getCanonicalProviderCopy('kimi'),
    authMethods: ['api-key'],
    apiKeyHelpUrl: 'https://platform.moonshot.cn/console/api-keys',
    envKey: 'MOONSHOT_CN_API_KEY',
    headerKey: 'x-kimi-key',
    sdkPackage: '@ai-sdk/openai-compatible',
    baseUrl: 'https://api.moonshot.cn',
    baseUrlEditable: true,
    apiPath: '/v1/chat/completions',
    models: [
      withCanonicalModelDescription('kimi', {
        id: 'moonshot-v1-8k',
        name: 'Moonshot 8K',
        contextWindow: 8192,
        isDefault: true,
      }),
      withCanonicalModelDescription('kimi', { id: 'moonshot-v1-32k', name: 'Moonshot 32K', contextWindow: 32768 }),
      withCanonicalModelDescription('kimi', { id: 'moonshot-v1-128k', name: 'Moonshot 128K', contextWindow: 131072 }),
    ],
  },

  /** Alibaba DashScope OpenAI-compatible mode. */
  qwen: {
    id: 'qwen',
    name: 'Qwen / Tongyi',
    ...getCanonicalProviderCopy('qwen'),
    authMethods: ['api-key'],
    apiKeyHelpUrl: 'https://help.aliyun.com/zh/dashscope/',
    envKey: 'DASHSCOPE_API_KEY',
    headerKey: 'x-qwen-key',
    sdkPackage: '@ai-sdk/openai-compatible',
    baseUrl: 'https://dashscope.aliyuncs.com',
    baseUrlEditable: true,
    apiPath: '/compatible-mode/v1/chat/completions',
    models: [
      withCanonicalModelDescription('qwen', {
        id: 'qwen-turbo',
        name: 'Qwen Turbo',
        contextWindow: 131072,
        isDefault: true,
      }),
      withCanonicalModelDescription('qwen', { id: 'qwen-plus', name: 'Qwen Plus', contextWindow: 131072 }),
    ],
  },

  /** ByteDance Volcengine Ark OpenAI-compatible API (set base URL from console). */
  doubao: {
    id: 'doubao',
    name: 'Doubao / Volcengine',
    ...getCanonicalProviderCopy('doubao'),
    authMethods: ['api-key'],
    apiKeyHelpUrl: 'https://www.volcengine.com/docs/82379',
    envKey: 'ARK_API_KEY',
    headerKey: 'x-doubao-key',
    sdkPackage: '@ai-sdk/openai-compatible',
    baseUrl: 'https://ark.cn-beijing.volces.com',
    baseUrlEditable: true,
    apiPath: '/api/v3/chat/completions',
    models: [
      {
        id: 'doubao-pro-32k',
        name: 'Doubao Pro 32K',
        contextWindow: 32768,
        isDefault: true,
      },
    ],
  },

  siliconflow: {
    id: 'siliconflow',
    name: 'SiliconFlow',
    ...getCanonicalProviderCopy('siliconflow'),
    authMethods: ['api-key'],
    apiKeyHelpUrl: 'https://cloud.siliconflow.com/account/ak',
    envKey: 'SILICONFLOW_API_KEY',
    headerKey: 'x-siliconflow-key',
    sdkPackage: '@ai-sdk/openai-compatible',
    baseUrl: 'https://api.siliconflow.com',
    baseUrlEditable: true,
    apiPath: '/v1/chat/completions',
    models: [
      { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', contextWindow: 65536, isDefault: true },
      { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1', contextWindow: 65536 },
      { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B', contextWindow: 131072 },
      { id: 'THUDM/glm-4-9b-chat', name: 'GLM-4 9B', contextWindow: 128000 },
    ],
  },

  // ── Local providers ───────────────────────────────────────────────────────

  ollama: {
    id: 'ollama',
    name: 'Ollama',
    ...getCanonicalProviderCopy('ollama'),
    authMethods: ['api-key'],
    apiKeyHelpUrl: 'https://ollama.com',
    envKey: 'OLLAMA_BASE_URL',
    headerKey: 'x-ollama-key',
    sdkPackage: '@ai-sdk/openai-compatible',
    baseUrl: 'http://localhost:11434',
    baseUrlEditable: true,
    apiPath: '/v1/chat/completions',
    noKeyRequired: true,
    models: [
      { id: 'llama3.2', name: 'Llama 3.2', contextWindow: 128000, isDefault: true },
      { id: 'qwen2.5', name: 'Qwen 2.5', contextWindow: 32768 },
      { id: 'deepseek-r1', name: 'DeepSeek R1', contextWindow: 65536 },
      { id: 'gemma3', name: 'Gemma 3', contextWindow: 131072 },
    ],
  },

  lmstudio: {
    id: 'lmstudio',
    name: 'LM Studio',
    ...getCanonicalProviderCopy('lmstudio'),
    authMethods: ['api-key'],
    apiKeyHelpUrl: 'https://lmstudio.ai',
    envKey: 'LMSTUDIO_API_KEY',
    headerKey: 'x-lmstudio-key',
    sdkPackage: '@ai-sdk/openai-compatible',
    baseUrl: 'http://127.0.0.1:1234',
    baseUrlEditable: true,
    apiPath: '/v1/chat/completions',
    noKeyRequired: true,
    models: [withCanonicalModelDescription('lmstudio', { id: 'local-model', name: 'Active model', isDefault: true })],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getDefaultModelId(providerId: ProviderId): string {
  const provider = PROVIDER_REGISTRY[providerId];
  const defaultModel = provider.models.find((m) => m.isDefault);
  return defaultModel?.id ?? provider.models[0]?.id ?? '';
}

export function getLocalizedProviderGroupLabel(label: string, language: InterfaceLanguage): string {
  return PROVIDER_UI_MESSAGES[language].groupLabels[label as keyof typeof PROVIDER_UI_MESSAGES.en.groupLabels] ?? label;
}

export function getLocalizedProviderDefinition(
  providerId: ProviderId,
  language: InterfaceLanguage,
): ProviderDefinition {
  const provider = PROVIDER_REGISTRY[providerId];
  const localized = PROVIDER_UI_MESSAGES[language].providers[providerId];

  return {
    ...provider,
    description: localized?.description ?? provider.description,
    apiKeyPlaceholder: localized?.apiKeyPlaceholder ?? provider.apiKeyPlaceholder,
    models: provider.models.map((model) => ({
      ...model,
      description: localized?.models?.[model.id as keyof typeof localized.models] ?? model.description,
    })),
  };
}

export const PROVIDER_IDS: ProviderId[] = [
  // Frontier
  'openai',
  'anthropic',
  'google',
  'deepseek',
  'xai',
  // Fast inference
  'groq',
  'cerebras',
  // Specialty
  'mistral',
  'cohere',
  'perplexity',
  'togetherai',
  'deepinfra',
  'fireworks',
  'openrouter',
  // Chinese
  'zai',
  'minimax',
  'moonshotai',
  'glm',
  'kimi',
  'qwen',
  'doubao',
  'siliconflow',
  // Local
  'ollama',
  'lmstudio',
];

/** Grouped for UI display */
export const PROVIDER_GROUPS: { label: string; ids: ProviderId[] }[] = [
  { label: 'Frontier', ids: ['openai', 'anthropic', 'google', 'deepseek', 'xai'] },
  { label: 'Fast Inference', ids: ['groq', 'cerebras'] },
  {
    label: 'Specialty',
    ids: ['mistral', 'cohere', 'perplexity', 'togetherai', 'deepinfra', 'fireworks', 'openrouter'],
  },
  { label: 'Chinese', ids: ['zai', 'minimax', 'moonshotai', 'glm', 'kimi', 'qwen', 'doubao', 'siliconflow'] },
  { label: 'Local', ids: ['ollama', 'lmstudio'] },
];

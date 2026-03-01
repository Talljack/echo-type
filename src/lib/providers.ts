// Provider registry — sourced from models.dev (https://github.com/sst/models.dev)

export type AuthMethod = 'oauth' | 'api-key';

export interface ProviderModel {
  id: string;
  name: string;
  description?: string;
  contextWindow?: number;
  isDefault?: boolean;
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
  | 'zhipuai'
  | 'minimax'
  | 'moonshotai'
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
  /** User-editable base URL */
  baseUrl?: string;
  /** User-editable API path override */
  apiPath?: string;
  /** Dynamically fetched models from provider API */
  dynamicModels?: ProviderModel[];
  /** Skip dynamic model fetching, use static list only */
  noModelApi?: boolean;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const PROVIDER_REGISTRY: Record<ProviderId, ProviderDefinition> = {

  // ── Frontier cloud providers ──────────────────────────────────────────────

  openai: {
    id: 'openai', name: 'OpenAI', description: 'GPT-4o, o3, o4-mini and more',
    authMethods: ['oauth', 'api-key'],
    oauth: {
      clientId: process.env.NEXT_PUBLIC_OPENAI_CLIENT_ID ?? '',
      authUrl: 'https://auth.openai.com/oauth/authorize',
      tokenUrl: 'https://auth.openai.com/oauth/token',
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      usePKCE: true,
      extraParams: { codex_cli_simplified_flow: 'true', id_token_add_organizations: 'true' },
    },
    apiKeyPlaceholder: 'sk-...', apiKeyHelpUrl: 'https://platform.openai.com/api-keys',
    envKey: 'OPENAI_API_KEY', headerKey: 'x-openai-key', sdkPackage: '@ai-sdk/openai',
    baseUrl: 'https://api.openai.com', baseUrlEditable: true, apiPath: '/v1/chat/completions',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Flagship multimodal model', contextWindow: 128000, isDefault: true },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast & affordable', contextWindow: 128000 },
      { id: 'o4-mini', name: 'o4-mini', description: 'Fast reasoning model', contextWindow: 200000 },
      { id: 'o3', name: 'o3', description: 'Most capable reasoning', contextWindow: 200000 },
    ],
  },

  anthropic: {
    id: 'anthropic', name: 'Anthropic', description: 'Claude Sonnet, Haiku, Opus',
    authMethods: ['api-key'],
    apiKeyPlaceholder: 'sk-ant-...', apiKeyHelpUrl: 'https://console.anthropic.com/settings/keys',
    envKey: 'ANTHROPIC_API_KEY', headerKey: 'x-anthropic-key', sdkPackage: '@ai-sdk/anthropic',
    baseUrl: 'https://api.anthropic.com', baseUrlEditable: true, apiPath: '/v1/messages',
    models: [
      { id: 'claude-sonnet-4-5-20251001', name: 'Claude Sonnet 4.5', description: 'Best balance', contextWindow: 200000, isDefault: true },
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', description: 'Most capable', contextWindow: 200000 },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', description: 'Fast & compact', contextWindow: 200000 },
    ],
  },

  google: {
    id: 'google', name: 'Google', description: 'Gemini 2.5 Flash, Pro and more',
    authMethods: ['oauth', 'api-key'],
    oauth: {
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '',
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: ['https://www.googleapis.com/auth/generative-language'],
      usePKCE: true,
    },
    apiKeyPlaceholder: 'AIza...', apiKeyHelpUrl: 'https://aistudio.google.com/apikey',
    envKey: 'GOOGLE_API_KEY', headerKey: 'x-google-key', sdkPackage: '@ai-sdk/google',
    baseUrl: 'https://generativelanguage.googleapis.com', baseUrlEditable: true,
    apiPath: '/v1beta/models/{model}:generateContent',
    models: [
      { id: 'gemini-2.5-flash-preview', name: 'Gemini 2.5 Flash', description: 'Fast & affordable', contextWindow: 1048576, isDefault: true },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Balanced', contextWindow: 1048576 },
      { id: 'gemini-2.5-pro-preview', name: 'Gemini 2.5 Pro', description: 'Advanced reasoning', contextWindow: 2097152 },
    ],
  },

  deepseek: {
    id: 'deepseek', name: 'DeepSeek', description: 'DeepSeek V3, R1',
    authMethods: ['api-key'],
    apiKeyPlaceholder: 'sk-...', apiKeyHelpUrl: 'https://platform.deepseek.com/api_keys',
    envKey: 'DEEPSEEK_API_KEY', headerKey: 'x-deepseek-key', sdkPackage: '@ai-sdk/openai-compatible',
    baseUrl: 'https://api.deepseek.com', baseUrlEditable: true, apiPath: '/v1/chat/completions',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3', description: 'General purpose', contextWindow: 64000, isDefault: true },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1', description: 'Advanced reasoning', contextWindow: 64000 },
    ],
  },

  xai: {
    id: 'xai', name: 'xAI', description: 'Grok 3 and more',
    authMethods: ['api-key'],
    apiKeyPlaceholder: 'xai-...', apiKeyHelpUrl: 'https://console.x.ai',
    envKey: 'XAI_API_KEY', headerKey: 'x-xai-key', sdkPackage: '@ai-sdk/xai',
    baseUrl: 'https://api.x.ai', baseUrlEditable: true, apiPath: '/v1/chat/completions',
    models: [
      { id: 'grok-3', name: 'Grok 3', description: 'Most capable', contextWindow: 131072, isDefault: true },
      { id: 'grok-3-mini', name: 'Grok 3 Mini', description: 'Fast reasoning', contextWindow: 131072 },
      { id: 'grok-2-1212', name: 'Grok 2', description: 'Previous gen', contextWindow: 131072 },
    ],
  },

  // ── Fast inference ────────────────────────────────────────────────────────

  groq: {
    id: 'groq', name: 'Groq', description: 'Llama, Gemma via LPU inference',
    authMethods: ['api-key'],
    apiKeyPlaceholder: 'gsk_...', apiKeyHelpUrl: 'https://console.groq.com/keys',
    envKey: 'GROQ_API_KEY', headerKey: 'x-groq-key', sdkPackage: '@ai-sdk/groq',
    baseUrl: 'https://api.groq.com', baseUrlEditable: true, apiPath: '/openai/v1/chat/completions',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', description: 'Fast & capable', contextWindow: 128000, isDefault: true },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', description: 'Ultra-fast', contextWindow: 128000 },
      { id: 'gemma2-9b-it', name: 'Gemma 2 9B', description: 'Google open model', contextWindow: 8192 },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: 'MoE model', contextWindow: 32768 },
    ],
  },

  cerebras: {
    id: 'cerebras', name: 'Cerebras', description: 'Ultra-fast wafer-scale inference',
    authMethods: ['api-key'],
    apiKeyPlaceholder: 'csk-...', apiKeyHelpUrl: 'https://cloud.cerebras.ai',
    envKey: 'CEREBRAS_API_KEY', headerKey: 'x-cerebras-key', sdkPackage: '@ai-sdk/cerebras',
    baseUrl: 'https://api.cerebras.ai', baseUrlEditable: true, apiPath: '/v1/chat/completions',
    models: [
      { id: 'llama3.1-70b', name: 'Llama 3.1 70B', description: 'Ultra-fast', contextWindow: 128000, isDefault: true },
      { id: 'llama3.1-8b', name: 'Llama 3.1 8B', description: 'Fastest', contextWindow: 128000 },
    ],
  },

  // ── Specialty providers ───────────────────────────────────────────────────

  mistral: {
    id: 'mistral', name: 'Mistral', description: 'Mistral Large, Small, Codestral',
    authMethods: ['api-key'],
    apiKeyPlaceholder: '...', apiKeyHelpUrl: 'https://console.mistral.ai/api-keys',
    envKey: 'MISTRAL_API_KEY', headerKey: 'x-mistral-key', sdkPackage: '@ai-sdk/mistral',
    baseUrl: 'https://api.mistral.ai', baseUrlEditable: true, apiPath: '/v1/chat/completions',
    models: [
      { id: 'mistral-large-latest', name: 'Mistral Large', description: 'Most capable', contextWindow: 128000, isDefault: true },
      { id: 'mistral-small-latest', name: 'Mistral Small', description: 'Fast & efficient', contextWindow: 128000 },
      { id: 'codestral-latest', name: 'Codestral', description: 'Code specialist', contextWindow: 256000 },
    ],
  },

  cohere: {
    id: 'cohere', name: 'Cohere', description: 'Command R, Embed models',
    authMethods: ['api-key'],
    apiKeyPlaceholder: '...', apiKeyHelpUrl: 'https://dashboard.cohere.com/api-keys',
    envKey: 'COHERE_API_KEY', headerKey: 'x-cohere-key', sdkPackage: '@ai-sdk/cohere',
    baseUrl: 'https://api.cohere.ai', baseUrlEditable: true, apiPath: '/v1/chat',
    models: [
      { id: 'command-r-plus', name: 'Command R+', description: 'Most capable', contextWindow: 128000, isDefault: true },
      { id: 'command-r', name: 'Command R', description: 'Balanced', contextWindow: 128000 },
    ],
  },

  perplexity: {
    id: 'perplexity', name: 'Perplexity', description: 'Sonar with real-time search',
    authMethods: ['api-key'],
    apiKeyPlaceholder: 'pplx-...', apiKeyHelpUrl: 'https://www.perplexity.ai/settings/api',
    envKey: 'PERPLEXITY_API_KEY', headerKey: 'x-perplexity-key', sdkPackage: '@ai-sdk/perplexity',
    baseUrl: 'https://api.perplexity.ai', baseUrlEditable: true, apiPath: '/chat/completions',
    models: [
      { id: 'sonar-pro', name: 'Sonar Pro', description: 'Search + reasoning', contextWindow: 200000, isDefault: true },
      { id: 'sonar', name: 'Sonar', description: 'Fast web search', contextWindow: 200000 },
    ],
  },

  togetherai: {
    id: 'togetherai', name: 'Together AI', description: 'Open models at scale',
    authMethods: ['api-key'],
    apiKeyPlaceholder: '...', apiKeyHelpUrl: 'https://api.together.xyz/settings/api-keys',
    envKey: 'TOGETHER_API_KEY', headerKey: 'x-together-key', sdkPackage: '@ai-sdk/togetherai',
    baseUrl: 'https://api.together.xyz', baseUrlEditable: true, apiPath: '/v1/chat/completions',
    models: [
      { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', name: 'Llama 3.3 70B Turbo', description: 'Fast open model', contextWindow: 128000, isDefault: true },
      { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1', description: 'Open reasoning', contextWindow: 65536 },
      { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', name: 'Mixtral 8x7B', description: 'MoE', contextWindow: 32768 },
    ],
  },

  deepinfra: {
    id: 'deepinfra', name: 'Deep Infra', description: 'Cost-efficient open model inference',
    authMethods: ['api-key'],
    apiKeyPlaceholder: '...', apiKeyHelpUrl: 'https://deepinfra.com/dash/api_keys',
    envKey: 'DEEPINFRA_API_KEY', headerKey: 'x-deepinfra-key', sdkPackage: '@ai-sdk/deepinfra',
    baseUrl: 'https://api.deepinfra.com', baseUrlEditable: true, apiPath: '/v1/openai/chat/completions',
    models: [
      { id: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B', contextWindow: 128000, isDefault: true },
      { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1', contextWindow: 65536 },
    ],
  },
  fireworks: {
    id: 'fireworks', name: 'Fireworks AI', description: 'Fast open model serving',
    authMethods: ['api-key'],
    apiKeyPlaceholder: 'fw-...', apiKeyHelpUrl: 'https://fireworks.ai/account/api-keys',
    envKey: 'FIREWORKS_API_KEY', headerKey: 'x-fireworks-key', sdkPackage: '@ai-sdk/openai-compatible',
    baseUrl: 'https://api.fireworks.ai', baseUrlEditable: true, apiPath: '/inference/v1/chat/completions',
    models: [
      { id: 'accounts/fireworks/models/llama-v3p3-70b-instruct', name: 'Llama 3.3 70B', contextWindow: 131072, isDefault: true },
      { id: 'accounts/fireworks/models/deepseek-r1', name: 'DeepSeek R1', contextWindow: 65536 },
    ],
  },

  openrouter: {
    id: 'openrouter', name: 'OpenRouter', description: 'Access 300+ models via one API',
    authMethods: ['api-key'],
    apiKeyPlaceholder: 'sk-or-...', apiKeyHelpUrl: 'https://openrouter.ai/keys',
    envKey: 'OPENROUTER_API_KEY', headerKey: 'x-openrouter-key', sdkPackage: '@ai-sdk/openai-compatible',
    baseUrl: 'https://openrouter.ai', baseUrlEditable: true, apiPath: '/api/v1/chat/completions',
    models: [
      { id: 'openai/gpt-4o', name: 'GPT-4o (via OR)', contextWindow: 128000, isDefault: true },
      { id: 'anthropic/claude-sonnet-4-5', name: 'Claude Sonnet 4.5 (via OR)', contextWindow: 200000 },
      { id: 'google/gemini-2.5-flash-preview', name: 'Gemini 2.5 Flash (via OR)', contextWindow: 1048576 },
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (via OR)', contextWindow: 65536 },
    ],
  },

  // ── Chinese providers ─────────────────────────────────────────────────────

  zhipuai: {
    id: 'zhipuai', name: 'Z.AI (GLM)', description: 'GLM-4.5/4.6/4.7, Z.AI Coding Plan',
    authMethods: ['api-key'],
    apiKeyPlaceholder: '...', apiKeyHelpUrl: 'https://z.ai/manage-apikey',
    envKey: 'ZHIPU_API_KEY', headerKey: 'x-zhipu-key', sdkPackage: '@ai-sdk/openai-compatible',
    baseUrl: 'https://api.z.ai', baseUrlEditable: true, apiPath: '/api/coding/paas/v4/chat/completions',
    models: [
      { id: 'glm-4.5', name: 'GLM-4.5', description: 'Balanced model', contextWindow: 128000, isDefault: true },
      { id: 'glm-4.5-air', name: 'GLM-4.5 Air', description: 'Fast & affordable', contextWindow: 128000 },
      { id: 'glm-4.6', name: 'GLM-4.6', description: 'Advanced model', contextWindow: 128000 },
      { id: 'glm-4.7', name: 'GLM-4.7', description: 'Enhanced reasoning', contextWindow: 200000 },
      { id: 'glm-4.7-flash', name: 'GLM-4.7 Flash', description: 'Fast reasoning', contextWindow: 200000 },
    ],
  },
  minimax: {
    id: 'minimax', name: 'MiniMax', description: 'MiniMax M2, M2.5 models',
    authMethods: ['api-key'],
    apiKeyPlaceholder: '...', apiKeyHelpUrl: 'https://platform.minimax.io/user-center/basic-information/interface-key',
    envKey: 'MINIMAX_API_KEY', headerKey: 'x-minimax-key', sdkPackage: '@ai-sdk/openai-compatible',
    baseUrl: 'https://api.minimax.io', baseUrlEditable: true, apiPath: '/v1/chat/completions',
    models: [
      { id: 'MiniMax-M2', name: 'MiniMax M2', description: 'Most capable', contextWindow: 1000000, isDefault: true },
      { id: 'MiniMax-Text-01', name: 'MiniMax Text-01', description: 'Fast', contextWindow: 1000000 },
    ],
  },

  moonshotai: {
    id: 'moonshotai', name: 'Moonshot AI (Kimi)', description: 'Kimi K2, long context',
    authMethods: ['api-key'],
    apiKeyPlaceholder: 'sk-...', apiKeyHelpUrl: 'https://platform.moonshot.ai/console/api-keys',
    envKey: 'MOONSHOT_API_KEY', headerKey: 'x-moonshot-key', sdkPackage: '@ai-sdk/openai-compatible',
    baseUrl: 'https://api.moonshot.ai', baseUrlEditable: true, apiPath: '/v1/chat/completions',
    models: [
      { id: 'kimi-k2-0711-preview', name: 'Kimi K2', description: '1T MoE model', contextWindow: 131072, isDefault: true },
      { id: 'moonshot-v1-128k', name: 'Moonshot 128K', description: 'Long context', contextWindow: 131072 },
      { id: 'moonshot-v1-32k', name: 'Moonshot 32K', description: 'Standard', contextWindow: 32768 },
    ],
  },

  siliconflow: {
    id: 'siliconflow', name: 'SiliconFlow', description: 'Open models, free tier available',
    authMethods: ['api-key'],
    apiKeyPlaceholder: 'sk-...', apiKeyHelpUrl: 'https://cloud.siliconflow.com/account/ak',
    envKey: 'SILICONFLOW_API_KEY', headerKey: 'x-siliconflow-key', sdkPackage: '@ai-sdk/openai-compatible',
    baseUrl: 'https://api.siliconflow.com', baseUrlEditable: true, apiPath: '/v1/chat/completions',
    models: [
      { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', contextWindow: 65536, isDefault: true },
      { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1', contextWindow: 65536 },
      { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B', contextWindow: 131072 },
      { id: 'THUDM/glm-4-9b-chat', name: 'GLM-4 9B', contextWindow: 128000 },
    ],
  },

  // ── Local providers ───────────────────────────────────────────────────────

  ollama: {
    id: 'ollama', name: 'Ollama', description: 'Local models — run anything locally',
    authMethods: ['api-key'],
    apiKeyPlaceholder: 'ollama', apiKeyHelpUrl: 'https://ollama.com',
    envKey: 'OLLAMA_BASE_URL', headerKey: 'x-ollama-key', sdkPackage: '@ai-sdk/openai-compatible',
    baseUrl: 'http://localhost:11434', baseUrlEditable: true, apiPath: '/v1/chat/completions',
    noKeyRequired: true,
    models: [
      { id: 'llama3.2', name: 'Llama 3.2', contextWindow: 128000, isDefault: true },
      { id: 'qwen2.5', name: 'Qwen 2.5', contextWindow: 32768 },
      { id: 'deepseek-r1', name: 'DeepSeek R1', contextWindow: 65536 },
      { id: 'gemma3', name: 'Gemma 3', contextWindow: 131072 },
    ],
  },

  lmstudio: {
    id: 'lmstudio', name: 'LM Studio', description: 'Local models via LM Studio server',
    authMethods: ['api-key'],
    apiKeyPlaceholder: 'lm-studio', apiKeyHelpUrl: 'https://lmstudio.ai',
    envKey: 'LMSTUDIO_API_KEY', headerKey: 'x-lmstudio-key', sdkPackage: '@ai-sdk/openai-compatible',
    baseUrl: 'http://127.0.0.1:1234', baseUrlEditable: true, apiPath: '/v1/chat/completions',
    noKeyRequired: true,
    models: [
      { id: 'local-model', name: 'Active model', description: 'Currently loaded in LM Studio', isDefault: true },
    ],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getDefaultModelId(providerId: ProviderId): string {
  const provider = PROVIDER_REGISTRY[providerId];
  const defaultModel = provider.models.find(m => m.isDefault);
  return defaultModel?.id ?? provider.models[0]?.id ?? '';
}

export const PROVIDER_IDS: ProviderId[] = [
  // Frontier
  'openai', 'anthropic', 'google', 'deepseek', 'xai',
  // Fast inference
  'groq', 'cerebras',
  // Specialty
  'mistral', 'cohere', 'perplexity', 'togetherai', 'deepinfra', 'fireworks', 'openrouter',
  // Chinese
  'zhipuai', 'minimax', 'moonshotai', 'siliconflow',
  // Local
  'ollama', 'lmstudio',
];

/** Grouped for UI display */
export const PROVIDER_GROUPS: { label: string; ids: ProviderId[] }[] = [
  { label: 'Frontier', ids: ['openai', 'anthropic', 'google', 'deepseek', 'xai'] },
  { label: 'Fast Inference', ids: ['groq', 'cerebras'] },
  { label: 'Specialty', ids: ['mistral', 'cohere', 'perplexity', 'togetherai', 'deepinfra', 'fireworks', 'openrouter'] },
  { label: 'Chinese', ids: ['zhipuai', 'minimax', 'moonshotai', 'siliconflow'] },
  { label: 'Local', ids: ['ollama', 'lmstudio'] },
];

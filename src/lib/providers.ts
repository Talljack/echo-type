// Provider registry — defines all supported AI providers, their auth methods, and available models.

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
  /** Whether to use PKCE flow */
  usePKCE: boolean;
}

export interface ProviderDefinition {
  id: string;
  name: string;
  description: string;
  /** Supported auth methods in priority order */
  authMethods: AuthMethod[];
  /** OAuth config if provider supports OAuth */
  oauth?: OAuthConfig;
  /** Placeholder text for API key input */
  apiKeyPlaceholder: string;
  /** Help URL for getting an API key */
  apiKeyHelpUrl: string;
  /** Environment variable name for server-side fallback */
  envKey: string;
  /** Custom header name for passing key from client */
  headerKey: string;
  /** AI SDK package identifier */
  sdkPackage: string;
  /** Available models */
  models: ProviderModel[];
}

export type ProviderId = 'openai' | 'anthropic' | 'google' | 'deepseek';

export interface ProviderAuthState {
  type: 'none' | 'api-key' | 'oauth';
  apiKey?: string;
  /** OAuth tokens */
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface ProviderConfig {
  providerId: ProviderId;
  auth: ProviderAuthState;
  selectedModelId: string;
}

export const PROVIDER_REGISTRY: Record<ProviderId, ProviderDefinition> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o, GPT-4o mini, and more',
    authMethods: ['oauth', 'api-key'],
    oauth: {
      clientId: '', // Set via env NEXT_PUBLIC_OPENAI_CLIENT_ID
      authUrl: 'https://auth.openai.com/oauth/authorize',
      tokenUrl: 'https://auth.openai.com/oauth/token',
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      usePKCE: true,
    },
    apiKeyPlaceholder: 'sk-...',
    apiKeyHelpUrl: 'https://platform.openai.com/api-keys',
    envKey: 'OPENAI_API_KEY',
    headerKey: 'x-openai-key',
    sdkPackage: '@ai-sdk/openai',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable model', contextWindow: 128000, isDefault: true },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and affordable', contextWindow: 128000 },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Previous generation', contextWindow: 128000 },
    ],
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude Sonnet, Haiku, and Opus',
    authMethods: ['api-key'],
    apiKeyPlaceholder: 'sk-ant-...',
    apiKeyHelpUrl: 'https://console.anthropic.com/settings/keys',
    envKey: 'ANTHROPIC_API_KEY',
    headerKey: 'x-anthropic-key',
    sdkPackage: '@ai-sdk/anthropic',
    models: [
      { id: 'claude-sonnet-4-5-20251001', name: 'Claude Sonnet 4.5', description: 'Best balance of speed and intelligence', contextWindow: 200000, isDefault: true },
      { id: 'claude-haiku-3-5-20241022', name: 'Claude Haiku 3.5', description: 'Fast and compact', contextWindow: 200000 },
    ],
  },
  google: {
    id: 'google',
    name: 'Google',
    description: 'Gemini 2.0 Flash, Pro, and more',
    authMethods: ['oauth', 'api-key'],
    oauth: {
      clientId: '', // Set via env NEXT_PUBLIC_GOOGLE_CLIENT_ID
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: ['https://www.googleapis.com/auth/generative-language'],
      usePKCE: false,
    },
    apiKeyPlaceholder: 'AIza...',
    apiKeyHelpUrl: 'https://aistudio.google.com/apikey',
    envKey: 'GOOGLE_API_KEY',
    headerKey: 'x-google-key',
    sdkPackage: '@ai-sdk/google',
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Fast and versatile', contextWindow: 1048576, isDefault: true },
      { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', description: 'Lightweight and fast', contextWindow: 1048576 },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Advanced reasoning', contextWindow: 2097152 },
    ],
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'DeepSeek Chat and Reasoner',
    authMethods: ['api-key'],
    apiKeyPlaceholder: 'sk-...',
    apiKeyHelpUrl: 'https://platform.deepseek.com/api_keys',
    envKey: 'DEEPSEEK_API_KEY',
    headerKey: 'x-deepseek-key',
    sdkPackage: '@ai-sdk/openai-compatible',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3', description: 'General purpose chat', contextWindow: 64000, isDefault: true },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1', description: 'Advanced reasoning', contextWindow: 64000 },
    ],
  },
};

/** Get the default model ID for a provider */
export function getDefaultModelId(providerId: ProviderId): string {
  const provider = PROVIDER_REGISTRY[providerId];
  const defaultModel = provider.models.find(m => m.isDefault);
  return defaultModel?.id ?? provider.models[0].id;
}

/** All provider IDs in display order */
export const PROVIDER_IDS: ProviderId[] = ['openai', 'anthropic', 'google', 'deepseek'];

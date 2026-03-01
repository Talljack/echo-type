import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createMistral } from '@ai-sdk/mistral';
import { createXai } from '@ai-sdk/xai';
import { createCohere } from '@ai-sdk/cohere';
import { createPerplexity } from '@ai-sdk/perplexity';
import { createTogetherAI } from '@ai-sdk/togetherai';
import { createDeepInfra } from '@ai-sdk/deepinfra';
import { createCerebras } from '@ai-sdk/cerebras';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { type ProviderId, PROVIDER_REGISTRY, getDefaultModelId } from './providers';

interface ResolveOptions {
  providerId: ProviderId;
  modelId: string;
  apiKey: string;
  /** Override base URL (for proxy servers or custom endpoints) */
  baseUrl?: string;
  /** Override API path (e.g. /chat/completions, /messages) */
  apiPath?: string;
}

/**
 * Build the SDK baseURL from origin + apiPath.
 * SDKs append their own resource suffix (e.g. /chat/completions, /messages),
 * so we strip known suffixes from apiPath and combine with the origin.
 *
 * Example: baseUrl="https://ai.php.kim" apiPath="/v1/chat/completions"
 *   → strips "/chat/completions" → sdkBaseURL = "https://ai.php.kim/v1"
 */
function buildSdkBaseURL(origin: string, apiPath: string): string {
  // Strip known resource suffixes that SDKs append automatically
  let prefix = apiPath;
  const suffixes = ['/chat/completions', '/messages', '/completions'];
  for (const s of suffixes) {
    if (prefix.endsWith(s)) {
      prefix = prefix.slice(0, -s.length);
      break;
    }
  }
  // Also handle Google-style paths like /v1beta/models/{model}:generateContent
  if (prefix.includes(':generateContent')) {
    prefix = prefix.replace(/\/models\/.*$/, '');
  }
  // Combine origin + remaining prefix, avoid double slash
  if (!prefix || prefix === '/') return origin;
  return origin.replace(/\/$/, '') + prefix;
}

export function resolveModel({ providerId, modelId, apiKey, baseUrl, apiPath }: ResolveOptions) {
  const effectiveModelId = modelId || getDefaultModelId(providerId);
  const def = PROVIDER_REGISTRY[providerId];
  const effectiveBaseUrl = baseUrl || def.baseUrl || '';
  const effectivePath = apiPath || def.apiPath || '';
  const isCustomUrl = baseUrl && baseUrl !== def.baseUrl;

  // When a custom baseUrl is set, route based on apiPath to pick the right SDK
  if (isCustomUrl) {
    const sdkBase = buildSdkBaseURL(effectiveBaseUrl, effectivePath);
    if (effectivePath.endsWith('/messages')) {
      return createAnthropic({ apiKey, baseURL: sdkBase })(effectiveModelId);
    }
    if (effectivePath.includes(':generateContent')) {
      return createGoogleGenerativeAI({ apiKey, baseURL: sdkBase })(effectiveModelId);
    }
    return createOpenAICompatible({ name: providerId, apiKey, baseURL: sdkBase })(effectiveModelId);
  }

  // Default provider routing — use native SDKs
  switch (providerId) {
    case 'openai':
      return createOpenAI({ apiKey })(effectiveModelId);
    case 'anthropic':
      return createAnthropic({ apiKey })(effectiveModelId);
    case 'google':
      return createGoogleGenerativeAI({ apiKey })(effectiveModelId);
    case 'groq':
      return createGroq({ apiKey })(effectiveModelId);
    case 'mistral':
      return createMistral({ apiKey })(effectiveModelId);
    case 'xai':
      return createXai({ apiKey })(effectiveModelId);
    case 'cohere':
      return createCohere({ apiKey })(effectiveModelId);
    case 'perplexity':
      return createPerplexity({ apiKey })(effectiveModelId);
    case 'togetherai':
      return createTogetherAI({ apiKey })(effectiveModelId);
    case 'deepinfra':
      return createDeepInfra({ apiKey })(effectiveModelId);
    case 'cerebras':
      return createCerebras({ apiKey })(effectiveModelId);
    // OpenAI-compatible providers (deepseek, fireworks, openrouter, chinese, local)
    default: {
      const sdkBase = buildSdkBaseURL(effectiveBaseUrl, effectivePath);
      if (!sdkBase) throw new Error(`No base URL configured for provider: ${providerId}`);
      return createOpenAICompatible({
        name: providerId,
        apiKey: def.noKeyRequired ? 'ollama' : apiKey,
        baseURL: sdkBase,
      })(effectiveModelId);
    }
  }
}

export function resolveApiKey(
  providerId: ProviderId,
  headers: Headers,
): string {
  const def = PROVIDER_REGISTRY[providerId];

  // Local providers don't need a real key
  if (def.noKeyRequired) return 'ollama';

  const fromHeader = headers.get(def.headerKey);
  if (fromHeader) return fromHeader;

  const fromEnv = process.env[def.envKey];
  if (fromEnv) return fromEnv;

  return '';
}

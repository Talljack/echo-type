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
  /** Override base URL (for user-customized Ollama / LM Studio endpoints) */
  baseUrl?: string;
}

export function resolveModel({ providerId, modelId, apiKey, baseUrl }: ResolveOptions) {
  // Use provider's default model if none specified
  const effectiveModelId = modelId || getDefaultModelId(providerId);

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

    // ── OpenAI-compatible providers ──────────────────────────────────────────
    default: {
      const def = PROVIDER_REGISTRY[providerId];
      const url = baseUrl || def.baseUrl;
      if (!url) throw new Error(`No base URL configured for provider: ${providerId}`);

      const client = createOpenAICompatible({
        name: providerId,
        apiKey: def.noKeyRequired ? 'ollama' : apiKey,
        baseURL: url,
      });
      return client(effectiveModelId);
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

import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { type ProviderId, PROVIDER_REGISTRY } from './providers';

interface ResolveOptions {
  providerId: ProviderId;
  modelId: string;
  apiKey: string;
}

export function resolveModel({ providerId, modelId, apiKey }: ResolveOptions) {
  switch (providerId) {
    case 'openai': {
      const openai = createOpenAI({ apiKey });
      return openai(modelId);
    }
    case 'anthropic': {
      const anthropic = createAnthropic({ apiKey });
      return anthropic(modelId);
    }
    case 'google': {
      const google = createGoogleGenerativeAI({ apiKey });
      return google(modelId);
    }
    case 'deepseek': {
      const deepseek = createOpenAI({
        apiKey,
        baseURL: 'https://api.deepseek.com/v1',
      });
      return deepseek(modelId);
    }
    default:
      throw new Error(`Unsupported provider: ${providerId}`);
  }
}

export function resolveApiKey(
  providerId: ProviderId,
  headers: Headers,
): string {
  const def = PROVIDER_REGISTRY[providerId];
  const fromHeader = headers.get(def.headerKey);
  if (fromHeader) return fromHeader;

  const fromEnv = process.env[def.envKey];
  if (fromEnv) return fromEnv;

  return '';
}

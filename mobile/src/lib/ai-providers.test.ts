import type { Settings } from '@/types';
import {
  buildLegacyProviderConfig,
  createDefaultAiProviderConfig,
  isAiProviderConfigReady,
} from './ai-providers';

describe('mobile ai provider helpers', () => {
  it('builds a migrated provider config from legacy settings', () => {
    const settings = {
      aiProvider: 'groq',
      aiApiKey: 'gsk_test_123',
      aiBaseUrl: '',
      aiModel: 'llama-3.3-70b-versatile',
    } as Settings;

    expect(buildLegacyProviderConfig(settings)).toEqual({
      providerId: 'groq',
      auth: { type: 'api-key', apiKey: 'gsk_test_123' },
      selectedModelId: 'llama-3.3-70b-versatile',
      baseUrl: 'https://api.groq.com',
      dynamicModels: [],
    });
  });

  it('creates provider defaults with the expected base model and endpoint', () => {
    expect(createDefaultAiProviderConfig('groq')).toEqual({
      providerId: 'groq',
      auth: { type: 'none' },
      selectedModelId: 'llama-3.3-70b-versatile',
      baseUrl: 'https://api.groq.com',
      dynamicModels: [],
    });
  });

  it('treats a provider config as ready only when required credentials are present', () => {
    expect(isAiProviderConfigReady(createDefaultAiProviderConfig('groq'))).toBe(false);
    expect(
      isAiProviderConfigReady({
        ...createDefaultAiProviderConfig('groq'),
        auth: { type: 'api-key', apiKey: 'gsk_test_123' },
      }),
    ).toBe(true);
  });
});

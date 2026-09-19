import { describe, expect, it } from 'vitest';
import { canFetchProviderModels } from '@/lib/provider-model-fetch';

describe('provider model fetch availability', () => {
  it('allows fetching before connection when an API key has been entered', () => {
    expect(
      canFetchProviderModels({
        isConnected: false,
        apiKeyInput: 'gsk-test',
        noKeyRequired: false,
        noModelApi: false,
      }),
    ).toBe(true);
  });

  it('hides fetching when the provider is configured without a model API', () => {
    expect(
      canFetchProviderModels({
        isConnected: true,
        apiKeyInput: '',
        noKeyRequired: false,
        noModelApi: true,
      }),
    ).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { addOpenRouterProviderPreferences } from './ai-model';

describe('addOpenRouterProviderPreferences', () => {
  it('requires endpoints that support tools when tools are present', () => {
    expect(addOpenRouterProviderPreferences({ tools: [{ type: 'function' }] })).toEqual({
      tools: [{ type: 'function' }],
      provider: { require_parameters: true },
    });
  });

  it('preserves existing OpenRouter provider preferences', () => {
    expect(
      addOpenRouterProviderPreferences({
        tools: [{ type: 'function' }],
        provider: { sort: 'throughput' },
      }),
    ).toEqual({
      tools: [{ type: 'function' }],
      provider: { sort: 'throughput', require_parameters: true },
    });
  });

  it('leaves text-only requests unchanged', () => {
    const request = { model: 'meta-llama/llama-3.3-70b-instruct:free' };
    expect(addOpenRouterProviderPreferences(request)).toBe(request);
  });
});

import { describe, expect, it } from 'vitest';
import { parseProviderTokenBudget, resolveProviderRetryMaxTokens } from './provider-token-budget';

describe('parseProviderTokenBudget', () => {
  it('parses the OpenRouter affordability error', () => {
    expect(
      parseProviderTokenBudget(
        'This request requires more credits, or fewer max_tokens. You requested up to 4096 tokens, but can only afford 48.',
      ),
    ).toEqual({ requested: 4096, available: 48 });
  });

  it('parses a normalized token availability error', () => {
    expect(parseProviderTokenBudget('Requested 4096 tokens but only 48 available.')).toEqual({
      requested: 4096,
      available: 48,
    });
  });

  it('ignores unrelated errors and unusable budgets', () => {
    expect(parseProviderTokenBudget('Rate limit exceeded')).toBeNull();
    expect(parseProviderTokenBudget('Requested 4096 tokens but only 0 available.')).toBeNull();
  });

  it('reduces a rejected request to the provider affordable limit', () => {
    expect(
      resolveProviderRetryMaxTokens(
        4096,
        'This request requires more credits. You requested up to 4096 tokens, but can only afford 48.',
      ),
    ).toBe(48);
  });

  it('keeps the configured limit for unrelated errors', () => {
    expect(resolveProviderRetryMaxTokens(4096, 'Tool calling is unsupported')).toBe(4096);
  });
});

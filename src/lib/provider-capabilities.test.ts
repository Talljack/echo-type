import { describe, expect, it } from 'vitest';
import {
  getProviderCapabilities,
  getRecommendedModelForCapability,
  providerSupportsCapability,
} from './provider-capabilities';

describe('provider capabilities', () => {
  it('declares support for Groq, OpenAI, and Anthropic correctly', () => {
    expect(providerSupportsCapability('groq', 'chat')).toBe(true);
    expect(providerSupportsCapability('groq', 'classify')).toBe(true);
    expect(providerSupportsCapability('groq', 'transcribe')).toBe(true);

    expect(providerSupportsCapability('openai', 'chat')).toBe(true);
    expect(providerSupportsCapability('openai', 'classify')).toBe(true);
    expect(providerSupportsCapability('openai', 'transcribe')).toBe(true);

    expect(providerSupportsCapability('anthropic', 'transcribe')).toBe(false);
  });

  it('exposes recommended models for each supported OpenAI and Groq capability', () => {
    for (const providerId of ['groq', 'openai'] as const) {
      for (const capability of getProviderCapabilities(providerId)) {
        expect(getRecommendedModelForCapability(providerId, capability)).toBeTruthy();
      }
    }
  });
});

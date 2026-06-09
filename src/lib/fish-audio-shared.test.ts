import { describe, expect, it } from 'vitest';
import { resolveTTSSource } from '@/lib/fish-audio-shared';

describe('resolveTTSSource', () => {
  it('falls back to browser when Edge is temporarily unavailable', () => {
    expect(
      resolveTTSSource({
        requestedSource: 'edge',
        hasFishCredentials: false,
        hasFishVoice: false,
        hasEdgeVoice: true,
        edgeTemporarilyUnavailable: true,
        edgeTemporarilyUnavailableReason: 'Edge TTS timed out. Browser voice is temporarily active for stability.',
      }),
    ).toEqual({
      source: 'browser',
      reason: 'Edge TTS timed out. Browser voice is temporarily active for stability.',
    });
  });

  it('keeps Edge selected when a voice is configured and no cooldown is active', () => {
    expect(
      resolveTTSSource({
        requestedSource: 'edge',
        hasFishCredentials: false,
        hasFishVoice: false,
        hasEdgeVoice: true,
      }),
    ).toEqual({
      source: 'edge',
    });
  });

  it('keeps Google selected when API key and voice are configured', () => {
    expect(
      resolveTTSSource({
        requestedSource: 'google',
        hasFishCredentials: false,
        hasFishVoice: false,
        hasGoogleCredentials: true,
        hasGoogleVoice: true,
        hasEdgeVoice: true,
      }),
    ).toEqual({
      source: 'google',
    });
  });

  it('falls back to browser when Google API key is missing', () => {
    expect(
      resolveTTSSource({
        requestedSource: 'google',
        hasFishCredentials: false,
        hasFishVoice: false,
        hasGoogleCredentials: false,
        hasGoogleVoice: true,
        hasEdgeVoice: true,
      }),
    ).toEqual({
      source: 'browser',
      reason: 'Google Cloud TTS is selected but no API key is configured.',
    });
  });

  it('falls back to browser when Google voice is missing', () => {
    expect(
      resolveTTSSource({
        requestedSource: 'google',
        hasFishCredentials: false,
        hasFishVoice: false,
        hasGoogleCredentials: true,
        hasGoogleVoice: false,
        hasEdgeVoice: true,
      }),
    ).toEqual({
      source: 'browser',
      reason: 'Google Cloud TTS is selected but no voice is chosen yet.',
    });
  });

  it('keeps OpenAI selected when API key and voice are configured', () => {
    expect(
      resolveTTSSource({
        requestedSource: 'openai',
        hasFishCredentials: false,
        hasFishVoice: false,
        hasOpenAICredentials: true,
        hasOpenAIVoice: true,
      }),
    ).toEqual({
      source: 'openai',
    });
  });

  it('falls back to browser when OpenAI API key is missing', () => {
    expect(
      resolveTTSSource({
        requestedSource: 'openai',
        hasFishCredentials: false,
        hasFishVoice: false,
        hasOpenAICredentials: false,
        hasOpenAIVoice: true,
      }),
    ).toEqual({
      source: 'browser',
      reason: 'OpenAI TTS is selected but no API key is configured.',
    });
  });
});

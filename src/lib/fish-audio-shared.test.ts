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
});

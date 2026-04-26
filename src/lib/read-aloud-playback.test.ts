import { describe, expect, it, vi } from 'vitest';
import { attachWordBoundaryTracking, isSpeechSynthesisUtteranceResult } from '@/lib/read-aloud-playback';

describe('read-aloud-playback', () => {
  it('detects speech synthesis utterance-like results', () => {
    expect(
      isSpeechSynthesisUtteranceResult({
        onboundary: null,
        onend: null,
        onerror: null,
      }),
    ).toBe(true);
    expect(isSpeechSynthesisUtteranceResult({})).toBe(false);
    expect(isSpeechSynthesisUtteranceResult(null)).toBe(false);
  });

  it('tracks word boundaries and preserves existing handlers', () => {
    const previousBoundary = vi.fn();
    const previousEnd = vi.fn();
    const previousError = vi.fn();
    const onWord = vi.fn();
    const onEnd = vi.fn();
    const onError = vi.fn();

    const utterance = {
      onboundary: previousBoundary,
      onend: previousEnd,
      onerror: previousError,
    };

    attachWordBoundaryTracking(utterance, {
      startWordIndex: 4,
      onWord,
      onEnd,
      onError,
    });

    utterance.onboundary?.({ name: 'sentence' } as SpeechSynthesisEvent);
    utterance.onboundary?.({ name: 'word' } as SpeechSynthesisEvent);
    utterance.onboundary?.({ name: 'word' } as SpeechSynthesisEvent);
    utterance.onend?.({} as SpeechSynthesisEvent);
    utterance.onerror?.({} as SpeechSynthesisErrorEvent);

    expect(previousBoundary).toHaveBeenCalledTimes(3);
    expect(onWord).toHaveBeenCalledTimes(2);
    expect(onWord).toHaveBeenNthCalledWith(1, 4);
    expect(onWord).toHaveBeenNthCalledWith(2, 5);
    expect(previousEnd).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(previousError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});

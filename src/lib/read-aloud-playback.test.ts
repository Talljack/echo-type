import { describe, expect, it, vi } from 'vitest';
import {
  attachWordBoundaryTracking,
  type BoundaryTrackableUtterance,
  isSpeechSynthesisUtteranceResult,
} from '@/lib/read-aloud-playback';

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

    const utterance: BoundaryTrackableUtterance = {
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

  it('uses charIndex to ignore duplicate boundary events', () => {
    const onWord = vi.fn();
    const utterance = {
      text: 'Every morning, I wake up',
      onboundary: null,
      onend: null,
      onerror: null,
    };

    attachWordBoundaryTracking(utterance, { startWordIndex: 0, onWord });

    const boundary = utterance.onboundary as ((event: SpeechSynthesisEvent) => void) | null;
    if (!boundary) throw new Error('Expected boundary handler');
    boundary({ name: 'word', charIndex: 0 } as SpeechSynthesisEvent);
    boundary({ name: 'word', charIndex: 0 } as SpeechSynthesisEvent);
    boundary({ name: 'word', charIndex: 6 } as SpeechSynthesisEvent);

    expect(onWord).toHaveBeenCalledTimes(2);
    expect(onWord).toHaveBeenNthCalledWith(1, 0);
    expect(onWord).toHaveBeenNthCalledWith(2, 1);
  });
});

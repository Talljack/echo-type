export interface BoundaryTrackableUtterance {
  onboundary: ((event: SpeechSynthesisEvent) => void) | null;
  onend: ((event: SpeechSynthesisEvent) => void) | null;
  onerror: ((event: SpeechSynthesisErrorEvent) => void) | null;
}

export function isSpeechSynthesisUtteranceResult(value: unknown): value is SpeechSynthesisUtterance {
  return typeof value === 'object' && value !== null && 'onboundary' in value && 'onend' in value && 'onerror' in value;
}

export function attachWordBoundaryTracking(
  utterance: BoundaryTrackableUtterance,
  options: {
    startWordIndex: number;
    onWord: (wordIndex: number) => void;
    onEnd?: () => void;
    onError?: () => void;
  },
) {
  const previousBoundary = utterance.onboundary;
  const previousEnd = utterance.onend;
  const previousError = utterance.onerror;
  let wordIndex = options.startWordIndex;

  utterance.onboundary = (event) => {
    previousBoundary?.(event);
    if (event.name === 'word') {
      options.onWord(wordIndex);
      wordIndex += 1;
    }
  };

  utterance.onend = (event) => {
    previousEnd?.(event);
    options.onEnd?.();
  };

  utterance.onerror = (event) => {
    previousError?.(event);
    options.onError?.();
  };
}

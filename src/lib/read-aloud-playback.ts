export interface BoundaryTrackableUtterance {
  text?: string;
  onboundary: ((event: SpeechSynthesisEvent) => void) | null;
  onend: ((event: SpeechSynthesisEvent) => void) | null;
  onerror: ((event: SpeechSynthesisErrorEvent) => void) | null;
}

export function getBoundaryWordIndex(text: string | undefined, charIndex: number | undefined): number | null {
  if (!text || typeof charIndex !== 'number' || charIndex < 0) return null;
  return text.slice(0, charIndex).trim().split(/\s+/).filter(Boolean).length;
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
  let lastWordIndex = -1;

  utterance.onboundary = (event) => {
    previousBoundary?.(event);
    if (event.name === 'word') {
      const boundaryWordIndex = getBoundaryWordIndex(utterance.text, event.charIndex);
      const nextWordIndex = boundaryWordIndex === null ? wordIndex : options.startWordIndex + boundaryWordIndex;
      if (nextWordIndex === lastWordIndex) return;
      lastWordIndex = nextWordIndex;
      wordIndex = nextWordIndex + 1;
      options.onWord(nextWordIndex);
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

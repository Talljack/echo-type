/** Resolves when speech starts, so AI actions cannot report an unplayed utterance as success. */
export function waitForSpeechStart(
  utterance: SpeechSynthesisUtterance,
  start: () => void,
  cancelPending?: () => void,
): Promise<SpeechSynthesisUtterance> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      utterance.removeEventListener('start', started);
      utterance.removeEventListener('error', failed);
    };
    const started = () => {
      cleanup();
      resolve(utterance);
    };
    const failed = (event: Event) => {
      cleanup();
      const code = (event as SpeechSynthesisErrorEvent).error;
      reject(
        code === 'canceled' || code === 'interrupted'
          ? new DOMException('Speech playback was cancelled', 'AbortError')
          : new Error(`Speech playback failed: ${code || 'unknown'}`),
      );
    };
    const timer = setTimeout(() => {
      cleanup();
      try {
        cancelPending?.();
      } catch (error) {
        reject(error);
        return;
      }
      reject(new Error('Speech playback timed out'));
    }, 15_000);
    utterance.addEventListener('start', started);
    utterance.addEventListener('error', failed);
    try {
      start();
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

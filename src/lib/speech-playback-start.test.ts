import { describe, expect, it, vi } from 'vitest';
import { waitForSpeechStart } from './speech-playback-start';
describe('speech startup acknowledgement', () => {
  it('resolves only after the original utterance starts', async () => {
    const utterance = new EventTarget() as SpeechSynthesisUtterance;
    const promise = waitForSpeechStart(utterance, () => utterance.dispatchEvent(new Event('start')));
    await expect(promise).resolves.toBe(utterance);
  });
  it('rejects native cancellation without requesting a fallback voice', async () => {
    const utterance = new EventTarget() as SpeechSynthesisUtterance;
    const promise = waitForSpeechStart(utterance, () => { const event = new Event('error'); Object.assign(event, { error: 'interrupted' }); utterance.dispatchEvent(event); });
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });
  it('cancels speech that did not start before the deadline', async () => {
    vi.useFakeTimers();
    try {
      const utterance = new EventTarget() as SpeechSynthesisUtterance;
      const cancel = vi.fn();
      const result = waitForSpeechStart(utterance, () => {}, cancel).catch(error => error);
      await vi.advanceTimersByTimeAsync(15_000);
      expect((await result).message).toContain('timed out');
      expect(cancel).toHaveBeenCalledOnce();
      utterance.dispatchEvent(new Event('start'));
      expect(cancel).toHaveBeenCalledOnce();
    } finally { vi.useRealTimers(); }
  });

});

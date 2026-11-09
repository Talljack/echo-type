import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AudioRecordingOptions } from '@/lib/audio-recording';
const mocks = vi.hoisted(() => ({ create: vi.fn(), assess: vi.fn() }));
vi.mock('@/lib/audio-recording', () => ({ createAudioRecording: mocks.create }));
vi.mock('@/lib/pronunciation/acoustic-assessment', () => ({ assessAcousticRecording: mocks.assess }));
import { usePronunciationStudio } from './use-pronunciation-studio';
function mountHook() {
  let result!: ReturnType<typeof usePronunciationStudio>;
  function Harness() { result = usePronunciationStudio('sheep'); return null; }
  renderToString(createElement(Harness)); return result;
}
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('window', {}); mocks.assess.mockResolvedValue({ phonemes: [], words: [] }); });
afterEach(() => { vi.unstubAllGlobals(); });
describe('studio recording integration', () => {
  it('records through one shared session, then assesses only on request', async () => {
    let options!: AudioRecordingOptions;
    const stop = vi.fn();
    mocks.create.mockImplementation((value) => { options = value; return { start: vi.fn().mockResolvedValue(undefined), stop, cancel: vi.fn() }; });
    const hook = mountHook(); await hook.start();
    expect(options).toMatchObject({ maxDurationMs: 20_000 });
    // Without browser speech recognition the studio still records for acoustic assessment.
    const blob = new Blob(['recorded audio'], { type: 'audio/webm' });
    options.onComplete?.({ blob, durationMs: 500 });
    expect(mocks.assess).not.toHaveBeenCalled();
    await hook.assess();
    expect(mocks.assess).toHaveBeenCalledWith(blob, 'sheep', expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(stop).not.toHaveBeenCalled();
  });
  it('does not score while recording completion is still pending', async () => {
    mocks.create.mockReturnValue({ start: vi.fn().mockResolvedValue(undefined), stop: vi.fn(), cancel: vi.fn() });
    const hook = mountHook(); await hook.start(); await hook.assess();
    expect(mocks.assess).not.toHaveBeenCalled();
  });
});

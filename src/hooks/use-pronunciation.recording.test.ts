import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AudioRecordingOptions, RecordedAudio } from '@/lib/audio-recording';

const mocks = vi.hoisted(() => ({ create: vi.fn(), assess: vi.fn() }));
vi.mock('@/lib/audio-recording', () => ({ createAudioRecording: mocks.create }));
vi.mock('@/lib/pronunciation/acoustic-assessment', () => ({ assessAcousticRecording: mocks.assess }));
import { usePronunciation } from './use-pronunciation';

function mountHook() {
  let result!: ReturnType<typeof usePronunciation>;
  function Harness() { result = usePronunciation({ referenceText: 'This is a real recording.' }); return null; }
  renderToString(createElement(Harness));
  return result;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.assess.mockResolvedValue({ overall: 81, phonemes: [], words: [{ word: 'real', score: 75 }] });
});

describe('pronunciation recording integration', () => {
  it('waits for completed audio before submitting an explicitly requested assessment', async () => {
    let options!: AudioRecordingOptions;
    let finish!: (audio: RecordedAudio) => void;
    const completion = new Promise<RecordedAudio>((resolve) => { finish = resolve; });
    const stop = vi.fn().mockReturnValue(completion);
    mocks.create.mockImplementation((value) => { options = value; return { start: vi.fn().mockResolvedValue(undefined), stop, cancel: vi.fn() }; });
    const hook = mountHook();
    await hook.startRecording();
    expect(mocks.assess).not.toHaveBeenCalled();
    const scoring = hook.assessRecognized('Any transcript is not acoustic evidence.');
    expect(stop).toHaveBeenCalledOnce();
    expect(mocks.assess).not.toHaveBeenCalled();
    const recorded = { blob: new Blob(['actual microphone audio'], { type: 'audio/wav' }), durationMs: 1200 };
    options.onComplete?.(recorded); finish(recorded);
    await scoring;
    expect(mocks.assess).toHaveBeenCalledWith(recorded.blob, 'This is a real recording.', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it('does not infer an acoustic score from transcript-only input', async () => {
    const hook = mountHook();
    await hook.assessRecognized('Perfectly matched reference words');
    expect(mocks.assess).not.toHaveBeenCalled();
  });

  it('uses cached automatically completed audio and never scores automatically', async () => {
    let options!: AudioRecordingOptions;
    const stop = vi.fn();
    mocks.create.mockImplementation((value) => { options = value; return { start: vi.fn().mockResolvedValue(undefined), stop, cancel: vi.fn() }; });
    const hook = mountHook();
    await hook.startRecording();
    const recorded = { blob: new Blob(['wav']), durationMs: 300 };
    options.onComplete?.(recorded);
    expect(mocks.assess).not.toHaveBeenCalled();
    await hook.assessRecognized('partial words');
    expect(stop).not.toHaveBeenCalled();
    expect(mocks.assess.mock.calls[0][0]).toBe(recorded.blob);
  });

  it('invalidates delayed recording completion when an attempt is reset', async () => {
    let options!: AudioRecordingOptions;
    let finish!: (audio: RecordedAudio) => void;
    const completion = new Promise<RecordedAudio>((resolve) => { finish = resolve; });
    const cancel = vi.fn();
    mocks.create.mockImplementation((value) => { options = value; return { start: vi.fn().mockResolvedValue(undefined), stop: () => completion, cancel }; });
    const hook = mountHook();
    await hook.startRecording();
    const scoring = hook.assessRecognized('old transcript');
    hook.clearResult();
    const recorded = { blob: new Blob(['old wav']), durationMs: 200 };
    options.onComplete?.(recorded); finish(recorded);
    await scoring;
    expect(cancel).toHaveBeenCalledOnce();
    expect(mocks.assess).not.toHaveBeenCalled();
  });
});

export interface RecordedAudio {
  blob: Blob;
  durationMs: number;
}
export interface AudioRecordingOptions {
  maxDurationMs?: number;
  onInterrupted?: (error: Error) => void;
  onComplete?: (recording: RecordedAudio) => void;
}
export interface RecordingSession {
  start(): Promise<void>;
  stop(): Promise<RecordedAudio>;
  cancel(): void;
}

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const START_TIMEOUT_MS = 60_000;
const STOP_TIMEOUT_MS = 15_000;
const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm', 'audio/ogg'];

/** One capture attempt. Create a new session for each subsequent recording. */
export function createAudioRecording(options: AudioRecordingOptions = {}): RecordingSession {
  const requestedDuration = options.maxDurationMs ?? 60_000;
  const maxDurationMs = Number.isFinite(requestedDuration)
    ? Math.max(1000, Math.min(120_000, requestedDuration))
    : 60_000;
  let phase: 'idle' | 'starting' | 'recording' | 'stopping' | 'completed' | 'failed' | 'cancelled' = 'idle';
  let failure: Error | undefined;
  let result: RecordedAudio | undefined;
  let startPromise: Promise<void> | undefined;
  let resolveStart: (() => void) | undefined;
  let rejectStart: ((error: Error) => void) | undefined;
  let stopPromise: Promise<RecordedAudio> | undefined;
  let resolveStop: ((recording: RecordedAudio) => void) | undefined;
  let rejectStop: ((error: Error) => void) | undefined;
  let startTimer: ReturnType<typeof setTimeout> | undefined;
  let stopTimer: ReturnType<typeof setTimeout> | undefined;
  let durationTimer: ReturnType<typeof setTimeout> | undefined;
  let stream: MediaStream | undefined;
  let recorder: MediaRecorder | undefined;
  let startedAt = 0;
  const chunks: Blob[] = [];
  const unlisten: Array<() => void> = [];
  const terminal = () => phase === 'completed' || phase === 'cancelled' || phase === 'failed';
  const notify = (callback: () => void) => {
    try {
      callback();
    } catch {
      /* UI observers must not prevent microphone cleanup or promise settlement. */
    }
  };
  const cleanup = () => {
    clearTimeout(startTimer);
    clearTimeout(stopTimer);
    clearTimeout(durationTimer);
    for (const remove of unlisten.splice(0)) remove();
    const activeStream = stream;
    stream = undefined;
    for (const track of activeStream?.getTracks() ?? []) track.stop();
    if (recorder?.state !== 'inactive') {
      try {
        recorder?.stop();
      } catch {
        /* Capture may already have stopped. */
      }
    }
  };
  const fail = (error: Error, cancelled = false, shouldNotify = true) => {
    if (terminal()) return;
    phase = cancelled ? 'cancelled' : 'failed';
    failure = error;
    cleanup();
    rejectStart?.(error);
    rejectStart = undefined;
    resolveStart = undefined;
    rejectStop?.(error);
    rejectStop = undefined;
    resolveStop = undefined;
    if (shouldNotify) notify(() => options.onInterrupted?.(error));
  };
  const complete = (audio: RecordedAudio) => {
    if (terminal()) return;
    result = audio;
    phase = 'completed';
    cleanup();
    resolveStart?.();
    rejectStart = undefined;
    resolveStart = undefined;
    resolveStop?.(result);
    rejectStop = undefined;
    resolveStop = undefined;
    notify(() => {
      if (result) options.onComplete?.(result);
    });
  };
  const started = () => {
    if (phase !== 'starting') return;
    clearTimeout(startTimer);
    phase = 'recording';
    startedAt = Date.now();
    resolveStart?.();
    rejectStart = undefined;
    resolveStart = undefined;
    durationTimer = setTimeout(() => {
      void session.stop().catch(() => {});
    }, maxDurationMs);
  };
  const listen = (source: EventTarget, event: string, handler: EventListener) => {
    source.addEventListener(event, handler);
    unlisten.push(() => source.removeEventListener(event, handler));
  };
  const beginBrowser = async () => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      throw new Error('Audio recording is unavailable in this browser.');
    }
    const grantedStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (phase !== 'starting') {
      for (const track of grantedStream.getTracks()) track.stop();
      return;
    }
    stream = grantedStream;
    const mimeType = MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    listen(recorder, 'dataavailable', (event) => {
      const data = (event as BlobEvent).data;
      if (!terminal() && data?.size) chunks.push(data);
    });
    listen(recorder, 'error', (event) => {
      const error = (event as Event & { error?: Error }).error;
      fail(error ?? new Error('Browser audio recording failed.'));
    });
    listen(recorder, 'stop', () => {
      if (terminal()) return;
      const blob = new Blob(chunks, {
        type: recorder?.mimeType || mimeType || chunks[0]?.type || 'application/octet-stream',
      });
      if (!blob.size || blob.size > MAX_AUDIO_BYTES) {
        fail(new Error('Recorded audio is empty or too large.'));
        return;
      }
      complete({ blob, durationMs: Math.max(0, Date.now() - startedAt) });
    });
    for (const track of stream.getTracks())
      listen(track, 'ended', () => {
        if (phase === 'recording') void session.stop().catch(() => {});
      });
    recorder.start();
    started();
  };

  const session: RecordingSession = {
    start() {
      if (phase === 'starting') return startPromise!;
      if (phase === 'recording') return Promise.resolve();
      if (phase !== 'idle') return Promise.reject(failure ?? new Error('Create a new session to record again.'));
      phase = 'starting';
      startPromise = new Promise<void>((resolve, reject) => {
        resolveStart = resolve;
        rejectStart = reject;
      });
      startTimer = setTimeout(
        () => fail(new Error('Microphone permission or recording startup timed out.')),
        START_TIMEOUT_MS,
      );
      void beginBrowser().catch((error) =>
        fail(error instanceof Error ? error : new Error('Microphone access failed.')),
      );
      return startPromise;
    },
    stop() {
      if (result) {
        stopPromise ??= Promise.resolve(result);
        return stopPromise;
      }
      if (failure) return Promise.reject(failure);
      if (phase === 'idle') return Promise.reject(new Error('Audio recording has not started.'));
      if (phase === 'starting') {
        const error = new DOMException('Recording stopped before the microphone was ready.', 'AbortError');
        fail(error, true, false);
        return Promise.reject(error);
      }
      if (stopPromise) return stopPromise;
      phase = 'stopping';
      clearTimeout(durationTimer);
      stopPromise = new Promise<RecordedAudio>((resolve, reject) => {
        resolveStop = resolve;
        rejectStop = reject;
      });
      stopTimer = setTimeout(() => fail(new Error('Audio recording finalization timed out.')), STOP_TIMEOUT_MS);
      try {
        if (recorder?.state !== 'inactive') recorder?.stop();
      } catch (error) {
        fail(error instanceof Error ? error : new Error('Audio recording could not stop.'));
      }
      return stopPromise;
    },
    cancel() {
      if (terminal()) return;
      fail(new DOMException('Audio recording was cancelled.', 'AbortError'), true, false);
    },
  };
  return session;
}

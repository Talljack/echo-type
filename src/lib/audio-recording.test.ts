import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAudioRecording } from './audio-recording';

const stopTrack = vi.fn();
class FakeMediaRecorder extends EventTarget {
  static instances: FakeMediaRecorder[] = [];
  static isTypeSupported = vi.fn((type: string) => type === 'audio/mp4');
  state = 'inactive';
  mimeType: string;
  autoStop = true;
  stopCalls = 0;
  constructor(_stream: MediaStream, options: { mimeType?: string }) { super(); this.mimeType = options.mimeType ?? ''; FakeMediaRecorder.instances.push(this); }
  start() { this.state = 'recording'; }
  stop() { this.stopCalls++; this.state = 'inactive'; if (this.autoStop) this.finish(); }
  finish() {
    const chunk = new Event('dataavailable'); Object.assign(chunk, { data: new Blob(['real recording'], { type: this.mimeType }) });
    this.dispatchEvent(chunk); this.dispatchEvent(new Event('stop'));
  }
}
function browser(getUserMedia: () => Promise<unknown> = vi.fn(async () => ({ getTracks: () => [Object.assign(new EventTarget(), { stop: stopTrack })] }))) {
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('navigator', { userAgent: 'browser', mediaDevices: { getUserMedia } });
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
  return { getUserMedia };
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); FakeMediaRecorder.instances = []; stopTrack.mockReset(); });

describe('shared audio recording', () => {
  it('records browser MP4 using supported MIME and releases microphone after stop', async () => {
    browser(); const session = createAudioRecording(); await session.start();
    const recorder = FakeMediaRecorder.instances[0]; expect(recorder.mimeType).toBe('audio/mp4');
    const result = await session.stop(); expect(result.blob.size).toBeGreaterThan(0);
    expect(result.blob.type).toBe('audio/mp4');
    expect(stopTrack).toHaveBeenCalledOnce();
  });
  it('waits for final browser chunks and makes repeated stop calls idempotent', async () => {
    browser(); const session = createAudioRecording(); await session.start();
    const recorder = FakeMediaRecorder.instances[0]; recorder.autoStop = false;
    const completed = vi.fn(); const stop = session.stop(); void stop.then(completed);
    expect(session.stop()).toBe(stop); await Promise.resolve(); expect(completed).not.toHaveBeenCalled();
    recorder.finish(); expect((await stop).blob.size).toBeGreaterThan(0); expect(recorder.stopCalls).toBe(1);
  });
  it('releases a browser permission grant that arrives after cancellation', async () => {
    let grant!: (stream: unknown) => void;
    browser(vi.fn(() => new Promise(resolve => { grant = resolve; })));
    const session = createAudioRecording(); const starting = session.start();
    const rejected = expect(starting).rejects.toMatchObject({ name: 'AbortError' }); session.cancel(); await rejected;
    grant({ getTracks: () => [{ stop: stopTrack }] }); await Promise.resolve(); await Promise.resolve();
    expect(stopTrack).toHaveBeenCalledOnce(); expect(FakeMediaRecorder.instances).toHaveLength(0);
  });
  it('automatically completes browser recording at the duration limit', async () => {
    vi.useFakeTimers(); browser(); const onComplete = vi.fn(); const session = createAudioRecording({ maxDurationMs: 1000, onComplete });
    await session.start(); await vi.advanceTimersByTimeAsync(1000);
    expect(onComplete).toHaveBeenCalledOnce(); expect((await session.stop()).durationMs).toBe(1000);
    expect(stopTrack).toHaveBeenCalledOnce();
  });  it('cancels an active browser stop waiter and does not publish abandoned chunks', async () => {
    browser(); const onComplete = vi.fn(); const session = createAudioRecording({ onComplete }); await session.start();
    const recorder = FakeMediaRecorder.instances[0]; recorder.autoStop = false;
    const stopped = session.stop(); const rejected = expect(stopped).rejects.toMatchObject({ name: 'AbortError' });
    session.cancel(); await rejected; recorder.finish();
    expect(onComplete).not.toHaveBeenCalled(); expect(stopTrack).toHaveBeenCalledOnce();
  });
  it('bounds browser finalization and releases every track if no stop event arrives', async () => {
    vi.useFakeTimers(); browser(); const onInterrupted = vi.fn(); const session = createAudioRecording({ onInterrupted }); await session.start();
    FakeMediaRecorder.instances[0].autoStop = false;
    const pending = session.stop().catch(error => error); await vi.advanceTimersByTimeAsync(15000);
    expect((await pending).message).toContain('timed out');
    expect(onInterrupted).toHaveBeenCalledOnce(); expect(stopTrack).toHaveBeenCalledOnce();
  });

});

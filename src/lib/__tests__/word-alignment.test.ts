import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { matchTimestampsToText, WordAlignmentPlayer } from '../word-alignment';

describe('matchTimestampsToText', () => {
  it('returns empty array for empty text', () => {
    const result = matchTimestampsToText([{ word: 'hello', start: 0, end: 0.5 }], '');
    expect(result).toEqual([]);
  });

  it('returns zero-timed entries when no whisper words', () => {
    const result = matchTimestampsToText([], 'hello world');
    expect(result).toEqual([
      { word: 'hello', start: 0, end: 0 },
      { word: 'world', start: 0, end: 0 },
    ]);
  });

  it('handles exact match', () => {
    const whisper = [
      { word: 'Hello', start: 0, end: 0.5 },
      { word: 'world', start: 0.6, end: 1.0 },
    ];
    const result = matchTimestampsToText(whisper, 'Hello world');
    expect(result).toEqual([
      { word: 'Hello', start: 0, end: 0.5 },
      { word: 'world', start: 0.6, end: 1.0 },
    ]);
  });

  it('handles punctuation differences', () => {
    const whisper = [
      { word: 'Hello,', start: 0, end: 0.5 },
      { word: 'world!', start: 0.6, end: 1.0 },
    ];
    const result = matchTimestampsToText(whisper, 'Hello, world!');
    expect(result).toEqual([
      { word: 'Hello,', start: 0, end: 0.5 },
      { word: 'world!', start: 0.6, end: 1.0 },
    ]);
  });

  it('handles whisper splitting contractions', () => {
    const whisper = [
      { word: 'I', start: 0, end: 0.2 },
      { word: 'don', start: 0.3, end: 0.5 },
      { word: "'t", start: 0.5, end: 0.6 },
      { word: 'know', start: 0.7, end: 1.0 },
    ];
    const result = matchTimestampsToText(whisper, "I don't know");
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ word: 'I', start: 0, end: 0.2 });
    expect(result[1]).toEqual({ word: "don't", start: 0.3, end: 0.6 });
    expect(result[2]).toEqual({ word: 'know', start: 0.7, end: 1.0 });
  });

  it('handles more original words than whisper words', () => {
    const whisper = [
      { word: 'Hello', start: 0, end: 0.5 },
    ];
    const result = matchTimestampsToText(whisper, 'Hello world today');
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ word: 'Hello', start: 0, end: 0.5 });
    expect(result[1].word).toBe('world');
    expect(result[1].start).toBe(0.5);
    expect(result[2].word).toBe('today');
  });

  it('handles case differences', () => {
    const whisper = [
      { word: 'HELLO', start: 0, end: 0.5 },
      { word: 'world', start: 0.6, end: 1.0 },
    ];
    const result = matchTimestampsToText(whisper, 'hello World');
    expect(result).toEqual([
      { word: 'hello', start: 0, end: 0.5 },
      { word: 'World', start: 0.6, end: 1.0 },
    ]);
  });

  it('handles single word', () => {
    const whisper = [{ word: 'Hello', start: 0, end: 0.5 }];
    const result = matchTimestampsToText(whisper, 'Hello');
    expect(result).toEqual([{ word: 'Hello', start: 0, end: 0.5 }]);
  });

  it('handles fuzzy mismatch (different words)', () => {
    const whisper = [
      { word: 'Hallo', start: 0, end: 0.5 },
      { word: 'world', start: 0.6, end: 1.0 },
    ];
    const result = matchTimestampsToText(whisper, 'Hello world');
    expect(result).toHaveLength(2);
    expect(result[0].word).toBe('Hello');
    expect(result[0].start).toBe(0);
    expect(result[1].word).toBe('world');
  });
});

describe('WordAlignmentPlayer', () => {
  let mockAudio: { currentTime: number; paused: boolean; ended: boolean };
  let onWordChange: (index: number) => void;
  let rafCallbacks: Array<FrameRequestCallback>;

  beforeEach(() => {
    rafCallbacks = [];
    globalThis.requestAnimationFrame = vi.fn((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    globalThis.cancelAnimationFrame = vi.fn();

    mockAudio = {
      currentTime: 0,
      paused: false,
      ended: false,
    };

    onWordChange = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function flushRAF() {
    const cbs = [...rafCallbacks];
    rafCallbacks = [];
    for (const cb of cbs) cb(performance.now());
  }

  it('calls onWordChange when word index changes', () => {
    const timestamps = [
      { word: 'Hello', start: 0, end: 0.5 },
      { word: 'world', start: 0.6, end: 1.0 },
    ];

    const player = new WordAlignmentPlayer(mockAudio as unknown as HTMLAudioElement, timestamps, onWordChange);
    mockAudio.currentTime = 0.3;
    player.start();
    flushRAF();

    expect(onWordChange).toHaveBeenCalledWith(0);
  });

  it('advances to next word', () => {
    const timestamps = [
      { word: 'Hello', start: 0, end: 0.5 },
      { word: 'world', start: 0.6, end: 1.0 },
    ];

    const player = new WordAlignmentPlayer(mockAudio as unknown as HTMLAudioElement, timestamps, onWordChange);
    mockAudio.currentTime = 0.3;
    player.start();
    flushRAF();

    mockAudio.currentTime = 0.7;
    flushRAF();

    expect(onWordChange).toHaveBeenCalledWith(1);
  });

  it('does not call onWordChange if index unchanged', () => {
    const timestamps = [
      { word: 'Hello', start: 0, end: 0.5 },
      { word: 'world', start: 0.6, end: 1.0 },
    ];

    const player = new WordAlignmentPlayer(mockAudio as unknown as HTMLAudioElement, timestamps, onWordChange);
    mockAudio.currentTime = 0.1;
    player.start();
    flushRAF();

    mockAudio.currentTime = 0.2;
    flushRAF();

    expect(onWordChange).toHaveBeenCalledTimes(1);
  });

  it('does not call onWordChange when still before first word (index stays -1)', () => {
    const timestamps = [
      { word: 'Hello', start: 0.5, end: 1.0 },
    ];

    const player = new WordAlignmentPlayer(mockAudio as unknown as HTMLAudioElement, timestamps, onWordChange);
    mockAudio.currentTime = 0.1;
    player.start();
    flushRAF();

    expect(onWordChange).not.toHaveBeenCalled();

    mockAudio.currentTime = 0.6;
    flushRAF();
    expect(onWordChange).toHaveBeenCalledWith(0);
  });

  it('stops rAF loop when audio paused', () => {
    const timestamps = [
      { word: 'Hello', start: 0, end: 0.5 },
    ];

    const player = new WordAlignmentPlayer(mockAudio as unknown as HTMLAudioElement, timestamps, onWordChange);
    mockAudio.currentTime = 0.1;
    player.start();

    mockAudio.paused = true;
    flushRAF();

    const callCount = rafCallbacks.length;
    expect(callCount).toBe(0);
  });

  it('dispose cancels animation frame', () => {
    const timestamps = [
      { word: 'Hello', start: 0, end: 0.5 },
    ];

    const player = new WordAlignmentPlayer(mockAudio as unknown as HTMLAudioElement, timestamps, onWordChange);
    player.start();
    player.dispose();

    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  it('does not call onWordChange for empty timestamps', () => {
    const player = new WordAlignmentPlayer(mockAudio as unknown as HTMLAudioElement, [], onWordChange);
    mockAudio.currentTime = 0.5;
    player.start();
    flushRAF();

    expect(onWordChange).not.toHaveBeenCalled();
  });
});

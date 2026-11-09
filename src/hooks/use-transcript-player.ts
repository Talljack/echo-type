'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTTS } from '@/hooks/use-tts';
import { type LessonSegment, segmentAtTime } from '@/lib/lesson-segments';

export type PlayerBackend = 'media' | 'youtube' | 'tts';
export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25] as const;

// ─── Minimal YouTube IFrame API typings ──────────────────────────────────────
interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  setPlaybackRate(rate: number): void;
  destroy(): void;
}
interface YTNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      host?: string;
      width?: string;
      height?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
        onError?: (event: { data: number }) => void;
      };
    },
  ) => YTPlayer;
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const YT_PLAYING = 1;
const YT_BUFFERING = 3;

let youTubeApi: Promise<YTNamespace> | null = null;
function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youTubeApi) return youTubeApi;
  youTubeApi = new Promise<YTNamespace>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      youTubeApi = null;
      reject(new Error('timeout'));
    }, 15000);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      window.clearTimeout(timer);
      if (window.YT?.Player) resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timer);
      youTubeApi = null;
      reject(new Error('load-failed'));
    };
    document.head.appendChild(script);
  });
  return youTubeApi;
}

type Mode = { kind: 'idle' } | { kind: 'segment'; index: number } | { kind: 'continuous' };

interface Timeline {
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  time(): number;
  setRate(rate: number): void;
}

export interface TranscriptPlayer {
  backend: PlayerBackend;
  ready: boolean;
  playing: boolean;
  activeIndex: number;
  /** Segment index currently being played on its own (single-sentence mode), if any. */
  soloIndex: number | null;
  rate: number;
  loop: boolean;
  pauseAfterEach: boolean;
  error: string | null;
  setRate: (rate: number) => void;
  setLoop: (loop: boolean) => void;
  setPauseAfterEach: (value: boolean) => void;
  /** Play one segment and stop at its end (repeats while `loop` is on). */
  playSegment: (index: number) => void;
  /** Play continuously from a segment, following the transcript. */
  playFrom: (index: number) => void;
  toggle: () => void;
  pause: () => void;
  select: (index: number) => void;
  next: () => void;
  prev: () => void;
  mediaRef: (element: HTMLMediaElement | null) => void;
  youtubeHostRef: (element: HTMLDivElement | null) => void;
}

/**
 * Drives sentence-level playback of a lesson over the original media
 * (native audio/video or YouTube) or, for text lessons, text-to-speech.
 */
export function useTranscriptPlayer({
  backend,
  segments,
  youtubeId,
  onSegmentHeard,
}: {
  backend: PlayerBackend;
  segments: LessonSegment[];
  youtubeId?: string;
  onSegmentHeard?: (index: number) => void;
}): TranscriptPlayer {
  const { speak, stop: stopSpeech } = useTTS();
  const [media, setMedia] = useState<HTMLMediaElement | null>(null);
  const [youtubeHost, setYoutubeHost] = useState<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(backend === 'tts');
  const [playing, setPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState(segments.length ? 0 : -1);
  const [soloIndex, setSoloIndex] = useState<number | null>(null);
  const [rate, setRateState] = useState(1);
  const [loop, setLoopState] = useState(false);
  const [pauseAfterEach, setPauseAfterEachState] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const segmentsRef = useRef(segments);
  const modeRef = useRef<Mode>({ kind: 'idle' });
  const activeRef = useRef(activeIndex);
  const loopRef = useRef(loop);
  const pauseAfterEachRef = useRef(pauseAfterEach);
  const rateRef = useRef(rate);
  const resumeAtRef = useRef<number | null>(null);
  const heardFromRef = useRef<{ index: number; time: number } | null>(null);
  const onHeardRef = useRef(onSegmentHeard);
  const ytRef = useRef<YTPlayer | null>(null);
  const timelineRef = useRef<Timeline | null>(null);
  const runRef = useRef(0);
  const playingRef = useRef(false);

  segmentsRef.current = segments;
  onHeardRef.current = onSegmentHeard;

  const setActive = useCallback((index: number) => {
    activeRef.current = index;
    setActiveIndex(index);
  }, []);
  const setPlayingState = useCallback((value: boolean) => {
    playingRef.current = value;
    setPlaying(value);
  }, []);
  const heard = useCallback((index: number) => {
    if (index >= 0) onHeardRef.current?.(index);
  }, []);

  // A backend switch (e.g. YouTube blocked → text-to-speech) starts from a clean state.
  useEffect(() => {
    runRef.current += 1;
    modeRef.current = { kind: 'idle' };
    playingRef.current = false;
    setPlaying(false);
    setSoloIndex(null);
    setError(null);
    setReady(backend === 'tts');
  }, [backend]);

  // Reset when the lesson (segments) changes.
  useEffect(() => {
    modeRef.current = { kind: 'idle' };
    resumeAtRef.current = null;
    heardFromRef.current = null;
    setSoloIndex(null);
    setActive(segments.length ? 0 : -1);
  }, [segments, setActive]);

  // ─── Timeline backends (media + YouTube) ──────────────────────────────────
  const tick = useCallback(
    (time: number) => {
      const list = segmentsRef.current;
      const timeline = timelineRef.current;
      if (!timeline || !list.length) return;
      const mode = modeRef.current;
      const index = Math.max(0, segmentAtTime(list, time));

      if (mode.kind === 'segment') {
        const segment = list[mode.index];
        if (segment?.end !== undefined && time >= segment.end - 0.06) {
          heard(mode.index);
          if (loopRef.current) timeline.seek(segment.start ?? 0);
          else {
            timeline.pause();
            modeRef.current = { kind: 'idle' };
            setSoloIndex(null);
          }
        }
        return;
      }

      if (index !== activeRef.current) {
        const previous = heardFromRef.current;
        if (previous && previous.index === activeRef.current && index === previous.index + 1) heard(previous.index);
        heardFromRef.current = { index, time };
        setActive(index);
      }
      if (mode.kind !== 'continuous') return;
      const segment = list[index];
      const last = list.at(-1);
      if (segment?.end !== undefined && time >= segment.end - 0.06 && (loopRef.current || pauseAfterEachRef.current)) {
        heard(index);
        if (loopRef.current) timeline.seek(segment.start ?? 0);
        else {
          timeline.pause();
          modeRef.current = { kind: 'idle' };
          resumeAtRef.current = Math.min(index + 1, list.length - 1);
        }
      } else if (last?.end !== undefined && time >= last.end) {
        heard(last.index);
        timeline.pause();
        modeRef.current = { kind: 'idle' };
        resumeAtRef.current = 0;
      }
    },
    [heard, setActive],
  );

  // Native <audio>/<video>
  useEffect(() => {
    if (backend !== 'media' || !media) return;
    timelineRef.current = {
      play: () => void media.play().catch(() => setPlayingState(false)),
      pause: () => media.pause(),
      seek: (seconds) => {
        media.currentTime = seconds;
      },
      time: () => media.currentTime,
      setRate: (value) => {
        media.playbackRate = value;
      },
    };
    media.playbackRate = rateRef.current;
    let frame = 0;
    const loopFrame = () => {
      tick(media.currentTime);
      if (!media.paused) frame = requestAnimationFrame(loopFrame);
    };
    const onLoaded = () => {
      setReady(true);
      const first = segmentsRef.current[0]?.start;
      if (first !== undefined && media.currentTime < first) media.currentTime = first;
    };
    const onPlay = () => {
      setPlayingState(true);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(loopFrame);
    };
    const onPause = () => {
      setPlayingState(false);
      cancelAnimationFrame(frame);
    };
    const onError = () => setError('media');
    if (media.readyState >= 1) onLoaded();
    media.addEventListener('loadedmetadata', onLoaded);
    media.addEventListener('play', onPlay);
    media.addEventListener('pause', onPause);
    media.addEventListener('ended', onPause);
    media.addEventListener('error', onError);
    return () => {
      cancelAnimationFrame(frame);
      media.removeEventListener('loadedmetadata', onLoaded);
      media.removeEventListener('play', onPlay);
      media.removeEventListener('pause', onPause);
      media.removeEventListener('ended', onPause);
      media.removeEventListener('error', onError);
      media.pause();
      timelineRef.current = null;
    };
  }, [backend, media, tick, setPlayingState]);

  // YouTube
  useEffect(() => {
    if (backend !== 'youtube' || !youtubeHost || !youtubeId) return;
    let cancelled = false;
    let poll = 0;
    const mount = document.createElement('div');
    mount.style.width = '100%';
    mount.style.height = '100%';
    youtubeHost.appendChild(mount);
    const stopPolling = () => window.clearInterval(poll);
    void loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        const start = Math.floor(segmentsRef.current[0]?.start ?? 0);
        const player = new YT.Player(mount, {
          videoId: youtubeId,
          host: 'https://www.youtube-nocookie.com',
          width: '100%',
          height: '100%',
          playerVars: {
            start,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              ytRef.current = player;
              timelineRef.current = {
                play: () => player.playVideo(),
                pause: () => player.pauseVideo(),
                seek: (seconds) => player.seekTo(seconds, true),
                time: () => player.getCurrentTime(),
                setRate: (value) => player.setPlaybackRate(value),
              };
              player.setPlaybackRate(rateRef.current);
              setReady(true);
            },
            onStateChange: (event) => {
              if (cancelled) return;
              const active = event.data === YT_PLAYING || event.data === YT_BUFFERING;
              setPlayingState(event.data === YT_PLAYING);
              stopPolling();
              if (active) poll = window.setInterval(() => tick(player.getCurrentTime()), 120);
            },
            onError: () => {
              if (!cancelled) setError('youtube');
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) setError('youtube');
      });
    return () => {
      cancelled = true;
      stopPolling();
      try {
        ytRef.current?.destroy();
      } catch {
        /* player already gone */
      }
      ytRef.current = null;
      timelineRef.current = null;
      mount.remove();
    };
  }, [backend, youtubeHost, youtubeId, tick, setPlayingState]);

  // ─── Text-to-speech backend ───────────────────────────────────────────────
  const speakAndWait = useCallback(
    async (index: number, run: number): Promise<boolean> => {
      const segment = segmentsRef.current[index];
      if (!segment) return false;
      let result: Awaited<ReturnType<typeof speak>>;
      try {
        result = await speak(segment.text, { rate: rateRef.current });
      } catch {
        return false;
      }
      if (run !== runRef.current) return false;
      const words = segment.text.split(/\s+/).length;
      const budget = ((words / 2.2) * 1000) / Math.max(rateRef.current, 0.25) + 4000;
      const finished = await new Promise<boolean>((resolve) => {
        const timer = window.setTimeout(() => resolve(true), budget);
        const done = (ok: boolean) => {
          window.clearTimeout(timer);
          resolve(ok);
        };
        if (!result) return done(false);
        if (typeof SpeechSynthesisUtterance !== 'undefined' && result instanceof SpeechSynthesisUtterance) {
          result.addEventListener('end', () => done(true), { once: true });
          result.addEventListener('error', () => done(false), { once: true });
          return;
        }
        const audio = 'audio' in result ? result.audio : undefined;
        if (!audio) return done(true);
        if (audio.ended) return done(true);
        audio.addEventListener('ended', () => done(true), { once: true });
        audio.addEventListener('error', () => done(false), { once: true });
        audio.addEventListener('pause', () => !audio.ended && done(false), { once: true });
      });
      return finished && run === runRef.current;
    },
    [speak],
  );

  const runSpeech = useCallback(
    async (from: number, solo: boolean) => {
      const run = ++runRef.current;
      const list = segmentsRef.current;
      const settle = () => {
        if (run !== runRef.current) return;
        modeRef.current = { kind: 'idle' };
        setSoloIndex(null);
        setPlayingState(false);
      };
      setPlayingState(true);
      for (let index = from; index < list.length; index += 1) {
        setActive(index);
        let completed = await speakAndWait(index, run);
        if (!completed) return settle();
        heard(index);
        while (loopRef.current && run === runRef.current) {
          await new Promise((resolve) => window.setTimeout(resolve, 450));
          completed = await speakAndWait(index, run);
          if (!completed) return settle();
          heard(index);
        }
        if (solo || pauseAfterEachRef.current) {
          resumeAtRef.current = solo ? null : Math.min(index + 1, list.length - 1);
          break;
        }
      }
      settle();
    },
    [heard, setActive, setPlayingState, speakAndWait],
  );

  // ─── Public controls ─────────────────────────────────────────────────────
  const pause = useCallback(() => {
    modeRef.current = { kind: 'idle' };
    setSoloIndex(null);
    if (backend === 'tts') {
      runRef.current += 1;
      stopSpeech();
      setPlayingState(false);
    } else timelineRef.current?.pause();
  }, [backend, stopSpeech, setPlayingState]);

  const playSegment = useCallback(
    (index: number) => {
      const segment = segmentsRef.current[index];
      if (!segment) return;
      resumeAtRef.current = null;
      modeRef.current = { kind: 'segment', index };
      setSoloIndex(index);
      setActive(index);
      if (backend === 'tts') {
        stopSpeech();
        void runSpeech(index, true);
        return;
      }
      const timeline = timelineRef.current;
      if (!timeline) return;
      timeline.seek(segment.start ?? 0);
      timeline.play();
    },
    [backend, runSpeech, setActive, stopSpeech],
  );

  const playFrom = useCallback(
    (index: number) => {
      const segment = segmentsRef.current[index];
      if (!segment) return;
      resumeAtRef.current = null;
      modeRef.current = { kind: 'continuous' };
      setSoloIndex(null);
      setActive(index);
      heardFromRef.current = { index, time: segment.start ?? 0 };
      if (backend === 'tts') {
        stopSpeech();
        void runSpeech(index, false);
        return;
      }
      const timeline = timelineRef.current;
      if (!timeline) return;
      const now = timeline.time();
      const end = segment.end ?? Number.POSITIVE_INFINITY;
      if (now < (segment.start ?? 0) - 0.05 || now >= end - 0.1) timeline.seek(segment.start ?? 0);
      timeline.play();
    },
    [backend, runSpeech, setActive, stopSpeech],
  );

  const toggle = useCallback(() => {
    if (playingRef.current) {
      pause();
      return;
    }
    const resumeAt = resumeAtRef.current;
    playFrom(resumeAt ?? Math.max(0, activeRef.current));
  }, [pause, playFrom]);

  const select = useCallback(
    (index: number) => {
      if (!segmentsRef.current[index]) return;
      resumeAtRef.current = null;
      setActive(index);
    },
    [setActive],
  );

  const step = useCallback(
    (delta: number) => {
      const target = Math.min(Math.max(activeRef.current + delta, 0), segmentsRef.current.length - 1);
      if (modeRef.current.kind === 'continuous' && playingRef.current) playFrom(target);
      else playSegment(target);
    },
    [playFrom, playSegment],
  );

  const next = useCallback(() => step(1), [step]);
  const prev = useCallback(() => step(-1), [step]);

  const setRate = useCallback((value: number) => {
    rateRef.current = value;
    setRateState(value);
    timelineRef.current?.setRate(value);
  }, []);
  const setLoop = useCallback((value: boolean) => {
    loopRef.current = value;
    setLoopState(value);
  }, []);
  const setPauseAfterEach = useCallback((value: boolean) => {
    pauseAfterEachRef.current = value;
    setPauseAfterEachState(value);
  }, []);

  // Stop speech when leaving the lesson.
  useEffect(
    () => () => {
      runRef.current += 1;
      stopSpeech();
    },
    [stopSpeech],
  );

  return {
    backend,
    ready,
    playing,
    activeIndex,
    soloIndex,
    rate,
    loop,
    pauseAfterEach,
    error,
    setRate,
    setLoop,
    setPauseAfterEach,
    playSegment,
    playFrom,
    toggle,
    pause,
    select,
    next,
    prev,
    mediaRef: setMedia,
    youtubeHostRef: setYoutubeHost,
  };
}

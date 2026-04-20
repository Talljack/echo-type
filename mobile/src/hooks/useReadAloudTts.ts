import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { cacheAudio, getCachedAudio } from '@/lib/audio-cache';
import { buildWordCharRanges, estimateWordTimings, localeFromEdgeVoiceId, wordIndexFromCharIndex } from '@/lib/tts';
import type { WordTimestamp } from '@/lib/word-alignment';
import { convertEdgeWordsToTimestamps, synthesizeEdgeTTS } from '@/services/tts-api';

type Mode = 'edge' | 'native';

function isEdgeVoice(ttsVoice: string): boolean {
  return /Neural$/i.test(ttsVoice);
}

function pickNativeVoiceId(ttsVoice: string, voices: Speech.Voice[]): string | undefined {
  if (!ttsVoice) return undefined;
  if (!isEdgeVoice(ttsVoice) && voices.some((v) => v.identifier === ttsVoice)) {
    return ttsVoice;
  }
  const locale = localeFromEdgeVoiceId(ttsVoice).toLowerCase();
  const normalizedLocale = locale.replace(/_/g, '-');
  const match =
    voices.find((v) => v.language?.replace(/_/g, '-').toLowerCase() === normalizedLocale) ??
    voices.find((v) => v.language?.toLowerCase().startsWith(locale.split('-')[0] ?? ''));
  return match?.identifier;
}

function findWordIndexByTime(timestamps: WordTimestamp[], currentTime: number): number {
  if (timestamps.length === 0) return -1;
  if (currentTime < timestamps[0].start) return -1;
  if (currentTime >= timestamps[timestamps.length - 1].start) return timestamps.length - 1;
  let lo = 0;
  let hi = timestamps.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (timestamps[mid].start <= currentTime) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return hi;
}

export interface UseReadAloudTtsOptions {
  ttsVoice: string;
  ttsSpeed: number;
}

export function useReadAloudTts({ ttsVoice, ttsSpeed }: UseReadAloudTtsOptions) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [progress, setProgress] = useState(0);
  const pulse = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedRef = useRef(false);
  const modeRef = useRef<Mode | null>(null);

  // Native-speech refs
  const textRef = useRef('');
  const rangesRef = useRef<{ start: number; end: number }[]>([]);
  const timingsRef = useRef<ReturnType<typeof estimateWordTimings>>([]);
  const startTimeRef = useRef(0);
  const lastBoundaryCharRef = useRef(0);
  const nativeVoiceRef = useRef<string | undefined>(undefined);

  // Edge-playback refs
  const soundRef = useRef<Audio.Sound | null>(null);
  const edgeTimestampsRef = useRef<WordTimestamp[]>([]);

  const clearProgressInterval = useCallback(() => {
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stopPulse = useCallback(() => {
    pulseLoopRef.current?.stop();
    pulseLoopRef.current = null;
    pulse.setValue(1);
  }, [pulse]);

  const startPulse = useCallback(() => {
    stopPulse();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.12,
          duration: 550,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 550,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoopRef.current = loop;
    loop.start();
  }, [pulse, stopPulse]);

  const resetProgressState = useCallback(() => {
    setActiveWordIndex(-1);
    setProgress(0);
    lastBoundaryCharRef.current = 0;
  }, []);

  const unloadSound = useCallback(async () => {
    const snd = soundRef.current;
    soundRef.current = null;
    if (snd) {
      try {
        await snd.unloadAsync();
      } catch {}
    }
  }, []);

  const stop = useCallback(async () => {
    stoppedRef.current = true;
    clearProgressInterval();
    stopPulse();
    const mode = modeRef.current;
    if (mode === 'edge') {
      try {
        await soundRef.current?.stopAsync();
      } catch {}
      await unloadSound();
    } else {
      try {
        await Speech.stop();
      } catch {}
    }
    modeRef.current = null;
    setIsSpeaking(false);
    resetProgressState();
  }, [clearProgressInterval, resetProgressState, stopPulse, unloadSound]);

  const finishSpeaking = useCallback(() => {
    stoppedRef.current = true;
    clearProgressInterval();
    stopPulse();
    setIsSpeaking(false);
    setActiveWordIndex(-1);
    setProgress(1);
  }, [clearProgressInterval, stopPulse]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        if (cancelled) return;
        nativeVoiceRef.current = pickNativeVoiceId(ttsVoice, voices);
      } catch {
        nativeVoiceRef.current = undefined;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ttsVoice]);

  useEffect(() => {
    return () => {
      stoppedRef.current = true;
      clearProgressInterval();
      stopPulse();
      void Speech.stop();
      void unloadSound();
    };
  }, [clearProgressInterval, stopPulse, unloadSound]);

  const startNativeProgressTicker = useCallback(() => {
    clearProgressInterval();
    intervalRef.current = setInterval(() => {
      if (stoppedRef.current) return;
      const text = textRef.current;
      const timings = timingsRef.current;
      const ranges = rangesRef.current;
      if (!text.length || !timings.length) return;

      const elapsed = Date.now() - startTimeRef.current;
      const totalMs = timings.reduce((s, t) => s + t.duration, 0) || 1;

      let acc = 0;
      let idx = 0;
      for (let i = 0; i < timings.length; i++) {
        if (elapsed < acc + timings[i].duration) {
          idx = i;
          break;
        }
        acc += timings[i].duration;
        idx = i + 1;
      }
      idx = Math.min(Math.max(0, idx), timings.length - 1);

      const boundaryChar = lastBoundaryCharRef.current;
      const boundaryIdx = boundaryChar > 0 && ranges.length > 0 ? wordIndexFromCharIndex(ranges, boundaryChar) : -1;
      const wordIdx = boundaryIdx >= 0 ? Math.max(idx, boundaryIdx) : idx;

      const estProgress = Math.min(1, elapsed / totalMs);
      const boundaryProgress = text.length > 0 ? Math.min(1, boundaryChar / text.length) : 0;
      const mergedProgress = Math.max(estProgress, boundaryProgress);

      setActiveWordIndex(wordIdx);
      setProgress(mergedProgress);
    }, 48);
  }, [clearProgressInterval]);

  const speakNative = useCallback(
    async (trimmed: string) => {
      modeRef.current = 'native';
      textRef.current = trimmed;
      rangesRef.current = buildWordCharRanges(trimmed);
      timingsRef.current = estimateWordTimings(trimmed, ttsSpeed);
      lastBoundaryCharRef.current = 0;
      startTimeRef.current = Date.now();

      const language = localeFromEdgeVoiceId(ttsVoice);
      const voiceOpt = nativeVoiceRef.current;

      setIsSpeaking(true);
      setProgress(0);
      setActiveWordIndex(0);
      startPulse();
      startNativeProgressTicker();

      Speech.speak(trimmed, {
        language,
        rate: ttsSpeed,
        ...(voiceOpt ? { voice: voiceOpt } : {}),
        onStart: () => {
          if (!stoppedRef.current) setIsSpeaking(true);
        },
        onBoundary: (ev: unknown) => {
          if (stoppedRef.current) return;
          const charIndex =
            typeof ev === 'object' &&
            ev !== null &&
            'charIndex' in ev &&
            typeof (ev as { charIndex: unknown }).charIndex === 'number'
              ? (ev as { charIndex: number }).charIndex
              : 0;
          lastBoundaryCharRef.current = Math.max(lastBoundaryCharRef.current, charIndex);
          const ranges = rangesRef.current;
          const fullLen = textRef.current.length;
          if (ranges.length > 0) {
            setActiveWordIndex(wordIndexFromCharIndex(ranges, charIndex));
          }
          if (fullLen > 0) {
            setProgress(Math.min(1, charIndex / fullLen));
          }
        },
        onDone: () => finishSpeaking(),
        onStopped: () => {
          if (stoppedRef.current) {
            resetProgressState();
            setProgress(0);
          }
        },
        onError: () => finishSpeaking(),
      });
    },
    [finishSpeaking, resetProgressState, startNativeProgressTicker, startPulse, ttsSpeed, ttsVoice],
  );

  const speakEdge = useCallback(
    async (trimmed: string): Promise<boolean> => {
      try {
        const cached = await getCachedAudio(trimmed, ttsVoice, ttsSpeed);

        let audioUri: string;
        let words: WordTimestamp[];

        if (cached) {
          audioUri = cached.audioUri;
          words = cached.words;
        } else {
          const response = await synthesizeEdgeTTS({ text: trimmed, voice: ttsVoice, speed: ttsSpeed });
          const edgeWords = convertEdgeWordsToTimestamps(response.words);
          const duration = edgeWords.length > 0 ? edgeWords[edgeWords.length - 1].end : 0;
          const written = await cacheAudio(trimmed, ttsVoice, ttsSpeed, response.audio, edgeWords, duration);
          audioUri = written.audioUri;
          words = written.words;
        }

        if (stoppedRef.current) return true;

        await unloadSound();
        edgeTimestampsRef.current = words;
        modeRef.current = 'edge';

        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          {
            shouldPlay: false,
            rate: ttsSpeed,
            shouldCorrectPitch: true,
            pitchCorrectionQuality: Audio.PitchCorrectionQuality.High,
          },
          (status) => {
            if (stoppedRef.current || !status.isLoaded) return;
            const durationMs = status.durationMillis ?? 0;
            const positionMs = status.positionMillis ?? 0;
            const currentSec = positionMs / 1000;

            if (status.isPlaying) {
              setProgress(durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0);
              const idx = findWordIndexByTime(edgeTimestampsRef.current, currentSec);
              setActiveWordIndex(idx);
            }

            if (status.didJustFinish) {
              finishSpeaking();
              void unloadSound();
            }
          },
        );

        if (stoppedRef.current) {
          try {
            await sound.unloadAsync();
          } catch {}
          return true;
        }

        soundRef.current = sound;
        setIsSpeaking(true);
        setProgress(0);
        setActiveWordIndex(0);
        startPulse();
        await sound.playAsync();
        return true;
      } catch (err) {
        console.warn('Edge TTS failed, falling back to native:', (err as Error)?.message);
        modeRef.current = null;
        return false;
      }
    },
    [finishSpeaking, startPulse, ttsSpeed, ttsVoice, unloadSound],
  );

  const speak = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      await Speech.stop();
      await unloadSound();
      stoppedRef.current = false;
      clearProgressInterval();
      stopPulse();

      if (isEdgeVoice(ttsVoice)) {
        const ok = await speakEdge(trimmed);
        if (ok || stoppedRef.current) return;
      }

      await speakNative(trimmed);
    },
    [clearProgressInterval, speakEdge, speakNative, stopPulse, ttsVoice, unloadSound],
  );

  const toggle = useCallback(
    async (text: string) => {
      if (modeRef.current === 'edge') {
        const status = await soundRef.current?.getStatusAsync().catch(() => null);
        if (status && 'isLoaded' in status && status.isLoaded && status.isPlaying) {
          await stop();
          return;
        }
      } else {
        const speaking = await Speech.isSpeakingAsync().catch(() => false);
        if (speaking) {
          await stop();
          return;
        }
      }
      await speak(text);
    },
    [speak, stop],
  );

  return {
    isSpeaking,
    activeWordIndex,
    progress,
    pulseScale: pulse,
    speak,
    stop,
    toggle,
  };
}

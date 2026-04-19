import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { buildWordCharRanges, estimateWordTimings, localeFromEdgeVoiceId, wordIndexFromCharIndex } from '@/lib/tts';

function pickNativeVoiceId(ttsVoice: string, voices: Speech.Voice[]): string | undefined {
  if (!ttsVoice) return undefined;
  if (!/Neural$/i.test(ttsVoice) && voices.some((v) => v.identifier === ttsVoice)) {
    return ttsVoice;
  }
  const locale = localeFromEdgeVoiceId(ttsVoice).toLowerCase();
  const normalizedLocale = locale.replace(/_/g, '-');
  const match =
    voices.find((v) => v.language?.replace(/_/g, '-').toLowerCase() === normalizedLocale) ??
    voices.find((v) => v.language?.toLowerCase().startsWith(locale.split('-')[0] ?? ''));
  return match?.identifier;
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
  const textRef = useRef('');
  const rangesRef = useRef<{ start: number; end: number }[]>([]);
  const timingsRef = useRef<ReturnType<typeof estimateWordTimings>>([]);
  const startTimeRef = useRef(0);
  const lastBoundaryCharRef = useRef(0);
  const nativeVoiceRef = useRef<string | undefined>(undefined);

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

  const stop = useCallback(async () => {
    stoppedRef.current = true;
    clearProgressInterval();
    stopPulse();
    await Speech.stop();
    setIsSpeaking(false);
    resetProgressState();
  }, [clearProgressInterval, resetProgressState, stopPulse]);

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
    };
  }, [clearProgressInterval, stopPulse]);

  const startProgressTicker = useCallback(() => {
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

  const speak = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      await Speech.stop();
      stoppedRef.current = false;
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
      startProgressTicker();

      Speech.speak(trimmed, {
        language,
        rate: ttsSpeed,
        ...(voiceOpt ? { voice: voiceOpt } : {}),
        onStart: () => {
          if (!stoppedRef.current) {
            setIsSpeaking(true);
          }
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
        onDone: () => {
          finishSpeaking();
        },
        onStopped: () => {
          if (stoppedRef.current) {
            resetProgressState();
            setProgress(0);
          }
        },
        onError: () => {
          finishSpeaking();
        },
      });
    },
    [finishSpeaking, resetProgressState, startProgressTicker, startPulse, ttsSpeed, ttsVoice],
  );

  const toggle = useCallback(
    async (text: string) => {
      const speaking = await Speech.isSpeakingAsync();
      if (speaking) {
        await stop();
        return;
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

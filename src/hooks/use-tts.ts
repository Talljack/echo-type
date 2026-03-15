'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getBrowserVoiceMetadata } from '@/lib/browser-voice-metadata';
import type { FishVoice } from '@/lib/fish-audio-shared';
import { resolveTTSSource } from '@/lib/fish-audio-shared';
import { useTTSStore } from '@/stores/tts-store';

export interface VoiceOption {
  source: 'browser' | 'fish';
  voiceURI: string;
  name: string;
  lang: string;
  localService: boolean;
  isPremium: boolean;
  label: string;
  description?: string;
  authorName?: string;
  coverImage?: string;
  sampleAudio?: string;
  sampleText?: string;
  languages?: string[];
  tags?: string[];
  taskCount?: number;
  likeCount?: number;
  provider?: 'apple' | 'google' | 'microsoft' | 'browser-cloud' | 'other';
  voiceType?: 'natural' | 'standard' | 'novelty';
  accent?: 'us' | 'uk' | 'au' | 'ca' | 'in' | 'ie' | 'za' | 'nz' | 'sg' | 'other-english' | 'non-english';
  isEnglish?: boolean;
  isFeatured?: boolean;
}

function formatVoiceName(voice: SpeechSynthesisVoice): string {
  const name = voice.name;
  const tag = voice.localService ? '' : ' ☁️';
  return `${name}${tag}`;
}

function isPremiumVoice(voice: SpeechSynthesisVoice): boolean {
  const name = voice.name.toLowerCase();

  const googlePremium = ['eddy', 'flo', 'grandma', 'grandpa', 'reed', 'rocko', 'sandy', 'shelley'];
  if (googlePremium.some((v) => name.includes(v))) return true;

  if (name.includes('online') && name.includes('natural')) return true;

  const appleEnhanced = ['samantha', 'alex', 'karen', 'daniel', 'moira', 'tessa', 'rishi', 'fred', 'kathy'];
  if (appleEnhanced.some((v) => name.includes(v))) return true;

  if (!voice.localService) return true;

  return false;
}

function normalizeFishVoiceToOption(voice: FishVoice): VoiceOption {
  const lang = voice.languages.find((item) => item.startsWith('en')) ?? voice.languages[0] ?? 'en';

  return {
    source: 'fish',
    voiceURI: voice.id,
    name: voice.name,
    lang,
    localService: false,
    isPremium: true,
    label: voice.name,
    description: voice.description,
    authorName: voice.authorName,
    coverImage: voice.coverImage,
    sampleAudio: voice.sampleAudio,
    sampleText: voice.sampleText,
    languages: voice.languages,
    tags: voice.tags,
    taskCount: voice.taskCount,
    likeCount: voice.likeCount,
  };
}

export function estimateListenDuration(text: string, rate: number = 1): number {
  const words = text.trim().split(/\s+/).length;
  const wpm = 150 * rate;
  return Math.ceil((words / wpm) * 60);
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function useTTS() {
  const { voiceSource, voiceURI, speed, pitch, volume, fishApiKey, fishVoiceId, fishModel } = useTTSStore();
  const [browserVoices, setBrowserVoices] = useState<VoiceOption[]>([]);
  const [fishVoices, setFishVoices] = useState<VoiceOption[]>([]);
  const [isBrowserReady, setIsBrowserReady] = useState(false);
  const [isFishLoading, setIsFishLoading] = useState(false);
  const [fishError, setFishError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [previewingURI, setPreviewingURI] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const requestAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function loadVoices() {
      const allVoices = window.speechSynthesis.getVoices();
      if (allVoices.length === 0) return;

      const normalizedVoices = allVoices
        .sort((a, b) => {
          const aMeta = getBrowserVoiceMetadata({
            name: a.name,
            lang: a.lang,
            localService: a.localService,
            isPremium: isPremiumVoice(a),
            voiceURI: a.voiceURI,
          });
          const bMeta = getBrowserVoiceMetadata({
            name: b.name,
            lang: b.lang,
            localService: b.localService,
            isPremium: isPremiumVoice(b),
            voiceURI: b.voiceURI,
          });

          if (aMeta.isEnglish !== bMeta.isEnglish) return aMeta.isEnglish ? -1 : 1;
          if (aMeta.isFeatured !== bMeta.isFeatured) return aMeta.isFeatured ? -1 : 1;

          const aPremium = isPremiumVoice(a);
          const bPremium = isPremiumVoice(b);
          if (aPremium !== bPremium) return aPremium ? -1 : 1;
          return a.name.localeCompare(b.name);
        })
        .map((voice) => {
          const isPremium = isPremiumVoice(voice);
          const meta = getBrowserVoiceMetadata({
            name: voice.name,
            lang: voice.lang,
            localService: voice.localService,
            isPremium,
            voiceURI: voice.voiceURI,
          });

          return {
            source: 'browser' as const,
            voiceURI: voice.voiceURI,
            name: voice.name,
            lang: voice.lang,
            localService: voice.localService,
            isPremium,
            label: formatVoiceName(voice),
            provider: meta.provider,
            voiceType: meta.voiceType,
            accent: meta.accent,
            isEnglish: meta.isEnglish,
            isFeatured: meta.isFeatured,
          };
        });

      setBrowserVoices(normalizedVoices);
      setIsBrowserReady(true);
    }

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    useTTSStore.getState().hydrate();
  }, []);

  useEffect(() => {
    if (!isBrowserReady || browserVoices.length === 0) return;
    const stored = useTTSStore.getState().voiceURI;
    if (stored) return;
    const eddy = browserVoices.find((voice) => voice.name.toLowerCase().includes('eddy') && voice.lang === 'en-US');
    if (eddy) {
      useTTSStore.getState().setVoiceURI(eddy.voiceURI);
    }
  }, [isBrowserReady, browserVoices]);

  useEffect(() => {
    if (voiceSource !== 'fish') return;
    if (!fishApiKey.trim()) {
      setFishVoices([]);
      setFishError(null);
      setIsFishLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsFishLoading(true);
    setFishError(null);

    void fetch('/api/tts/fish/voices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: fishApiKey }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = (await response.json()) as { voices?: FishVoice[]; error?: string };
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load Fish Audio voices.');
        }

        setFishVoices((data.voices ?? []).map(normalizeFishVoiceToOption));
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setFishVoices([]);
        setFishError(error instanceof Error ? error.message : 'Failed to load Fish Audio voices.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsFishLoading(false);
        }
      });

    return () => controller.abort();
  }, [fishApiKey, voiceSource]);

  const stop = useCallback(() => {
    requestAbortRef.current?.abort();
    requestAbortRef.current = null;
    window.speechSynthesis.cancel();
    audioRef.current?.pause();
    audioRef.current = null;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setIsSpeaking(false);
    setPreviewingURI(null);
  }, []);

  useEffect(() => stop, [stop]);

  const getVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (!voiceURI) return null;
    const allVoices = window.speechSynthesis.getVoices();
    return allVoices.find((voice) => voice.voiceURI === voiceURI) || null;
  }, [voiceURI]);

  const createUtterance = useCallback(
    (text: string, overrides?: { rate?: number }): SpeechSynthesisUtterance => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = overrides?.rate ?? speed;
      utterance.pitch = pitch;
      utterance.volume = volume;
      const voice = getVoice();
      utterance.lang = voice?.lang ?? 'en-US';
      if (voice) utterance.voice = voice;
      return utterance;
    },
    [speed, pitch, volume, getVoice],
  );

  const playBrowserSpeech = useCallback(
    (text: string, overrides?: { rate?: number }) => {
      window.speechSynthesis.cancel();
      const utterance = createUtterance(text, overrides);
      utteranceRef.current = utterance;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        setPreviewingURI(null);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setPreviewingURI(null);
      };
      window.speechSynthesis.speak(utterance);
      return utterance;
    },
    [createUtterance],
  );

  const playFishSpeech = useCallback(
    async (text: string, voiceId: string, overrides?: { rate?: number }) => {
      stop();
      const controller = new AbortController();
      requestAbortRef.current = controller;

      const response = await fetch('/api/tts/fish/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: fishApiKey,
          text,
          voiceId,
          model: fishModel,
          speed: overrides?.rate ?? speed,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Fish Audio synthesis failed.');
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      objectUrlRef.current = objectUrl;
      audioRef.current = audio;

      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => {
        setIsSpeaking(false);
        setPreviewingURI(null);
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        setPreviewingURI(null);
      };

      await audio.play();
    },
    [fishApiKey, fishModel, speed, stop],
  );

  const resolvedPlayback = useMemo(
    () =>
      resolveTTSSource({
        requestedSource: voiceSource,
        hasFishCredentials: Boolean(fishApiKey.trim()),
        hasFishVoice: Boolean(fishVoiceId.trim()),
      }),
    [voiceSource, fishApiKey, fishVoiceId],
  );

  const boundaryPlayback = useMemo(
    () =>
      resolveTTSSource({
        requestedSource: voiceSource,
        hasFishCredentials: Boolean(fishApiKey.trim()),
        hasFishVoice: Boolean(fishVoiceId.trim()),
        requiresBoundaryEvents: true,
      }),
    [voiceSource, fishApiKey, fishVoiceId],
  );

  const speak = useCallback(
    async (text: string, overrides?: { rate?: number }) => {
      if (resolvedPlayback.source === 'fish') {
        try {
          await playFishSpeech(text, fishVoiceId, overrides);
          return;
        } catch {
          return playBrowserSpeech(text, overrides);
        }
      }

      return playBrowserSpeech(text, overrides);
    },
    [resolvedPlayback.source, playFishSpeech, fishVoiceId, playBrowserSpeech],
  );

  const preview = useCallback(
    (text: string = 'Hello, I am your English tutor. Let me help you practice.') => {
      void speak(text);
    },
    [speak],
  );

  const previewVoice = useCallback(
    async (uri: string, text: string = 'Hello, I am your English tutor. Let me help you practice.') => {
      setPreviewingURI(uri);
      if (voiceSource === 'fish') {
        try {
          await playFishSpeech(text, uri);
          return;
        } catch {
          setPreviewingURI(null);
        }
      }

      window.speechSynthesis.cancel();
      const allVoices = window.speechSynthesis.getVoices();
      const voice = allVoices.find((item) => item.voiceURI === uri) || null;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = speed;
      utterance.pitch = pitch;
      utterance.volume = volume;
      utterance.lang = voice?.lang ?? 'en-US';
      if (voice) utterance.voice = voice;
      utteranceRef.current = utterance;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        setPreviewingURI(null);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setPreviewingURI(null);
      };
      window.speechSynthesis.speak(utterance);
    },
    [voiceSource, speed, pitch, volume, playFishSpeech],
  );

  const voices = useMemo(() => {
    if (voiceSource === 'fish') {
      return fishVoices;
    }
    return browserVoices;
  }, [voiceSource, fishVoices, browserVoices]);

  const currentVoice = useMemo(() => {
    if (voiceSource === 'fish') {
      return fishVoices.find((voice) => voice.voiceURI === fishVoiceId) ?? null;
    }
    return browserVoices.find((voice) => voice.voiceURI === voiceURI) ?? null;
  }, [voiceSource, fishVoices, fishVoiceId, browserVoices, voiceURI]);

  return {
    voices,
    browserVoices,
    fishVoices,
    currentVoice,
    isReady: isBrowserReady && !isFishLoading,
    isSpeaking,
    isFishLoading,
    fishError,
    previewingURI,
    voiceSource,
    resolvedVoiceSource: resolvedPlayback.source,
    resolvedVoiceSourceReason: resolvedPlayback.reason ?? fishError ?? undefined,
    boundaryVoiceSource: boundaryPlayback.source,
    boundaryPlaybackNotice: boundaryPlayback.reason,
    speak,
    stop,
    preview,
    previewVoice,
    createUtterance,
    getVoice,
    estimateListenDuration,
    formatDuration,
  };
}

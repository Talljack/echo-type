'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getBrowserVoiceMetadata } from '@/lib/browser-voice-metadata';
import type { FishVoice } from '@/lib/fish-audio-shared';
import { resolveTTSSource } from '@/lib/fish-audio-shared';
import type { KokoroVoice } from '@/lib/kokoro-shared';
import type { WordTimestamp } from '@/lib/word-alignment';
import { useTTSStore } from '@/stores/tts-store';

export interface VoiceOption {
  source: 'browser' | 'fish' | 'kokoro' | 'edge';
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
  provider?: 'apple' | 'google' | 'microsoft' | 'browser-cloud' | 'other' | 'kokoro';
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

function normalizeKokoroVoiceToOption(voice: KokoroVoice): VoiceOption {
  const accent =
    voice.langCode === 'en-US'
      ? 'us'
      : voice.langCode === 'en-GB'
        ? 'uk'
        : voice.langCode.startsWith('en')
          ? 'other-english'
          : 'non-english';

  return {
    source: 'kokoro',
    voiceURI: voice.id,
    name: voice.name,
    lang: voice.langCode,
    localService: false,
    isPremium: true,
    label: `${voice.name} (${voice.language})`,
    description: `${voice.language} • ${voice.gender === 'female' ? 'Female' : 'Male'} voice`,
    languages: [voice.langCode],
    tags: [voice.language, voice.gender],
    provider: 'kokoro',
    voiceType: 'natural',
    accent,
    isEnglish: voice.langCode.startsWith('en'),
    isFeatured: voice.langCode.startsWith('en'),
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
  const {
    voiceSource,
    voiceURI,
    speed,
    pitch,
    volume,
    fishApiKey,
    fishVoiceId,
    fishModel,
    kokoroServerUrl,
    kokoroApiKey,
    kokoroVoiceId,
    edgeVoiceId,
  } = useTTSStore();
  const [browserVoices, setBrowserVoices] = useState<VoiceOption[]>([]);
  const [fishVoices, setFishVoices] = useState<VoiceOption[]>([]);
  const [kokoroVoices, setKokoroVoices] = useState<VoiceOption[]>([]);
  const [edgeVoices, setEdgeVoices] = useState<VoiceOption[]>([]);
  const [isBrowserReady, setIsBrowserReady] = useState(false);
  const [isFishLoading, setIsFishLoading] = useState(false);
  const [isKokoroLoading, setIsKokoroLoading] = useState(false);
  const [isEdgeLoading, setIsEdgeLoading] = useState(false);
  const [fishError, setFishError] = useState<string | null>(null);
  const [kokoroError, setKokoroError] = useState<string | null>(null);
  const [edgeError, setEdgeError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [previewingURI, setPreviewingURI] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const requestAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function normalizeBrowserVoices(allVoices: SpeechSynthesisVoice[]) {
      return allVoices
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
    }

    let cancelled = false;
    let attempts = 0;
    let retryTimer: number | null = null;

    function loadVoices() {
      if (cancelled) return;

      const allVoices = window.speechSynthesis.getVoices();
      if (allVoices.length > 0) {
        setBrowserVoices(normalizeBrowserVoices(allVoices));
        setIsBrowserReady(true);
        return true;
      }

      attempts += 1;
      if (attempts >= 12) {
        setBrowserVoices([]);
        setIsBrowserReady(true);
        return true;
      }

      retryTimer = window.setTimeout(() => {
        void loadVoices();
      }, 250);
      return false;
    }

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      cancelled = true;
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
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

    const enVoices = browserVoices.filter((v) => v.isEnglish);
    if (enVoices.length === 0) return;

    const isGoodVoice = (v: VoiceOption) => v.isPremium && v.voiceType !== 'novelty';

    // Ranked list of known high-quality browser voices (macOS/Windows/Chrome)
    const preferredNames = ['samantha', 'karen', 'daniel', 'allison', 'ava', 'serena', 'reed'];
    const byName = (name: string) => enVoices.find((v) => v.name.toLowerCase().includes(name));
    const preferred = preferredNames.reduce<VoiceOption | undefined>((found, name) => found ?? byName(name), undefined);

    const naturalUS = enVoices.find((v) => v.voiceType === 'natural' && v.accent === 'us');
    const naturalAny = enVoices.find((v) => v.voiceType === 'natural' && v.isEnglish);
    const appleUS = enVoices.find((v) => isGoodVoice(v) && v.provider === 'apple' && v.accent === 'us');
    const appleAny = enVoices.find((v) => isGoodVoice(v) && v.provider === 'apple');
    const premiumUS = enVoices.find((v) => isGoodVoice(v) && v.accent === 'us');
    const premiumAny = enVoices.find((v) => isGoodVoice(v));
    const fallback = enVoices.find((v) => v.voiceType !== 'novelty');

    const best = naturalUS ?? naturalAny ?? preferred ?? appleUS ?? appleAny ?? premiumUS ?? premiumAny ?? fallback;
    if (best) {
      useTTSStore.getState().setVoiceURI(best.voiceURI);
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

  useEffect(() => {
    if (voiceSource !== 'kokoro') return;
    if (!kokoroServerUrl.trim()) {
      setKokoroVoices([]);
      setKokoroError(null);
      setIsKokoroLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsKokoroLoading(true);
    setKokoroError(null);

    void fetch('/api/tts/kokoro/voices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serverUrl: kokoroServerUrl,
        apiKey: kokoroApiKey || undefined,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = (await response.json()) as { voices?: KokoroVoice[]; error?: string };
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load Kokoro voices.');
        }

        setKokoroVoices((data.voices ?? []).map(normalizeKokoroVoiceToOption));
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setKokoroVoices([]);
        setKokoroError(error instanceof Error ? error.message : 'Failed to load Kokoro voices.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsKokoroLoading(false);
        }
      });

    return () => controller.abort();
  }, [kokoroApiKey, kokoroServerUrl, voiceSource]);

  useEffect(() => {
    if (voiceSource !== 'edge') return;

    setIsEdgeLoading(true);
    setEdgeError(null);

    void fetch('/api/tts/edge/voices')
      .then(async (response) => {
        const data = (await response.json()) as {
          voices?: Array<{ id: string; name: string; locale: string; gender: string; personalities?: string[] }>;
        };
        if (!response.ok) return;

        const localeToAccent: Record<string, VoiceOption['accent']> = {
          'en-US': 'us',
          'en-GB': 'uk',
          'en-AU': 'au',
          'en-CA': 'ca',
          'en-IN': 'in',
          'en-IE': 'ie',
          'en-ZA': 'za',
          'en-NZ': 'nz',
          'en-SG': 'sg',
        };

        setEdgeVoices(
          (data.voices ?? []).map((v) => ({
            source: 'edge' as const,
            voiceURI: v.id,
            name: v.name,
            lang: v.locale,
            localService: false,
            isPremium: true,
            label: `${v.name} (${v.locale})`,
            description: `${v.gender} voice`,
            tags: v.personalities,
            provider: 'microsoft' as const,
            voiceType: 'natural' as const,
            accent: localeToAccent[v.locale] ?? ('other-english' as const),
            isEnglish: true,
            isFeatured: v.locale === 'en-US' || v.locale === 'en-GB',
          })),
        );
      })
      .catch(() => {
        setEdgeVoices([]);
        setEdgeError('Failed to load Edge voices. Using fallback list.');
      })
      .finally(() => setIsEdgeLoading(false));
  }, [voiceSource]);

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

  useEffect(() => {
    function handleGlobalStop() {
      stop();
    }

    window.addEventListener('echotype:stop-tts', handleGlobalStop);
    return () => window.removeEventListener('echotype:stop-tts', handleGlobalStop);
  }, [stop]);

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

  const playAudioBlob = useCallback((blob: Blob): { audio: HTMLAudioElement; objectUrl: string } => {
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

    return { audio, objectUrl };
  }, []);

  const playFishSpeech = useCallback(
    async (
      text: string,
      voiceId: string,
      overrides?: { rate?: number },
    ): Promise<{ blob: Blob; audio: HTMLAudioElement }> => {
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
      const { audio } = playAudioBlob(blob);

      await audio.play();
      return { blob, audio };
    },
    [fishApiKey, fishModel, speed, stop, playAudioBlob],
  );

  const playKokoroSpeech = useCallback(
    async (
      text: string,
      voiceId: string,
      overrides?: { rate?: number },
    ): Promise<{ blob: Blob; audio: HTMLAudioElement }> => {
      stop();
      const controller = new AbortController();
      requestAbortRef.current = controller;

      const response = await fetch('/api/tts/kokoro/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverUrl: kokoroServerUrl,
          apiKey: kokoroApiKey || undefined,
          text,
          voice: voiceId,
          speed: overrides?.rate ?? speed,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Kokoro speech synthesis failed.');
      }

      const blob = await response.blob();
      const { audio } = playAudioBlob(blob);

      await audio.play();
      return { blob, audio };
    },
    [kokoroApiKey, kokoroServerUrl, speed, stop, playAudioBlob],
  );

  const playEdgeSpeech = useCallback(
    async (
      text: string,
      voiceId: string,
      overrides?: { rate?: number },
    ): Promise<{ blob: Blob; audio: HTMLAudioElement }> => {
      stop();
      const controller = new AbortController();
      requestAbortRef.current = controller;

      const response = await fetch('/api/tts/edge/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: voiceId,
          speed: overrides?.rate ?? speed,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Edge TTS synthesis failed.');
      }

      const blob = await response.blob();
      const { audio } = playAudioBlob(blob);

      await audio.play();
      return { blob, audio };
    },
    [speed, stop, playAudioBlob],
  );

  const synthesizeEdgeWithAlignment = useCallback(
    async (
      text: string,
      voiceId: string,
      overrides?: { rate?: number },
    ): Promise<{ blob: Blob; audio: HTMLAudioElement; wordTimestamps: WordTimestamp[] }> => {
      stop();
      const controller = new AbortController();
      requestAbortRef.current = controller;

      const response = await fetch('/api/tts/edge/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: voiceId,
          speed: overrides?.rate ?? speed,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Edge TTS synthesis failed.');
      }

      const data = (await response.json()) as {
        audio: string;
        contentType: string;
        words: WordTimestamp[];
      };

      const binaryStr = atob(data.audio);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: data.contentType });
      const { audio } = playAudioBlob(blob);

      await audio.play();
      return { blob, audio, wordTimestamps: data.words };
    },
    [speed, stop, playAudioBlob],
  );

  const resolvedPlayback = useMemo(
    () =>
      resolveTTSSource({
        requestedSource: voiceSource,
        hasFishCredentials: Boolean(fishApiKey.trim()),
        hasFishVoice: Boolean(fishVoiceId.trim()),
        hasKokoroServerUrl: Boolean(kokoroServerUrl.trim()),
        hasKokoroVoice: Boolean(kokoroVoiceId.trim()),
        hasEdgeVoice: Boolean(edgeVoiceId.trim()),
      }),
    [voiceSource, fishApiKey, fishVoiceId, kokoroServerUrl, kokoroVoiceId, edgeVoiceId],
  );

  const boundaryPlayback = useMemo(
    () =>
      resolveTTSSource({
        requestedSource: voiceSource,
        hasFishCredentials: Boolean(fishApiKey.trim()),
        hasFishVoice: Boolean(fishVoiceId.trim()),
        hasKokoroServerUrl: Boolean(kokoroServerUrl.trim()),
        hasKokoroVoice: Boolean(kokoroVoiceId.trim()),
        hasEdgeVoice: Boolean(edgeVoiceId.trim()),
        requiresBoundaryEvents: true,
      }),
    [voiceSource, fishApiKey, fishVoiceId, kokoroServerUrl, kokoroVoiceId, edgeVoiceId],
  );

  const speak = useCallback(
    async (
      text: string,
      overrides?: { rate?: number },
    ): Promise<
      { blob?: Blob; audio?: HTMLAudioElement; wordTimestamps?: WordTimestamp[] } | SpeechSynthesisUtterance | undefined
    > => {
      if (resolvedPlayback.source === 'fish') {
        try {
          return await playFishSpeech(text, fishVoiceId, overrides);
        } catch {
          return playBrowserSpeech(text, overrides);
        }
      }

      if (resolvedPlayback.source === 'kokoro') {
        try {
          return await playKokoroSpeech(text, kokoroVoiceId, overrides);
        } catch {
          return playBrowserSpeech(text, overrides);
        }
      }

      if (resolvedPlayback.source === 'edge') {
        try {
          return await synthesizeEdgeWithAlignment(text, edgeVoiceId, overrides);
        } catch {
          return playBrowserSpeech(text, overrides);
        }
      }

      return playBrowserSpeech(text, overrides);
    },
    [
      resolvedPlayback.source,
      playFishSpeech,
      fishVoiceId,
      playKokoroSpeech,
      kokoroVoiceId,
      synthesizeEdgeWithAlignment,
      edgeVoiceId,
      playBrowserSpeech,
    ],
  );

  const getAudioElement = useCallback((): HTMLAudioElement | null => {
    return audioRef.current;
  }, []);

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

      if (voiceSource === 'kokoro') {
        try {
          await playKokoroSpeech(text, uri);
          return;
        } catch {
          setPreviewingURI(null);
        }
      }

      if (voiceSource === 'edge') {
        try {
          await playEdgeSpeech(text, uri);
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
    [voiceSource, speed, pitch, volume, playFishSpeech, playKokoroSpeech, playEdgeSpeech],
  );

  const voices = useMemo(() => {
    if (voiceSource === 'fish') return fishVoices;
    if (voiceSource === 'kokoro') return kokoroVoices;
    if (voiceSource === 'edge') return edgeVoices;
    return browserVoices;
  }, [voiceSource, fishVoices, kokoroVoices, edgeVoices, browserVoices]);

  const currentVoice = useMemo(() => {
    if (voiceSource === 'fish') {
      return fishVoices.find((voice) => voice.voiceURI === fishVoiceId) ?? null;
    }
    if (voiceSource === 'kokoro') {
      return kokoroVoices.find((voice) => voice.voiceURI === kokoroVoiceId) ?? null;
    }
    if (voiceSource === 'edge') {
      return edgeVoices.find((voice) => voice.voiceURI === edgeVoiceId) ?? null;
    }
    return browserVoices.find((voice) => voice.voiceURI === voiceURI) ?? null;
  }, [
    voiceSource,
    fishVoices,
    fishVoiceId,
    kokoroVoices,
    kokoroVoiceId,
    edgeVoices,
    edgeVoiceId,
    browserVoices,
    voiceURI,
  ]);

  const sourceError =
    voiceSource === 'fish'
      ? fishError
      : voiceSource === 'kokoro'
        ? kokoroError
        : voiceSource === 'edge'
          ? edgeError
          : null;
  const isSourceLoading =
    voiceSource === 'fish'
      ? isFishLoading
      : voiceSource === 'kokoro'
        ? isKokoroLoading
        : voiceSource === 'edge'
          ? isEdgeLoading
          : false;

  return {
    voices,
    browserVoices,
    fishVoices,
    kokoroVoices,
    edgeVoices,
    currentVoice,
    isReady: isBrowserReady && !isSourceLoading,
    isSpeaking,
    isFishLoading,
    isKokoroLoading,
    isEdgeLoading,
    fishError,
    kokoroError,
    edgeError,
    previewingURI,
    voiceSource,
    resolvedVoiceSource: resolvedPlayback.source,
    resolvedVoiceSourceReason: resolvedPlayback.reason ?? sourceError ?? undefined,
    boundaryVoiceSource: boundaryPlayback.source,
    boundaryPlaybackNotice: boundaryPlayback.reason,
    speak,
    stop,
    preview,
    previewVoice,
    createUtterance,
    getVoice,
    getAudioElement,
    estimateListenDuration,
    formatDuration,
  };
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getBrowserVoiceMetadata } from '@/lib/browser-voice-metadata';
import type { FishVoice } from '@/lib/fish-audio-shared';
import { resolveTTSSource } from '@/lib/fish-audio-shared';
import type { GoogleTTSVoice } from '@/lib/google-tts';
import { getIOSNativeQAMockEdgeVoices, getIOSNativeQAMode } from '@/lib/ios-native-qa';
import { OPENAI_TTS_VOICES, type OpenAITTSVoice } from '@/lib/openai-tts';
import type { WordTimestamp } from '@/lib/word-alignment';
import { type TTSSource, useTTSStore } from '@/stores/tts-store';

export interface VoiceOption {
  source: 'browser' | 'fish' | 'google' | 'openai' | 'edge';
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
  provider?: 'apple' | 'google' | 'openai' | 'microsoft' | 'browser-cloud' | 'other';
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

  const appleEnhanced = [
    'samantha',
    'alex',
    'ava',
    'allison',
    'serena',
    'karen',
    'daniel',
    'moira',
    'tessa',
    'rishi',
    'fred',
    'kathy',
  ];
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

function getGoogleVoiceLabel(name: string): string {
  return name
    .replace(/^en-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeGoogleVoiceToOption(voice: GoogleTTSVoice): VoiceOption {
  const lang = voice.languageCodes.find((item) => item.startsWith('en')) ?? voice.languageCodes[0] ?? 'en-US';
  const label = getGoogleVoiceLabel(voice.name);

  return {
    source: 'google',
    voiceURI: voice.name,
    name: label,
    lang,
    localService: false,
    isPremium: voice.name.includes('Wavenet') || voice.name.includes('Neural2') || voice.name.includes('Chirp'),
    label: `${label} (${lang})`,
    description: `${voice.ssmlGender.toLowerCase()} voice`,
    provider: 'google',
    voiceType:
      voice.name.includes('Wavenet') || voice.name.includes('Neural2') || voice.name.includes('Chirp')
        ? 'natural'
        : 'standard',
    accent: getBrowserVoiceMetadata({
      name: voice.name,
      lang,
      localService: false,
      isPremium: true,
      voiceURI: voice.name,
    }).accent,
    isEnglish: true,
    isFeatured: lang === 'en-US' || lang === 'en-GB',
    tags: [voice.name.split('-')[2] ?? 'Google'],
  };
}

function normalizeOpenAIVoiceToOption(voice: OpenAITTSVoice): VoiceOption {
  return {
    source: 'openai',
    voiceURI: voice.id,
    name: voice.name,
    lang: 'en-US',
    localService: false,
    isPremium: true,
    label: `${voice.name} (OpenAI)`,
    description: voice.description,
    provider: 'openai',
    voiceType: 'natural',
    accent: 'us',
    isEnglish: true,
    isFeatured: voice.id === 'marin' || voice.id === 'cedar',
    tags: [voice.gender, 'OpenAI'],
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

const EDGE_FALLBACK_COOLDOWN_MS = 2 * 60 * 1000;
const EDGE_TIMEOUT_MESSAGE = 'Edge TTS timed out. Browser voice is temporarily active for stability.';
const EDGE_UNAVAILABLE_MESSAGE =
  'Edge TTS is temporarily unavailable. Browser voice is temporarily active for stability.';

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
    googleApiKey,
    googleVoiceName,
    googleLanguageCode,
    openaiTtsApiKey,
    openaiTtsBaseUrl,
    openaiTtsModel,
    openaiTtsVoice,
    edgeVoiceId,
  } = useTTSStore();
  const [browserVoices, setBrowserVoices] = useState<VoiceOption[]>([]);
  const [fishVoices, setFishVoices] = useState<VoiceOption[]>([]);
  const [googleVoices, setGoogleVoices] = useState<VoiceOption[]>([]);
  const [openaiVoices] = useState<VoiceOption[]>(() => OPENAI_TTS_VOICES.map(normalizeOpenAIVoiceToOption));
  const [edgeVoices, setEdgeVoices] = useState<VoiceOption[]>([]);
  const [isBrowserReady, setIsBrowserReady] = useState(false);
  const [isFishLoading, setIsFishLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEdgeLoading, setIsEdgeLoading] = useState(false);
  const [fishError, setFishError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [edgeError, setEdgeError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [previewingURI, setPreviewingURI] = useState<string | null>(null);
  const [lastPlaybackSource, setLastPlaybackSource] = useState<TTSSource | null>(null);
  const [lastPlaybackSourceReason, setLastPlaybackSourceReason] = useState<string | null>(null);
  const [edgeFallbackUntil, setEdgeFallbackUntil] = useState(0);
  const [edgeFallbackReason, setEdgeFallbackReason] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const requestAbortRef = useRef<AbortController | null>(null);

  const markPlaybackSource = useCallback((source: TTSSource, reason?: string | null) => {
    setLastPlaybackSource(source);
    setLastPlaybackSourceReason(reason ?? null);
  }, []);

  const isEdgeTemporarilyUnavailable = edgeFallbackUntil > Date.now();

  const activateEdgeFallback = useCallback((message: string) => {
    setEdgeFallbackUntil(Date.now() + EDGE_FALLBACK_COOLDOWN_MS);
    setEdgeFallbackReason(message);
  }, []);

  const clearEdgeFallback = useCallback(() => {
    setEdgeFallbackUntil(0);
    setEdgeFallbackReason(null);
  }, []);

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

    const localAppleUS = enVoices.find(
      (v) => isGoodVoice(v) && v.localService && v.provider === 'apple' && v.accent === 'us',
    );
    const localAppleAny = enVoices.find((v) => isGoodVoice(v) && v.localService && v.provider === 'apple');
    const localPremiumUS = enVoices.find((v) => isGoodVoice(v) && v.localService && v.accent === 'us');
    const localPremiumAny = enVoices.find((v) => isGoodVoice(v) && v.localService);
    const naturalUS = enVoices.find((v) => v.voiceType === 'natural' && v.accent === 'us');
    const naturalAny = enVoices.find((v) => v.voiceType === 'natural' && v.isEnglish);
    const googleUS = enVoices.find((v) => isGoodVoice(v) && v.provider === 'google' && v.accent === 'us');
    const googleUK = enVoices.find((v) => isGoodVoice(v) && v.provider === 'google' && v.accent === 'uk');
    const googleAny = enVoices.find((v) => isGoodVoice(v) && v.provider === 'google' && v.isEnglish);
    const appleUS = enVoices.find((v) => isGoodVoice(v) && v.provider === 'apple' && v.accent === 'us');
    const appleAny = enVoices.find((v) => isGoodVoice(v) && v.provider === 'apple');
    const premiumUS = enVoices.find((v) => isGoodVoice(v) && v.accent === 'us');
    const premiumAny = enVoices.find((v) => isGoodVoice(v));
    const fallback = enVoices.find((v) => v.voiceType !== 'novelty');

    const best =
      localAppleUS ??
      localAppleAny ??
      localPremiumUS ??
      localPremiumAny ??
      naturalUS ??
      naturalAny ??
      googleUS ??
      googleUK ??
      googleAny ??
      appleUS ??
      appleAny ??
      premiumUS ??
      premiumAny ??
      fallback;
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
    if (voiceSource !== 'google') return;

    const controller = new AbortController();
    setIsGoogleLoading(true);
    setGoogleError(null);

    void fetch('/api/tts/google/voices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: googleApiKey }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = (await response.json()) as { voices?: GoogleTTSVoice[]; error?: string };
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load Google Cloud TTS voices.');
        }

        setGoogleVoices((data.voices ?? []).map(normalizeGoogleVoiceToOption));
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setGoogleVoices([]);
        setGoogleError(error instanceof Error ? error.message : 'Failed to load Google Cloud TTS voices.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsGoogleLoading(false);
        }
      });

    return () => controller.abort();
  }, [googleApiKey, voiceSource]);

  useEffect(() => {
    if (voiceSource !== 'google' || googleVoices.length === 0) return;

    const currentSelection = googleVoices.find((voice) => voice.voiceURI === googleVoiceName);
    if (currentSelection) return;

    const preferredVoice =
      googleVoices.find((voice) => voice.voiceURI === 'en-US-Wavenet-F') ??
      googleVoices.find((voice) => voice.lang === 'en-US' && voice.voiceURI.includes('Wavenet')) ??
      googleVoices.find((voice) => voice.lang === 'en-US') ??
      googleVoices[0];

    if (preferredVoice) {
      useTTSStore.getState().setGoogleVoice(preferredVoice.voiceURI, preferredVoice.name, preferredVoice.lang);
    }
  }, [googleVoices, googleVoiceName, voiceSource]);

  useEffect(() => {
    if (voiceSource !== 'edge') return;

    if (getIOSNativeQAMode()) {
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
        getIOSNativeQAMockEdgeVoices().map((v) => ({
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
      setEdgeError(null);
      setIsEdgeLoading(false);
      return;
    }

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

  useEffect(() => {
    if (voiceSource !== 'edge' || edgeVoices.length === 0) return;

    const currentSelection = edgeVoices.find((voice) => voice.voiceURI === edgeVoiceId);
    if (currentSelection) return;

    const preferredVoice =
      edgeVoices.find((voice) => voice.voiceURI === 'en-US-JennyNeural') ??
      edgeVoices.find((voice) => voice.lang === 'en-US' && voice.voiceType === 'natural' && voice.isPremium) ??
      edgeVoices[0];

    if (preferredVoice) {
      useTTSStore.getState().setEdgeVoice(preferredVoice.voiceURI, preferredVoice.name);
    }
  }, [edgeVoices, edgeVoiceId, voiceSource]);

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
    (text: string, overrides?: { rate?: number }, reason?: string | null) => {
      window.speechSynthesis.cancel();
      const utterance = createUtterance(text, overrides);
      utteranceRef.current = utterance;
      utterance.onstart = () => {
        markPlaybackSource('browser', reason);
        setIsSpeaking(true);
      };
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
    [createUtterance, markPlaybackSource],
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
      markPlaybackSource('fish');

      await audio.play();
      return { blob, audio };
    },
    [fishApiKey, fishModel, speed, stop, playAudioBlob, markPlaybackSource],
  );

  const playGoogleSpeech = useCallback(
    async (
      text: string,
      voiceName: string,
      languageCode: string,
      overrides?: { rate?: number },
    ): Promise<{ blob: Blob; audio: HTMLAudioElement }> => {
      stop();
      const controller = new AbortController();
      requestAbortRef.current = controller;

      const response = await fetch('/api/tts/google/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: googleApiKey,
          text,
          voiceName,
          languageCode,
          speed: overrides?.rate ?? speed,
          pitch,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Google Cloud TTS synthesis failed.');
      }

      const blob = await response.blob();
      const { audio } = playAudioBlob(blob);
      markPlaybackSource('google');

      await audio.play();
      return { blob, audio };
    },
    [googleApiKey, speed, pitch, stop, playAudioBlob, markPlaybackSource],
  );

  const playOpenAISpeech = useCallback(
    async (
      text: string,
      voice: string,
      overrides?: { rate?: number },
    ): Promise<{ blob: Blob; audio: HTMLAudioElement }> => {
      stop();
      const controller = new AbortController();
      requestAbortRef.current = controller;

      const response = await fetch('/api/tts/openai/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: openaiTtsApiKey,
          baseUrl: openaiTtsBaseUrl,
          text,
          model: openaiTtsModel,
          voice,
          speed: overrides?.rate ?? speed,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'OpenAI TTS synthesis failed.');
      }

      const blob = await response.blob();
      const { audio } = playAudioBlob(blob);
      markPlaybackSource('openai');

      await audio.play();
      return { blob, audio };
    },
    [openaiTtsApiKey, openaiTtsBaseUrl, openaiTtsModel, speed, stop, playAudioBlob, markPlaybackSource],
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
      markPlaybackSource('edge');
      clearEdgeFallback();

      await audio.play();
      return { blob, audio, wordTimestamps: data.words };
    },
    [speed, stop, playAudioBlob, markPlaybackSource, clearEdgeFallback],
  );

  const resolvedPlayback = useMemo(
    () =>
      resolveTTSSource({
        requestedSource: voiceSource,
        hasFishCredentials: Boolean(fishApiKey.trim()),
        hasFishVoice: Boolean(fishVoiceId.trim()),
        hasGoogleCredentials: Boolean(googleApiKey.trim() || googleVoices.length > 0),
        hasGoogleVoice: Boolean(googleVoiceName.trim()),
        hasOpenAICredentials: Boolean(openaiTtsApiKey.trim()),
        hasOpenAIVoice: Boolean(openaiTtsVoice.trim()),
        hasEdgeVoice: Boolean(edgeVoiceId.trim()),
        edgeTemporarilyUnavailable: isEdgeTemporarilyUnavailable,
        edgeTemporarilyUnavailableReason: edgeFallbackReason ?? undefined,
      }),
    [
      voiceSource,
      fishApiKey,
      fishVoiceId,
      googleApiKey,
      googleVoices.length,
      googleVoiceName,
      openaiTtsApiKey,
      openaiTtsVoice,
      edgeVoiceId,
      isEdgeTemporarilyUnavailable,
      edgeFallbackReason,
    ],
  );

  const boundaryPlayback = useMemo(
    () =>
      resolveTTSSource({
        requestedSource: voiceSource,
        hasFishCredentials: Boolean(fishApiKey.trim()),
        hasFishVoice: Boolean(fishVoiceId.trim()),
        hasGoogleCredentials: Boolean(googleApiKey.trim() || googleVoices.length > 0),
        hasGoogleVoice: Boolean(googleVoiceName.trim()),
        hasOpenAICredentials: Boolean(openaiTtsApiKey.trim()),
        hasOpenAIVoice: Boolean(openaiTtsVoice.trim()),
        hasEdgeVoice: Boolean(edgeVoiceId.trim()),
        requiresBoundaryEvents: true,
      }),
    [
      voiceSource,
      fishApiKey,
      fishVoiceId,
      googleApiKey,
      googleVoices.length,
      googleVoiceName,
      openaiTtsApiKey,
      openaiTtsVoice,
      edgeVoiceId,
    ],
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
          return playBrowserSpeech(text, overrides, 'Fish Audio failed. Browser voice is active for stability.');
        }
      }

      if (resolvedPlayback.source === 'google') {
        try {
          return await playGoogleSpeech(text, googleVoiceName, googleLanguageCode, overrides);
        } catch {
          return playBrowserSpeech(text, overrides, 'Google Cloud TTS failed. Browser voice is active for stability.');
        }
      }

      if (resolvedPlayback.source === 'openai') {
        try {
          return await playOpenAISpeech(text, openaiTtsVoice, overrides);
        } catch {
          return playBrowserSpeech(text, overrides, 'OpenAI TTS failed. Browser voice is active for stability.');
        }
      }

      if (resolvedPlayback.source === 'edge') {
        try {
          return await synthesizeEdgeWithAlignment(text, edgeVoiceId, overrides);
        } catch (error) {
          const message =
            error instanceof Error && error.message.includes('timed out')
              ? EDGE_TIMEOUT_MESSAGE
              : EDGE_UNAVAILABLE_MESSAGE;
          activateEdgeFallback(message);
          return playBrowserSpeech(text, overrides, message);
        }
      }

      return playBrowserSpeech(text, overrides, resolvedPlayback.reason ?? null);
    },
    [
      resolvedPlayback.source,
      resolvedPlayback.reason,
      playFishSpeech,
      fishVoiceId,
      playGoogleSpeech,
      googleVoiceName,
      googleLanguageCode,
      playOpenAISpeech,
      openaiTtsVoice,
      synthesizeEdgeWithAlignment,
      edgeVoiceId,
      playBrowserSpeech,
      activateEdgeFallback,
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

      if (voiceSource === 'google') {
        const voice = googleVoices.find((item) => item.voiceURI === uri);
        try {
          await playGoogleSpeech(text, uri, voice?.lang ?? googleLanguageCode);
          return;
        } catch {
          setPreviewingURI(null);
        }
      }

      if (voiceSource === 'openai') {
        try {
          await playOpenAISpeech(text, uri);
          return;
        } catch {
          setPreviewingURI(null);
        }
      }

      if (voiceSource === 'edge') {
        if (isEdgeTemporarilyUnavailable) {
          setPreviewingURI(null);
          playBrowserSpeech(text, undefined, edgeFallbackReason ?? EDGE_UNAVAILABLE_MESSAGE);
          return;
        }
        try {
          await synthesizeEdgeWithAlignment(text, uri);
          return;
        } catch (error) {
          activateEdgeFallback(
            error instanceof Error && error.message.includes('timed out')
              ? EDGE_TIMEOUT_MESSAGE
              : EDGE_UNAVAILABLE_MESSAGE,
          );
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
      utterance.onstart = () => {
        markPlaybackSource('browser');
        setIsSpeaking(true);
      };
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
    [
      voiceSource,
      speed,
      pitch,
      volume,
      playFishSpeech,
      googleVoices,
      playGoogleSpeech,
      googleLanguageCode,
      playOpenAISpeech,
      synthesizeEdgeWithAlignment,
      isEdgeTemporarilyUnavailable,
      edgeFallbackReason,
      playBrowserSpeech,
      activateEdgeFallback,
      markPlaybackSource,
    ],
  );

  const voices = useMemo(() => {
    if (voiceSource === 'fish') return fishVoices;
    if (voiceSource === 'google') return googleVoices;
    if (voiceSource === 'openai') return openaiVoices;
    if (voiceSource === 'edge') return edgeVoices;
    return browserVoices;
  }, [voiceSource, fishVoices, googleVoices, openaiVoices, edgeVoices, browserVoices]);

  const currentVoice = useMemo(() => {
    if (voiceSource === 'fish') {
      return fishVoices.find((voice) => voice.voiceURI === fishVoiceId) ?? null;
    }
    if (voiceSource === 'google') {
      return googleVoices.find((voice) => voice.voiceURI === googleVoiceName) ?? null;
    }
    if (voiceSource === 'openai') {
      return openaiVoices.find((voice) => voice.voiceURI === openaiTtsVoice) ?? null;
    }
    if (voiceSource === 'edge') {
      return edgeVoices.find((voice) => voice.voiceURI === edgeVoiceId) ?? null;
    }
    return browserVoices.find((voice) => voice.voiceURI === voiceURI) ?? null;
  }, [
    voiceSource,
    fishVoices,
    fishVoiceId,
    googleVoices,
    googleVoiceName,
    openaiVoices,
    openaiTtsVoice,
    edgeVoices,
    edgeVoiceId,
    browserVoices,
    voiceURI,
  ]);

  const sourceError =
    voiceSource === 'fish'
      ? fishError
      : voiceSource === 'google'
        ? googleError
        : voiceSource === 'edge'
          ? edgeError
          : null;
  const isSourceLoading =
    voiceSource === 'fish'
      ? isFishLoading
      : voiceSource === 'google'
        ? isGoogleLoading
        : voiceSource === 'edge'
          ? isEdgeLoading
          : false;

  return {
    voices,
    browserVoices,
    fishVoices,
    googleVoices,
    openaiVoices,
    edgeVoices,
    currentVoice,
    isReady: isBrowserReady && !isSourceLoading,
    isSpeaking,
    isFishLoading,
    isGoogleLoading,
    isEdgeLoading,
    fishError,
    googleError,
    edgeError,
    previewingURI,
    voiceSource,
    resolvedVoiceSource: resolvedPlayback.source,
    resolvedVoiceSourceReason: resolvedPlayback.reason ?? sourceError ?? undefined,
    actualPlaybackSource: lastPlaybackSource,
    actualPlaybackSourceReason: lastPlaybackSourceReason ?? undefined,
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

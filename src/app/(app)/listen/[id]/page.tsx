'use client';

import { ArrowLeft, Clock, Ear, Eye, EyeOff, RotateCcw, Type, Volume2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ImmersiveReaderOverlay, ReadAloudContent, ReadAloudInlineControls } from '@/components/read-aloud';
import { CrossModuleNav } from '@/components/shared/cross-module-nav';
import { PageSpinner } from '@/components/shared/page-spinner';
import { PracticeCompleteBanner } from '@/components/shared/practice-complete-banner';
import { RecommendationPanel } from '@/components/shared/recommendation-panel';
import { ShadowReadingProgressBar } from '@/components/shared/shadow-reading-progress-bar';
import { TranslationBar } from '@/components/translation/translation-bar';
import { TranslationDisplay } from '@/components/translation/translation-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { Recommendation } from '@/hooks/use-recommendations';
import { useShortcuts } from '@/hooks/use-shortcuts';
import { useTranslation } from '@/hooks/use-translation';
import { estimateListenDuration, formatDuration, useTTS } from '@/hooks/use-tts';
import { getAlignmentCache, setAlignmentCache } from '@/lib/alignment-cache';
import { savePracticeSession } from '@/lib/daily-plan-progress';
import { db } from '@/lib/db';
import enListenDetail from '@/lib/i18n/messages/listen-detail/en.json';
import zhListenDetail from '@/lib/i18n/messages/listen-detail/zh.json';
import { scoreDictationAttempt } from '@/lib/listen-dictation';
import { estimateSentenceHighlightTimings } from '@/lib/listen-highlight';
import { getListenTranslationDisplayState } from '@/lib/listen-translation';
import { alignPracticeTranslations } from '@/lib/practice-translation';
import {
  attachWordBoundaryTracking,
  getBoundaryWordIndex,
  isSpeechSynthesisUtteranceResult,
} from '@/lib/read-aloud-playback';
import { cn } from '@/lib/utils';
import { resolveWeakSpot, upsertWeakSpot } from '@/lib/weak-spots';
import { fetchAlignment, matchTimestampsToText, WordAlignmentPlayer } from '@/lib/word-alignment';
import { useContentStore } from '@/stores/content-store';
import { useDailyPlanStore } from '@/stores/daily-plan-store';
import { useLanguageStore } from '@/stores/language-store';
import { usePracticeTranslationStore } from '@/stores/practice-translation-store';
import { useReadAloudStore } from '@/stores/read-aloud-store';
import { useShadowReadingStore } from '@/stores/shadow-reading-store';
import { useTTSStore } from '@/stores/tts-store';
import type { ContentItem } from '@/types/content';

const LISTEN_DETAIL_LOCALES = { en: enListenDetail, zh: zhListenDetail } as const;
const LISTEN_MODES = ['normal', 'repeat', 'hide-text', 'dictation'] as const;

type ListenMode = (typeof LISTEN_MODES)[number];

function parseListenMode(value: string | null): ListenMode {
  return LISTEN_MODES.find((mode) => mode === value) ?? 'normal';
}

export default function ListenDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const interfaceLanguage = useLanguageStore((s) => s.interfaceLanguage);
  const t = LISTEN_DETAIL_LOCALES[interfaceLanguage];
  const requestedMode = parseListenMode(searchParams.get('mode'));
  const requestedSentence = searchParams.get('sentence');
  const requestedSentenceIndex =
    requestedSentence && Number.isFinite(Number(requestedSentence)) ? Number(requestedSentence) : null;
  const [content, setContent] = useState<ContentItem | null>(null);
  const [contentNotFound, setContentNotFound] = useState(false);
  const [bootstrapReady, setBootstrapReady] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [listenMode, setListenMode] = useState<ListenMode>(requestedMode);
  const [transcriptRevealed, setTranscriptRevealed] = useState(
    requestedMode === 'normal' || requestedMode === 'repeat',
  );
  const [dictationInput, setDictationInput] = useState('');
  const [dictationResult, setDictationResult] = useState<ReturnType<typeof scoreDictationAttempt> | null>(null);
  const listenStartRef = useRef<number | null>(null);
  const cloudPlaybackStartedRef = useRef(false);
  const cloudShouldPersistCompletionRef = useRef(false);
  const sentenceHighlightTimersRef = useRef<number[]>([]);
  const alignmentPlayerRef = useRef<WordAlignmentPlayer | null>(null);
  const alignmentAbortRef = useRef<AbortController | null>(null);
  const [hasWordAlignment, setHasWordAlignment] = useState(false);
  const {
    createUtterance,
    getAudioElement,
    pause,
    resume,
    stop,
    speak: speakWithSelectedVoice,
    isSpeaking: isTTSPlaying,
    browserVoices,
    currentVoice,
    resolvedVoiceSource,
  } = useTTS();
  const { speed, setSpeed, voiceURI, edgeVoiceName } = useTTSStore();
  const showTranslation = usePracticeTranslationStore((s) => s.visibility.listen);
  const targetLang = useTTSStore((s) => s.targetLang);
  const recommendationsEnabled = useTTSStore((s) => s.recommendationsEnabled);
  const shadowReadingSession = useShadowReadingStore((s) => s.session);
  const markModuleProgress = useShadowReadingStore((s) => s.markModuleProgress);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const isDailyPlanPractice = useDailyPlanStore((s) =>
    s.tasks.some(
      (task) => !task.completed && !task.skipped && task.module === 'listen' && task.contentId === params.id,
    ),
  );
  const { addContent } = useContentStore();

  const raActivate = useReadAloudStore((s) => s.activate);
  const raDeactivate = useReadAloudStore((s) => s.deactivate);
  const raSetPlaying = useReadAloudStore((s) => s.setPlaying);
  const raSetCurrentWordIndex = useReadAloudStore((s) => s.setCurrentWordIndex);
  const raSetWordProgress = useReadAloudStore((s) => s.setWordProgress);
  const raResetProgress = useReadAloudStore((s) => s.resetProgress);
  const raIsPlaying = useReadAloudStore((s) => s.isPlaying);
  const raSentences = useReadAloudStore((s) => s.sentences);
  const currentSentenceIndex = useReadAloudStore((s) => s.currentSentenceIndex);

  const {
    translation,
    sentenceTranslations,
    isLoading: translationLoading,
    error: translationError,
    retry: retryTranslation,
    fetchTranslation,
  } = useTranslation(content?.text || '', targetLang, {
    visible: showTranslation,
    shouldPrefetch: true,
  });

  useEffect(() => {
    if (showTranslation && content?.text) fetchTranslation();
  }, [showTranslation, content?.text, fetchTranslation]);

  const handleRecommendationNavigate = useCallback(
    async (rec: Recommendation) => {
      const now = Date.now();
      const item: ContentItem = {
        id: nanoid(),
        title: rec.title,
        text: rec.text,
        type: rec.type,
        tags: [rec.relation],
        source: 'ai-generated',
        createdAt: now,
        updatedAt: now,
      };
      await addContent(item);
      router.push(`/listen/${item.id}`);
    },
    [addContent, router],
  );

  useEffect(() => {
    useTTSStore.getState().hydrate();
  }, []);

  useEffect(() => {
    const markReady = () => setBootstrapReady(true);
    if (typeof document !== 'undefined' && document.querySelector('[data-seeded="true"]')) {
      setBootstrapReady(true);
    }
    window.addEventListener('echotype:bootstrap-ready', markReady);
    return () => window.removeEventListener('echotype:bootstrap-ready', markReady);
  }, []);

  useEffect(() => {
    const contentId = typeof params.id === 'string' ? params.id : null;
    if (!contentId) {
      setContent(null);
      setContentNotFound(true);
      return;
    }

    const itemFromStore = useContentStore.getState().items.find((item) => item.id === contentId);
    if (itemFromStore) {
      setContent(itemFromStore);
      setContentNotFound(false);
      return;
    }

    setContent((current) => (current?.id === contentId ? current : null));
    setContentNotFound(false);

    let cancelled = false;

    async function load() {
      const item = await db.contents.get(contentId);
      if (cancelled) return;

      if (item) {
        setContent(item);
        setContentNotFound(false);
        return;
      }

      if (bootstrapReady) {
        setContentNotFound(true);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [bootstrapReady, params.id]);

  useEffect(() => {
    if (content?.text) {
      raActivate(content.text);
    }
    return () => {
      raDeactivate();
    };
  }, [content?.text, raActivate, raDeactivate]);

  useEffect(() => {
    setListenMode(requestedMode);
    setTranscriptRevealed(requestedMode === 'normal' || requestedMode === 'repeat');
    setDictationInput('');
    setDictationResult(null);
  }, [requestedMode]);

  useEffect(() => {
    if (requestedSentenceIndex === null) return;
    if (requestedSentenceIndex < 0 || requestedSentenceIndex >= raSentences.length) return;
    raSetCurrentWordIndex(raSentences[requestedSentenceIndex].startWordIndex);
  }, [requestedSentenceIndex, raSentences, raSetCurrentWordIndex]);

  const clearSentenceHighlightTimers = useCallback(() => {
    sentenceHighlightTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    sentenceHighlightTimersRef.current = [];
  }, []);

  const stopAlignmentPlayer = useCallback(() => {
    alignmentPlayerRef.current?.dispose();
    alignmentPlayerRef.current = null;
    alignmentAbortRef.current?.abort();
    alignmentAbortRef.current = null;
    setHasWordAlignment(false);
  }, []);

  useEffect(() => {
    if (shadowReadingSession?.contentId === params.id) {
      markModuleProgress('listen', 'in_progress');
    }
  }, [params.id, shadowReadingSession?.contentId, markModuleProgress]);

  useEffect(() => {
    function handleGlobalStop() {
      raResetProgress();
      stopAlignmentPlayer();
      cloudPlaybackStartedRef.current = false;
    }

    window.addEventListener('echotype:stop-tts', handleGlobalStop);
    return () => window.removeEventListener('echotype:stop-tts', handleGlobalStop);
  }, [raResetProgress, stopAlignmentPlayer]);

  const wordCount = content?.text ? content.text.split(/\s+/).filter(Boolean).length : 0;
  const duration = content ? estimateListenDuration(content.text, speed) : 0;

  const browserVoice = browserVoices.find((voice) => voice.voiceURI === voiceURI);
  const isCloudListenMode =
    resolvedVoiceSource === 'fish' ||
    resolvedVoiceSource === 'google' ||
    resolvedVoiceSource === 'openai' ||
    resolvedVoiceSource === 'edge';
  const cloudSourceLabel =
    resolvedVoiceSource === 'fish'
      ? 'Fish Audio'
      : resolvedVoiceSource === 'google'
        ? 'Google Cloud TTS'
        : resolvedVoiceSource === 'openai'
          ? 'OpenAI TTS'
          : 'Edge TTS';
  const activeListenVoiceName = isCloudListenMode
    ? currentVoice?.name || edgeVoiceName || cloudSourceLabel
    : browserVoice?.name;
  const activeSentenceIndex =
    currentSentenceIndex >= 0
      ? currentSentenceIndex
      : requestedSentenceIndex !== null && requestedSentenceIndex >= 0 && requestedSentenceIndex < raSentences.length
        ? requestedSentenceIndex
        : 0;
  const activeSentence = raSentences[activeSentenceIndex] ?? null;
  const dictationTargetText = activeSentence?.text ?? content?.text ?? '';
  const transcriptVisible = listenMode === 'normal' || listenMode === 'repeat' || transcriptRevealed;
  const translationDisplayState = getListenTranslationDisplayState({
    showTranslation,
    transcriptVisible,
    translationLoading,
    translationError,
    translation,
    sentenceTranslations,
  });

  const updateListenMode = useCallback(
    (nextMode: ListenMode) => {
      if (!content) return;
      setListenMode(nextMode);
      setTranscriptRevealed(nextMode === 'normal' || nextMode === 'repeat');
      setDictationInput('');
      setDictationResult(null);

      const nextParams = new URLSearchParams(searchParams.toString());
      if (nextMode === 'normal') nextParams.delete('mode');
      else nextParams.set('mode', nextMode);

      const query = nextParams.toString();
      router.replace(query ? `/listen/${content.id}?${query}` : `/listen/${content.id}`, { scroll: false });
    },
    [content, router, searchParams],
  );

  const startLazyAlignment = useCallback(
    async (
      blob: Blob,
      audio: HTMLAudioElement,
      text: string,
      contentId: string,
      precomputedTimestamps?: import('@/lib/word-alignment').WordTimestamp[],
    ) => {
      if (precomputedTimestamps && precomputedTimestamps.length > 0) {
        const matched = matchTimestampsToText(precomputedTimestamps, text);
        clearSentenceHighlightTimers();
        const player = new WordAlignmentPlayer(audio, matched, raSetCurrentWordIndex, raSetWordProgress);
        alignmentPlayerRef.current = player;
        player.start();
        setHasWordAlignment(true);

        const {
          voiceSource: vs,
          fishVoiceId: fvId,
          googleVoiceName: gvName,
          openaiTtsVoice: ovId,
          edgeVoiceId: evId,
          speed: spd,
        } = useTTSStore.getState();
        const voiceId = vs === 'fish' ? fvId : vs === 'google' ? gvName : vs === 'openai' ? ovId : evId;
        const duration = audio.duration || matched[matched.length - 1]?.end || 0;
        void setAlignmentCache(contentId, voiceId, spd, matched, duration);
        return;
      }

      const {
        voiceSource: vs,
        fishVoiceId: fvId,
        googleVoiceName: gvName,
        openaiTtsVoice: ovId,
        edgeVoiceId: evId,
        speed: spd,
        groqApiKey,
      } = useTTSStore.getState();
      const voiceId = vs === 'fish' ? fvId : vs === 'google' ? gvName : vs === 'openai' ? ovId : evId;

      const cached = await getAlignmentCache(contentId, voiceId, spd);
      if (cached) {
        clearSentenceHighlightTimers();
        const player = new WordAlignmentPlayer(audio, cached.timestamps, raSetCurrentWordIndex, raSetWordProgress);
        alignmentPlayerRef.current = player;
        player.start();
        setHasWordAlignment(true);
        return;
      }

      const controller = new AbortController();
      alignmentAbortRef.current = controller;

      const result = await fetchAlignment(blob, text, {
        groqApiKey: groqApiKey || undefined,
        signal: controller.signal,
      });

      if (result && !controller.signal.aborted) {
        await setAlignmentCache(contentId, voiceId, spd, result.words, result.duration);
        clearSentenceHighlightTimers();
        const player = new WordAlignmentPlayer(audio, result.words, raSetCurrentWordIndex, raSetWordProgress);
        alignmentPlayerRef.current = player;
        player.start();
        setHasWordAlignment(true);
      }
    },
    [clearSentenceHighlightTimers, raSetCurrentWordIndex, raSetWordProgress],
  );

  const persistListenSession = useCallback(() => {
    if (!content) return;
    const savedWordCount = content.text.split(/\s+/).filter(Boolean).length;
    void savePracticeSession({
      id: nanoid(),
      contentId: content.id,
      module: 'listen',
      startTime: listenStartRef.current || Date.now(),
      endTime: Date.now(),
      totalChars: content.text.length,
      correctChars: 0,
      wrongChars: 0,
      totalWords: savedWordCount,
      wpm: 0,
      accuracy: 0,
      completed: true,
    });
    setSessionCompleted(true);
    if (shadowReadingSession?.contentId === content.id) {
      markModuleProgress('listen', 'completed');
    }
  }, [content, shadowReadingSession?.contentId, markModuleProgress]);

  const speakWithWordHighlight = useCallback(
    (text: string, rate: number) => {
      window.speechSynthesis.cancel();
      const utterance = createUtterance(text, { rate });
      listenStartRef.current = Date.now();

      let wordIdx = 0;
      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          const boundaryWordIndex = getBoundaryWordIndex(text, event.charIndex);
          const nextWordIndex = boundaryWordIndex ?? wordIdx;
          if (nextWordIndex === wordIdx - 1) return;
          wordIdx = nextWordIndex + 1;
          raSetCurrentWordIndex(nextWordIndex);
        }
      };
      utterance.onpause = () => raSetPlaying(false);
      utterance.onresume = () => raSetPlaying(true);
      utterance.onerror = () => raResetProgress();
      utterance.onend = () => {
        raResetProgress();
        persistListenSession();
      };
      window.speechSynthesis.speak(utterance);
      raSetPlaying(true);
    },
    [createUtterance, persistListenSession, raSetCurrentWordIndex, raSetPlaying, raResetProgress],
  );

  const startCloudSentenceHighlight = useCallback(
    (rate: number) => {
      clearSentenceHighlightTimers();
      if (raSentences.length === 0) return;

      const timings = estimateSentenceHighlightTimings(
        raSentences.map((sentence) => ({
          text: sentence.text,
          wordCount: sentence.endWordIndex - sentence.startWordIndex + 1,
        })),
        rate,
      );

      raSetCurrentWordIndex(raSentences[0].startWordIndex);

      timings.forEach((timing, sentenceIndex) => {
        if (sentenceIndex > 0) {
          const timerId = window.setTimeout(() => {
            raSetCurrentWordIndex(raSentences[sentenceIndex].startWordIndex);
          }, timing.startMs);
          sentenceHighlightTimersRef.current.push(timerId);
        }
      });
    },
    [clearSentenceHighlightTimers, raSentences, raSetCurrentWordIndex],
  );

  useEffect(() => {
    if (!isCloudListenMode) return;

    if (isTTSPlaying) {
      cloudPlaybackStartedRef.current = true;
      if (!raIsPlaying) {
        raSetPlaying(true);
      }
      return;
    }

    const audio = getAudioElement();
    if (cloudPlaybackStartedRef.current && audio?.paused && !audio.ended) {
      raSetPlaying(false);
      clearSentenceHighlightTimers();
      return;
    }

    if (raIsPlaying && cloudPlaybackStartedRef.current) {
      raResetProgress();
      clearSentenceHighlightTimers();
      stopAlignmentPlayer();
      if (cloudShouldPersistCompletionRef.current) {
        persistListenSession();
      }
      cloudPlaybackStartedRef.current = false;
      cloudShouldPersistCompletionRef.current = false;
    }
  }, [
    clearSentenceHighlightTimers,
    stopAlignmentPlayer,
    getAudioElement,
    isCloudListenMode,
    raIsPlaying,
    isTTSPlaying,
    persistListenSession,
    raSetPlaying,
    raResetProgress,
  ]);

  useEffect(() => {
    return () => {
      clearSentenceHighlightTimers();
      stopAlignmentPlayer();
    };
  }, [clearSentenceHighlightTimers, stopAlignmentPlayer]);

  const handlePlay = useCallback(() => {
    if (!content) return;
    if (raIsPlaying) {
      const listenedMs = listenStartRef.current ? Date.now() - listenStartRef.current : 0;
      const estimatedDurationMs = estimateListenDuration(content.text, speed) * 1000;
      const listenedEnough = listenedMs > estimatedDurationMs * 0.5;

      if (listenedEnough && !sessionCompleted) {
        persistListenSession();
      }

      cloudShouldPersistCompletionRef.current = false;
      clearSentenceHighlightTimers();
      stopAlignmentPlayer();
      stop();
      raResetProgress();
      cloudPlaybackStartedRef.current = false;
    } else {
      if (window.speechSynthesis.paused || getAudioElement()?.paused) {
        resume();
        alignmentPlayerRef.current?.start();
        raSetPlaying(true);
        return;
      }

      if (isCloudListenMode) {
        listenStartRef.current = Date.now();
        cloudShouldPersistCompletionRef.current = true;
        raSetPlaying(true);
        setTtsError(null);
        cloudPlaybackStartedRef.current = false;

        void (async () => {
          try {
            const result = await speakWithSelectedVoice(content.text, { rate: speed });
            if (isSpeechSynthesisUtteranceResult(result)) {
              raSetCurrentWordIndex(0);
              attachWordBoundaryTracking(result, {
                startWordIndex: 0,
                onWord: raSetCurrentWordIndex,
                onEnd: () => {
                  raResetProgress();
                  persistListenSession();
                },
                onError: () => {
                  raSetPlaying(false);
                  cloudPlaybackStartedRef.current = false;
                },
              });
              return;
            }
            if (result && 'blob' in result && result.blob && result.audio) {
              const wordTimestamps = 'wordTimestamps' in result ? result.wordTimestamps : undefined;
              if (!wordTimestamps?.length) {
                startCloudSentenceHighlight(speed);
              }
              void startLazyAlignment(result.blob, result.audio, content.text, content.id, wordTimestamps);
            }
          } catch {
            clearSentenceHighlightTimers();
            stopAlignmentPlayer();
            raSetPlaying(false);
            cloudPlaybackStartedRef.current = false;
            setTtsError(t.errors.ttsFailed);
          }
        })();
        return;
      }

      speakWithWordHighlight(content.text, speed);
    }
  }, [
    content,
    raIsPlaying,
    speed,
    sessionCompleted,
    persistListenSession,
    clearSentenceHighlightTimers,
    stopAlignmentPlayer,
    stop,
    getAudioElement,
    resume,
    raResetProgress,
    isCloudListenMode,
    raSetPlaying,
    startCloudSentenceHighlight,
    speakWithSelectedVoice,
    speakWithWordHighlight,
    startLazyAlignment,
    t.errors.ttsFailed,
  ]);

  const handlePause = useCallback(() => {
    if (!content || !raIsPlaying) return;
    pause();
    raSetPlaying(false);
  }, [content, raIsPlaying, pause, raSetPlaying]);

  const handleWordClick = useCallback(
    (word: string) => {
      cloudShouldPersistCompletionRef.current = false;
      clearSentenceHighlightTimers();
      stopAlignmentPlayer();
      stop();
      raSetPlaying(false);
      cloudPlaybackStartedRef.current = false;
      if (isCloudListenMode) {
        void speakWithSelectedVoice(word, { rate: speed });
        return;
      }
      const u = createUtterance(word, { rate: speed });
      window.speechSynthesis.speak(u);
    },
    [
      clearSentenceHighlightTimers,
      stopAlignmentPlayer,
      stop,
      raSetPlaying,
      isCloudListenMode,
      speakWithSelectedVoice,
      speed,
      createUtterance,
    ],
  );

  const handleRestart = useCallback(() => {
    if (!content) return;
    cloudShouldPersistCompletionRef.current = false;
    clearSentenceHighlightTimers();
    stopAlignmentPlayer();
    stop();
    raResetProgress();
    cloudPlaybackStartedRef.current = false;
    if (isCloudListenMode) {
      listenStartRef.current = Date.now();
      cloudShouldPersistCompletionRef.current = true;
      raSetPlaying(true);

      void (async () => {
        const result = await speakWithSelectedVoice(content.text, { rate: speed });
        if (isSpeechSynthesisUtteranceResult(result)) {
          raSetCurrentWordIndex(0);
          attachWordBoundaryTracking(result, {
            startWordIndex: 0,
            onWord: raSetCurrentWordIndex,
            onEnd: () => {
              raResetProgress();
              persistListenSession();
            },
            onError: () => {
              raSetPlaying(false);
              cloudPlaybackStartedRef.current = false;
            },
          });
          return;
        }
        if (result && 'blob' in result && result.blob && result.audio) {
          const wordTimestamps = 'wordTimestamps' in result ? result.wordTimestamps : undefined;
          if (!wordTimestamps?.length) {
            startCloudSentenceHighlight(speed);
          }
          void startLazyAlignment(result.blob, result.audio, content.text, content.id, wordTimestamps);
        }
      })();
      return;
    }
    speakWithWordHighlight(content.text, speed);
  }, [
    content,
    clearSentenceHighlightTimers,
    stopAlignmentPlayer,
    stop,
    raResetProgress,
    isCloudListenMode,
    raSetPlaying,
    startCloudSentenceHighlight,
    speed,
    speakWithSelectedVoice,
    speakWithWordHighlight,
    startLazyAlignment,
  ]);

  const playSentenceSegment = useCallback(
    (sentenceText: string, startWordIndex: number) => {
      cloudShouldPersistCompletionRef.current = false;
      clearSentenceHighlightTimers();
      stopAlignmentPlayer();
      stop();
      cloudPlaybackStartedRef.current = false;
      raSetCurrentWordIndex(startWordIndex);

      if (isCloudListenMode) {
        raSetPlaying(true);
        setTtsError(null);
        void speakWithSelectedVoice(sentenceText, { rate: speed })
          .then((result) => {
            if (isSpeechSynthesisUtteranceResult(result)) {
              attachWordBoundaryTracking(result, {
                startWordIndex,
                onWord: raSetCurrentWordIndex,
                onEnd: () => {
                  raSetPlaying(false);
                },
                onError: () => {
                  raSetPlaying(false);
                },
              });
            }
          })
          .catch(() => {
            raSetPlaying(false);
            setTtsError(t.errors.ttsFailed);
          });
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = createUtterance(sentenceText, { rate: speed });
      let wordIdx = startWordIndex;
      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          const boundaryWordIndex = getBoundaryWordIndex(sentenceText, event.charIndex);
          const nextWordIndex = boundaryWordIndex === null ? wordIdx : startWordIndex + boundaryWordIndex;
          if (nextWordIndex === wordIdx - 1) return;
          wordIdx = nextWordIndex + 1;
          raSetCurrentWordIndex(nextWordIndex);
        }
      };
      utterance.onend = () => {
        raSetPlaying(false);
      };
      window.speechSynthesis.speak(utterance);
      raSetPlaying(true);
    },
    [
      clearSentenceHighlightTimers,
      stopAlignmentPlayer,
      stop,
      raSetCurrentWordIndex,
      isCloudListenMode,
      raSetPlaying,
      speakWithSelectedVoice,
      speed,
      createUtterance,
      t.errors.ttsFailed,
    ],
  );

  const handleRepeatSentence = useCallback(() => {
    if (!activeSentence) return;
    playSentenceSegment(activeSentence.text, activeSentence.startWordIndex);
  }, [activeSentence, playSentenceSegment]);

  const handleCheckDictation = useCallback(async () => {
    if (!content || !dictationTargetText.trim()) return;

    const result = scoreDictationAttempt(dictationTargetText, dictationInput);
    setDictationResult(result);

    const totalChars = result.normalizedExpected.length;
    const estimatedCorrectChars = Math.round((totalChars * result.accuracy) / 100);
    const sessionEndedAt = Date.now();

    void savePracticeSession({
      id: nanoid(),
      contentId: content.id,
      module: 'listen',
      startTime: sessionEndedAt - 30000,
      endTime: sessionEndedAt,
      totalChars,
      correctChars: estimatedCorrectChars,
      wrongChars: Math.max(0, totalChars - estimatedCorrectChars),
      totalWords: result.normalizedExpected.split(/\s+/).filter(Boolean).length,
      wpm: 0,
      accuracy: result.accuracy,
      completed: result.passed,
    });

    if (result.passed) {
      setSessionCompleted(true);
      if (shadowReadingSession?.contentId === content.id) {
        markModuleProgress('listen', 'completed');
      }
      void resolveWeakSpot({
        module: 'listen',
        weakSpotType: 'dictation-sentence',
        text: dictationTargetText,
        accuracy: result.accuracy,
      });
      return;
    }

    void upsertWeakSpot({
      module: 'listen',
      weakSpotType: 'dictation-sentence',
      sourceId: content.id,
      sourceType: 'content',
      text: dictationTargetText,
      reason: t.dictation.weakSpotReason.replace('{{accuracy}}', String(result.accuracy)),
      targetHref: `/listen/${content.id}?mode=dictation&sentence=${activeSentenceIndex}`,
      accuracy: result.accuracy,
    }).catch(() => undefined);
  }, [
    activeSentenceIndex,
    content,
    dictationInput,
    dictationTargetText,
    markModuleProgress,
    shadowReadingSession?.contentId,
    t.dictation.weakSpotReason,
  ]);

  const handleReadAloudNext = useCallback(() => {
    if (!content) return;
    const state = useReadAloudStore.getState();
    const { sentences, currentSentenceIndex } = state;
    if (sentences.length === 0) return;
    const nextIdx = Math.min(currentSentenceIndex + 1, sentences.length - 1);
    const nextSentence = sentences[nextIdx];

    playSentenceSegment(nextSentence.text, nextSentence.startWordIndex);
  }, [content, playSentenceSegment]);

  const handleReadAloudPrev = useCallback(() => {
    if (!content) return;
    const state = useReadAloudStore.getState();
    const { sentences, currentSentenceIndex, currentWordIndex } = state;
    if (sentences.length === 0 || currentSentenceIndex < 0) return;

    const currentSentence = sentences[currentSentenceIndex];
    let targetIdx = currentSentenceIndex;
    if (currentSentence && currentWordIndex <= currentSentence.startWordIndex) {
      targetIdx = Math.max(currentSentenceIndex - 1, 0);
    }
    const targetSentence = sentences[targetIdx];

    playSentenceSegment(targetSentence.text, targetSentence.startWordIndex);
  }, [content, playSentenceSegment]);

  const SPEED_STEPS = [0.5, 0.75, 1, 1.25, 1.5];

  const getPreviousSpeedStep = (currentSpeed: number) => {
    const previous = [...SPEED_STEPS].reverse().find((step) => step < currentSpeed);
    return previous ?? SPEED_STEPS[0];
  };

  const getNextSpeedStep = (currentSpeed: number) => {
    const next = SPEED_STEPS.find((step) => step > currentSpeed);
    return next ?? SPEED_STEPS[SPEED_STEPS.length - 1];
  };

  const raToggleImmersive = useReadAloudStore((s) => s.toggleImmersiveMode);

  useShortcuts('listen', {
    'listen:play-pause': handlePlay,
    'listen:restart': handleRestart,
    'listen:toggle-translation': () => usePracticeTranslationStore.getState().toggle('listen'),
    'listen:toggle-immersive': raToggleImmersive,
    'listen:speed-down': () => {
      const nextSpeed = getPreviousSpeedStep(speed);
      if (nextSpeed !== speed) setSpeed(nextSpeed);
    },
    'listen:speed-up': () => {
      const nextSpeed = getNextSpeedStep(speed);
      if (nextSpeed !== speed) setSpeed(nextSpeed);
    },
  });

  if (!content) {
    if (!bootstrapReady) {
      return <PageSpinner size="sm" className="min-h-[40vh]" />;
    }
    if (contentNotFound) {
      return (
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-4 py-16 text-center">
          <h2 className="text-xl font-semibold text-ink-2">{t.notFound.title}</h2>
          <p className="text-sm text-ink-3">{t.notFound.description}</p>
          <Link
            href="/library"
            prefetch={false}
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong transition-colors"
          >
            {t.notFound.goToLibrary}
          </Link>
        </div>
      );
    }
    return <PageSpinner size="sm" className="min-h-[40vh]" />;
  }

  return (
    <div className={cn('max-w-4xl mx-auto space-y-5')}>
      {/* Header */}

      <div className="flex items-center gap-3">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="text-ink-3 hover:text-ink-2 hover:bg-surface-3 cursor-pointer rounded-xl"
        >
          <Link href="/listen" prefetch={false} aria-label={interfaceLanguage === 'zh' ? '返回听力' : 'Back to Listen'}>
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg md:text-xl font-bold font-display text-ink truncate">{content.title}</h1>
          <div className="flex items-center gap-2 md:gap-4 mt-0.5 text-xs text-ink-4 flex-wrap">
            <span className="flex items-center gap-1">
              <Type className="w-3.5 h-3.5" />
              {t.header.words.replace('{{count}}', String(wordCount))}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />~{formatDuration(duration)}
            </span>
            {activeListenVoiceName && (
              <span className="flex items-center gap-1 hidden sm:flex">
                <Volume2 className="w-3.5 h-3.5" />
                {activeListenVoiceName}
              </span>
            )}
          </div>
        </div>
        {shadowReadingSession?.contentId === content.id ? (
          <ShadowReadingProgressBar contentId={content.id} currentModule="listen" showSpeakHint speakHref="/speak" />
        ) : (
          <CrossModuleNav contentId={content.id} currentModule="listen" />
        )}
        <TranslationBar module="listen" />
      </div>

      <Card className={cn('bg-surface border-line shadow-sm')}>
        <CardContent className="p-4 md:p-6 space-y-4 md:space-y-5">
          <div className={cn('space-y-3 rounded-2xl p-3 md:p-4', 'border border-line bg-brand-soft/70')}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-ink">{t.modes.title}</p>
                <p className="text-xs text-brand-ink">{t.modes[listenMode].description}</p>
              </div>
              <div className={cn('rounded-full px-3 py-1 text-xs font-medium', 'bg-surface text-brand-ink')}>
                {t.modes[listenMode].label}
              </div>
            </div>

            <Tabs value={listenMode} onValueChange={(value) => updateListenMode(value as ListenMode)}>
              <TabsList
                className={cn(
                  'grid h-auto w-full grid-cols-2 gap-2 p-1 md:grid-cols-4 group-data-[orientation=horizontal]/tabs:h-auto',
                  'bg-surface',
                )}
              >
                {LISTEN_MODES.map((mode) => (
                  <TabsTrigger key={mode} value={mode} className="cursor-pointer">
                    {t.modes[mode].label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {ttsError && (
            <div className="rounded-xl border border-danger-line bg-danger-soft px-4 py-3 text-sm text-danger-ink">
              {ttsError}
            </div>
          )}

          <ReadAloudInlineControls
            label="Listen controls"
            onPlay={handlePlay}
            onPause={handlePause}
            onNext={handleReadAloudNext}
            onPrev={handleReadAloudPrev}
            onRestart={handleRestart}
          />

          {listenMode === 'repeat' && activeSentence && (
            <div className={cn('rounded-2xl border p-4', 'border-success-line bg-success-soft/80')}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-success-ink">{t.repeat.title}</p>
                  <p className="text-xs text-success-ink">
                    {t.repeat.sentenceLabel
                      .replace('{{current}}', String(activeSentenceIndex + 1))
                      .replace('{{total}}', String(raSentences.length || 1))}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRepeatSentence}
                  className="border-success-line bg-surface text-success-ink hover:bg-success-soft"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t.repeat.cta}
                </Button>
              </div>
            </div>
          )}

          {listenMode === 'hide-text' && (
            <div className="rounded-2xl border border-line bg-surface-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-ink">{t.hidden.title}</p>
                  <p className="text-xs text-ink-3">{t.hidden.description}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTranscriptRevealed((value) => !value)}
                  className="border-line bg-surface"
                >
                  {transcriptRevealed ? (
                    <>
                      <EyeOff className="mr-2 h-4 w-4" />
                      {t.hidden.hide}
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      {t.hidden.reveal}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {listenMode === 'dictation' && (
            <div
              className={cn('space-y-4 rounded-2xl border p-4', 'border-warning-line bg-warning-soft/80')}
              data-testid="listen-dictation-panel"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-warning-ink">{t.dictation.title}</p>
                  <p className="text-xs text-warning-ink">
                    {t.dictation.sentenceLabel
                      .replace('{{current}}', String(activeSentenceIndex + 1))
                      .replace('{{total}}', String(raSentences.length || 1))}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRepeatSentence}
                    className="border-warning-line bg-surface text-warning-ink hover:bg-warning-soft"
                  >
                    <Ear className="mr-2 h-4 w-4" />
                    {t.dictation.replay}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTranscriptRevealed((value) => !value)}
                    className="border-warning-line bg-surface text-warning-ink hover:bg-warning-soft"
                  >
                    {transcriptRevealed ? (
                      <>
                        <EyeOff className="mr-2 h-4 w-4" />
                        {t.hidden.hide}
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        {t.dictation.reveal}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Textarea
                value={dictationInput}
                onChange={(event) => setDictationInput(event.target.value)}
                placeholder={t.dictation.placeholder}
                aria-label={t.dictation.placeholder}
                className={cn('min-h-32 bg-surface')}
                data-testid="listen-dictation-input"
              />

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" onClick={() => void handleCheckDictation()} disabled={!dictationInput.trim()}>
                  {t.dictation.check}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDictationInput('');
                    setDictationResult(null);
                  }}
                >
                  {t.dictation.clear}
                </Button>
              </div>

              {dictationResult && (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    dictationResult.passed
                      ? 'border-success-line bg-success-soft text-success-ink'
                      : 'border-danger-line bg-danger-soft text-danger-ink'
                  }`}
                  data-testid="listen-dictation-result"
                >
                  <p className="font-medium">
                    {dictationResult.passed ? t.dictation.pass : t.dictation.retry}{' '}
                    {t.dictation.accuracy.replace('{{accuracy}}', String(dictationResult.accuracy))}
                  </p>
                  {!dictationResult.passed && <p className="mt-1 text-xs text-danger">{t.dictation.failedHint}</p>}
                </div>
              )}

              {transcriptRevealed && (
                <div className="rounded-xl border border-warning-line bg-surface px-4 py-3">
                  <p className="text-xs font-medium text-warning">{t.dictation.answer}</p>
                  <p className="mt-2 text-sm leading-7 text-ink-2">{dictationTargetText}</p>
                </div>
              )}
            </div>
          )}

          {transcriptVisible ? (
            <div
              data-testid="listen-content-text"
              className={cn(
                'max-h-[52dvh] min-h-64 overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface p-4 md:p-5',
              )}
            >
              <ReadAloudContent
                text={content.text}
                onWordClick={handleWordClick}
                showTranslation={!!translationDisplayState?.sentenceTranslations?.length}
                sentenceTranslations={alignPracticeTranslations(
                  content.text,
                  translationDisplayState?.sentenceTranslations,
                )}
              />
              {translationDisplayState && (
                <TranslationDisplay
                  translation={
                    translationDisplayState.sentenceTranslations?.length ? null : translationDisplayState.translation
                  }
                  isLoading={translationDisplayState.isLoading}
                  show={true}
                  error={translationDisplayState.error}
                  onRetry={retryTranslation}
                />
              )}
            </div>
          ) : (
            <div
              className="rounded-2xl border border-dashed border-line bg-surface-2 px-6 py-10 text-center"
              data-testid="listen-hidden-transcript"
            >
              <p className="text-sm font-medium text-ink-2">{t.hidden.transcriptHidden}</p>
              <p className="mt-2 text-xs text-ink-3">{t.hidden.keepListening}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <ImmersiveReaderOverlay
        text={content.text}
        onPlay={handlePlay}
        onPause={handlePause}
        onNext={handleReadAloudNext}
        onPrev={handleReadAloudPrev}
        onWordClick={handleWordClick}
      />

      {sessionCompleted && isDailyPlanPractice && <PracticeCompleteBanner module="listen" />}

      {recommendationsEnabled && <RecommendationPanel content={content} onNavigate={handleRecommendationNavigate} />}
    </div>
  );
}

'use client';

import { ArrowLeft, Clock, Ear, Eye, EyeOff, RotateCcw, Type, Volume2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ImmersiveReaderOverlay, ReadAloudContent, ReadAloudFloatingBar } from '@/components/read-aloud';
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
import { resolveWeakSpot, upsertWeakSpot } from '@/lib/weak-spots';
import { fetchAlignment, matchTimestampsToText, WordAlignmentPlayer } from '@/lib/word-alignment';
import { useContentStore } from '@/stores/content-store';
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
  const t = LISTEN_DETAIL_LOCALES[useLanguageStore((s) => s.interfaceLanguage)];
  const requestedMode = parseListenMode(searchParams.get('mode'));
  const requestedSentence = searchParams.get('sentence');
  const requestedSentenceIndex =
    requestedSentence && Number.isFinite(Number(requestedSentence)) ? Number(requestedSentence) : null;
  const [content, setContent] = useState<ContentItem | null>(null);
  const [contentNotFound, setContentNotFound] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [listenMode, setListenMode] = useState<ListenMode>(requestedMode);
  const [transcriptRevealed, setTranscriptRevealed] = useState(
    requestedMode === 'normal' || requestedMode === 'repeat',
  );
  const [dictationInput, setDictationInput] = useState('');
  const [dictationResult, setDictationResult] = useState<ReturnType<typeof scoreDictationAttempt> | null>(null);
  const listenStartRef = useRef<number | null>(null);
  const kokoroPlaybackStartedRef = useRef(false);
  const kokoroShouldPersistCompletionRef = useRef(false);
  const sentenceHighlightTimersRef = useRef<number[]>([]);
  const alignmentPlayerRef = useRef<WordAlignmentPlayer | null>(null);
  const alignmentAbortRef = useRef<AbortController | null>(null);
  const [hasWordAlignment, setHasWordAlignment] = useState(false);
  const {
    createUtterance,
    stop,
    speak: speakWithSelectedVoice,
    isSpeaking: isTTSPlaying,
    browserVoices,
    currentVoice,
    boundaryPlaybackNotice,
    voiceSource,
  } = useTTS();
  const { speed, setSpeed, voiceURI, kokoroVoiceName } = useTTSStore();
  const showTranslation = usePracticeTranslationStore((s) => s.visibility.listen);
  const targetLang = useTTSStore((s) => s.targetLang);
  const recommendationsEnabled = useTTSStore((s) => s.recommendationsEnabled);
  const shadowReadingSession = useShadowReadingStore((s) => s.session);
  const markModuleProgress = useShadowReadingStore((s) => s.markModuleProgress);
  const [sessionCompleted, setSessionCompleted] = useState(false);
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
    async function load() {
      const item = await db.contents.get(params.id as string);
      if (item) setContent(item);
      else setContentNotFound(true);
    }
    load();
  }, [params.id]);

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
      kokoroPlaybackStartedRef.current = false;
    }

    window.addEventListener('echotype:stop-tts', handleGlobalStop);
    return () => window.removeEventListener('echotype:stop-tts', handleGlobalStop);
  }, [raResetProgress, stopAlignmentPlayer]);

  const wordCount = content?.text ? content.text.split(/\s+/).filter(Boolean).length : 0;
  const duration = content ? estimateListenDuration(content.text, speed) : 0;

  const browserVoice = browserVoices.find((voice) => voice.voiceURI === voiceURI);
  const isCloudListenMode = voiceSource === 'kokoro' || voiceSource === 'fish' || voiceSource === 'edge';
  const cloudSourceLabel = voiceSource === 'fish' ? 'Fish Audio' : voiceSource === 'edge' ? 'Edge TTS' : 'Kokoro';
  const activeListenVoiceName = isCloudListenMode
    ? currentVoice?.name || kokoroVoiceName || cloudSourceLabel
    : browserVoice?.name;
  const playbackNotice =
    isCloudListenMode && !hasWordAlignment
      ? t.header.cloudPlaybackNotice.replace('{{source}}', cloudSourceLabel)
      : isCloudListenMode
        ? null
        : boundaryPlaybackNotice;
  const activeSentenceIndex =
    currentSentenceIndex >= 0
      ? currentSentenceIndex
      : requestedSentenceIndex !== null && requestedSentenceIndex >= 0 && requestedSentenceIndex < raSentences.length
        ? requestedSentenceIndex
        : 0;
  const activeSentence = raSentences[activeSentenceIndex] ?? null;
  const dictationTargetText = activeSentence?.text ?? content?.text ?? '';
  const transcriptVisible = listenMode === 'normal' || listenMode === 'repeat' || transcriptRevealed;

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
          kokoroVoiceId: kvId,
          edgeVoiceId: evId,
          speed: spd,
        } = useTTSStore.getState();
        const voiceId = vs === 'fish' ? fvId : vs === 'kokoro' ? kvId : evId;
        const duration = audio.duration || matched[matched.length - 1]?.end || 0;
        void setAlignmentCache(contentId, voiceId, spd, matched, duration);
        return;
      }

      const {
        voiceSource: vs,
        fishVoiceId: fvId,
        kokoroVoiceId: kvId,
        edgeVoiceId: evId,
        speed: spd,
        groqApiKey,
      } = useTTSStore.getState();
      const voiceId = vs === 'fish' ? fvId : vs === 'kokoro' ? kvId : evId;

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
          raSetCurrentWordIndex(wordIdx);
          wordIdx++;
        }
      };
      utterance.onend = () => {
        raResetProgress();
        persistListenSession();
      };
      window.speechSynthesis.speak(utterance);
      raSetPlaying(true);
    },
    [createUtterance, persistListenSession, raSetCurrentWordIndex, raSetPlaying, raResetProgress],
  );

  const startKokoroSentenceHighlight = useCallback(
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
      kokoroPlaybackStartedRef.current = true;
      if (!raIsPlaying) {
        raSetPlaying(true);
      }
      return;
    }

    if (raIsPlaying && kokoroPlaybackStartedRef.current) {
      raResetProgress();
      clearSentenceHighlightTimers();
      stopAlignmentPlayer();
      if (kokoroShouldPersistCompletionRef.current) {
        persistListenSession();
      }
      kokoroPlaybackStartedRef.current = false;
      kokoroShouldPersistCompletionRef.current = false;
    }
  }, [
    clearSentenceHighlightTimers,
    stopAlignmentPlayer,
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

      kokoroShouldPersistCompletionRef.current = false;
      clearSentenceHighlightTimers();
      stopAlignmentPlayer();
      stop();
      raResetProgress();
      kokoroPlaybackStartedRef.current = false;
    } else {
      if (isCloudListenMode) {
        listenStartRef.current = Date.now();
        kokoroShouldPersistCompletionRef.current = true;
        raSetPlaying(true);
        setTtsError(null);
        startKokoroSentenceHighlight(speed);
        kokoroPlaybackStartedRef.current = false;

        void (async () => {
          try {
            const result = await speakWithSelectedVoice(content.text, { rate: speed });
            if (result && 'blob' in result && result.blob && result.audio) {
              const wordTimestamps = 'wordTimestamps' in result ? result.wordTimestamps : undefined;
              void startLazyAlignment(result.blob, result.audio, content.text, content.id, wordTimestamps);
            }
          } catch {
            clearSentenceHighlightTimers();
            stopAlignmentPlayer();
            raSetPlaying(false);
            kokoroPlaybackStartedRef.current = false;
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
    raResetProgress,
    isCloudListenMode,
    raSetPlaying,
    startKokoroSentenceHighlight,
    speakWithSelectedVoice,
    speakWithWordHighlight,
    startLazyAlignment,
    t.errors.ttsFailed,
  ]);

  const handlePause = useCallback(() => {
    if (!content || !raIsPlaying) return;
    kokoroShouldPersistCompletionRef.current = false;
    clearSentenceHighlightTimers();
    stopAlignmentPlayer();
    stop();
    raSetPlaying(false);
    kokoroPlaybackStartedRef.current = false;
  }, [content, raIsPlaying, clearSentenceHighlightTimers, stopAlignmentPlayer, stop, raSetPlaying]);

  const handleWordClick = useCallback(
    (word: string) => {
      kokoroShouldPersistCompletionRef.current = false;
      clearSentenceHighlightTimers();
      stopAlignmentPlayer();
      stop();
      raSetPlaying(false);
      kokoroPlaybackStartedRef.current = false;
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
    kokoroShouldPersistCompletionRef.current = false;
    clearSentenceHighlightTimers();
    stopAlignmentPlayer();
    stop();
    raResetProgress();
    kokoroPlaybackStartedRef.current = false;
    if (isCloudListenMode) {
      listenStartRef.current = Date.now();
      kokoroShouldPersistCompletionRef.current = true;
      raSetPlaying(true);
      startKokoroSentenceHighlight(speed);

      void (async () => {
        const result = await speakWithSelectedVoice(content.text, { rate: speed });
        if (result && 'blob' in result && result.blob && result.audio) {
          const wordTimestamps = 'wordTimestamps' in result ? result.wordTimestamps : undefined;
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
    startKokoroSentenceHighlight,
    speed,
    speakWithSelectedVoice,
    speakWithWordHighlight,
    startLazyAlignment,
  ]);

  const playSentenceSegment = useCallback(
    (sentenceText: string, startWordIndex: number) => {
      kokoroShouldPersistCompletionRef.current = false;
      clearSentenceHighlightTimers();
      stopAlignmentPlayer();
      stop();
      kokoroPlaybackStartedRef.current = false;
      raSetCurrentWordIndex(startWordIndex);

      if (isCloudListenMode) {
        raSetPlaying(true);
        setTtsError(null);
        void speakWithSelectedVoice(sentenceText, { rate: speed }).catch(() => {
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
          raSetCurrentWordIndex(wordIdx);
          wordIdx++;
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

  const handleFloatingNext = useCallback(() => {
    if (!content) return;
    const state = useReadAloudStore.getState();
    const { sentences, currentSentenceIndex } = state;
    if (sentences.length === 0) return;
    const nextIdx = Math.min(currentSentenceIndex + 1, sentences.length - 1);
    const nextSentence = sentences[nextIdx];

    playSentenceSegment(nextSentence.text, nextSentence.startWordIndex);
  }, [content, playSentenceSegment]);

  const handleFloatingPrev = useCallback(() => {
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
    if (contentNotFound) {
      return (
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-4 py-16 text-center">
          <h2 className="text-xl font-semibold text-slate-700">{t.notFound.title}</h2>
          <p className="text-sm text-slate-500">{t.notFound.description}</p>
          <Link
            href="/library"
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            {t.notFound.goToLibrary}
          </Link>
        </div>
      );
    }
    return <PageSpinner size="sm" className="min-h-[40vh]" />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 pr-16">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/listen">
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 cursor-pointer rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg md:text-xl font-bold font-[var(--font-poppins)] text-slate-900 truncate">
            {content.title}
          </h1>
          <div className="flex items-center gap-2 md:gap-4 mt-0.5 text-xs text-slate-400 flex-wrap">
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

      <Card className="bg-white border-slate-100 shadow-sm">
        <CardContent className="p-4 md:p-6 space-y-4 md:space-y-5">
          <div className="space-y-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3 md:p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-indigo-900">{t.modes.title}</p>
                <p className="text-xs text-indigo-500">{t.modes[listenMode].description}</p>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-indigo-600">
                {t.modes[listenMode].label}
              </div>
            </div>

            <Tabs value={listenMode} onValueChange={(value) => updateListenMode(value as ListenMode)}>
              <TabsList className="grid w-full grid-cols-2 gap-2 bg-white p-1 md:grid-cols-4">
                {LISTEN_MODES.map((mode) => (
                  <TabsTrigger key={mode} value={mode} className="cursor-pointer">
                    {t.modes[mode].label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {ttsError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{ttsError}</div>
          )}

          {playbackNotice && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {playbackNotice}
            </div>
          )}

          {listenMode === 'repeat' && activeSentence && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-emerald-900">{t.repeat.title}</p>
                  <p className="text-xs text-emerald-700">
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
                  className="border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-100"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t.repeat.cta}
                </Button>
              </div>
            </div>
          )}

          {listenMode === 'hide-text' && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">{t.hidden.title}</p>
                  <p className="text-xs text-slate-500">{t.hidden.description}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTranscriptRevealed((value) => !value)}
                  className="border-slate-200 bg-white"
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
              className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4"
              data-testid="listen-dictation-panel"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-amber-900">{t.dictation.title}</p>
                  <p className="text-xs text-amber-700">
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
                    className="border-amber-200 bg-white text-amber-800 hover:bg-amber-100"
                  >
                    <Ear className="mr-2 h-4 w-4" />
                    {t.dictation.replay}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTranscriptRevealed((value) => !value)}
                    className="border-amber-200 bg-white text-amber-800 hover:bg-amber-100"
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
                className="min-h-32 bg-white"
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
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                  data-testid="listen-dictation-result"
                >
                  <p className="font-medium">
                    {dictationResult.passed ? t.dictation.pass : t.dictation.retry}{' '}
                    {t.dictation.accuracy.replace('{{accuracy}}', String(dictationResult.accuracy))}
                  </p>
                  {!dictationResult.passed && <p className="mt-1 text-xs text-red-600">{t.dictation.failedHint}</p>}
                </div>
              )}

              {transcriptRevealed && (
                <div className="rounded-xl border border-amber-200 bg-white px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-amber-500">{t.dictation.answer}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{dictationTargetText}</p>
                </div>
              )}
            </div>
          )}

          {transcriptVisible ? (
            <div data-testid="listen-content-text">
              <ReadAloudContent text={content.text} onWordClick={handleWordClick} />
            </div>
          ) : (
            <div
              className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center"
              data-testid="listen-hidden-transcript"
            >
              <p className="text-sm font-medium text-slate-700">{t.hidden.transcriptHidden}</p>
              <p className="mt-2 text-xs text-slate-500">{t.hidden.keepListening}</p>
            </div>
          )}

          {showTranslation && transcriptVisible && translationError && !translationLoading && (
            <TranslationDisplay
              translation={null}
              isLoading={false}
              show={true}
              error={translationError}
              onRetry={retryTranslation}
            />
          )}
        </CardContent>
      </Card>

      <ReadAloudFloatingBar
        onPlay={handlePlay}
        onPause={handlePause}
        onNext={handleFloatingNext}
        onPrev={handleFloatingPrev}
        onRestart={handleRestart}
      />

      <ImmersiveReaderOverlay
        text={content.text}
        onPlay={handlePlay}
        onPause={handlePause}
        onNext={handleFloatingNext}
        onPrev={handleFloatingPrev}
        onWordClick={handleWordClick}
      />

      {sessionCompleted && <PracticeCompleteBanner module="listen" />}

      {recommendationsEnabled && <RecommendationPanel content={content} onNavigate={handleRecommendationNavigate} />}
    </div>
  );
}

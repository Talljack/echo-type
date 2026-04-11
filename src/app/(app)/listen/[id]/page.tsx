'use client';

import { ArrowLeft, Clock, Type, Volume2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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
import type { Recommendation } from '@/hooks/use-recommendations';
import { useShortcuts } from '@/hooks/use-shortcuts';
import { useTranslation } from '@/hooks/use-translation';
import { estimateListenDuration, formatDuration, useTTS } from '@/hooks/use-tts';
import { getAlignmentCache, setAlignmentCache } from '@/lib/alignment-cache';
import { savePracticeSession } from '@/lib/daily-plan-progress';
import { db } from '@/lib/db';
import enListenDetail from '@/lib/i18n/messages/listen-detail/en.json';
import zhListenDetail from '@/lib/i18n/messages/listen-detail/zh.json';
import { estimateSentenceHighlightTimings } from '@/lib/listen-highlight';
import { fetchAlignment, matchTimestampsToText, WordAlignmentPlayer } from '@/lib/word-alignment';
import { useContentStore } from '@/stores/content-store';
import { useLanguageStore } from '@/stores/language-store';
import { usePracticeTranslationStore } from '@/stores/practice-translation-store';
import { useReadAloudStore } from '@/stores/read-aloud-store';
import { useShadowReadingStore } from '@/stores/shadow-reading-store';
import { useTTSStore } from '@/stores/tts-store';
import type { ContentItem } from '@/types/content';

const LISTEN_DETAIL_LOCALES = { en: enListenDetail, zh: zhListenDetail } as const;

export default function ListenDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = LISTEN_DETAIL_LOCALES[useLanguageStore((s) => s.interfaceLanguage)];
  const [content, setContent] = useState<ContentItem | null>(null);
  const [contentNotFound, setContentNotFound] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
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

  const handleFloatingNext = useCallback(() => {
    if (!content) return;
    const state = useReadAloudStore.getState();
    const { sentences, currentSentenceIndex } = state;
    if (sentences.length === 0) return;
    const nextIdx = Math.min(currentSentenceIndex + 1, sentences.length - 1);
    const nextSentence = sentences[nextIdx];

    clearSentenceHighlightTimers();
    stopAlignmentPlayer();
    stop();
    kokoroPlaybackStartedRef.current = false;

    const sentenceText = nextSentence.text;
    raSetCurrentWordIndex(nextSentence.startWordIndex);

    if (isCloudListenMode) {
      raSetPlaying(true);
      void speakWithSelectedVoice(sentenceText, { rate: speed });
    } else {
      window.speechSynthesis.cancel();
      const utterance = createUtterance(sentenceText, { rate: speed });
      let wordIdx = nextSentence.startWordIndex;
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
    }
  }, [
    content,
    clearSentenceHighlightTimers,
    stopAlignmentPlayer,
    stop,
    raSetCurrentWordIndex,
    isCloudListenMode,
    raSetPlaying,
    speakWithSelectedVoice,
    speed,
    createUtterance,
  ]);

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

    clearSentenceHighlightTimers();
    stopAlignmentPlayer();
    stop();
    kokoroPlaybackStartedRef.current = false;

    const sentenceText = targetSentence.text;
    raSetCurrentWordIndex(targetSentence.startWordIndex);

    if (isCloudListenMode) {
      raSetPlaying(true);
      void speakWithSelectedVoice(sentenceText, { rate: speed });
    } else {
      window.speechSynthesis.cancel();
      const utterance = createUtterance(sentenceText, { rate: speed });
      let wordIdx = targetSentence.startWordIndex;
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
    }
  }, [
    content,
    clearSentenceHighlightTimers,
    stopAlignmentPlayer,
    stop,
    raSetCurrentWordIndex,
    isCloudListenMode,
    raSetPlaying,
    speakWithSelectedVoice,
    speed,
    createUtterance,
  ]);

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
          {ttsError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{ttsError}</div>
          )}

          {playbackNotice && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {playbackNotice}
            </div>
          )}

          <ReadAloudContent text={content.text} onWordClick={handleWordClick} />

          {showTranslation && translationError && !translationLoading && (
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

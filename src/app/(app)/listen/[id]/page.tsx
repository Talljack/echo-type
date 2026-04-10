'use client';

import { ArrowLeft, Clock, Type, Volume2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ReadAloudContent, ReadAloudFloatingBar } from '@/components/read-aloud';
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
import { savePracticeSession } from '@/lib/daily-plan-progress';
import { db } from '@/lib/db';
import { estimateSentenceHighlightTimings } from '@/lib/listen-highlight';
import { useContentStore } from '@/stores/content-store';
import { usePracticeTranslationStore } from '@/stores/practice-translation-store';
import { useReadAloudStore } from '@/stores/read-aloud-store';
import { useShadowReadingStore } from '@/stores/shadow-reading-store';
import { useTTSStore } from '@/stores/tts-store';
import type { ContentItem } from '@/types/content';

export default function ListenDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [content, setContent] = useState<ContentItem | null>(null);
  const listenStartRef = useRef<number | null>(null);
  const kokoroPlaybackStartedRef = useRef(false);
  const kokoroShouldPersistCompletionRef = useRef(false);
  const sentenceHighlightTimersRef = useRef<number[]>([]);
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
    if (shadowReadingSession?.contentId === params.id) {
      markModuleProgress('listen', 'in_progress');
    }
  }, [params.id, shadowReadingSession?.contentId, markModuleProgress]);

  useEffect(() => {
    function handleGlobalStop() {
      raResetProgress();
      kokoroPlaybackStartedRef.current = false;
    }

    window.addEventListener('echotype:stop-tts', handleGlobalStop);
    return () => window.removeEventListener('echotype:stop-tts', handleGlobalStop);
  }, [raResetProgress]);

  const wordCount = content?.text ? content.text.split(/\s+/).filter(Boolean).length : 0;
  const duration = content ? estimateListenDuration(content.text, speed) : 0;

  const browserVoice = browserVoices.find((voice) => voice.voiceURI === voiceURI);
  const isKokoroListenMode = voiceSource === 'kokoro';
  const activeListenVoiceName = isKokoroListenMode
    ? currentVoice?.name || kokoroVoiceName || 'Kokoro'
    : browserVoice?.name;
  const playbackNotice = isKokoroListenMode
    ? 'Kokoro playback is active on this page. The page estimates sentence timing for sentence-level highlighting, so it will feel less precise than browser word highlighting.'
    : boundaryPlaybackNotice;

  const clearSentenceHighlightTimers = useCallback(() => {
    sentenceHighlightTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    sentenceHighlightTimersRef.current = [];
  }, []);

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
    if (!isKokoroListenMode) return;

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
      if (kokoroShouldPersistCompletionRef.current) {
        persistListenSession();
      }
      kokoroPlaybackStartedRef.current = false;
      kokoroShouldPersistCompletionRef.current = false;
    }
  }, [
    clearSentenceHighlightTimers,
    isKokoroListenMode,
    raIsPlaying,
    isTTSPlaying,
    persistListenSession,
    raSetPlaying,
    raResetProgress,
  ]);

  useEffect(() => {
    return () => clearSentenceHighlightTimers();
  }, [clearSentenceHighlightTimers]);

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
      stop();
      raResetProgress();
      kokoroPlaybackStartedRef.current = false;
    } else {
      if (isKokoroListenMode) {
        listenStartRef.current = Date.now();
        kokoroShouldPersistCompletionRef.current = true;
        raSetPlaying(true);
        startKokoroSentenceHighlight(speed);
        kokoroPlaybackStartedRef.current = false;
        void speakWithSelectedVoice(content.text, { rate: speed });
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
    stop,
    raResetProgress,
    isKokoroListenMode,
    raSetPlaying,
    startKokoroSentenceHighlight,
    speakWithSelectedVoice,
    speakWithWordHighlight,
  ]);

  const handlePause = useCallback(() => {
    if (!content || !raIsPlaying) return;
    kokoroShouldPersistCompletionRef.current = false;
    clearSentenceHighlightTimers();
    stop();
    raSetPlaying(false);
    kokoroPlaybackStartedRef.current = false;
  }, [content, raIsPlaying, clearSentenceHighlightTimers, stop, raSetPlaying]);

  const handleWordClick = useCallback(
    (word: string) => {
      kokoroShouldPersistCompletionRef.current = false;
      clearSentenceHighlightTimers();
      stop();
      raSetPlaying(false);
      kokoroPlaybackStartedRef.current = false;
      if (isKokoroListenMode) {
        void speakWithSelectedVoice(word, { rate: speed });
        return;
      }
      const u = createUtterance(word, { rate: speed });
      window.speechSynthesis.speak(u);
    },
    [
      clearSentenceHighlightTimers,
      stop,
      raSetPlaying,
      isKokoroListenMode,
      speakWithSelectedVoice,
      speed,
      createUtterance,
    ],
  );

  const handleRestart = useCallback(() => {
    if (!content) return;
    kokoroShouldPersistCompletionRef.current = false;
    clearSentenceHighlightTimers();
    stop();
    raResetProgress();
    kokoroPlaybackStartedRef.current = false;
    if (isKokoroListenMode) {
      listenStartRef.current = Date.now();
      kokoroShouldPersistCompletionRef.current = true;
      raSetPlaying(true);
      startKokoroSentenceHighlight(speed);
      void speakWithSelectedVoice(content.text, { rate: speed });
      return;
    }
    speakWithWordHighlight(content.text, speed);
  }, [
    content,
    clearSentenceHighlightTimers,
    stop,
    raResetProgress,
    isKokoroListenMode,
    raSetPlaying,
    startKokoroSentenceHighlight,
    speed,
    speakWithSelectedVoice,
    speakWithWordHighlight,
  ]);

  const handleFloatingNext = useCallback(() => {
    if (!content) return;
    const state = useReadAloudStore.getState();
    const { sentences, currentSentenceIndex } = state;
    if (sentences.length === 0) return;
    const nextIdx = Math.min(currentSentenceIndex + 1, sentences.length - 1);
    const nextSentence = sentences[nextIdx];

    clearSentenceHighlightTimers();
    stop();
    kokoroPlaybackStartedRef.current = false;

    const sentenceText = nextSentence.text;
    raSetCurrentWordIndex(nextSentence.startWordIndex);

    if (isKokoroListenMode) {
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
    stop,
    raSetCurrentWordIndex,
    isKokoroListenMode,
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
    stop();
    kokoroPlaybackStartedRef.current = false;

    const sentenceText = targetSentence.text;
    raSetCurrentWordIndex(targetSentence.startWordIndex);

    if (isKokoroListenMode) {
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
    stop,
    raSetCurrentWordIndex,
    isKokoroListenMode,
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

  useShortcuts('listen', {
    'listen:play-pause': handlePlay,
    'listen:restart': handleRestart,
    'listen:toggle-translation': () => usePracticeTranslationStore.getState().toggle('listen'),
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
              {wordCount} words
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

      {sessionCompleted && <PracticeCompleteBanner module="listen" />}

      {recommendationsEnabled && <RecommendationPanel content={content} onNavigate={handleRecommendationNavigate} />}
    </div>
  );
}

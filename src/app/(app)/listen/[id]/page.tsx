'use client';

import { ArrowLeft, Clock, Pause, Play, RotateCcw, Type, Volume2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { type SentenceTranslation, useTranslation } from '@/hooks/use-translation';
import { estimateListenDuration, formatDuration, useTTS } from '@/hooks/use-tts';
import { splitContentBlocks } from '@/lib/content-format';
import { savePracticeSession } from '@/lib/daily-plan-progress';
import { db } from '@/lib/db';
import { estimateSentenceHighlightTimings } from '@/lib/listen-highlight';
import { splitSentences } from '@/lib/sentence-split';
import { useContentStore } from '@/stores/content-store';
import { usePracticeTranslationStore } from '@/stores/practice-translation-store';
import { useShadowReadingStore } from '@/stores/shadow-reading-store';
import { useTTSStore } from '@/stores/tts-store';
import type { ContentItem } from '@/types/content';

interface SentenceSpan {
  text: string;
  translation: string;
  startWordIndex: number;
  endWordIndex: number;
  wordCount: number;
}

function buildSentenceSpans(text: string, sentenceTranslations: SentenceTranslation[] | null): SentenceSpan[] {
  const sentences =
    sentenceTranslations && sentenceTranslations.length > 0
      ? sentenceTranslations.map((sentence) => ({
          text: sentence.original,
          translation: sentence.translation,
        }))
      : splitSentences(text).map((sentence) => ({
          text: sentence,
          translation: '',
        }));

  let startWordIndex = 0;

  return sentences
    .map(({ text: sentenceText, translation }) => {
      const wordCount = sentenceText.split(/\s+/).filter(Boolean).length;
      const span = {
        text: sentenceText,
        translation,
        startWordIndex,
        endWordIndex: startWordIndex + wordCount - 1,
        wordCount,
      };
      startWordIndex += wordCount;
      return span;
    })
    .filter((span) => span.wordCount > 0);
}

export default function ListenDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [content, setContent] = useState<ContentItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(-1);
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
  const {
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
    async function load() {
      const item = await db.contents.get(params.id as string);
      if (item) setContent(item);
    }
    load();
  }, [params.id]);

  useEffect(() => {
    if (shadowReadingSession?.contentId === params.id) {
      markModuleProgress('listen', 'in_progress');
    }
  }, [params.id, shadowReadingSession?.contentId, markModuleProgress]);

  useEffect(() => {
    function handleGlobalStop() {
      setIsPlaying(false);
      setCurrentWordIndex(-1);
      kokoroPlaybackStartedRef.current = false;
    }

    window.addEventListener('echotype:stop-tts', handleGlobalStop);
    return () => window.removeEventListener('echotype:stop-tts', handleGlobalStop);
  }, []);

  const contentBlocks = useMemo(() => splitContentBlocks(content?.text || ''), [content?.text]);
  const wordCount = contentBlocks.reduce((total, block) => total + block.wordCount, 0);
  const duration = content ? estimateListenDuration(content.text, speed) : 0;

  const sentenceSpans = useMemo(
    () => buildSentenceSpans(content?.text || '', sentenceTranslations),
    [content?.text, sentenceTranslations],
  );

  const wordToSentenceMap = useMemo(() => {
    const map = new Map<number, number>();
    sentenceSpans.forEach((span, sentenceIndex) => {
      for (let wordIndex = span.startWordIndex; wordIndex <= span.endWordIndex; wordIndex += 1) {
        map.set(wordIndex, sentenceIndex);
      }
    });
    return map;
  }, [sentenceSpans]);

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
      setCurrentSentenceIndex(-1);

      let wordIdx = 0;
      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          setCurrentWordIndex(wordIdx);
          wordIdx++;
        }
      };
      utterance.onend = () => {
        setIsPlaying(false);
        setCurrentWordIndex(-1);
        persistListenSession();
      };
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    },
    [createUtterance, persistListenSession],
  );

  const startKokoroSentenceHighlight = useCallback(
    (rate: number) => {
      clearSentenceHighlightTimers();
      if (sentenceSpans.length === 0) {
        setCurrentSentenceIndex(-1);
        return;
      }

      const timings = estimateSentenceHighlightTimings(
        sentenceSpans.map((sentence) => ({
          text: sentence.text,
          wordCount: sentence.wordCount,
        })),
        rate,
      );

      setCurrentSentenceIndex(0);

      timings.forEach((timing, sentenceIndex) => {
        if (sentenceIndex > 0) {
          const timerId = window.setTimeout(() => {
            setCurrentSentenceIndex(sentenceIndex);
          }, timing.startMs);
          sentenceHighlightTimersRef.current.push(timerId);
        }
      });
    },
    [clearSentenceHighlightTimers, sentenceSpans],
  );

  useEffect(() => {
    if (!isKokoroListenMode) return;

    if (isTTSPlaying) {
      kokoroPlaybackStartedRef.current = true;
      if (!isPlaying) {
        setIsPlaying(true);
      }
      return;
    }

    if (isPlaying && kokoroPlaybackStartedRef.current) {
      setIsPlaying(false);
      setCurrentWordIndex(-1);
      setCurrentSentenceIndex(-1);
      clearSentenceHighlightTimers();
      if (kokoroShouldPersistCompletionRef.current) {
        persistListenSession();
      }
      kokoroPlaybackStartedRef.current = false;
      kokoroShouldPersistCompletionRef.current = false;
    }
  }, [clearSentenceHighlightTimers, isKokoroListenMode, isPlaying, isTTSPlaying, persistListenSession]);

  useEffect(() => {
    return () => clearSentenceHighlightTimers();
  }, [clearSentenceHighlightTimers]);

  const handlePlay = () => {
    if (!content) return;
    if (isPlaying) {
      const listenedMs = listenStartRef.current ? Date.now() - listenStartRef.current : 0;
      const estimatedDurationMs = estimateListenDuration(content.text, speed) * 1000;
      const listenedEnough = listenedMs > estimatedDurationMs * 0.5;

      if (listenedEnough && !sessionCompleted) {
        persistListenSession();
      }

      kokoroShouldPersistCompletionRef.current = false;
      clearSentenceHighlightTimers();
      stop();
      setIsPlaying(false);
      setCurrentWordIndex(-1);
      setCurrentSentenceIndex(-1);
      kokoroPlaybackStartedRef.current = false;
    } else {
      if (isKokoroListenMode) {
        listenStartRef.current = Date.now();
        setCurrentWordIndex(-1);
        kokoroShouldPersistCompletionRef.current = true;
        setIsPlaying(true);
        startKokoroSentenceHighlight(speed);
        kokoroPlaybackStartedRef.current = false;
        void speakWithSelectedVoice(content.text, { rate: speed });
        return;
      }

      speakWithWordHighlight(content.text, speed);
    }
  };

  const handleWordClick = (word: string) => {
    kokoroShouldPersistCompletionRef.current = false;
    clearSentenceHighlightTimers();
    stop();
    setIsPlaying(false);
    setCurrentSentenceIndex(-1);
    kokoroPlaybackStartedRef.current = false;
    if (isKokoroListenMode) {
      void speakWithSelectedVoice(word, { rate: speed });
      return;
    }
    const u = createUtterance(word, { rate: speed });
    window.speechSynthesis.speak(u);
  };

  const handleRestart = () => {
    if (!content) return;
    kokoroShouldPersistCompletionRef.current = false;
    clearSentenceHighlightTimers();
    stop();
    setCurrentWordIndex(-1);
    setCurrentSentenceIndex(-1);
    kokoroPlaybackStartedRef.current = false;
    if (isKokoroListenMode) {
      listenStartRef.current = Date.now();
      kokoroShouldPersistCompletionRef.current = true;
      setIsPlaying(true);
      startKokoroSentenceHighlight(speed);
      void speakWithSelectedVoice(content.text, { rate: speed });
      return;
    }
    speakWithWordHighlight(content.text, speed);
  };

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
    <div className="max-w-4xl mx-auto space-y-5">
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

          {/* Player controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  onClick={handlePlay}
                  className={`cursor-pointer font-semibold transition-all duration-200 ${
                    isPlaying
                      ? 'bg-slate-800 hover:bg-slate-900 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                  size="lg"
                >
                  {isPlaying ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button
                  onClick={handleRestart}
                  variant="ghost"
                  size="icon"
                  className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer rounded-xl"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Mode:{' '}
                {isKokoroListenMode
                  ? 'Kokoro audio with estimated sentence highlighting'
                  : 'Browser speech with word highlighting'}
              </p>
            </div>

            {/* Speed selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 mr-1">Speed</span>
              {[0.5, 0.75, 1, 1.25, 1.5].map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 md:px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                    speed === s
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Content text */}
          <div className="space-y-4" data-testid="listen-content-text">
            {contentBlocks.map((block) => (
              <div
                key={block.id}
                data-testid={block.kind === 'paragraph' ? 'listen-content-sentence' : undefined}
                className={
                  block.kind === 'title'
                    ? 'text-xl font-semibold text-slate-900 leading-tight'
                    : block.kind === 'label'
                      ? 'text-xs font-semibold tracking-[0.2em] text-slate-400'
                      : block.kind === 'quote'
                        ? 'border-l-2 border-slate-200 pl-4 italic text-slate-600'
                        : 'text-[17px] leading-8 text-slate-700'
                }
              >
                <div className="flex flex-wrap items-baseline gap-x-1 gap-y-2">
                  {block.words.map((word, localIndex) => {
                    const idx = block.wordStart + localIndex;
                    const sentenceIndex = wordToSentenceMap.get(idx);
                    const sentenceSpan = sentenceIndex !== undefined ? sentenceSpans[sentenceIndex] : undefined;
                    const isActiveSentence = isKokoroListenMode && sentenceIndex === currentSentenceIndex;
                    const isSentenceBoundary = sentenceSpan?.endWordIndex === idx;

                    return (
                      <span key={`${block.id}-${idx}`} className="contents">
                        <button
                          type="button"
                          onClick={() => handleWordClick(word)}
                          className={`inline-block rounded-md px-0.5 py-0.5 cursor-pointer transition-colors duration-150 ${
                            !isKokoroListenMode && idx === currentWordIndex
                              ? 'bg-indigo-100 text-indigo-900 font-semibold'
                              : isActiveSentence
                                ? 'bg-emerald-50 text-emerald-900 font-medium'
                                : 'text-inherit hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          {word}
                        </button>
                        {showTranslation && isSentenceBoundary && sentenceSpan?.translation && (
                          <div
                            className={`basis-full pt-1 text-sm leading-relaxed whitespace-pre-wrap transition-colors duration-150 ${
                              isActiveSentence ? 'text-emerald-600' : 'text-indigo-400'
                            }`}
                          >
                            {sentenceSpan.translation}
                          </div>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

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

      {sessionCompleted && <PracticeCompleteBanner module="listen" />}

      {recommendationsEnabled && <RecommendationPanel content={content} onNavigate={handleRecommendationNavigate} />}
    </div>
  );
}

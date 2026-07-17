'use client';

import { ArrowLeft, Pause, Play, RotateCcw, Target, Timer, Trophy, Volume2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { CrossModuleNav } from '@/components/shared/cross-module-nav';
import { FormattedContentText } from '@/components/shared/formatted-content-text';
import { IOS_LIST_CARD_CLASS, IOS_SECTION_CARD_CLASS } from '@/components/shared/ios-native-ui';
import { PageSpinner } from '@/components/shared/page-spinner';
import { PracticeCompleteBanner } from '@/components/shared/practice-complete-banner';
import { RecommendationPanel } from '@/components/shared/recommendation-panel';
import { ShadowReadingProgressBar } from '@/components/shared/shadow-reading-progress-bar';
import { TranslationBar } from '@/components/translation/translation-bar';
import { TranslationDisplay } from '@/components/translation/translation-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Recommendation } from '@/hooks/use-recommendations';
import { useTranslation } from '@/hooks/use-translation';
import { useTTS } from '@/hooks/use-tts';
import { getInitialState, typingReducer } from '@/hooks/use-typing-reducer';
import { splitContentBlocks } from '@/lib/content-format';
import { savePracticeSession } from '@/lib/daily-plan-progress';
import { db } from '@/lib/db';
import enWriteDetail from '@/lib/i18n/messages/write-detail/en.json';
import zhWriteDetail from '@/lib/i18n/messages/write-detail/zh.json';
import { getIOSNativeQAMode } from '@/lib/ios-native-qa';
import { matchesShortcutEvent } from '@/lib/shortcut-utils';
import { detectIOSNativeHost, reportNativeQAState } from '@/lib/tauri';
import { cn } from '@/lib/utils';
import { useContentStore } from '@/stores/content-store';
import { useDailyPlanStore } from '@/stores/daily-plan-store';
import { useLanguageStore } from '@/stores/language-store';
import { usePracticeTranslationStore } from '@/stores/practice-translation-store';
import { useShadowReadingStore } from '@/stores/shadow-reading-store';
import { useShortcutStore } from '@/stores/shortcut-store';
import { useTTSStore } from '@/stores/tts-store';
import type { ContentItem } from '@/types/content';

const WRITE_DETAIL_LOCALES = { en: enWriteDetail, zh: zhWriteDetail } as const;

const charColorMap = {
  pending: 'text-slate-400',
  correct: 'text-green-600',
  wrong: 'text-red-500 bg-red-50',
};

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function accuracyColor(accuracy: number): string {
  if (accuracy >= 90) return 'text-green-600';
  if (accuracy >= 70) return 'text-yellow-600';
  return 'text-red-600';
}

export default function WriteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = WRITE_DETAIL_LOCALES[useLanguageStore((s) => s.interfaceLanguage)];
  const [content, setContent] = useState<ContentItem | null>(null);
  const [contentNotFound, setContentNotFound] = useState(false);
  const [bootstrapReady, setBootstrapReady] = useState(false);
  const [state, dispatch] = useReducer(typingReducer, getInitialState());
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const showTranslation = usePracticeTranslationStore((s) => s.visibility.write);
  const targetLang = useTTSStore((s) => s.targetLang);
  const recommendationsEnabled = useTTSStore((s) => s.recommendationsEnabled);
  const shadowReadingSession = useShadowReadingStore((s) => s.session);
  const markModuleProgress = useShadowReadingStore((s) => s.markModuleProgress);
  const isDailyPlanPractice = useDailyPlanStore((s) =>
    s.tasks.some((task) => !task.completed && !task.skipped && task.module === 'write' && task.contentId === params.id),
  );
  const { addContent } = useContentStore();
  const { speak } = useTTS();
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
      router.push(`/write/${item.id}`);
    },
    [addContent, router],
  );

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
      dispatch({ type: 'INIT', text: itemFromStore.text });
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
        dispatch({ type: 'INIT', text: item.text });
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
    if (shadowReadingSession?.contentId === params.id) {
      markModuleProgress('write', 'in_progress');
    }
  }, [params.id, shadowReadingSession?.contentId, markModuleProgress]);

  useEffect(() => {
    if (state.mode === 'typing') {
      timerRef.current = setInterval(() => {
        dispatch({ type: 'TICK_TIMER' });
      }, 200);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.mode]);

  useEffect(() => {
    if (state.isShaking) {
      shakeTimeoutRef.current = setTimeout(() => {
        dispatch({ type: 'RESET_WORD' });
      }, 300);
    }
    return () => {
      if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
    };
  }, [state.isShaking]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on cursor position change is intentional
  useEffect(() => {
    if (state.mode === 'typing' && cursorRef.current) {
      cursorRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [state.currentWordIndex, state.currentCharIndex, state.mode]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: moduleProgress checked at completion time, not as trigger
  useEffect(() => {
    if (state.mode === 'finished' && content) {
      const isShadowContent = shadowReadingSession?.contentId === content.id;
      const session = {
        id: nanoid(),
        contentId: content.id,
        module: 'write' as const,
        startTime: state.startTime || Date.now(),
        endTime: Date.now(),
        totalChars: state.charStates.length,
        correctChars: state.correctCount,
        wrongChars: state.errorCount,
        totalWords: state.words.length,
        wpm: state.wpm,
        accuracy: state.accuracy,
        completed: true,
      };
      void savePracticeSession(session);
      if (isShadowContent) {
        markModuleProgress('write', 'completed');
      }
    }
  }, [
    state.mode,
    content,
    state.startTime,
    state.charStates.length,
    state.correctCount,
    state.errorCount,
    state.wpm,
    state.accuracy,
    shadowReadingSession?.contentId,
    markModuleProgress,
    state.words.length,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (state.mode === 'finished' || state.mode === 'paused' || state.isShaking) return;
      e.preventDefault();

      if (e.key === 'Escape' && state.mode === 'typing') {
        dispatch({ type: 'PAUSE' });
        return;
      }

      if (e.key.length === 1) {
        dispatch({ type: 'KEY_PRESS', key: e.key });
      }
    },
    [state.mode, state.isShaking],
  );

  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      if (state.mode === 'paused' && e.key === 'Enter') {
        dispatch({ type: 'RESUME' });
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [state.mode]);

  const [isReviewMode, setIsReviewMode] = useState(false);
  const isIOSNativeHost = detectIOSNativeHost();
  const isIOSNativeQA = !!getIOSNativeQAMode();

  useEffect(() => {
    reportNativeQAState({
      page: 'write-detail',
      hasContent: !!content,
      title: content?.title ?? '',
      mode: state.mode,
      isReviewMode,
      currentWordIndex: state.currentWordIndex,
      errorCount: state.errorCount,
      accuracy: state.accuracy,
    });
  }, [content, isReviewMode, state.accuracy, state.currentWordIndex, state.errorCount, state.mode]);

  const handleReset = useCallback(() => {
    if (content) {
      dispatch({ type: 'INIT', text: content.text });
      setIsReviewMode(false);
    }
    inputRef.current?.focus();
  }, [content]);

  const handleReviewErrors = () => {
    if (state.errorWords.length > 0) {
      dispatch({ type: 'INIT', text: state.errorWords.join(' ') });
      setIsReviewMode(true);
      inputRef.current?.focus();
    }
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const toggleTranslationKey = useShortcutStore.getState().getKey('write:toggle-translation');
      const resetKey = useShortcutStore.getState().getKey('write:reset');

      if (toggleTranslationKey && matchesShortcutEvent(event, toggleTranslationKey)) {
        event.preventDefault();
        event.stopPropagation();
        usePracticeTranslationStore.getState().toggle('write');
        return;
      }

      if (resetKey && matchesShortcutEvent(event, resetKey)) {
        event.preventDefault();
        event.stopPropagation();
        handleReset();
      }
    }

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [handleReset]);

  const paragraphBreakCharIndices = useMemo(() => {
    if (!content?.text || state.words.length === 0) return new Set<number>();
    const blocks = splitContentBlocks(content.text);
    const set = new Set<number>();
    for (const block of blocks) {
      if (block.wordStart === 0) continue;
      let charPos = 0;
      for (let w = 0; w < block.wordStart; w++) {
        charPos += state.words[w].length + 1;
      }
      if (charPos > 0) set.add(charPos - 1);
    }
    return set;
  }, [content?.text, state.words]);

  if (!content) {
    if (!bootstrapReady) {
      return <PageSpinner size="sm" className="min-h-[40vh]" />;
    }
    if (contentNotFound) {
      return (
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-4 py-16 text-center">
          <h2 className="text-xl font-semibold text-slate-700">Content not found</h2>
          <p className="text-sm text-slate-500">This content may have been deleted or the link is invalid.</p>
          <Link
            href="/library"
            prefetch={false}
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Go to Library
          </Link>
        </div>
      );
    }
    return <PageSpinner size="sm" className="min-h-[40vh]" />;
  }

  const fullText = state.words.join(' ');
  const chars = fullText.split('');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {isIOSNativeHost && (
        <Card className={cn(IOS_SECTION_CARD_CLASS, 'overflow-hidden')}>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,rgba(168,85,247,0.18)_0%,rgba(147,51,234,0.10)_100%)]">
                    <Target className="h-5 w-5 text-violet-600" />
                  </div>
                  <div className="inline-flex items-center rounded-full bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-500">
                    Write Practice
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="truncate font-[var(--font-poppins)] text-[1.85rem] font-bold tracking-[-0.04em] text-slate-950">
                      {content.title}
                    </h1>
                    {isReviewMode && (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                        <Target className="w-3 h-3" /> {t.header.errorReview}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {content.type} · {t.header.subtitle}
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                <TranslationBar module="write" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {shadowReadingSession?.contentId === content.id ? (
                <ShadowReadingProgressBar
                  contentId={content.id}
                  currentModule="write"
                  showSpeakHint
                  speakHref="/speak"
                />
              ) : (
                <CrossModuleNav contentId={content.id} currentModule="write" />
              )}
            </div>
          </CardContent>
        </Card>
      )}
      {!isIOSNativeHost && (
        <div className="flex items-center gap-4">
          <Link href="/write" prefetch={false}>
            <Button variant="ghost" size="icon" className="text-indigo-600 cursor-pointer">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-[var(--font-poppins)] text-indigo-900 truncate">
                {content.title}
              </h1>
              {isReviewMode && (
                <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                  <Target className="w-3 h-3" /> {t.header.errorReview}
                </span>
              )}
            </div>
            <p className="text-sm text-indigo-500">
              {content.type} · {t.header.subtitle}
            </p>
          </div>
          {shadowReadingSession?.contentId === content.id ? (
            <ShadowReadingProgressBar contentId={content.id} currentModule="write" showSpeakHint speakHref="/speak" />
          ) : (
            <CrossModuleNav contentId={content.id} currentModule="write" />
          )}
        </div>
      )}

      <Card className={cn(isIOSNativeHost ? IOS_SECTION_CARD_CLASS : 'bg-white border-slate-100 shadow-sm')}>
        <CardContent className="py-3 px-4 md:px-5 text-sm">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 md:gap-6">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-indigo-500" />
              <span className="text-lg font-bold text-indigo-900 tabular-nums">{formatTime(state.elapsedMs)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-500" />
              <span className={`font-medium ${accuracyColor(state.accuracy)}`}>{state.accuracy}%</span>
            </div>
            <div className="flex items-center gap-2 text-indigo-600">
              <Trophy className="w-4 h-4" />
              <span>
                {state.wpm} {t.stats.wpm}
              </span>
            </div>
            <div className="text-indigo-500">
              {state.completedWords}/{state.words.length} {t.stats.words}
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto md:ml-auto">
              {(state.mode === 'typing' || state.mode === 'paused') && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-indigo-600 cursor-pointer"
                  onClick={() => {
                    if (state.mode === 'typing') dispatch({ type: 'PAUSE' });
                    else dispatch({ type: 'RESUME' });
                    inputRef.current?.focus();
                  }}
                >
                  {state.mode === 'paused' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </Button>
              )}

              {!isIOSNativeHost && <TranslationBar module="write" />}

              <Button
                variant="ghost"
                size="sm"
                className="text-indigo-600 cursor-pointer"
                onClick={() => content && speak(content.text)}
                title={t.toolbar.listenTitle}
              >
                <Volume2 className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">{t.toolbar.listen}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="border-indigo-200 text-indigo-600 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 mr-1" /> {t.toolbar.reset}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {state.mode !== 'finished' ? (
        <div className="relative">
          <Card
            className={cn(
              isIOSNativeHost ? IOS_SECTION_CARD_CLASS : 'bg-indigo-50/50 border-indigo-100 shadow-sm',
              'mb-3',
            )}
          >
            <CardContent className="p-5">
              <div className="mb-3">
                <h3 className="font-semibold text-indigo-900">{t.content.referenceText}</h3>
                <p className="text-xs text-indigo-400 mt-1">{t.content.referenceHint}</p>
              </div>
              <FormattedContentText
                text={content.text}
                paragraphClassName="text-base leading-relaxed text-indigo-800"
                titleClassName="text-xl font-semibold text-indigo-900 leading-tight"
                labelClassName="text-xs font-semibold tracking-[0.18em] text-indigo-400"
                quoteClassName="border-l-2 border-indigo-200 pl-4 text-base italic leading-relaxed text-indigo-700"
              />
            </CardContent>
          </Card>

          {showTranslation && sentenceTranslations && sentenceTranslations.length > 0 ? (
            <Card
              className={cn(
                isIOSNativeHost ? IOS_LIST_CARD_CLASS : 'bg-indigo-50/50 border-indigo-100 shadow-sm',
                'mb-3',
              )}
            >
              <CardContent className="p-4 space-y-2">
                {sentenceTranslations.map((st, i) => (
                  <div key={i}>
                    <p className="text-sm leading-relaxed text-indigo-800 whitespace-pre-wrap">{st.original}</p>
                    <p className="text-xs text-indigo-400/80 leading-relaxed mt-0.5 pl-0.5 whitespace-pre-wrap">
                      {st.translation}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : showTranslation && translationLoading ? (
            <TranslationDisplay translation={null} isLoading={true} show={true} error={translationError} />
          ) : showTranslation && translationError ? (
            <TranslationDisplay
              translation={null}
              isLoading={false}
              show={true}
              error={translationError}
              onRetry={retryTranslation}
            />
          ) : null}

          <Card
            className={cn(
              isIOSNativeHost
                ? `${IOS_SECTION_CARD_CLASS} cursor-text`
                : 'bg-white border-slate-100 shadow-sm cursor-text',
            )}
            onClick={focusInput}
          >
            <CardContent className="p-4 md:p-8 relative">
              {isIOSNativeQA && (
                <div className="mb-4 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={focusInput}
                    className="border-indigo-200 text-indigo-700"
                  >
                    Focus typing input
                  </Button>
                </div>
              )}
              <div
                className={`text-lg md:text-2xl leading-relaxed font-mono tracking-wide select-none ${
                  state.isShaking ? 'animate-shake' : ''
                }`}
              >
                {chars.map((char, idx) => {
                  const charState = state.charStates[idx] || 'pending';
                  const isCursor =
                    idx ===
                    (() => {
                      let pos = 0;
                      for (let w = 0; w < state.currentWordIndex; w++) {
                        pos += state.words[w].length + 1;
                      }
                      return pos + state.currentCharIndex;
                    })();
                  const isParagraphBreak = paragraphBreakCharIndices.has(idx);

                  return (
                    <span key={idx} className="contents">
                      <span
                        ref={isCursor ? cursorRef : null}
                        className={`${charColorMap[charState]} ${
                          isCursor ? 'border-b-2 border-indigo-600' : ''
                        } transition-colors duration-100`}
                      >
                        {char}
                      </span>
                      {isParagraphBreak && <span className="block h-6 w-full" />}
                    </span>
                  );
                })}
              </div>

              <input
                ref={inputRef}
                onKeyDown={handleKeyDown}
                className="opacity-0 absolute -z-10 w-0 h-0"
                aria-label={t.typing.inputLabel}
              />

              {state.mode === 'idle' && <p className="text-center text-indigo-400 mt-6">{t.typing.startHint}</p>}

              {state.mode === 'paused' && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl z-10">
                  <p className="text-2xl font-bold text-indigo-900 mb-4">{t.typing.paused}</p>
                  <Button
                    onClick={() => {
                      dispatch({ type: 'RESUME' });
                      inputRef.current?.focus();
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                  >
                    <Play className="w-4 h-4 mr-2" /> {t.typing.resume}
                  </Button>
                  <p className="text-xs text-indigo-400 mt-2">{t.typing.resumeHint}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card
          className={cn(
            isIOSNativeHost
              ? `${IOS_SECTION_CARD_CLASS} border-green-200 bg-[linear-gradient(145deg,rgba(240,253,244,0.94)_0%,rgba(255,255,255,0.92)_52%,rgba(238,242,255,0.92)_100%)]`
              : 'bg-gradient-to-br from-green-50 via-white to-indigo-50 border-green-200 shadow-lg',
          )}
        >
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Trophy className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-indigo-900 font-[var(--font-poppins)]">{t.completion.title}</h2>
              <p className="text-green-600 mt-2">{t.completion.encouragement}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-indigo-50 rounded-xl p-4">
                <p className="text-sm text-indigo-500">{t.completion.time}</p>
                <p className="text-2xl font-bold text-indigo-900">{formatTime(state.elapsedMs)}</p>
              </div>
              <div className="bg-indigo-50 rounded-xl p-4">
                <p className="text-sm text-indigo-500">{t.stats.wpm}</p>
                <p className="text-2xl font-bold text-indigo-900">{state.wpm}</p>
              </div>
              <div className="bg-indigo-50 rounded-xl p-4">
                <p className="text-sm text-indigo-500">{t.completion.accuracy}</p>
                <p className={`text-2xl font-bold ${accuracyColor(state.accuracy)}`}>{state.accuracy}%</p>
              </div>
              <div className="bg-indigo-50 rounded-xl p-4">
                <p className="text-sm text-indigo-500">{t.completion.errors}</p>
                <p className="text-2xl font-bold text-indigo-900">{state.errorCount}</p>
              </div>
            </div>

            {state.errorWords.length > 0 && (
              <div>
                <h3 className="font-semibold text-indigo-900 mb-2">{t.completion.errorWords}</h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  {state.errorWords.map((word, i) => (
                    <span key={i} className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-sm font-medium">
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4 justify-center flex-wrap">
              {state.errorWords.length > 0 && (
                <Button onClick={handleReviewErrors} className="bg-orange-500 hover:bg-orange-600 cursor-pointer">
                  <Target className="w-4 h-4 mr-2" /> {t.completion.reviewErrors}
                </Button>
              )}
              <Button onClick={handleReset} className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
                <RotateCcw className="w-4 h-4 mr-2" />{' '}
                {isReviewMode ? t.completion.fullTextAgain : t.completion.tryAgain}
              </Button>
              <Link href="/dashboard">
                <Button variant="outline" className="border-green-300 text-green-700 hover:bg-green-50 cursor-pointer">
                  {t.completion.backToDashboard}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {state.mode === 'finished' && isDailyPlanPractice && <PracticeCompleteBanner module="write" />}

      {recommendationsEnabled && <RecommendationPanel content={content} onNavigate={handleRecommendationNavigate} />}
    </div>
  );
}

'use client';

import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Loader2,
  MessageCircle,
  Mic,
  MicOff,
  PenTool,
  RotateCcw,
  Trophy,
  Volume2,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ReadAloudInlineControls } from '@/components/read-aloud';
import { PageSpinner } from '@/components/shared/page-spinner';
import { PracticeCompleteBanner } from '@/components/shared/practice-complete-banner';
import { WordDictionaryInfo } from '@/components/shared/word-dictionary-info';
import { TranslationBar } from '@/components/translation/translation-bar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useFallbackSTT } from '@/hooks/use-fallback-stt';
import { useTTS } from '@/hooks/use-tts';
import { savePracticeSession } from '@/lib/daily-plan-progress';
import { toLocalDateKey } from '@/lib/date-key';
import { db } from '@/lib/db';
import enWordBook from '@/lib/i18n/messages/word-book-practice/en.json';
import zhWordBook from '@/lib/i18n/messages/word-book-practice/zh.json';
import {
  getIOSNativeQAMockTranslation,
  getIOSNativeQAMode,
  getIOSNativeQAVoiceTranscript,
  isIOSNativeQASpeakMockEnabled,
} from '@/lib/ios-native-qa';
import {
  buildSpeechWordFeedback,
  calculateSpeechMatch,
  joinSpeechTranscripts,
  resolveSpeechTranscript,
  shouldShowSpeechFeedback,
} from '@/lib/speech-feedback';
import { IS_IOS_NATIVE_HOST, IS_TAURI, reportNativeQAState } from '@/lib/tauri';
import { cn } from '@/lib/utils';
import {
  canFinishWordBookPractice,
  resolveWordBookPracticeItems,
  type WordBookPracticeProgressSnapshot,
} from '@/lib/wordbook-practice-progress';
import {
  isWordBookWriteMatch,
  normalizeWordBookWriteChar,
  resolveWordBookWriteTarget,
} from '@/lib/wordbook-write-target';
import { getWordBook, loadWordBookItems } from '@/lib/wordbooks';
import { useDailyPlanStore } from '@/stores/daily-plan-store';
import { useLanguageStore } from '@/stores/language-store';
import { usePracticeTranslationStore } from '@/stores/practice-translation-store';
import { useReadAloudStore } from '@/stores/read-aloud-store';
import { useTTSStore } from '@/stores/tts-store';
import type { ContentItem } from '@/types/content';
import type { PracticeModule } from '@/types/translation';
import type { WordBook } from '@/types/wordbook';

const WB_LOCALES = { en: enWordBook, zh: zhWordBook } as const;

// ─── Types ───────────────────────────────────────────────────────────────────

interface WordBookPracticeProps {
  module: PracticeModule;
}

interface SingleItemPracticeProps {
  item: ContentItem;
  module: PracticeModule;
  onCompleted?: () => void;
}

interface BookInfo {
  name: string;
  emoji: string;
}

type BrowserSpeechRecognition = typeof window & {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const difficultyColors: Record<string, string> = {
  beginner: 'bg-emerald-100 text-emerald-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-red-100 text-red-700',
};

const moduleIcons = {
  listen: { icon: Headphones, backColor: 'text-indigo-600' },
  speak: { icon: MessageCircle, backColor: 'text-teal-600' },
  read: { icon: BookOpen, backColor: 'text-blue-600' },
  write: { icon: PenTool, backColor: 'text-purple-600' },
};

const SWIPE_THRESHOLD = 50;
const WORDBOOK_PROGRESS_STORAGE_KEY = 'echotype_wordbook_progress';

interface WordBookPracticeProgress {
  currentIndex: number;
  completedCount: number;
  completedItemIds?: string[];
  itemIds?: string[];
  dayKey?: string;
  finished: boolean;
  updatedAt: number;
}

function buildWordBookProgressKey(module: PracticeModule, bookId: string, limit: number): string {
  return `${module}::${bookId}::${limit || 0}`;
}

function loadWordBookProgress(progressKey: string): WordBookPracticeProgress | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(WORDBOOK_PROGRESS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, WordBookPracticeProgress>;
    return parsed[progressKey] ?? null;
  } catch {
    return null;
  }
}

function saveWordBookProgress(progressKey: string, progress: WordBookPracticeProgress) {
  if (typeof window === 'undefined') return;

  try {
    const raw = localStorage.getItem(WORDBOOK_PROGRESS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, WordBookPracticeProgress>) : {};
    parsed[progressKey] = progress;
    localStorage.setItem(WORDBOOK_PROGRESS_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    /* ignore storage failures */
  }
}

function clearWordBookProgress(progressKey: string) {
  if (typeof window === 'undefined') return;

  try {
    const raw = localStorage.getItem(WORDBOOK_PROGRESS_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, WordBookPracticeProgress>;
    delete parsed[progressKey];
    localStorage.setItem(WORDBOOK_PROGRESS_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    /* ignore storage failures */
  }
}

// ─── Translation Helper ─────────────────────────────────────────────────────

function useItemTranslation(text: string, targetLang: string, enabled: boolean) {
  const [translation, setTranslation] = useState('');
  const cacheRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!enabled) {
      setTranslation('');
      return;
    }

    if (!text) return;

    const key = `${text}::${targetLang}`;
    const cached = cacheRef.current.get(key);
    if (cached) {
      setTranslation(cached);
      return;
    }

    if (getIOSNativeQAMode()) {
      const mocked = getIOSNativeQAMockTranslation(text, targetLang);
      cacheRef.current.set(key, mocked);
      setTranslation(mocked);
      return;
    }

    setTranslation('');
    let cancelled = false;
    fetch('/api/translate/free', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang }),
    })
      .then((r) => r.json())
      .then((data: { translation?: string }) => {
        if (!cancelled && data.translation) {
          cacheRef.current.set(key, data.translation);
          setTranslation(data.translation);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled, text, targetLang]);

  return translation;
}

function SentenceTranslation({
  text,
  targetLang,
  module,
}: {
  text: string;
  targetLang: string;
  module: PracticeModule;
}) {
  const showTranslation = usePracticeTranslationStore((s) => s.isVisible(module));
  const translation = useItemTranslation(text, targetLang, showTranslation);
  if (!showTranslation || !translation) return null;
  return (
    <p data-testid="wordbook-translation" className="text-sm text-indigo-400/80 text-center leading-relaxed">
      {translation}
    </p>
  );
}

// ─── Listen Practice ─────────────────────────────────────────────────────────

function WordBookPlaybackControls({
  item,
  module,
  onCompleted,
  onPrev,
  onNext,
}: {
  item: ContentItem;
  module: 'listen' | 'read';
  onCompleted?: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { createUtterance, boundaryPlaybackNotice } = useTTS();
  const speed = useTTSStore((s) => s.speed);
  const isPlaying = useReadAloudStore((s) => s.isPlaying);
  const activate = useReadAloudStore((s) => s.activate);
  const deactivate = useReadAloudStore((s) => s.deactivate);
  const setPlaying = useReadAloudStore((s) => s.setPlaying);
  const setCurrentWordIndex = useReadAloudStore((s) => s.setCurrentWordIndex);
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    activate(item.text);
    return () => {
      window.speechSynthesis.cancel();
      deactivate();
    };
  }, [activate, deactivate, item.text]);

  const handlePause = useCallback(() => {
    window.speechSynthesis.cancel();
    setPlaying(false);
  }, [setPlaying]);

  const handlePlay = useCallback(() => {
    window.speechSynthesis.cancel();
    const utterance = createUtterance(item.text, { rate: speed });
    startedAtRef.current = Date.now();
    let wordIndex = -1;

    utterance.onboundary = (event) => {
      if (event.name !== 'word') return;
      wordIndex += 1;
      setCurrentWordIndex(wordIndex);
    };
    utterance.onend = () => {
      setPlaying(false);
      if (module === 'listen') {
        void savePracticeSession(
          {
            id: nanoid(),
            contentId: item.id,
            module: 'listen',
            startTime: startedAtRef.current,
            endTime: Date.now(),
            totalChars: item.text.length,
            correctChars: 0,
            wrongChars: 0,
            totalWords: item.text.split(/\s+/).filter(Boolean).length,
            wpm: 0,
            accuracy: 0,
            completed: true,
          },
          { content: item },
        );
        onCompleted?.();
      }
    };
    utterance.onerror = () => {
      setPlaying(false);
    };
    window.speechSynthesis.speak(utterance);
    setPlaying(true);
  }, [createUtterance, item, module, onCompleted, setCurrentWordIndex, setPlaying, speed]);

  const handlePrev = useCallback(() => {
    handlePause();
    onPrev();
  }, [handlePause, onPrev]);

  const handleNext = useCallback(() => {
    handlePause();
    onNext();
  }, [handlePause, onNext]);

  if (module === 'listen') {
    return boundaryPlaybackNotice ? (
      <div className="pt-2">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {boundaryPlaybackNotice}
        </div>
      </div>
    ) : null;
  }

  return (
    <div className="space-y-3 pt-2">
      {boundaryPlaybackNotice && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {boundaryPlaybackNotice}
        </div>
      )}
      <ReadAloudInlineControls
        label="Read aloud controls"
        onPlay={handlePlay}
        onPause={handlePause}
        onPrev={handlePrev}
        onNext={handleNext}
        showImmersive={false}
        showProgress={false}
      />
    </div>
  );
}

// ─── Write Practice ──────────────────────────────────────────────────────────

function WritePractice({
  item,
  onCorrect,
  onCompleted,
}: {
  item: ContentItem;
  onCorrect?: () => void;
  onCompleted?: () => void;
}) {
  const t = WB_LOCALES[useLanguageStore((s) => s.interfaceLanguage)];
  const [typedText, setTypedText] = useState('');
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const startedAtRef = useRef<number>(Date.now());
  const target = resolveWordBookWriteTarget(item);

  // Reset when item changes
  useEffect(() => {
    setTypedText('');
    setResult(null);
    startedAtRef.current = Date.now();
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [item.id]);

  const handleSubmit = () => {
    if (isWordBookWriteMatch(typedText, target.text)) {
      setResult('correct');
      void savePracticeSession(
        {
          id: nanoid(),
          contentId: item.id,
          module: 'write',
          startTime: startedAtRef.current,
          endTime: Date.now(),
          totalChars: target.text.length,
          correctChars: target.text.length,
          wrongChars: 0,
          totalWords: target.text.split(/\s+/).filter(Boolean).length,
          wpm: 0,
          accuracy: 100,
          completed: true,
        },
        { content: item },
      );
      setTimeout(() => {
        onCompleted?.();
        onCorrect?.();
      }, 800);
    } else {
      setResult('wrong');
    }
  };

  // Character-by-character feedback
  const expectedChars = target.text.split('');
  const typedChars = typedText.split('');

  return (
    <div className="space-y-3 pt-2">
      {/* Character feedback display */}
      <div className="bg-slate-50 rounded-lg p-3 min-h-[2.5rem] font-mono text-lg text-center tracking-wide">
        {expectedChars.map((char, i) => {
          const isSpace = char === ' ';
          let color = 'text-slate-300';
          if (i < typedChars.length) {
            if (normalizeWordBookWriteChar(typedChars[i] ?? '') === normalizeWordBookWriteChar(char)) {
              color = 'text-green-600';
            } else if (isSpace) {
              // Missing/wrong space: highly visible
              color = 'text-red-500 bg-red-200 border-b-2 border-red-500 rounded-sm';
            } else {
              color = 'text-red-500 bg-red-50';
            }
          }
          const isCursor = i === typedChars.length;
          return (
            <span key={i} className={cn(color, isCursor && 'border-b-2 border-indigo-500')}>
              {isSpace && i < typedChars.length && typedChars[i] !== char ? '·' : char}
            </span>
          );
        })}
      </div>

      <Input
        ref={inputRef}
        aria-label="Wordbook typing input"
        value={typedText}
        onChange={(e) => {
          setTypedText(e.target.value);
          setResult(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit();
        }}
        placeholder={t.write.placeholder}
        className={cn(
          'text-center text-lg bg-white border-2 transition-colors',
          result === 'correct' && 'border-green-400 bg-green-50',
          result === 'wrong' && 'border-red-400 bg-red-50',
          !result && 'border-indigo-200',
        )}
        autoFocus
      />

      {result === 'correct' && <p className="text-center text-green-600 font-medium text-sm">{t.write.correct}</p>}
      {result === 'wrong' && (
        <div className="flex items-center justify-center gap-2">
          <p className="text-center text-red-500 font-medium text-sm">{t.write.wrong}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTypedText('');
              setResult(null);
              inputRef.current?.focus();
            }}
            className="text-indigo-500 cursor-pointer h-7"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            {t.write.clear}
          </Button>
        </div>
      )}
      {!result && typedText.length > 0 && (
        <Button onClick={handleSubmit} className="w-full bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
          {t.write.check}
        </Button>
      )}
    </div>
  );
}

// ─── Read / Speak Practice ───────────────────────────────────────────────────

type SpeakPhase = 'idle' | 'listening' | 'transcribing' | 'result';

const hasNativeSpeechRecognition = () => {
  if (typeof window === 'undefined') return false;
  const browserWindow = window as BrowserSpeechRecognition;
  return Boolean(browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition);
};

const encourageByAccuracy = (accuracy: number, enc: typeof enWordBook.encourage): string => {
  if (accuracy === 100) return enc.perfect;
  if (accuracy >= 90) return enc.excellent;
  if (accuracy >= 80) return enc.great;
  if (accuracy >= 60) return enc.good;
  if (accuracy >= 40) return enc.keep;
  return enc.dontGiveUp;
};

function ReadSpeakPractice({
  item,
  module,
  onCompleted,
}: {
  item: ContentItem;
  module: 'speak' | 'read';
  onCompleted?: () => void;
}) {
  const t = WB_LOCALES[useLanguageStore((s) => s.interfaceLanguage)];
  const [phase, setPhase] = useState<SpeakPhase>('idle');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [sttError, setSttError] = useState<string | null>(null);
  const useNative = useRef(hasNativeSpeechRecognition());
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { createUtterance, boundaryPlaybackNotice } = useTTS();
  const speed = useTTSStore((s) => s.speed);
  const startedAtRef = useRef<number>(Date.now());
  const lastSavedTranscriptRef = useRef<string>('');
  const intentionalStopRef = useRef(false);
  const autoRestartCountRef = useRef(0);
  const recognitionBaseTranscriptRef = useRef('');
  const currentSessionFinalRef = useRef('');
  const hasRecognitionResultRef = useRef(false);
  const liveTranscriptRef = useRef('');
  const itemIdRef = useRef(item.id);
  const activeRecognitionItemIdRef = useRef<string | null>(null);
  const MAX_AUTO_RESTARTS = 20;

  const transcript = resolveSpeechTranscript(finalTranscript, interimTranscript, useNative.current);

  // Fallback STT for Tauri / browsers without SpeechRecognition
  const fallbackSTT = useFallbackSTT({
    lang: 'en',
    onTranscript: useCallback((text: string) => {
      if (activeRecognitionItemIdRef.current !== itemIdRef.current) return;
      setInterimTranscript('');
      setFinalTranscript(text);
      setPhase(text ? 'result' : 'idle');
    }, []),
    onInterimTranscript: useNative.current
      ? undefined
      : (text: string) => {
          if (activeRecognitionItemIdRef.current !== itemIdRef.current) return;
          setInterimTranscript(text);
        },
    onError: useCallback((error: string) => {
      if (activeRecognitionItemIdRef.current !== itemIdRef.current) return;
      setInterimTranscript('');
      if (liveTranscriptRef.current) {
        setFinalTranscript(liveTranscriptRef.current);
        setSttError(`${error} Showing the live browser recognition result instead.`);
        setPhase('result');
      } else {
        setFinalTranscript('');
        setSttError(error);
        setPhase('idle');
      }
    }, []),
  });
  // Reset when item changes
  useEffect(() => {
    itemIdRef.current = item.id;
    activeRecognitionItemIdRef.current = null;
    recognitionRef.current?.abort();
    fallbackSTT.stopRecording();
    setFinalTranscript('');
    setInterimTranscript('');
    setPhase('idle');
    setSttError(null);
    startedAtRef.current = Date.now();
    lastSavedTranscriptRef.current = '';
    intentionalStopRef.current = false;
    autoRestartCountRef.current = 0;
    recognitionBaseTranscriptRef.current = '';
    currentSessionFinalRef.current = '';
    hasRecognitionResultRef.current = false;
    liveTranscriptRef.current = '';
  }, [fallbackSTT.stopRecording, item.id]);

  // Initialize native speech recognition
  useEffect(() => {
    if (!useNative.current) return;
    const browserWindow = window as BrowserSpeechRecognition;
    const SpeechRecognitionAPI = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const rec = new SpeechRecognitionAPI();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (event: SpeechRecognitionEvent) => {
      if (activeRecognitionItemIdRef.current !== itemIdRef.current) return;
      let final = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) {
          final += r[0].transcript;
        } else {
          interim += r[0].transcript;
        }
      }
      if (final.trim() || interim.trim()) {
        hasRecognitionResultRef.current = true;
      }
      currentSessionFinalRef.current = final.trim();
      const confirmed = joinSpeechTranscripts(recognitionBaseTranscriptRef.current, final);
      const liveTranscript = joinSpeechTranscripts(confirmed, interim);
      liveTranscriptRef.current = liveTranscript;
      setFinalTranscript(confirmed);
      setInterimTranscript(interim);
    };

    rec.onend = () => {
      if (activeRecognitionItemIdRef.current !== itemIdRef.current) return;
      // Auto-restart if user didn't intentionally stop and we haven't exceeded retries
      if (!intentionalStopRef.current && autoRestartCountRef.current < MAX_AUTO_RESTARTS) {
        autoRestartCountRef.current += 1;
        recognitionBaseTranscriptRef.current = joinSpeechTranscripts(
          recognitionBaseTranscriptRef.current,
          currentSessionFinalRef.current,
        );
        currentSessionFinalRef.current = '';
        setFinalTranscript(recognitionBaseTranscriptRef.current);
        setInterimTranscript('');
        try {
          rec.start();
          return;
        } catch {
          // Fall through to stop
        }
      }
      if (!intentionalStopRef.current && !hasRecognitionResultRef.current) {
        setSttError('Live word detection paused. Keep reading; final recognition will run when you stop.');
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (activeRecognitionItemIdRef.current !== itemIdRef.current) return;
      if (event.error === 'aborted' && intentionalStopRef.current) return;

      if (event.error === 'network') {
        intentionalStopRef.current = true;
        useNative.current = false;
        setSttError('Live word detection is unavailable. Keep reading; final recognition will run when you stop.');
        setPhase('listening');
        return;
      }

      if (event.error === 'no-speech') {
        return;
      }

      const messages: Partial<Record<SpeechRecognitionErrorCode, string>> = {
        'not-allowed': 'Microphone access was denied. Allow microphone access in the browser and try again.',
        'service-not-allowed': 'Browser speech recognition is blocked. Check browser privacy settings and try again.',
        'audio-capture': 'No working microphone was found. Check the selected input device and try again.',
        'language-not-supported': 'English speech recognition is not supported by this browser.',
      };
      intentionalStopRef.current = true;
      setSttError(messages[event.error] ?? `Speech recognition stopped: ${event.error}.`);
    };

    recognitionRef.current = rec;

    return () => {
      activeRecognitionItemIdRef.current = null;
      rec.abort();
    };
  }, []);

  const startListening = useCallback(() => {
    setSttError(null);
    setFinalTranscript('');
    setInterimTranscript('');
    recognitionBaseTranscriptRef.current = '';
    currentSessionFinalRef.current = '';
    hasRecognitionResultRef.current = false;
    liveTranscriptRef.current = '';
    startedAtRef.current = Date.now();
    activeRecognitionItemIdRef.current = item.id;

    if (isIOSNativeQASpeakMockEnabled()) {
      setPhase('listening');
      return;
    }

    void fallbackSTT.startRecording();
    setPhase('listening');

    if (useNative.current && recognitionRef.current) {
      intentionalStopRef.current = false;
      autoRestartCountRef.current = 0;
      try {
        recognitionRef.current.start();
      } catch {
        try {
          recognitionRef.current.abort();
          setTimeout(() => {
            recognitionRef.current?.start();
          }, 100);
        } catch {
          useNative.current = false;
        }
      }
    }
  }, [fallbackSTT, item.id]);

  const stopListening = useCallback(() => {
    if (isIOSNativeQASpeakMockEnabled()) {
      const transcript = getIOSNativeQAVoiceTranscript();
      setInterimTranscript('');
      setFinalTranscript(transcript);
      setPhase(transcript ? 'result' : 'idle');
      return;
    }

    if (useNative.current && recognitionRef.current) {
      intentionalStopRef.current = true;
      recognitionRef.current.stop();
    }
    fallbackSTT.stopRecording();
    setPhase('transcribing');
  }, [fallbackSTT]);

  const handleListen = useCallback(() => {
    window.speechSynthesis.cancel();
    const u = createUtterance(item.text, { rate: speed });
    window.speechSynthesis.speak(u);
  }, [item.text, createUtterance, speed]);

  const handleTryAgain = useCallback(() => {
    setFinalTranscript('');
    setInterimTranscript('');
    setSttError(null);
    lastSavedTranscriptRef.current = '';
    startListening();
  }, [startListening]);

  const getMatchResult = useCallback(
    (text: string) => {
      if (!text) return null;
      return calculateSpeechMatch(item.text, text);
    },
    [item.text],
  );

  const matchResult = getMatchResult(transcript);

  // Save progress when result phase is reached
  useEffect(() => {
    if (phase !== 'result' || !transcript || !matchResult) return;
    if (lastSavedTranscriptRef.current === transcript) return;

    lastSavedTranscriptRef.current = transcript;
    void savePracticeSession(
      {
        id: nanoid(),
        contentId: item.id,
        module,
        startTime: startedAtRef.current,
        endTime: Date.now(),
        totalChars: item.text.length,
        correctChars: matchResult.correct,
        wrongChars: Math.max(matchResult.total - matchResult.correct, 0),
        totalWords: matchResult.total,
        wpm: 0,
        accuracy: matchResult.accuracy,
        completed: true,
      },
      { content: item },
    );
    onCompleted?.();
  }, [phase, item, matchResult, module, onCompleted, transcript]);

  const wordComparison = (() => {
    if (!shouldShowSpeechFeedback(phase, transcript)) return null;
    return buildSpeechWordFeedback(item.text, transcript, phase !== 'result');
  })();

  // Update phase when fallback STT is transcribing
  useEffect(() => {
    if (fallbackSTT.isTranscribing && phase !== 'transcribing') {
      setPhase('transcribing');
    }
  }, [fallbackSTT.isTranscribing, phase]);

  return (
    <div className="space-y-3 pt-2">
      {boundaryPlaybackNotice && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {boundaryPlaybackNotice}
        </div>
      )}

      {sttError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 text-center">
          {sttError}
        </div>
      )}

      {/* Mic button area */}
      <div className="flex items-center justify-center gap-3">
        <div className="relative">
          {/* Pulse rings when listening */}
          {phase === 'listening' && (
            <>
              <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-20" />
              <span
                className="absolute -inset-1 rounded-full border-2 border-red-300 opacity-40"
                style={{ animation: 'pulse 2s ease-in-out infinite' }}
              />
            </>
          )}
          <Button
            data-testid="wordbook-speech-toggle"
            aria-label={phase === 'listening' ? 'Stop wordbook speech practice' : 'Start wordbook speech practice'}
            onClick={phase === 'listening' ? stopListening : startListening}
            disabled={phase === 'transcribing'}
            className={cn(
              'cursor-pointer w-14 h-14 rounded-full transition-all duration-200 relative z-10',
              phase === 'listening'
                ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200'
                : phase === 'transcribing'
                  ? 'bg-amber-500 shadow-lg shadow-amber-200'
                  : 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-200',
            )}
          >
            {phase === 'transcribing' ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : phase === 'listening' ? (
              <MicOff className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </Button>
        </div>
        {module === 'speak' && (
          <Button variant="outline" onClick={handleListen} className="border-indigo-200 text-indigo-600 cursor-pointer">
            <Volume2 className="w-4 h-4 mr-1" /> {t.speak.listen}
          </Button>
        )}
      </div>

      {/* Status hint */}
      <p className="text-xs text-center text-slate-400">
        {phase === 'idle' && t.speak.micHint}
        {phase === 'listening' && (
          <span className="text-red-500 font-medium">
            {t.speak.listening}
            <span className="inline-flex ml-1">
              <span className="animate-bounce" style={{ animationDelay: '0ms' }}>
                .
              </span>
              <span className="animate-bounce" style={{ animationDelay: '150ms' }}>
                .
              </span>
              <span className="animate-bounce" style={{ animationDelay: '300ms' }}>
                .
              </span>
            </span>
          </span>
        )}
        {phase === 'transcribing' && <span className="text-amber-600 font-medium">{t.speak.processing}</span>}
        {phase === 'result' && !transcript && t.speak.noSpeech}
      </p>

      {/* Real-time word highlighting (visible during listening AND result) */}
      {wordComparison && (
        <div data-testid="wordbook-pronunciation-panel" className="bg-slate-50 rounded-lg p-3 text-center space-y-2">
          <p className="sr-only">Wordbook pronunciation panel</p>
          <p className="text-xs text-slate-400">
            {phase === 'listening' ? t.speak.hearingYou : t.speak.yourPronunciation}
          </p>
          <div className="flex flex-wrap justify-center gap-1">
            {wordComparison.map((w, i) => (
              <span
                key={`${w.word}-${i}`}
                className={cn(
                  'px-1.5 py-0.5 rounded text-sm font-medium transition-all duration-200',
                  w.accuracy === 'pending' && 'text-slate-400 bg-slate-100',
                  w.accuracy === 'correct' && 'text-green-700 bg-green-100',
                  w.accuracy === 'close' && 'text-amber-700 bg-amber-100',
                  (w.accuracy === 'wrong' || w.accuracy === 'missing' || w.accuracy === 'extra') &&
                    'text-red-600 bg-red-100',
                )}
                title={
                  w.accuracy === 'pending'
                    ? t.tooltips.notYetSpoken
                    : w.accuracy === 'correct'
                      ? t.tooltips.correct
                      : t.tooltips.youSaid.replace('{{spoken}}', w.recognized || '—')
                }
              >
                {w.word}
              </span>
            ))}
          </div>

          {/* Interim transcript preview while listening */}
          {phase === 'listening' && interimTranscript && (
            <p className="text-xs text-indigo-400 italic truncate">&ldquo;{interimTranscript}&rdquo;</p>
          )}

          {/* Score display (only in result phase) */}
          {phase === 'result' && matchResult && (
            <div className="space-y-1.5 pt-1">
              <p
                className={cn(
                  'text-lg font-bold tabular-nums transition-colors',
                  matchResult.accuracy >= 80
                    ? 'text-green-600'
                    : matchResult.accuracy >= 50
                      ? 'text-yellow-600'
                      : 'text-red-500',
                )}
              >
                {matchResult.accuracy}%
                <span className="text-sm font-normal ml-1.5 text-slate-500">
                  ({matchResult.correct}/{matchResult.total} {t.speak.words})
                </span>
              </p>
              <p className="text-xs text-indigo-500">{encourageByAccuracy(matchResult.accuracy, t.encourage)}</p>
            </div>
          )}
        </div>
      )}

      {/* Try Again button (only in result phase) */}
      {phase === 'result' && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTryAgain}
            className="border-indigo-200 text-indigo-600 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> {t.speak.tryAgain}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Completion Screen ──────────────────────────────────────────────────────

const encourageMessagesEn: Record<string, string> = {
  listen: 'Your ears are getting sharper — come back tomorrow for more!',
  speak: 'Great pronunciation practice — keep the streak going tomorrow!',
  read: 'Awesome reading session — see you again tomorrow!',
  write: 'Your typing is leveling up — come back tomorrow to keep improving!',
};

const encourageMessagesZh: Record<string, string> = {
  listen: '你的听力越来越敏锐了——明天继续加油！',
  speak: '很棒的发音练习——明天继续保持！',
  read: '出色的阅读——明天再来！',
  write: '打字水平在提升——明天继续进步！',
};

const encourageMessagesByLang = { en: encourageMessagesEn, zh: encourageMessagesZh };

function WordBookCompleteScreen({
  module,
  isDailyPlanPractice,
  completedCount,
  total,
  onRestart,
}: {
  module: string;
  isDailyPlanPractice: boolean;
  completedCount: number;
  total: number;
  onRestart: () => void;
}) {
  const lang = useLanguageStore((s) => s.interfaceLanguage);
  const t = WB_LOCALES[lang];
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {isDailyPlanPractice && <PracticeCompleteBanner module={module as 'listen' | 'speak' | 'read' | 'write'} />}
      <Card className="bg-gradient-to-br from-green-50 via-white to-indigo-50 border-green-200 shadow-lg">
        <CardContent className="p-8 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <Trophy className="w-10 h-10 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-indigo-900">{t.completion.title}</h2>
            <p className="text-green-600 mt-2">{encourageMessagesByLang[lang][module]}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-indigo-50 rounded-xl p-4">
              <p className="text-sm text-indigo-500">{t.completion.totalItems}</p>
              <p className="text-2xl font-bold text-indigo-900">{total}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-sm text-green-600">{t.completion.completed}</p>
              <p className="text-2xl font-bold text-green-700">{completedCount}</p>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <Button onClick={onRestart} className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
              <RotateCcw className="w-4 h-4 mr-2" /> {t.completion.practiceAgain}
            </Button>
            <Link href="/dashboard" prefetch={false}>
              <Button variant="outline" className="border-green-300 text-green-700 hover:bg-green-50 cursor-pointer">
                {t.completion.backToDashboard}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function WordBookPractice({ module }: WordBookPracticeProps) {
  const params = useParams();
  const searchParams = useSearchParams();
  const bookId = params.bookId as string;
  const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 0;
  const progressKey = buildWordBookProgressKey(module, bookId, limit);
  const progressScopeByDay = limit > 0;
  const progressDayKey = toLocalDateKey();
  const isDailyPlanPractice = useDailyPlanStore((s) =>
    s.tasks.some((task) => !task.completed && !task.skipped && task.module === module && task.bookId === bookId),
  );

  const [book, setBook] = useState<WordBook | null>(null);
  const [bookInfo, setBookInfo] = useState<BookInfo | null>(null);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [slideClass, setSlideClass] = useState('');
  const [finished, setFinished] = useState(false);
  const [completedItemIds, setCompletedItemIds] = useState<Set<string>>(new Set());
  // Translation & TTS
  const targetLang = useTTSStore((s) => s.targetLang);
  const { speak } = useTTS();

  // Touch handling
  const touchStartX = useRef(0);

  useEffect(() => {
    useTTSStore.getState().hydrate();
  }, []);

  // Load word book and items
  useEffect(() => {
    async function load() {
      // Try static word book first
      const wb = getWordBook(bookId);
      if (wb) {
        setBook(wb);
      } else {
        // Try user-imported book (category is bookId, e.g. "book-xxx")
        // bookId might be "book-xxx" directly from the route
        const actualBookId = bookId.startsWith('book-') ? bookId.slice(5) : bookId;
        const imported = await db.books.get(actualBookId);
        if (imported) {
          setBookInfo({ name: imported.title, emoji: imported.coverEmoji });
        }
      }

      const savedProgress = loadWordBookProgress(progressKey);

      if (wb) {
        // Built-in books must come from the complete source data. Practice
        // sessions also save individual content snapshots into Dexie, but those
        // snapshots are not the full book and must not shadow the source book.
        const wordItems = await loadWordBookItems(bookId);
        const practiceItems: ContentItem[] = wordItems.map((item, i) => ({
          ...item,
          id: `${bookId}-${i}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }));
        const resolved = resolveWordBookPracticeItems({
          availableItems: practiceItems,
          limit,
          savedProgress,
          practicedIds: limit > 0 ? new Set((await db.records.toArray()).map((record) => record.contentId)) : undefined,
          dayKey: progressDayKey,
        });
        setItems(resolved.items);
      } else {
        // User-imported books only exist in Dexie.
        const dbItems = await db.contents.where('category').equals(bookId).toArray();
        if (dbItems.length > 0) {
          const practicedIds =
            limit > 0 ? new Set((await db.records.toArray()).map((record) => record.contentId)) : undefined;
          const resolved = resolveWordBookPracticeItems({
            availableItems: dbItems,
            limit,
            savedProgress,
            practicedIds,
            dayKey: progressDayKey,
          });
          setItems(resolved.items);
        }
      }
      setLoading(false);
    }
    load();
  }, [bookId, limit, progressDayKey, progressKey]);

  useEffect(() => {
    if (loading || items.length === 0) return;

    const saved = loadWordBookProgress(progressKey);
    if (!saved) return;

    const scopedSaved =
      progressScopeByDay && saved.dayKey && saved.dayKey !== progressDayKey
        ? ({
            ...saved,
            currentIndex: 0,
            completedCount: 0,
            completedItemIds: [],
            finished: false,
          } satisfies WordBookPracticeProgressSnapshot)
        : saved;

    const safeIndex = Math.min(Math.max(scopedSaved.currentIndex, 0), Math.max(items.length - 1, 0));
    const itemIds = new Set(items.map((item) => item.id));
    const restoredCompletedIds = Array.isArray(scopedSaved.completedItemIds)
      ? scopedSaved.completedItemIds.filter((id) => itemIds.has(id)).slice(0, items.length)
      : [];
    const safeCompletedCount = Math.min(
      Math.max(restoredCompletedIds.length > 0 ? restoredCompletedIds.length : scopedSaved.completedCount, 0),
      items.length,
    );
    const fallbackCompletedIds = items.slice(0, safeCompletedCount).map((item) => item.id);

    setCurrentIndex(safeIndex);
    setCompletedItemIds(new Set(restoredCompletedIds.length > 0 ? restoredCompletedIds : fallbackCompletedIds));
    setFinished(scopedSaved.finished && safeCompletedCount >= items.length && items.length > 0);
  }, [items, loading, progressDayKey, progressKey, progressScopeByDay]);

  const completedCount = completedItemIds.size;

  useEffect(() => {
    if (loading || items.length === 0) return;

    saveWordBookProgress(progressKey, {
      currentIndex,
      completedCount,
      completedItemIds: Array.from(completedItemIds),
      itemIds: items.map((item) => item.id),
      dayKey: progressScopeByDay ? progressDayKey : undefined,
      finished,
      updatedAt: Date.now(),
    });
  }, [
    completedCount,
    completedItemIds,
    currentIndex,
    finished,
    items,
    loading,
    progressDayKey,
    progressKey,
    progressScopeByDay,
  ]);

  const total = items.length;

  useEffect(() => {
    reportNativeQAState({
      page: 'wordbook-practice',
      module,
      bookId,
      loading,
      hasBook: Boolean(book || bookInfo),
      total,
      currentIndex,
      completedCount,
      finished,
    });
  }, [book, bookId, bookInfo, completedCount, currentIndex, finished, loading, module, total]);

  const currentItem = items[currentIndex];
  const currentItemCompleted = currentItem ? completedItemIds.has(currentItem.id) : false;
  const canAdvance = module !== 'write' || currentItemCompleted;
  const canFinish = canFinishWordBookPractice({ total, completedCount });

  // Navigation with slide animation
  const goToNext = useCallback(
    (options?: { force?: boolean }) => {
      if (module === 'write' && !options?.force && !currentItemCompleted) return;
      if (currentIndex >= total - 1) {
        // Last item — show completion screen
        setFinished(true);
        return;
      }
      setSlideClass('animate-slide-out-left');
      setTimeout(() => {
        setCurrentIndex((i) => i + 1);
        setSlideClass('animate-slide-in-right');
        setTimeout(() => setSlideClass(''), 200);
      }, 150);
    },
    [currentIndex, currentItemCompleted, module, total],
  );

  const handleItemCompleted = useCallback(() => {
    if (!currentItem) return;
    setCompletedItemIds((existing) => {
      if (existing.has(currentItem.id)) return existing;
      const next = new Set(existing);
      next.add(currentItem.id);
      return next;
    });
  }, [currentItem]);

  const goToPrev = useCallback(() => {
    if (currentIndex <= 0) return;
    setSlideClass('animate-slide-out-right');
    setTimeout(() => {
      setCurrentIndex((i) => i - 1);
      setSlideClass('animate-slide-in-left');
      setTimeout(() => setSlideClass(''), 200);
    }, 150);
  }, [currentIndex]);

  // Touch swipe handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const diff = touchStartX.current - e.changedTouches[0].clientX;
      if (Math.abs(diff) > SWIPE_THRESHOLD) {
        if (diff > 0) goToNext();
        else goToPrev();
      }
    },
    [goToNext, goToPrev],
  );

  // Keyboard navigation (not in write mode to avoid input conflicts)
  useEffect(() => {
    if (module === 'write') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goToNext, goToPrev, module]);

  const t = WB_LOCALES[useLanguageStore((s) => s.interfaceLanguage)];
  const config = moduleIcons[module];
  const moduleLabel = t.modules[module];

  if (loading) {
    return <PageSpinner size="sm" className="min-h-[40vh]" />;
  }

  if ((!book && !bookInfo) || items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-4">
        <p className="text-lg text-indigo-400">{t.empty.noItems}</p>
        <p className="text-sm text-indigo-300">{t.empty.importHint}</p>
        <Link href={`/${module}`}>
          <Button variant="outline" className="border-indigo-200 text-indigo-600 cursor-pointer mt-2">
            {t.empty.backTo.replace('{{label}}', moduleLabel)}
          </Button>
        </Link>
      </div>
    );
  }

  if (finished) {
    return (
      <WordBookCompleteScreen
        module={module}
        isDailyPlanPractice={isDailyPlanPractice}
        completedCount={completedCount}
        total={total}
        onRestart={() => {
          clearWordBookProgress(progressKey);
          setFinished(false);
          setCurrentIndex(0);
          setCompletedItemIds(new Set());
        }}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      {!IS_IOS_NATIVE_HOST && (
        <div className="flex items-center gap-3">
          <Link href={`/${module}`}>
            <Button variant="ghost" size="icon" className={cn('cursor-pointer shrink-0', config.backColor)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-indigo-900 truncate">
              {book ? `${book.emoji} ${book.nameEn}` : bookInfo ? `${bookInfo.emoji} ${bookInfo.name}` : bookId}
            </h1>
            <p className="text-xs text-indigo-500">{t.nav.mode.replace('{{label}}', moduleLabel)}</p>
          </div>
          <TranslationBar module={module} />
          <Badge className="bg-indigo-100 text-indigo-600 shrink-0 font-mono">
            {currentIndex + 1} / {total}
          </Badge>
        </div>
      )}

      {/* Progress bar */}
      <div className="w-full bg-indigo-100 rounded-full h-1.5">
        <div
          className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
        />
      </div>

      {/* Swipeable card area */}
      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className="relative overflow-hidden">
        {currentItem && (
          <div className={cn('transition-all duration-150 ease-out', slideClass)}>
            <Card className="bg-white border-indigo-100 shadow-md">
              <CardContent className="p-6 space-y-4">
                {/* Word / Title */}
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <h2 className="text-3xl font-bold text-indigo-900">{currentItem.title}</h2>
                    <button
                      type="button"
                      onClick={() => speak(currentItem.title)}
                      className="text-indigo-400 hover:text-indigo-600 cursor-pointer transition-colors p-1"
                      title={t.tooltips.playWord}
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>
                  <WordDictionaryInfo
                    word={currentItem.title}
                    targetLang={targetLang}
                    module={module}
                    sourceDefinition={currentItem.text}
                  />
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {currentItem.difficulty && (
                      <Badge className={difficultyColors[currentItem.difficulty]} variant="secondary">
                        {currentItem.difficulty}
                      </Badge>
                    )}
                    {currentItem.tags.slice(0, 3).map((tag, index) => (
                      <Badge
                        key={`${currentItem.id}-${tag}-${index}`}
                        variant="outline"
                        className="border-indigo-200 text-indigo-400 text-xs"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Example text / content */}
                <div className="bg-indigo-50/50 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <p
                      data-testid="listen-book-sentence"
                      className="text-indigo-700 leading-relaxed text-center whitespace-pre-wrap"
                    >
                      {currentItem.text}
                    </p>
                    <button
                      type="button"
                      onClick={() => speak(currentItem.text)}
                      className="text-indigo-300 hover:text-indigo-500 cursor-pointer transition-colors shrink-0 p-1"
                      title={t.tooltips.playSentence}
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                  <SentenceTranslation text={currentItem.text} targetLang={targetLang} module={module} />
                </div>

                {/* Mode-specific practice area */}
                {(module === 'listen' || module === 'read') && (
                  <WordBookPlaybackControls
                    key={currentItem.id}
                    item={currentItem}
                    module={module}
                    onCompleted={handleItemCompleted}
                    onPrev={goToPrev}
                    onNext={goToNext}
                  />
                )}
                {module === 'write' && (
                  <WritePractice
                    key={currentItem.id}
                    item={currentItem}
                    onCorrect={() => goToNext({ force: true })}
                    onCompleted={handleItemCompleted}
                  />
                )}
                {(module === 'read' || module === 'speak') && (
                  <ReadSpeakPractice
                    key={currentItem.id}
                    item={currentItem}
                    module={module}
                    onCompleted={handleItemCompleted}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={goToPrev}
          disabled={currentIndex === 0}
          className="border-indigo-200 text-indigo-600 cursor-pointer disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> {t.nav.previous}
        </Button>

        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(7, total) }, (_, i) => {
            const halfRange = 3;
            let dotIndex: number;
            if (total <= 7) {
              dotIndex = i;
            } else if (currentIndex < halfRange) {
              dotIndex = i;
            } else if (currentIndex > total - halfRange - 1) {
              dotIndex = total - 7 + i;
            } else {
              dotIndex = currentIndex - halfRange + i;
            }
            return (
              <button
                key={dotIndex}
                type="button"
                onClick={() => {
                  if (module === 'write' && dotIndex > currentIndex && !canAdvance) return;
                  setCurrentIndex(dotIndex);
                }}
                disabled={module === 'write' && dotIndex > currentIndex && !canAdvance}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  dotIndex === currentIndex ? 'bg-indigo-600 w-4' : 'bg-indigo-200 hover:bg-indigo-300',
                  module === 'write' && dotIndex > currentIndex && !canAdvance
                    ? 'cursor-not-allowed opacity-40 hover:bg-indigo-200'
                    : 'cursor-pointer',
                )}
              />
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={currentIndex === total - 1 ? () => setFinished(true) : () => goToNext()}
          disabled={currentIndex === total - 1 ? !canFinish : !canAdvance}
          className={cn(
            'cursor-pointer',
            currentIndex === total - 1
              ? 'border-green-300 text-green-600 bg-green-50 hover:bg-green-100'
              : 'border-indigo-200 text-indigo-600 disabled:opacity-30',
          )}
        >
          {currentIndex === total - 1 ? t.nav.finish : t.nav.next} <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

export function SingleItemPractice({ item, module, onCompleted }: SingleItemPracticeProps) {
  const t = WB_LOCALES[useLanguageStore((s) => s.interfaceLanguage)];
  const targetLang = useTTSStore((s) => s.targetLang);
  const { speak } = useTTS();

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <TranslationBar module={module} />
      </div>
      <Card className="bg-white border-indigo-100 shadow-md">
        <CardContent className="p-6 space-y-4">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-3xl font-bold text-indigo-900">{item.title}</h2>
              <button
                type="button"
                onClick={() => speak(item.title)}
                className="text-indigo-400 hover:text-indigo-600 cursor-pointer transition-colors p-1"
                title={t.tooltips.playWord}
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>
            <WordDictionaryInfo
              word={item.title}
              targetLang={targetLang}
              module={module}
              sourceDefinition={item.text}
            />
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {item.difficulty && (
                <Badge className={difficultyColors[item.difficulty]} variant="secondary">
                  {item.difficulty}
                </Badge>
              )}
              {item.tags.slice(0, 3).map((tag, index) => (
                <Badge
                  key={`${item.id}-${tag}-${index}`}
                  variant="outline"
                  className="border-indigo-200 text-indigo-400 text-xs"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <div className="bg-indigo-50/50 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-center gap-2">
              <p className="text-indigo-700 leading-relaxed text-center whitespace-pre-wrap">{item.text}</p>
              <button
                type="button"
                onClick={() => speak(item.text)}
                className="text-indigo-300 hover:text-indigo-500 cursor-pointer transition-colors shrink-0 p-1"
                title={t.tooltips.playSentence}
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
            <SentenceTranslation text={item.text} targetLang={targetLang} module={module} />
          </div>

          {(module === 'listen' || module === 'read') && (
            <WordBookPlaybackControls
              item={item}
              module={module}
              onCompleted={onCompleted}
              onPrev={() => {}}
              onNext={() => {}}
            />
          )}
          {module === 'write' && <WritePractice item={item} onCompleted={onCompleted} />}
          {(module === 'read' || module === 'speak') && (
            <ReadSpeakPractice item={item} module={module} onCompleted={onCompleted} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

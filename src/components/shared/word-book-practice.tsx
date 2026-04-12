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
  Pause,
  PenTool,
  Play,
  RotateCcw,
  Trophy,
  Volume2,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PageSpinner } from '@/components/shared/page-spinner';
import { fireConfetti } from '@/components/shared/practice-complete-banner';
import { WordDictionaryInfo } from '@/components/shared/word-dictionary-info';
import { TranslationBar } from '@/components/translation/translation-bar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useFallbackSTT } from '@/hooks/use-fallback-stt';
import { useTTS } from '@/hooks/use-tts';
import { savePracticeSession } from '@/lib/daily-plan-progress';
import { db } from '@/lib/db';
import enWordBook from '@/lib/i18n/messages/word-book-practice/en.json';
import zhWordBook from '@/lib/i18n/messages/word-book-practice/zh.json';
import { IS_TAURI } from '@/lib/tauri';
import { cn } from '@/lib/utils';
import { getWordBook, loadWordBookItems } from '@/lib/wordbooks';
import { useLanguageStore } from '@/stores/language-store';
import { usePracticeTranslationStore } from '@/stores/practice-translation-store';
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
  persistProgress?: boolean;
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

function ListenPractice({
  item,
  persistProgress,
  onCompleted,
}: {
  item: ContentItem;
  persistProgress: boolean;
  onCompleted?: () => void;
}) {
  const t = WB_LOCALES[useLanguageStore((s) => s.interfaceLanguage)];
  const [isPlaying, setIsPlaying] = useState(false);
  const { createUtterance, boundaryPlaybackNotice } = useTTS();
  const speed = useTTSStore((s) => s.speed);
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Reset when item changes
  useEffect(() => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    startedAtRef.current = Date.now();
  }, []);

  const handlePlay = useCallback(() => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      window.speechSynthesis.cancel();
      const u = createUtterance(item.text, { rate: speed });
      startedAtRef.current = Date.now();
      u.onend = () => {
        setIsPlaying(false);
        if (!persistProgress) return;
        void savePracticeSession({
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
        });
        onCompleted?.();
      };
      u.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(u);
      setIsPlaying(true);
    }
  }, [isPlaying, item, createUtterance, onCompleted, persistProgress, speed]);

  return (
    <div className="space-y-3 pt-2">
      {boundaryPlaybackNotice && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {boundaryPlaybackNotice}
        </div>
      )}
      <div className="flex items-center justify-center gap-3">
        <Button
          onClick={handlePlay}
          className={cn(
            'cursor-pointer font-medium px-6',
            isPlaying ? 'bg-slate-700 hover:bg-slate-800' : 'bg-indigo-600 hover:bg-indigo-700',
          )}
        >
          {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
          {isPlaying ? t.listen.pause : t.listen.play}
        </Button>
        <div className="flex gap-1">
          {[0.5, 0.75, 1, 1.25, 1.5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => useTTSStore.getState().setSpeed(s)}
              className={cn(
                'px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer',
                speed === s ? 'bg-indigo-600 text-white' : 'text-indigo-400 hover:bg-indigo-50',
              )}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Write Practice ──────────────────────────────────────────────────────────

function WritePractice({
  item,
  onCorrect,
  persistProgress,
  onCompleted,
}: {
  item: ContentItem;
  onCorrect?: () => void;
  persistProgress: boolean;
  onCompleted?: () => void;
}) {
  const t = WB_LOCALES[useLanguageStore((s) => s.interfaceLanguage)];
  const [typedText, setTypedText] = useState('');
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const startedAtRef = useRef<number>(Date.now());

  // Reset when item changes
  useEffect(() => {
    setTypedText('');
    setResult(null);
    startedAtRef.current = Date.now();
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSubmit = () => {
    const normalized = typedText.trim().toLowerCase();
    const expected = item.text.trim().toLowerCase();
    if (normalized === expected) {
      setResult('correct');
      if (persistProgress) {
        void savePracticeSession({
          id: nanoid(),
          contentId: item.id,
          module: 'write',
          startTime: startedAtRef.current,
          endTime: Date.now(),
          totalChars: item.text.length,
          correctChars: item.text.length,
          wrongChars: 0,
          totalWords: item.text.split(/\s+/).filter(Boolean).length,
          wpm: 0,
          accuracy: 100,
          completed: true,
        });
      }
      setTimeout(() => {
        onCompleted?.();
        onCorrect?.();
      }, 800);
    } else {
      setResult('wrong');
    }
  };

  // Character-by-character feedback
  const expectedChars = item.text.split('');
  const typedChars = typedText.split('');

  return (
    <div className="space-y-3 pt-2">
      {/* Character feedback display */}
      <div className="bg-slate-50 rounded-lg p-3 min-h-[2.5rem] font-mono text-lg text-center tracking-wide">
        {expectedChars.map((char, i) => {
          const isSpace = char === ' ';
          let color = 'text-slate-300';
          if (i < typedChars.length) {
            if (typedChars[i] === char) {
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
  // In Tauri, skip native SpeechRecognition to avoid TCC crash (missing Info.plist in dev mode)
  if (IS_TAURI) return false;
  const w = window as BrowserSpeechRecognition;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
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
  persistProgress,
  onCompleted,
}: {
  item: ContentItem;
  module: 'speak' | 'read';
  persistProgress: boolean;
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
  const MAX_AUTO_RESTARTS = 3;

  const transcript = finalTranscript || interimTranscript;

  // Fallback STT for Tauri / browsers without SpeechRecognition
  const fallbackSTT = useFallbackSTT({
    lang: 'en',
    onTranscript: useCallback((text: string) => {
      setFinalTranscript(text);
      setPhase(text ? 'result' : 'idle');
    }, []),
    onInterimTranscript: useCallback((text: string) => {
      setInterimTranscript(text);
    }, []),
    onError: useCallback((error: string) => {
      setSttError(error);
      setPhase('idle');
    }, []),
  });

  // Reset when item changes
  useEffect(() => {
    setFinalTranscript('');
    setInterimTranscript('');
    setPhase('idle');
    setSttError(null);
    startedAtRef.current = Date.now();
    lastSavedTranscriptRef.current = '';
    intentionalStopRef.current = false;
    autoRestartCountRef.current = 0;
    recognitionRef.current?.abort();
  }, []);

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
      if (final) setFinalTranscript(final);
      setInterimTranscript(interim);
    };

    rec.onend = () => {
      // Auto-restart if user didn't intentionally stop and we haven't exceeded retries
      if (!intentionalStopRef.current && autoRestartCountRef.current < MAX_AUTO_RESTARTS) {
        autoRestartCountRef.current += 1;
        try {
          rec.start();
          return;
        } catch {
          // Fall through to stop
        }
      }
      setPhase((prev) => {
        if (prev === 'listening') return 'result';
        return prev;
      });
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      // 'no-speech' and 'aborted' are recoverable — let onend handle restart
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      setPhase('result');
    };

    recognitionRef.current = rec;

    return () => {
      rec.abort();
    };
  }, []);

  const startListening = useCallback(() => {
    setSttError(null);
    setFinalTranscript('');
    setInterimTranscript('');
    startedAtRef.current = Date.now();

    if (useNative.current && recognitionRef.current) {
      intentionalStopRef.current = false;
      autoRestartCountRef.current = 0;
      try {
        recognitionRef.current.start();
        setPhase('listening');
      } catch {
        try {
          recognitionRef.current.abort();
          setTimeout(() => {
            recognitionRef.current?.start();
            setPhase('listening');
          }, 100);
        } catch {
          // Native failed, try fallback
          void fallbackSTT.startRecording();
          setPhase('listening');
        }
      }
    } else {
      // Use fallback STT (Tauri / unsupported browsers)
      void fallbackSTT.startRecording();
      setPhase('listening');
    }
  }, [fallbackSTT]);

  const stopListening = useCallback(() => {
    if (useNative.current && recognitionRef.current) {
      intentionalStopRef.current = true;
      recognitionRef.current.stop();
      setPhase('result');
    } else {
      fallbackSTT.stopRecording();
      setPhase('transcribing');
    }
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

  // Simple word comparison
  const getMatchResult = useCallback(
    (text: string) => {
      if (!text) return null;
      const expected = item.text
        .toLowerCase()
        .replace(/[^a-z\s']/g, '')
        .split(/\s+/)
        .filter(Boolean);
      const spoken = text
        .toLowerCase()
        .replace(/[^a-z\s']/g, '')
        .split(/\s+/)
        .filter(Boolean);
      const correct = expected.filter((w, i) => spoken[i] === w).length;
      const accuracy = expected.length > 0 ? Math.round((correct / expected.length) * 100) : 0;
      return { accuracy, correct, total: expected.length };
    },
    [item.text],
  );

  const matchResult = getMatchResult(transcript);

  // Save progress when result phase is reached
  useEffect(() => {
    if (phase !== 'result' || !transcript || !matchResult || !persistProgress) return;
    if (lastSavedTranscriptRef.current === transcript) return;

    lastSavedTranscriptRef.current = transcript;
    void savePracticeSession({
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
    });
    onCompleted?.();
  }, [phase, item, matchResult, module, onCompleted, persistProgress, transcript]);

  // Word-by-word comparison for highlighting (works during listening and result)
  const wordComparison = (() => {
    if (!transcript) return null;
    const expected = item.text.split(/\s+/).filter(Boolean);
    const spoken = transcript.split(/\s+/).filter(Boolean);
    return expected.map((word, i) => {
      const spokenWord = spoken[i] || '';
      const clean = (w: string) => w.toLowerCase().replace(/[^a-z']/g, '');
      const isMatched = clean(spokenWord) === clean(word);
      const isReached = i < spoken.length;
      return { word, match: isMatched, spoken: spokenWord, reached: isReached };
    });
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
        <Button variant="outline" onClick={handleListen} className="border-indigo-200 text-indigo-600 cursor-pointer">
          <Volume2 className="w-4 h-4 mr-1" /> {t.speak.listen}
        </Button>
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
        <div className="bg-slate-50 rounded-lg p-3 text-center space-y-2">
          <p className="text-xs text-slate-400">
            {phase === 'listening' ? t.speak.hearingYou : t.speak.yourPronunciation}
          </p>
          <div className="flex flex-wrap justify-center gap-1">
            {wordComparison.map((w, i) => (
              <span
                key={i}
                className={cn(
                  'px-1.5 py-0.5 rounded text-sm font-medium transition-all duration-200',
                  !w.reached && 'text-slate-400 bg-slate-100',
                  w.reached && w.match && 'text-green-700 bg-green-100',
                  w.reached && !w.match && 'text-red-600 bg-red-100',
                )}
                title={
                  !w.reached
                    ? t.tooltips.notYetSpoken
                    : w.match
                      ? t.tooltips.correct
                      : t.tooltips.youSaid.replace('{{spoken}}', w.spoken || '—')
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
  completedCount,
  total,
  onRestart,
}: {
  module: string;
  completedCount: number;
  total: number;
  onRestart: () => void;
}) {
  const lang = useLanguageStore((s) => s.interfaceLanguage);
  const t = WB_LOCALES[lang];
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    fireConfetti();
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
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
            <Link href="/dashboard">
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

  const [book, setBook] = useState<WordBook | null>(null);
  const [bookInfo, setBookInfo] = useState<BookInfo | null>(null);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [persistProgress, setPersistProgress] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [slideClass, setSlideClass] = useState('');
  const [finished, setFinished] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
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

      // First try loading from DB (already imported items)
      const dbItems = await db.contents.where('category').equals(bookId).toArray();
      if (dbItems.length > 0) {
        setItems(limit > 0 ? dbItems.slice(0, limit) : dbItems);
        setPersistProgress(true);
      } else if (wb) {
        // Not imported yet — load directly from wordbook data for practice
        const wordItems = await loadWordBookItems(bookId);
        const practiceItems: ContentItem[] = wordItems.map((item, i) => ({
          ...item,
          id: `${bookId}-${i}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }));
        setItems(limit > 0 ? practiceItems.slice(0, limit) : practiceItems);
        setPersistProgress(false);
      }
      setLoading(false);
    }
    load();
  }, [bookId, limit]);

  const currentItem = items[currentIndex];
  const total = items.length;

  // Navigation with slide animation
  const goToNext = useCallback(() => {
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
  }, [currentIndex, total]);

  const handleItemCompleted = useCallback(() => {
    setCompletedCount((c) => c + 1);
  }, []);

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
        completedCount={completedCount}
        total={total}
        onRestart={() => {
          setFinished(false);
          setCurrentIndex(0);
          setCompletedCount(0);
        }}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
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
                  <WordDictionaryInfo word={currentItem.title} targetLang={targetLang} module={module} />
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {currentItem.difficulty && (
                      <Badge className={difficultyColors[currentItem.difficulty]} variant="secondary">
                        {currentItem.difficulty}
                      </Badge>
                    )}
                    {currentItem.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="border-indigo-200 text-indigo-400 text-xs">
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
                {module === 'listen' && (
                  <ListenPractice
                    item={currentItem}
                    persistProgress={persistProgress}
                    onCompleted={handleItemCompleted}
                  />
                )}
                {module === 'write' && (
                  <WritePractice
                    item={currentItem}
                    onCorrect={goToNext}
                    persistProgress={persistProgress}
                    onCompleted={handleItemCompleted}
                  />
                )}
                {(module === 'read' || module === 'speak') && (
                  <ReadSpeakPractice
                    item={currentItem}
                    module={module}
                    persistProgress={persistProgress}
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
                onClick={() => setCurrentIndex(dotIndex)}
                className={cn(
                  'w-2 h-2 rounded-full transition-all cursor-pointer',
                  dotIndex === currentIndex ? 'bg-indigo-600 w-4' : 'bg-indigo-200 hover:bg-indigo-300',
                )}
              />
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={currentIndex === total - 1 ? () => setFinished(true) : goToNext}
          disabled={false}
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

export function SingleItemPractice({ item, module, persistProgress = true, onCompleted }: SingleItemPracticeProps) {
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
            <WordDictionaryInfo word={item.title} targetLang={targetLang} module={module} />
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {item.difficulty && (
                <Badge className={difficultyColors[item.difficulty]} variant="secondary">
                  {item.difficulty}
                </Badge>
              )}
              {item.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="border-indigo-200 text-indigo-400 text-xs">
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

          {module === 'listen' && (
            <ListenPractice item={item} persistProgress={persistProgress} onCompleted={onCompleted} />
          )}
          {module === 'write' && (
            <WritePractice item={item} persistProgress={persistProgress} onCompleted={onCompleted} />
          )}
          {(module === 'read' || module === 'speak') && (
            <ReadSpeakPractice
              item={item}
              module={module}
              persistProgress={persistProgress}
              onCompleted={onCompleted}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

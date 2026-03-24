'use client';

import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Headphones,
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
import { fireConfetti } from '@/components/shared/practice-complete-banner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTTS } from '@/hooks/use-tts';
import { savePracticeSession } from '@/lib/daily-plan-progress';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';
import { getWordBook, loadWordBookItems } from '@/lib/wordbooks';
import { useTTSStore } from '@/stores/tts-store';
import type { ContentItem } from '@/types/content';
import type { WordBook } from '@/types/wordbook';

// ─── Types ───────────────────────────────────────────────────────────────────

interface WordBookPracticeProps {
  module: 'listen' | 'speak' | 'read' | 'write';
}

interface SingleItemPracticeProps {
  item: ContentItem;
  module: 'listen' | 'speak' | 'read' | 'write';
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

const moduleConfig = {
  listen: { label: 'Listen', icon: Headphones, backColor: 'text-indigo-600' },
  speak: { label: 'Speak', icon: MessageCircle, backColor: 'text-teal-600' },
  read: { label: 'Read', icon: BookOpen, backColor: 'text-blue-600' },
  write: { label: 'Write', icon: PenTool, backColor: 'text-purple-600' },
};

const SWIPE_THRESHOLD = 50;

// ─── Translation Helper ─────────────────────────────────────────────────────

function useItemTranslation(text: string, targetLang: string) {
  const [translation, setTranslation] = useState('');
  const cacheRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
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
  }, [text, targetLang]);

  return translation;
}

function SentenceTranslation({ text, targetLang }: { text: string; targetLang: string }) {
  const translation = useItemTranslation(text, targetLang);
  if (!translation) return null;
  return <p className="text-sm text-indigo-400/80 text-center leading-relaxed">{translation}</p>;
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
  }, [item.id]);

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
          {isPlaying ? 'Pause' : 'Play'}
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
  }, [item.id]);

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
        placeholder="Type the text above..."
        className={cn(
          'text-center text-lg bg-white border-2 transition-colors',
          result === 'correct' && 'border-green-400 bg-green-50',
          result === 'wrong' && 'border-red-400 bg-red-50',
          !result && 'border-indigo-200',
        )}
        autoFocus
      />

      {result === 'correct' && (
        <p className="text-center text-green-600 font-medium text-sm">Correct! Moving to next...</p>
      )}
      {result === 'wrong' && (
        <div className="flex items-center justify-center gap-2">
          <p className="text-center text-red-500 font-medium text-sm">Not quite right. Try again!</p>
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
            Clear
          </Button>
        </div>
      )}
      {!result && typedText.length > 0 && (
        <Button onClick={handleSubmit} className="w-full bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
          Check
        </Button>
      )}
    </div>
  );
}

// ─── Read / Speak Practice ───────────────────────────────────────────────────

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
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { createUtterance, boundaryPlaybackNotice } = useTTS();
  const speed = useTTSStore((s) => s.speed);
  const startedAtRef = useRef<number>(Date.now());
  const lastSavedTranscriptRef = useRef<string>('');

  // Reset when item changes
  useEffect(() => {
    setTranscript('');
    setIsListening(false);
    startedAtRef.current = Date.now();
    lastSavedTranscriptRef.current = '';
    recognitionRef.current?.abort();
  }, [item.id]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const browserWindow = window as BrowserSpeechRecognition;
    const SpeechRecognition = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let result = '';
      for (let i = 0; i < event.results.length; i++) {
        result += event.results[i][0].transcript;
      }
      setTranscript(result);
    };

    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);

    recognitionRef.current = rec;
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      startedAtRef.current = Date.now();
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        // Already started
      }
    }
  }, [isListening]);

  const handleListen = useCallback(() => {
    window.speechSynthesis.cancel();
    const u = createUtterance(item.text, { rate: speed });
    window.speechSynthesis.speak(u);
  }, [item.text, createUtterance, speed]);

  // Simple word comparison
  const getMatchResult = () => {
    if (!transcript) return null;
    const expected = item.text
      .toLowerCase()
      .replace(/[^a-z\s']/g, '')
      .split(/\s+/)
      .filter(Boolean);
    const spoken = transcript
      .toLowerCase()
      .replace(/[^a-z\s']/g, '')
      .split(/\s+/)
      .filter(Boolean);
    const correct = expected.filter((w, i) => spoken[i] === w).length;
    const accuracy = expected.length > 0 ? Math.round((correct / expected.length) * 100) : 0;
    return { accuracy, correct, total: expected.length };
  };

  const matchResult = getMatchResult();

  useEffect(() => {
    if (isListening || !transcript || !matchResult || !persistProgress) return;
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
  }, [isListening, item, matchResult, module, onCompleted, persistProgress, transcript]);

  // Word-by-word comparison for highlighting
  const wordComparison = (() => {
    if (!transcript) return null;
    const expected = item.text.split(/\s+/).filter(Boolean);
    const spoken = transcript.split(/\s+/).filter(Boolean);
    return expected.map((word, i) => {
      const spokenWord = spoken[i] || '';
      const clean = (w: string) => w.toLowerCase().replace(/[^a-z']/g, '');
      const match = clean(spokenWord) === clean(word);
      return { word, match, spoken: spokenWord };
    });
  })();

  return (
    <div className="space-y-3 pt-2">
      {boundaryPlaybackNotice && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {boundaryPlaybackNotice}
        </div>
      )}
      <div className="flex items-center justify-center gap-3">
        <Button
          onClick={toggleListening}
          className={cn(
            'cursor-pointer w-14 h-14 rounded-full transition-colors',
            isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600',
          )}
        >
          {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </Button>
        <Button variant="outline" onClick={handleListen} className="border-indigo-200 text-indigo-600 cursor-pointer">
          <Volume2 className="w-4 h-4 mr-1" /> Listen
        </Button>
      </div>

      {wordComparison && (
        <div className="bg-slate-50 rounded-lg p-3 text-center space-y-2">
          <p className="text-xs text-slate-400">Your pronunciation:</p>
          <div className="flex flex-wrap justify-center gap-1">
            {wordComparison.map((w, i) => (
              <span
                key={i}
                className={cn(
                  'px-1.5 py-0.5 rounded text-sm font-medium',
                  w.match ? 'text-green-700 bg-green-100' : 'text-red-600 bg-red-100',
                )}
                title={w.match ? 'Correct' : `You said: "${w.spoken || '—'}"`}
              >
                {w.word}
              </span>
            ))}
          </div>
          {matchResult && (
            <p
              className={cn(
                'text-sm font-medium',
                matchResult.accuracy >= 80
                  ? 'text-green-600'
                  : matchResult.accuracy >= 50
                    ? 'text-yellow-600'
                    : 'text-red-500',
              )}
            >
              {matchResult.accuracy}% accuracy ({matchResult.correct}/{matchResult.total} words)
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Completion Screen ──────────────────────────────────────────────────────

const encourageMessages: Record<string, string> = {
  listen: 'Your ears are getting sharper — come back tomorrow for more!',
  speak: 'Great pronunciation practice — keep the streak going tomorrow!',
  read: 'Awesome reading session — see you again tomorrow!',
  write: 'Your typing is leveling up — come back tomorrow to keep improving!',
};

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
            <h2 className="text-2xl font-bold text-indigo-900">Session Complete!</h2>
            <p className="text-green-600 mt-2">{encourageMessages[module]}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-indigo-50 rounded-xl p-4">
              <p className="text-sm text-indigo-500">Total Items</p>
              <p className="text-2xl font-bold text-indigo-900">{total}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-sm text-green-600">Completed</p>
              <p className="text-2xl font-bold text-green-700">{completedCount}</p>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <Button onClick={onRestart} className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
              <RotateCcw className="w-4 h-4 mr-2" /> Practice Again
            </Button>
            <Link href="/dashboard">
              <Button variant="outline" className="border-green-300 text-green-700 hover:bg-green-50 cursor-pointer">
                Back to Dashboard
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
  }, [bookId]);

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

  const config = moduleConfig[module];

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-indigo-400">Loading...</div>;
  }

  if ((!book && !bookInfo) || items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-4">
        <p className="text-lg text-indigo-400">No items found in this word book.</p>
        <p className="text-sm text-indigo-300">Import this word book from the Word Books page first.</p>
        <Link href={`/${module}`}>
          <Button variant="outline" className="border-indigo-200 text-indigo-600 cursor-pointer mt-2">
            Back to {config.label}
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
          <p className="text-xs text-indigo-500">{config.label} Mode</p>
        </div>
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
                      title="Play word"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>
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
                    <p className="text-indigo-700 leading-relaxed text-center whitespace-pre-wrap">
                      {currentItem.text}
                    </p>
                    <button
                      type="button"
                      onClick={() => speak(currentItem.text)}
                      className="text-indigo-300 hover:text-indigo-500 cursor-pointer transition-colors shrink-0 p-1"
                      title="Play sentence"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                  <SentenceTranslation text={currentItem.text} targetLang={targetLang} />
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
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
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
          {currentIndex === total - 1 ? 'Finish' : 'Next'} <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

export function SingleItemPractice({ item, module, persistProgress = true, onCompleted }: SingleItemPracticeProps) {
  const targetLang = useTTSStore((s) => s.targetLang);
  const { speak } = useTTS();

  return (
    <Card className="bg-white border-indigo-100 shadow-md">
      <CardContent className="p-6 space-y-4">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-3xl font-bold text-indigo-900">{item.title}</h2>
            <button
              type="button"
              onClick={() => speak(item.title)}
              className="text-indigo-400 hover:text-indigo-600 cursor-pointer transition-colors p-1"
              title="Play word"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>
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
              title="Play sentence"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
          <SentenceTranslation text={item.text} targetLang={targetLang} />
        </div>

        {module === 'listen' && (
          <ListenPractice item={item} persistProgress={persistProgress} onCompleted={onCompleted} />
        )}
        {module === 'write' && (
          <WritePractice item={item} persistProgress={persistProgress} onCompleted={onCompleted} />
        )}
        {(module === 'read' || module === 'speak') && (
          <ReadSpeakPractice item={item} module={module} persistProgress={persistProgress} onCompleted={onCompleted} />
        )}
      </CardContent>
    </Card>
  );
}

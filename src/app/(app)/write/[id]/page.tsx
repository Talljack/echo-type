'use client';

import { useEffect, useState, useReducer, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, RotateCcw, Timer, Target, Trophy, Pause, Play, Languages, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { typingReducer, getInitialState } from '@/hooks/use-typing-reducer';
import { useTranslation } from '@/hooks/use-translation';
import { useTTSStore } from '@/stores/tts-store';
import type { ContentItem } from '@/types/content';

const charColorMap = {
  pending: 'text-slate-400',
  correct: 'text-green-600',
  wrong: 'text-red-500 bg-red-50',
};

const LANG_OPTIONS = [
  { value: 'zh-CN', label: '中文' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
];

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
  const [content, setContent] = useState<ContentItem | null>(null);
  const [state, dispatch] = useReducer(typingReducer, getInitialState());
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetLang = useTTSStore((s) => s.targetLang);
  const setTargetLang = useTTSStore((s) => s.setTargetLang);
  const { translation, isLoading: translationLoading } = useTranslation(
    content?.text || '',
    targetLang,
  );

  useEffect(() => {
    async function load() {
      const item = await db.contents.get(params.id as string);
      if (item) {
        setContent(item);
        dispatch({ type: 'INIT', text: item.text });
      }
    }
    load();
  }, [params.id]);

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


  useEffect(() => {
    if (state.mode === 'finished' && content) {
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
      db.sessions.add(session);
    }
  }, [state.mode, content, state.startTime, state.charStates.length, state.correctCount, state.errorCount, state.wpm, state.accuracy, state.words.length]);

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
    [state.mode, state.isShaking]
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

  const handleReset = () => {
    if (content) {
      dispatch({ type: 'INIT', text: content.text });
    }
    inputRef.current?.focus();
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };


  if (!content) {
    return <div className="flex items-center justify-center h-64 text-indigo-400">Loading...</div>;
  }

  const fullText = state.words.join(' ');
  const chars = fullText.split('');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/write">
          <Button variant="ghost" size="icon" className="text-indigo-600 cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-[var(--font-poppins)] text-indigo-900">{content.title}</h1>
          <p className="text-sm text-indigo-500">{content.type} · Write Mode</p>
        </div>
      </div>

      <Card className="bg-white/70 backdrop-blur-xl border-indigo-100">
        <CardContent className="flex items-center gap-6 py-3 px-5 text-sm">
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
            <span>{state.wpm} WPM</span>
          </div>
          <div className="text-indigo-500">
            {state.completedWords}/{state.words.length} words
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Pause/Resume */}
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


            {/* Translation toggle */}
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 cursor-pointer ${state.showTranslation ? 'text-indigo-600 bg-indigo-50' : 'text-indigo-400'}`}
              onClick={() => dispatch({ type: 'TOGGLE_TRANSLATION' })}
            >
              <Languages className="w-4 h-4" />
            </Button>

            {/* Language selector */}
            {state.showTranslation && (
              <Select value={targetLang} onValueChange={setTargetLang}>
                <SelectTrigger size="sm" className="h-8 w-auto text-xs border-indigo-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANG_OPTIONS.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button variant="outline" size="sm" onClick={handleReset} className="border-indigo-200 text-indigo-600 cursor-pointer">
              <RotateCcw className="w-4 h-4 mr-1" /> Reset
            </Button>
          </div>
        </CardContent>
      </Card>


      {state.mode !== 'finished' ? (
        <div className="relative">
          {/* Translation display */}
          {state.showTranslation && (
            <div className="mb-3 px-2 text-sm text-indigo-400 min-h-[1.5rem]">
              {translationLoading ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Translating...
                </span>
              ) : (
                translation
              )}
            </div>
          )}

          <Card
            className="bg-white/70 backdrop-blur-xl border-indigo-100 cursor-text"
            onClick={focusInput}
          >
            <CardContent className="p-8 relative">
              <div
                className={`text-2xl leading-relaxed font-mono tracking-wide select-none ${
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

                  return (
                    <span
                      key={idx}
                      className={`${charColorMap[charState]} ${
                        isCursor ? 'border-b-2 border-indigo-600' : ''
                      } transition-colors duration-100`}
                    >
                      {char}
                    </span>
                  );
                })}
              </div>

              <input
                ref={inputRef}
                onKeyDown={handleKeyDown}
                className="opacity-0 absolute -z-10 w-0 h-0"
                autoFocus
                aria-label="Typing input"
              />

              {state.mode === 'idle' && (
                <p className="text-center text-indigo-400 mt-6">Click here and start typing...</p>
              )}


              {/* Pause overlay */}
              {state.mode === 'paused' && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl z-10">
                  <p className="text-2xl font-bold text-indigo-900 mb-4">Paused</p>
                  <Button
                    onClick={() => {
                      dispatch({ type: 'RESUME' });
                      inputRef.current?.focus();
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                  >
                    <Play className="w-4 h-4 mr-2" /> Resume
                  </Button>
                  <p className="text-xs text-indigo-400 mt-2">or press Enter</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="bg-white/70 backdrop-blur-xl border-indigo-100">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Trophy className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-indigo-900 font-[var(--font-poppins)]">Session Complete!</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-indigo-50 rounded-xl p-4">
                <p className="text-sm text-indigo-500">Time</p>
                <p className="text-2xl font-bold text-indigo-900">{formatTime(state.elapsedMs)}</p>
              </div>
              <div className="bg-indigo-50 rounded-xl p-4">
                <p className="text-sm text-indigo-500">WPM</p>
                <p className="text-2xl font-bold text-indigo-900">{state.wpm}</p>
              </div>
              <div className="bg-indigo-50 rounded-xl p-4">
                <p className="text-sm text-indigo-500">Accuracy</p>
                <p className={`text-2xl font-bold ${accuracyColor(state.accuracy)}`}>{state.accuracy}%</p>
              </div>
              <div className="bg-indigo-50 rounded-xl p-4">
                <p className="text-sm text-indigo-500">Errors</p>
                <p className="text-2xl font-bold text-indigo-900">{state.errorCount}</p>
              </div>
            </div>

            {state.errorWords.length > 0 && (
              <div>
                <h3 className="font-semibold text-indigo-900 mb-2">Error Words</h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  {state.errorWords.map((word, i) => (
                    <span key={i} className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-sm font-medium">
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <Button onClick={handleReset} className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
                <RotateCcw className="w-4 h-4 mr-2" /> Try Again
              </Button>
              <Link href="/write">
                <Button variant="outline" className="border-indigo-200 text-indigo-600 cursor-pointer">
                  Back to List
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

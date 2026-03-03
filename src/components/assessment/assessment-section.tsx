'use client';

import {
  BookOpen,
  ChevronRight,
  Loader2,
  MessageSquare,
  Minus,
  PenLine,
  RotateCcw,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PROVIDER_REGISTRY } from '@/lib/providers';
import { cn } from '@/lib/utils';
import {
  type AssessmentResult,
  CEFR_DESCRIPTIONS,
  CEFR_LABELS,
  CEFR_ORDER,
  type CEFRLevel,
  levelComparison,
  scoreToLevel,
  useAssessmentStore,
} from '@/stores/assessment-store';
import { useProviderStore } from '@/stores/provider-store';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Question {
  question: string;
  options: [string, string, string, string];
  correct: 'A' | 'B' | 'C' | 'D';
  difficulty: string;
  category: 'vocabulary' | 'grammar' | 'reading';
}

type Phase = 'idle' | 'loading' | 'testing' | 'result';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const LEVEL_COLORS: Record<CEFRLevel, string> = {
  A1: 'bg-red-100 text-red-700 border-red-200',
  A2: 'bg-orange-100 text-orange-700 border-orange-200',
  B1: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  B2: 'bg-blue-100 text-blue-700 border-blue-200',
  C1: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  C2: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const CATEGORY_ICONS = {
  vocabulary: BookOpen,
  grammar: PenLine,
  reading: MessageSquare,
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ─── Loading State ────────────────────────────────────────────────────────────

const LOADING_STEPS = [
  { label: 'Connecting to AI model...', pct: 15 },
  { label: 'Generating vocabulary questions...', pct: 35 },
  { label: 'Generating grammar questions...', pct: 55 },
  { label: 'Generating reading questions...', pct: 75 },
  { label: 'Preparing your assessment...', pct: 90 },
];

const LOADING_TIPS = [
  'The test covers vocabulary, grammar, and reading comprehension.',
  'Questions span 6 difficulty levels: A1 (Beginner) to C2 (Proficiency).',
  'Answer honestly for the most accurate result.',
  'Each question has 4 options — only one is correct.',
  'Your result will include personalized learning tips.',
];

function LoadingState({ onCancel }: { onCancel: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    setTipIndex(Math.floor(Math.random() * LOADING_TIPS.length));

    const stepTimer = setInterval(() => {
      setStepIndex((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
    }, 3000);
    const tipTimer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % LOADING_TIPS.length);
    }, 4000);
    return () => {
      clearInterval(stepTimer);
      clearInterval(tipTimer);
    };
  }, []);

  const step = LOADING_STEPS[stepIndex];

  return (
    <div className="py-6 space-y-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-indigo-500 h-full rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${step.pct}%` }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin flex-shrink-0" />
          <p className="text-xs font-medium text-slate-600 transition-opacity duration-300">{step.label}</p>
        </div>
      </div>

      {/* Tip */}
      <div className="bg-indigo-50/60 rounded-lg px-3.5 py-2.5">
        <p className="text-[11px] text-indigo-600/80 leading-relaxed transition-opacity duration-300">
          {LOADING_TIPS[tipIndex]}
        </p>
      </div>

      {/* Cancel */}
      <div className="text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function AssessmentSection() {
  const { currentLevel, history, setResult } = useAssessmentStore();
  const providerStore = useProviderStore();

  const [phase, setPhase] = useState<Phase>('idle');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ questionIndex: number; correct: boolean }[]>([]);
  const [latestResult, setLatestResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lastResult = history.length > 0 ? history[history.length - 1] : null;

  const startTest = useCallback(async () => {
    setPhase('loading');
    setError(null);
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers([]);
    setLatestResult(null);

    try {
      const config = providerStore.getActiveProviderOrFree();
      const def = PROVIDER_REGISTRY[config.providerId];
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.auth.apiKey) {
        headers[def.headerKey] = config.auth.apiKey;
      } else if (config.auth.accessToken) {
        headers[def.headerKey] = config.auth.accessToken;
      }

      const res = await fetch('/api/assessment', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          provider: config.providerId,
          providerConfigs: providerStore.providers,
          currentLevel: currentLevel, // Pass current level for adaptive testing
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to generate questions (${res.status})`);
      }

      const data = await res.json();
      if (!data.questions?.length) {
        throw new Error('No questions received from AI');
      }

      setQuestions(data.questions);
      setPhase('testing');
    } catch (e) {
      setError((e as Error).message);
      setPhase('idle');
    }
  }, [providerStore, currentLevel]);

  const handleAnswer = useCallback(
    (optionIndex: number) => {
      const q = questions[currentIndex];
      const correctIndex = q.correct.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
      const isCorrect = optionIndex === correctIndex;

      const newAnswers = [...answers, { questionIndex: currentIndex, correct: isCorrect }];
      setAnswers(newAnswers);

      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // Test complete — calculate result
        const totalCorrect = newAnswers.filter((a) => a.correct).length;
        const score = Math.round((totalCorrect / questions.length) * 100);
        const level = scoreToLevel(score);

        // Breakdown by category
        const catCorrect = { vocabulary: 0, grammar: 0, reading: 0 };
        const catTotal = { vocabulary: 0, grammar: 0, reading: 0 };
        questions.forEach((q, i) => {
          const cat = q.category;
          if (catTotal[cat] !== undefined) {
            catTotal[cat]++;
            if (newAnswers[i]?.correct) catCorrect[cat]++;
          }
        });

        const result: AssessmentResult = {
          level,
          score,
          completedAt: Date.now(),
          sessionsAtTest: 0, // Will be set by caller if needed
          answers: newAnswers,
          breakdown: {
            vocabulary: catCorrect.vocabulary,
            grammar: catCorrect.grammar,
            reading: catCorrect.reading,
          },
        };

        // Get total sessions from IndexedDB
        import('@/lib/db')
          .then(({ db }) => {
            db.sessions
              .toArray()
              .then((sessions) => {
                result.sessionsAtTest = sessions.filter((s) => s.completed).length;
                setResult(result);
                setLatestResult(result);
                setPhase('result');
              })
              .catch(() => {
                setResult(result);
                setLatestResult(result);
                setPhase('result');
              });
          })
          .catch(() => {
            setResult(result);
            setLatestResult(result);
            setPhase('result');
          });
      }
    },
    [questions, currentIndex, answers, setResult],
  );

  const cancel = useCallback(() => {
    setPhase('idle');
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers([]);
    setError(null);
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
        <Target className="w-4 h-4 text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-800">English Level</h2>
        {currentLevel && phase === 'idle' && (
          <span
            className={cn('ml-auto px-2.5 py-0.5 rounded-full text-xs font-bold border', LEVEL_COLORS[currentLevel])}
          >
            {currentLevel}
          </span>
        )}
      </div>

      <div className="p-5">
        {/* ─── Idle: Not tested ────────────────────────────────────────── */}
        {phase === 'idle' && !currentLevel && (
          <div className="text-center py-4 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mx-auto">
              <Target className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Assess your English level</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-sm mx-auto">
                Take a quick test (CEFR A1-C2) to get personalized learning recommendations.
              </p>
            </div>
            {error && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>
            )}
            <Button
              onClick={() => void startTest()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
            >
              Start Assessment
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* ─── Idle: Already tested (compact view) ────────────────────── */}
        {phase === 'idle' && currentLevel && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={cn('px-3 py-1.5 rounded-lg text-sm font-bold border', LEVEL_COLORS[currentLevel])}>
                  {currentLevel}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-800">{CEFR_LABELS[currentLevel]}</p>
                  {lastResult && (
                    <p className="text-[11px] text-slate-400">
                      Last tested {timeAgo(lastResult.completedAt)} · Score {lastResult.score}/100
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void startTest()}
                className="border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Retake
              </Button>
            </div>
            {error && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>
            )}
          </div>
        )}

        {/* ─── Loading ────────────────────────────────────────────────── */}
        {phase === 'loading' && <LoadingState onCancel={cancel} />}

        {/* ─── Testing ───────────────────────────────────────────────── */}
        {phase === 'testing' && questions.length > 0 && (
          <div className="space-y-5">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">
                  Question {currentIndex + 1} / {questions.length}
                </span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide',
                    questions[currentIndex].category === 'vocabulary'
                      ? 'bg-blue-50 text-blue-600'
                      : questions[currentIndex].category === 'grammar'
                        ? 'bg-purple-50 text-purple-600'
                        : 'bg-amber-50 text-amber-600',
                  )}
                >
                  {questions[currentIndex].category}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentIndex / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question */}
            <div>
              <p className="text-sm font-medium text-slate-800 leading-relaxed">{questions[currentIndex].question}</p>
            </div>

            {/* Options */}
            <div className="space-y-2">
              {questions[currentIndex].options.map((opt, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => handleAnswer(i)}
                  className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 transition-colors cursor-pointer group"
                >
                  <span className="text-sm text-slate-700 group-hover:text-indigo-700">{opt}</span>
                </button>
              ))}
            </div>

            {/* Cancel */}
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={cancel}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* ─── Result ────────────────────────────────────────────────── */}
        {phase === 'result' && latestResult && (
          <div className="space-y-5">
            {/* Level badge */}
            <div className="text-center space-y-2">
              <span
                className={cn(
                  'inline-block px-6 py-3 rounded-xl text-2xl font-bold border-2',
                  LEVEL_COLORS[latestResult.level],
                )}
              >
                {latestResult.level}
              </span>
              <p className="text-base font-semibold text-slate-800">{CEFR_LABELS[latestResult.level]}</p>
              <p className="text-sm text-slate-500">Score: {latestResult.score} / 100</p>
            </div>

            {/* Level description */}
            <div className="bg-slate-50 rounded-lg p-4 space-y-2.5">
              <p className="text-sm text-slate-700 leading-relaxed">{CEFR_DESCRIPTIONS[latestResult.level].summary}</p>
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">What you can do</p>
                <p className="text-xs text-slate-600 leading-relaxed">{CEFR_DESCRIPTIONS[latestResult.level].canDo}</p>
              </div>
            </div>

            {/* Breakdown with accuracy bars */}
            <div className="space-y-2.5">
              {(['vocabulary', 'grammar', 'reading'] as const).map((cat) => {
                const Icon = CATEGORY_ICONS[cat];
                const catQuestions = questions.filter((q) => q.category === cat);
                const total = catQuestions.length;
                const correct = latestResult.breakdown[cat];
                const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
                const isWeak = total > 0 && pct < 50;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Icon className={cn('w-3.5 h-3.5', isWeak ? 'text-rose-400' : 'text-slate-400')} />
                        <span className="text-xs font-semibold text-slate-600 capitalize">{cat}</span>
                      </div>
                      <span className={cn('text-xs font-bold', isWeak ? 'text-rose-500' : 'text-slate-600')}>
                        {correct}/{total} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className={cn(
                          'h-2 rounded-full transition-all',
                          isWeak ? 'bg-rose-400' : pct >= 80 ? 'bg-emerald-400' : 'bg-indigo-400',
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Personalized analysis */}
            {(() => {
              const cats = (['vocabulary', 'grammar', 'reading'] as const).map((cat) => {
                const total = questions.filter((q) => q.category === cat).length;
                const correct = latestResult.breakdown[cat];
                return { cat, total, correct, pct: total > 0 ? Math.round((correct / total) * 100) : -1 };
              });
              const weakAreas = cats.filter((c) => c.total > 0 && c.pct < 50);
              const strongAreas = cats.filter((c) => c.total > 0 && c.pct >= 80);

              const WEAK_TIPS: Record<string, string> = {
                vocabulary:
                  'Try learning 5-10 new words daily with flashcards. Read graded readers at your level and note unfamiliar words in context.',
                grammar:
                  'Review core grammar rules (tenses, articles, prepositions). Practice with fill-in-the-blank exercises and pay attention to patterns when reading.',
                reading:
                  'Start with short texts (news headlines, short stories) and gradually increase length. Practice skimming for main ideas and scanning for details.',
              };

              const STRONG_TIPS: Record<string, string> = {
                vocabulary: 'Great vocabulary knowledge!',
                grammar: 'Solid grammar foundation!',
                reading: 'Strong reading comprehension!',
              };

              return (
                <div className="space-y-2">
                  {weakAreas.length > 0 && (
                    <div className="bg-rose-50 border border-rose-100 rounded-lg p-3.5 space-y-2">
                      <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wide">
                        Areas to improve
                      </p>
                      {weakAreas.map(({ cat, pct }) => (
                        <div key={cat} className="space-y-0.5">
                          <p className="text-xs font-semibold text-rose-700 capitalize">
                            {cat} — {pct}% correct
                          </p>
                          <p className="text-xs text-rose-600/80 leading-relaxed">{WEAK_TIPS[cat]}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {strongAreas.length > 0 && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3.5 space-y-1">
                      <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide">Strengths</p>
                      {strongAreas.map(({ cat }) => (
                        <p key={cat} className="text-xs text-emerald-700 capitalize">
                          {STRONG_TIPS[cat]}
                        </p>
                      ))}
                    </div>
                  )}
                  {weakAreas.length === 0 && strongAreas.length === 0 && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3.5">
                      <p className="text-xs text-blue-700 leading-relaxed">
                        Balanced performance across all areas. Keep practicing to strengthen each skill!
                      </p>
                    </div>
                  )}
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3.5 space-y-1">
                    <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wide">Next step</p>
                    <p className="text-xs text-indigo-700 leading-relaxed">
                      {CEFR_DESCRIPTIONS[latestResult.level].tip}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Comparison with previous */}
            {history.length > 1 &&
              (() => {
                const prev = history[history.length - 2];
                const comp = levelComparison(prev.level, latestResult.level);
                return (
                  <div
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 rounded-lg border text-sm',
                      comp === 'improved'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : comp === 'declined'
                          ? 'bg-rose-50 border-rose-200 text-rose-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600',
                    )}
                  >
                    {comp === 'improved' ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : comp === 'declined' ? (
                      <TrendingDown className="w-4 h-4" />
                    ) : (
                      <Minus className="w-4 h-4" />
                    )}
                    <span>
                      Previous: <strong>{prev.level}</strong> → Current: <strong>{latestResult.level}</strong>
                      {comp === 'improved' && ' — Great progress!'}
                      {comp === 'same' && ' — Keep practicing!'}
                      {comp === 'declined' && " — Keep going, you'll improve!"}
                    </span>
                  </div>
                );
              })()}

            {/* CEFR scale visualization */}
            <div className="space-y-1.5">
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">CEFR Scale</p>
              <div className="flex gap-1">
                {CEFR_ORDER.map((lvl) => (
                  <div
                    key={lvl}
                    className={cn(
                      'flex-1 py-1.5 rounded text-center text-[10px] font-bold transition-all',
                      lvl === latestResult.level
                        ? cn(LEVEL_COLORS[lvl], 'ring-2 ring-offset-1 ring-indigo-400')
                        : 'bg-slate-100 text-slate-400',
                    )}
                  >
                    {lvl}
                  </div>
                ))}
              </div>
            </div>

            {/* Retake */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setPhase('idle');
                }}
                className="border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

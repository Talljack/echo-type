'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MinusCircle,
  PlusCircle,
  Volume2,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useI18n } from '@/lib/i18n/use-i18n';
import type { WordAccuracy, WordResult } from '@/lib/levenshtein';
import type { PronunciationResult } from '@/lib/pronunciation';
import { PhonemeDisplay } from './phoneme-display';
import { PronunciationTips } from './pronunciation-tips';

const accuracyStyle: Record<
  WordAccuracy,
  {
    bg: string;
    text: string;
    border: string;
    icon: typeof CheckCircle2;
  }
> = {
  correct: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle2 },
  close: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: AlertCircle },
  wrong: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: XCircle },
  missing: { bg: 'bg-gray-50', text: 'text-gray-400', border: 'border-gray-200', icon: MinusCircle },
  extra: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', icon: PlusCircle },
};

const accuracyLabelKeys: Record<WordAccuracy, 'correct' | 'close' | 'wrong' | 'missed' | 'extra'> = {
  correct: 'correct',
  close: 'close',
  wrong: 'wrong',
  missing: 'missed',
  extra: 'extra',
};

interface WordBadgeProps {
  result: WordResult;
  index: number;
  onPlayWord: (word: string) => void;
}

function WordBadge({ result, index, onPlayWord }: WordBadgeProps) {
  const { messages: t } = useI18n('speak');
  const style = accuracyStyle[result.accuracy];
  const hasDetail = result.accuracy !== 'correct';

  const badge = (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      onClick={() => onPlayWord(result.word)}
      className={`
        inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium
        border cursor-pointer transition-shadow duration-200 hover:shadow-md
        ${style.bg} ${style.text} ${style.border}
        ${result.accuracy === 'extra' ? 'line-through opacity-70' : ''}
        ${result.accuracy === 'missing' ? 'opacity-60' : ''}
      `}
    >
      {result.word}
      {result.accuracy !== 'correct' && result.accuracy !== 'extra' && <Volume2 className="w-3 h-3 opacity-50" />}
    </motion.button>
  );

  if (!hasDetail || !result.hint) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent className="max-w-[250px] bg-indigo-900 text-white text-xs px-3 py-2 rounded-lg" sideOffset={6}>
          <p>{result.hint}</p>
          {result.recognized && result.accuracy !== 'extra' && (
            <p className="mt-1 opacity-70">
              {t.pronunciation.youSaid} &ldquo;{result.recognized}&rdquo;
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface PronunciationFeedbackProps {
  results: WordResult[];
  onPlayWord: (word: string) => void;
  pronunciationResult?: PronunciationResult | null;
}

export function PronunciationFeedback({ results, onPlayWord, pronunciationResult }: PronunciationFeedbackProps) {
  const { messages: t } = useI18n('speak');
  const [showDetails, setShowDetails] = useState(false);
  const problemWords = results.filter((r) => r.accuracy !== 'correct' && r.accuracy !== 'extra');

  const accuracyLabels = useMemo<Record<WordAccuracy, string>>(
    () => ({
      correct: t.stats.correct,
      close: t.stats.close,
      wrong: t.stats.wrong,
      missing: t.stats.missed,
      extra: t.stats.extra,
    }),
    [t],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {results.map((r, i) => (
          <WordBadge key={`${r.word}-${i}`} result={r} index={i} onPlayWord={onPlayWord} />
        ))}
      </div>

      <div className="flex gap-3 text-xs text-indigo-500 flex-wrap">
        {(Object.keys(accuracyStyle) as WordAccuracy[]).map((key) => {
          const style = accuracyStyle[key];
          const count = results.filter((r) => r.accuracy === key).length;
          if (count === 0) return null;
          return (
            <span key={key} className="flex items-center gap-1">
              <span className={`w-2.5 h-2.5 rounded-sm ${style.bg} ${style.border} border`} />
              {accuracyLabels[key]} ({count})
            </span>
          );
        })}
      </div>

      {problemWords.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
          >
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showDetails ? t.pronunciation.hideDetails : t.pronunciation.showDetails} {t.pronunciation.detailedFeedback}{' '}
            ({problemWords.length} {t.pronunciation.issues})
          </button>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-2">
                  {problemWords.map((r, i) => {
                    const style = accuracyStyle[r.accuracy];
                    const Icon = style.icon;
                    return (
                      <motion.div
                        key={`detail-${r.word}-${i}`}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${style.bg} ${style.border}`}
                      >
                        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${style.text}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${style.text}`}>{r.word}</span>
                            {r.recognized && (
                              <span className="text-xs text-gray-500">→ &ldquo;{r.recognized}&rdquo;</span>
                            )}
                          </div>
                          {r.hint && <p className="text-xs text-gray-600 mt-0.5">{r.hint}</p>}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 w-8 h-8 text-indigo-500 hover:text-indigo-700 cursor-pointer"
                          onClick={() => onPlayWord(r.word)}
                        >
                          <Volume2 className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {pronunciationResult && pronunciationResult.words.length > 0 && (
        <PhonemeDisplay words={pronunciationResult.words} onPlayWord={onPlayWord} />
      )}

      {pronunciationResult && pronunciationResult.tips.length > 0 && (
        <PronunciationTips tips={pronunciationResult.tips} />
      )}
    </div>
  );
}

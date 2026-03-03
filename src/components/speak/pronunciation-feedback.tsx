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
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { WordAccuracy, WordResult } from '@/lib/levenshtein';

const accuracyConfig: Record<
  WordAccuracy,
  {
    bg: string;
    text: string;
    border: string;
    icon: typeof CheckCircle2;
    label: string;
  }
> = {
  correct: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    icon: CheckCircle2,
    label: 'Correct',
  },
  close: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: AlertCircle, label: 'Close' },
  wrong: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: XCircle, label: 'Wrong' },
  missing: { bg: 'bg-gray-50', text: 'text-gray-400', border: 'border-gray-200', icon: MinusCircle, label: 'Missed' },
  extra: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', icon: PlusCircle, label: 'Extra' },
};

interface WordBadgeProps {
  result: WordResult;
  index: number;
  onPlayWord: (word: string) => void;
}

function WordBadge({ result, index, onPlayWord }: WordBadgeProps) {
  const config = accuracyConfig[result.accuracy];
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
        ${config.bg} ${config.text} ${config.border}
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
            <p className="mt-1 opacity-70">You said: &ldquo;{result.recognized}&rdquo;</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface PronunciationFeedbackProps {
  results: WordResult[];
  onPlayWord: (word: string) => void;
}

export function PronunciationFeedback({ results, onPlayWord }: PronunciationFeedbackProps) {
  const [showDetails, setShowDetails] = useState(false);
  const problemWords = results.filter((r) => r.accuracy !== 'correct' && r.accuracy !== 'extra');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {results.map((r, i) => (
          <WordBadge key={`${r.word}-${i}`} result={r} index={i} onPlayWord={onPlayWord} />
        ))}
      </div>

      <div className="flex gap-3 text-xs text-indigo-500 flex-wrap">
        {Object.entries(accuracyConfig).map(([key, config]) => {
          const count = results.filter((r) => r.accuracy === key).length;
          if (count === 0) return null;
          return (
            <span key={key} className="flex items-center gap-1">
              <span className={`w-2.5 h-2.5 rounded-sm ${config.bg} ${config.border} border`} />
              {config.label} ({count})
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
            {showDetails ? 'Hide' : 'Show'} detailed feedback ({problemWords.length} issues)
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
                    const config = accuracyConfig[r.accuracy];
                    const Icon = config.icon;
                    return (
                      <motion.div
                        key={`detail-${r.word}-${i}`}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${config.bg} ${config.border}`}
                      >
                        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.text}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${config.text}`}>{r.word}</span>
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
    </div>
  );
}

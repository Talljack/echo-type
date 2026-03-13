'use client';

import { Check, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { wordSimilarity } from '@/lib/levenshtein';
import type { FillBlankBlock as FillBlankBlockType } from '@/types/chat';

interface FillBlankBlockProps {
  block: FillBlankBlockType;
  onAnswer?: (correct: boolean, userAnswers: string[]) => void;
}

export function FillBlankBlockComponent({ block, onAnswer }: FillBlankBlockProps) {
  const [userAnswers, setUserAnswers] = useState<string[]>(block.answers.map(() => ''));
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState<('correct' | 'close' | 'wrong')[]>([]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const parts = block.sentence.split(/___/);

  const handleCheck = () => {
    const newResults = userAnswers.map((answer, i) => {
      const expected = block.answers[i];
      if (!expected) return 'wrong' as const;
      const similarity = wordSimilarity(answer.trim(), expected.trim());
      if (similarity >= 0.9) return 'correct' as const;
      if (similarity >= 0.6) return 'close' as const;
      return 'wrong' as const;
    });
    setResults(newResults);
    setChecked(true);
    const allCorrect = newResults.every((r) => r === 'correct');
    onAnswer?.(allCorrect, userAnswers);
  };

  const handleInputChange = (index: number, value: string) => {
    const newAnswers = [...userAnswers];
    newAnswers[index] = value;
    setUserAnswers(newAnswers);
  };

  return (
    <div className="rounded-xl border border-indigo-100 bg-white p-3 space-y-2">
      <div className="text-sm text-slate-700 leading-relaxed flex flex-wrap items-center gap-1">
        {parts.map((part, i) => (
          <span key={i} className="contents">
            <span>{part}</span>
            {i < parts.length - 1 && (
              <span className="inline-flex items-center gap-1">
                <input
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="text"
                  value={userAnswers[i] || ''}
                  onChange={(e) => handleInputChange(i, e.target.value)}
                  disabled={checked}
                  className={`inline-block w-24 px-2 py-0.5 rounded border text-sm text-center ${
                    checked
                      ? results[i] === 'correct'
                        ? 'border-green-300 bg-green-50'
                        : results[i] === 'close'
                          ? 'border-amber-300 bg-amber-50'
                          : 'border-red-300 bg-red-50'
                      : 'border-indigo-200 focus:border-indigo-400 focus:outline-none'
                  }`}
                  placeholder={block.hints?.[i] || '...'}
                />
                {checked && results[i] === 'correct' && <Check className="w-3.5 h-3.5 text-green-600" />}
                {checked && results[i] !== 'correct' && <X className="w-3.5 h-3.5 text-red-500" />}
              </span>
            )}
          </span>
        ))}
      </div>
      {checked && results.some((r) => r !== 'correct') && (
        <div className="text-xs text-slate-500">Answers: {block.answers.join(', ')}</div>
      )}
      {!checked && (
        <button
          type="button"
          onClick={handleCheck}
          disabled={userAnswers.some((a) => !a.trim())}
          className="text-xs px-3 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer disabled:cursor-default transition-colors"
        >
          Check
        </button>
      )}
    </div>
  );
}

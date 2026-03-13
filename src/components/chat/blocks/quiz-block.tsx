'use client';

import { Check, X } from 'lucide-react';
import { useState } from 'react';
import type { QuizBlock as QuizBlockType } from '@/types/chat';

interface QuizBlockProps {
  block: QuizBlockType;
  onAnswer?: (correct: boolean, selectedIndex: number) => void;
}

export function QuizBlockComponent({ block, onAnswer }: QuizBlockProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  const handleSelect = (index: number) => {
    if (answered) return;
    setSelectedIndex(index);
    setAnswered(true);
    const correct = index === block.correctIndex;
    onAnswer?.(correct, index);
  };

  return (
    <div className="rounded-xl border border-indigo-100 bg-white p-3 space-y-2">
      <p className="text-sm font-medium text-indigo-900">{block.question}</p>
      <div className="space-y-1.5">
        {block.options.map((option, i) => {
          const isSelected = selectedIndex === i;
          const isCorrect = i === block.correctIndex;
          let style = 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50';

          if (answered) {
            if (isCorrect) {
              style = 'border-green-300 bg-green-50 text-green-800';
            } else if (isSelected && !isCorrect) {
              style = 'border-red-300 bg-red-50 text-red-800';
            } else {
              style = 'border-slate-100 text-slate-400';
            }
          }

          return (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(i)}
              disabled={answered}
              className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors cursor-pointer disabled:cursor-default flex items-center gap-2 ${style}`}
            >
              <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs shrink-0">
                {answered && isCorrect && <Check className="w-3 h-3 text-green-600" />}
                {answered && isSelected && !isCorrect && <X className="w-3 h-3 text-red-600" />}
                {!answered && String.fromCharCode(65 + i)}
              </span>
              <span>{option}</span>
            </button>
          );
        })}
      </div>
      {answered && block.explanation && (
        <div className="mt-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-800">
          {block.explanation}
        </div>
      )}
    </div>
  );
}

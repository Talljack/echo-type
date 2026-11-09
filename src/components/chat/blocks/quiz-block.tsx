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
    <div className="rounded-xl border border-line bg-surface p-3 space-y-2">
      <p className="text-sm font-medium text-ink">{block.question}</p>
      <div className="space-y-1.5">
        {block.options.map((option, i) => {
          const isSelected = selectedIndex === i;
          const isCorrect = i === block.correctIndex;
          let style = 'border-line hover:border-brand-line hover:bg-brand-soft';

          if (answered) {
            if (isCorrect) {
              style = 'border-success-line bg-success-soft text-success-ink';
            } else if (isSelected && !isCorrect) {
              style = 'border-danger-line bg-danger-soft text-danger-ink';
            } else {
              style = 'border-line text-ink-4';
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
                {answered && isCorrect && <Check className="w-3 h-3 text-success" />}
                {answered && isSelected && !isCorrect && <X className="w-3 h-3 text-danger" />}
                {!answered && String.fromCharCode(65 + i)}
              </span>
              <span>{option}</span>
            </button>
          );
        })}
      </div>
      {answered && block.explanation && (
        <div className="mt-2 px-3 py-2 rounded-lg bg-info-soft border border-info-line text-xs text-info-ink">
          {block.explanation}
        </div>
      )}
    </div>
  );
}

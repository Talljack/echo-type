'use client';

import { ExternalLink } from 'lucide-react';
import type { ExerciseType } from '@/types/chat';

const EXERCISES: { type: ExerciseType; label: string; module: string }[] = [
  { type: 'translation', label: 'Translate', module: '/write' },
  { type: 'fill-blank', label: 'Fill Blank', module: '/write' },
  { type: 'quiz', label: 'Quiz', module: '/read' },
  { type: 'dictation', label: 'Dictation', module: '/listen' },
];

interface ChatModeSelectorProps {
  activeType: ExerciseType | null;
  onSelect: (type: ExerciseType) => void;
  onNavigate?: (path: string) => void;
}

export function ChatModeSelector({ activeType, onSelect, onNavigate }: ChatModeSelectorProps) {
  const activeExercise = EXERCISES.find((ex) => ex.type === activeType);

  return (
    <div className="flex items-center gap-1 px-3 py-1.5">
      <span className="text-[10px] text-ink-4 mr-1">Exercise:</span>
      {EXERCISES.map((ex) => (
        <button
          key={ex.type}
          type="button"
          onClick={() => onSelect(ex.type)}
          className={`text-[10px] px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
            activeType === ex.type
              ? 'bg-brand text-white'
              : 'bg-surface-3 text-ink-3 hover:bg-brand-soft hover:text-brand-ink'
          }`}
        >
          {ex.label}
        </button>
      ))}
      {activeExercise && onNavigate && (
        <button
          type="button"
          onClick={() => onNavigate(activeExercise.module)}
          className="flex items-center gap-0.5 text-[10px] px-2 py-1 rounded-full bg-success-soft text-success hover:bg-success-line cursor-pointer transition-colors ml-auto"
          title={`Open ${activeExercise.module.slice(1)} module`}
        >
          <ExternalLink className="w-2.5 h-2.5" /> Go to {activeExercise.module.slice(1)}
        </button>
      )}
    </div>
  );
}

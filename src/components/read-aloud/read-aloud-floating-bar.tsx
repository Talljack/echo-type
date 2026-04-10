'use client';

import { ChevronDown, ChevronUp, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { useReadAloudStore } from '@/stores/read-aloud-store';
import { useTTSStore } from '@/stores/tts-store';

const SPEED_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface ReadAloudFloatingBarProps {
  onPlay: () => void;
  onPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onRestart?: () => void;
}

export function ReadAloudFloatingBar({ onPlay, onPause, onPrev, onNext }: ReadAloudFloatingBarProps) {
  const isPlaying = useReadAloudStore((s) => s.isPlaying);
  const isActive = useReadAloudStore((s) => s.isActive);
  const words = useReadAloudStore((s) => s.words);
  const currentWordIndex = useReadAloudStore((s) => s.currentWordIndex);
  const { speed, setSpeed } = useTTSStore();

  if (!isActive) return null;

  const progress = words.length > 0 && currentWordIndex >= 0 ? ((currentWordIndex + 1) / words.length) * 100 : 0;

  const speedIndex = SPEED_STEPS.indexOf(speed);
  const handleSpeedUp = () => {
    const nextIdx = SPEED_STEPS.findIndex((s) => s > speed);
    if (nextIdx >= 0) setSpeed(SPEED_STEPS[nextIdx]);
  };
  const handleSpeedDown = () => {
    const prevIdx = [...SPEED_STEPS].reverse().findIndex((s) => s < speed);
    if (prevIdx >= 0) setSpeed([...SPEED_STEPS].reverse()[prevIdx]);
  };

  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-1.5 p-3 bg-white/90 backdrop-blur-xl border border-indigo-100 rounded-2xl shadow-lg shadow-indigo-100/30">
      {/* Previous Sentence */}
      <button
        type="button"
        onClick={onPrev}
        className="w-10 h-10 rounded-xl flex items-center justify-center text-indigo-500 hover:bg-indigo-50 transition-colors cursor-pointer"
        aria-label="Previous sentence"
      >
        <SkipBack className="w-4 h-4" />
      </button>

      {/* Play / Pause */}
      <button
        type="button"
        onClick={isPlaying ? onPause : onPlay}
        className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-500 text-white hover:bg-indigo-600 transition-all cursor-pointer shadow-sm shadow-indigo-200"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
      </button>

      {/* Next Sentence */}
      <button
        type="button"
        onClick={onNext}
        className="w-10 h-10 rounded-xl flex items-center justify-center text-indigo-500 hover:bg-indigo-50 transition-colors cursor-pointer"
        aria-label="Next sentence"
      >
        <SkipForward className="w-4 h-4" />
      </button>

      {/* Divider */}
      <div className="w-6 h-px bg-indigo-100 my-0.5" />

      {/* Speed Control */}
      <div className="flex flex-col items-center gap-0.5">
        <button
          type="button"
          onClick={handleSpeedUp}
          disabled={speedIndex === SPEED_STEPS.length - 1}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-indigo-400 hover:bg-indigo-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default"
          aria-label="Speed up"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs font-bold text-indigo-600 select-none tabular-nums">{speed}x</span>
        <button
          type="button"
          onClick={handleSpeedDown}
          disabled={speedIndex === 0}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-indigo-400 hover:bg-indigo-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default"
          aria-label="Speed down"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Divider */}
      <div className="w-6 h-px bg-indigo-100 my-0.5" />

      {/* Progress ring */}
      <div className="relative w-8 h-8">
        <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="13" fill="none" stroke="#E0E7FF" strokeWidth="2.5" />
          <circle
            cx="16"
            cy="16"
            r="13"
            fill="none"
            stroke="#4F46E5"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${(progress / 100) * 81.68} 81.68`}
            className="transition-all duration-300"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-indigo-600 tabular-nums">
          {Math.round(progress)}
        </span>
      </div>
    </div>
  );
}

'use client';

import { Maximize2, Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { IOS_LIST_CARD_CLASS } from '@/components/shared/ios-native-ui';
import enPracticeUi from '@/lib/i18n/messages/practice-ui/en.json';
import zhPracticeUi from '@/lib/i18n/messages/practice-ui/zh.json';
import { nativeHaptic } from '@/lib/tauri';
import { cn } from '@/lib/utils';
import { useLanguageStore } from '@/stores/language-store';
import { useReadAloudStore } from '@/stores/read-aloud-store';
import { useTTSStore } from '@/stores/tts-store';

const PRACTICE_UI_LOCALES = { en: enPracticeUi, zh: zhPracticeUi } as const;
const SPEED_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface IOSReadAloudControlsProps {
  accentClassName?: string;
  label: string;
  onPlay: () => void;
  onPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onRestart?: () => void;
  progress?: number;
}

export function IOSReadAloudControls({
  accentClassName = 'text-indigo-600',
  label,
  onPlay,
  onPause,
  onPrev,
  onNext,
  onRestart,
  progress: progressOverride,
}: IOSReadAloudControlsProps) {
  const raT = PRACTICE_UI_LOCALES[useLanguageStore((s) => s.interfaceLanguage)].readAloud;
  const isPlaying = useReadAloudStore((s) => s.isPlaying);
  const immersiveMode = useReadAloudStore((s) => s.immersiveMode);
  const toggleImmersiveMode = useReadAloudStore((s) => s.toggleImmersiveMode);
  const words = useReadAloudStore((s) => s.words);
  const currentWordIndex = useReadAloudStore((s) => s.currentWordIndex);
  const { speed, setSpeed } = useTTSStore();

  const ttsProgress = words.length > 0 && currentWordIndex >= 0 ? ((currentWordIndex + 1) / words.length) * 100 : 0;
  const progress = Math.min(100, Math.max(0, progressOverride ?? ttsProgress));

  return (
    <div className={cn(IOS_LIST_CARD_CLASS, 'space-y-4 px-4 py-4')}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className="mt-1 text-sm text-slate-500">
            {Math.round(progress)}% {raT.progress.toLowerCase()}
          </p>
        </div>
        <div className="min-w-[5.5rem] rounded-full bg-slate-100 px-3 py-2 text-center text-sm font-semibold text-slate-700 tabular-nums">
          {speed}x
        </div>
      </div>

      <div
        role="progressbar"
        aria-label={`${label} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        className="h-2 overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className={cn(
            'h-full rounded-full bg-[linear-gradient(90deg,rgba(79,70,229,0.95)_0%,rgba(129,140,248,0.9)_100%)] transition-all duration-300',
            accentClassName.includes('orange') &&
              'bg-[linear-gradient(90deg,rgba(249,115,22,0.92)_0%,rgba(251,146,60,0.88)_100%)]',
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="grid grid-cols-5 gap-2">
        <button
          type="button"
          onClick={() => {
            nativeHaptic('light');
            onPrev();
          }}
          className="flex h-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition active:scale-[0.97]"
          aria-label={raT.previousSentence}
        >
          <SkipBack className="h-4.5 w-4.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            nativeHaptic('light');
            (onRestart ?? onPrev)();
          }}
          disabled={!onRestart}
          className="flex h-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition active:scale-[0.97] disabled:opacity-40"
          aria-label="Restart"
        >
          <RotateCcw className="h-4.5 w-4.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            nativeHaptic(isPlaying ? 'light' : 'medium');
            (isPlaying ? onPause : onPlay)();
          }}
          className={cn(
            'flex h-11 items-center justify-center rounded-2xl text-white shadow-[0_12px_28px_rgba(79,70,229,0.24)] transition active:scale-[0.97]',
            accentClassName.includes('orange')
              ? 'bg-[linear-gradient(135deg,#f97316_0%,#fb923c_100%)] shadow-[0_12px_28px_rgba(249,115,22,0.24)]'
              : 'bg-[linear-gradient(135deg,#4f46e5_0%,#6366f1_100%)]',
          )}
          aria-label={isPlaying ? raT.pause : raT.play}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={() => {
            nativeHaptic('light');
            onNext();
          }}
          className="flex h-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition active:scale-[0.97]"
          aria-label={raT.nextSentence}
        >
          <SkipForward className="h-4.5 w-4.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            nativeHaptic('light');
            toggleImmersiveMode();
          }}
          className="flex h-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition active:scale-[0.97]"
          aria-label={immersiveMode ? raT.exitImmersive : raT.immersiveMode}
        >
          <Maximize2 className="h-4.5 w-4.5" />
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {SPEED_STEPS.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => {
              nativeHaptic('light');
              setSpeed(step);
            }}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
              speed === step ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100',
            )}
          >
            {step}x
          </button>
        ))}
      </div>
    </div>
  );
}

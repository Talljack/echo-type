'use client';

import { Maximize2, Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import enPracticeUi from '@/lib/i18n/messages/practice-ui/en.json';
import zhPracticeUi from '@/lib/i18n/messages/practice-ui/zh.json';
import { cn } from '@/lib/utils';
import { useLanguageStore } from '@/stores/language-store';
import { useReadAloudStore } from '@/stores/read-aloud-store';
import { useTTSStore } from '@/stores/tts-store';

const PRACTICE_UI_LOCALES = { en: enPracticeUi, zh: zhPracticeUi } as const;
const SPEED_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface ReadAloudInlineControlsProps {
  accentClassName?: string;
  children?: React.ReactNode;
  className?: string;
  label: string;
  onPlay: () => void;
  onPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onRestart?: () => void;
  showImmersive?: boolean;
  showProgress?: boolean;
}

export function ReadAloudInlineControls({
  accentClassName = 'text-indigo-600',
  children,
  className,
  label,
  onPlay,
  onPause,
  onPrev,
  onNext,
  onRestart,
  showImmersive = true,
  showProgress = true,
}: ReadAloudInlineControlsProps) {
  const raT = PRACTICE_UI_LOCALES[useLanguageStore((s) => s.interfaceLanguage)].readAloud;
  const isPlaying = useReadAloudStore((s) => s.isPlaying);
  const immersiveMode = useReadAloudStore((s) => s.immersiveMode);
  const toggleImmersiveMode = useReadAloudStore((s) => s.toggleImmersiveMode);
  const words = useReadAloudStore((s) => s.words);
  const currentWordIndex = useReadAloudStore((s) => s.currentWordIndex);
  const { speed, setSpeed } = useTTSStore();

  const progress =
    words.length > 0 && currentWordIndex >= 0
      ? Math.min(100, Math.max(0, ((currentWordIndex + 1) / words.length) * 100))
      : 0;

  return (
    <div
      data-testid="read-aloud-inline-controls"
      className={cn('rounded-2xl border border-slate-200 bg-slate-50/95 p-3 shadow-sm backdrop-blur', className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
          {showProgress ? (
            <p className="mt-1 text-sm text-slate-500">
              {Math.round(progress)}% {raT.progress.toLowerCase()}
            </p>
          ) : null}
        </div>
        <div className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm tabular-nums">
          {speed}x
        </div>
      </div>

      {showProgress ? (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
          <div
            className={cn(
              'h-full rounded-full bg-[linear-gradient(90deg,rgba(79,70,229,0.96)_0%,rgba(129,140,248,0.92)_100%)] transition-all duration-300',
              accentClassName.includes('orange') &&
                'bg-[linear-gradient(90deg,rgba(249,115,22,0.94)_0%,rgba(251,146,60,0.9)_100%)]',
            )}
            style={{ width: `${Math.max(progress, 4)}%` }}
          />
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Button type="button" variant="outline" size="icon" onClick={onPrev} aria-label={raT.previousSentence}>
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onRestart ?? onPrev}
          aria-label="Restart"
          disabled={!onRestart}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          onClick={isPlaying ? onPause : onPlay}
          className={cn(
            'min-w-28 gap-2 shadow-sm',
            accentClassName.includes('orange')
              ? 'bg-orange-500 hover:bg-orange-600 text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white',
          )}
          aria-label={isPlaying ? raT.pause : raT.play}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
          {isPlaying ? raT.pause : raT.play}
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={onNext} aria-label={raT.nextSentence}>
          <SkipForward className="h-4 w-4" />
        </Button>
        {showImmersive ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={toggleImmersiveMode}
            aria-label={immersiveMode ? raT.exitImmersive : raT.immersiveMode}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {SPEED_STEPS.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => setSpeed(step)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
              speed === step ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100',
            )}
          >
            {step}x
          </button>
        ))}
      </div>

      {children ? <div className="mt-3 border-t border-slate-200 pt-3">{children}</div> : null}
    </div>
  );
}

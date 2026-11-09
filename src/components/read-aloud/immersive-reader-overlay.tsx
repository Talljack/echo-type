'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Minimize2, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { splitContentBlocks } from '@/lib/content-format';
import enPracticeUi from '@/lib/i18n/messages/practice-ui/en.json';
import zhPracticeUi from '@/lib/i18n/messages/practice-ui/zh.json';
import { cn } from '@/lib/utils';
import { useLanguageStore } from '@/stores/language-store';
import { useReadAloudStore } from '@/stores/read-aloud-store';
import { useTTSStore } from '@/stores/tts-store';

const PRACTICE_UI_LOCALES = { en: enPracticeUi, zh: zhPracticeUi } as const;

const SPEED_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface ImmersiveReaderOverlayProps {
  text: string;
  onPlay: () => void;
  onPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onWordClick?: (word: string) => void;
}

function ImmersiveWordButton({
  word,
  globalIndex,
  currentWordIndex,
  wordProgress,
  isActiveSentence,
  isRead,
  isPlaying,
}: {
  word: string;
  globalIndex: number;
  currentWordIndex: number;
  wordProgress: number;
  isActiveSentence: boolean;
  isRead: boolean;
  isPlaying: boolean;
}) {
  const isCurrent = isPlaying && globalIndex === currentWordIndex;
  const fillPercent = isCurrent ? Math.round(wordProgress * 100) : 0;

  return (
    <span
      className={cn(
        'inline-block rounded-lg px-1.5 py-1 transition-[color,scale] duration-300 ease-out',
        isCurrent
          ? 'font-bold text-ink scale-[1.08]'
          : isRead
            ? 'text-brand-muted/70'
            : isActiveSentence
              ? 'text-surface'
              : 'text-ink-4/60',
      )}
      style={
        isCurrent
          ? {
              // The lesson studio's highlighter: the stronger yellow fills the word as it is spoken. No glow.
              background: `linear-gradient(to right, var(--highlight) ${fillPercent}%, var(--highlight-soft) ${fillPercent}%)`,
            }
          : undefined
      }
    >
      {word}
    </span>
  );
}

export function ImmersiveReaderOverlay({
  text,
  onPlay,
  onPause,
  onPrev,
  onNext,
  onWordClick,
}: ImmersiveReaderOverlayProps) {
  const raT = PRACTICE_UI_LOCALES[useLanguageStore((s) => s.interfaceLanguage)].readAloud;
  const immersiveMode = useReadAloudStore((s) => s.immersiveMode);
  const isPlaying = useReadAloudStore((s) => s.isPlaying);
  const isActive = useReadAloudStore((s) => s.isActive);
  const currentWordIndex = useReadAloudStore((s) => s.currentWordIndex);
  const currentSentenceIndex = useReadAloudStore((s) => s.currentSentenceIndex);
  const sentences = useReadAloudStore((s) => s.sentences);
  const words = useReadAloudStore((s) => s.words);
  const wordProgress = useReadAloudStore((s) => s.wordProgress);
  const setImmersiveMode = useReadAloudStore((s) => s.setImmersiveMode);
  const { speed, setSpeed } = useTTSStore();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeSentenceRef = useRef<HTMLDivElement>(null);

  const contentBlocks = useMemo(() => splitContentBlocks(text), [text]);

  const getSentenceIndex = useCallback(
    (globalWordIndex: number): number => {
      return sentences.findIndex((s) => globalWordIndex >= s.startWordIndex && globalWordIndex <= s.endWordIndex);
    },
    [sentences],
  );

  useEffect(() => {
    if (immersiveMode && activeSentenceRef.current) {
      activeSentenceRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [immersiveMode]);

  useEffect(() => {
    if (!immersiveMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setImmersiveMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [immersiveMode, setImmersiveMode]);

  const progress = words.length > 0 && currentWordIndex >= 0 ? ((currentWordIndex + 1) / words.length) * 100 : 0;

  const handleSpeedUp = () => {
    const nextIdx = SPEED_STEPS.findIndex((s) => s > speed);
    if (nextIdx >= 0) setSpeed(SPEED_STEPS[nextIdx]);
  };
  const handleSpeedDown = () => {
    const prevIdx = [...SPEED_STEPS].reverse().findIndex((s) => s < speed);
    if (prevIdx >= 0) setSpeed([...SPEED_STEPS].reverse()[prevIdx]);
  };

  if (!isActive) return null;

  return (
    <AnimatePresence>
      {immersiveMode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="fixed inset-0 z-[100] flex flex-col bg-ink/90 backdrop-blur-2xl"
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="h-1 w-48 rounded-full bg-ink overflow-hidden">
                <div
                  className="h-full w-full origin-left rounded-full bg-brand transition-transform duration-300"
                  style={{ transform: `scaleX(${progress / 100})` }}
                />
              </div>
              <span className="text-xs text-ink-4 tabular-nums">{Math.round(progress)}%</span>
            </div>
            <button
              type="button"
              onClick={() => setImmersiveMode(false)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-ink-4 hover:text-white hover:bg-ink transition-colors cursor-pointer"
              aria-label={raT.exitImmersive}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content area */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-8 md:px-16 lg:px-32 py-8 scroll-smooth">
            <div className="max-w-3xl mx-auto space-y-8">
              {contentBlocks.map((block) => {
                const blockSentenceIdx = getSentenceIndex(block.wordStart);
                const isActiveSentenceBlock = currentSentenceIndex >= 0 && blockSentenceIdx === currentSentenceIndex;

                return (
                  <div
                    key={block.id}
                    ref={isActiveSentenceBlock ? activeSentenceRef : undefined}
                    className={cn(
                      block.kind === 'title'
                        ? 'text-3xl md:text-4xl font-bold text-white leading-tight'
                        : block.kind === 'label'
                          ? 'text-sm font-semibold tracking-[0.2em] text-ink-3'
                          : block.kind === 'quote'
                            ? 'border-l-3 border-brand/50 pl-6 italic text-xl md:text-2xl leading-relaxed'
                            : 'text-xl md:text-2xl leading-[2.2] text-surface',
                    )}
                  >
                    <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-3">
                      {block.words.map((word, localIndex) => {
                        const globalIndex = block.wordStart + localIndex;
                        const wordSentenceIdx = getSentenceIndex(globalIndex);
                        const isRead = isPlaying && currentWordIndex >= 0 && globalIndex < currentWordIndex;
                        const isInActiveSentence =
                          isPlaying && currentSentenceIndex >= 0 && wordSentenceIdx === currentSentenceIndex;

                        return (
                          <ImmersiveWordButton
                            key={`imm-${block.id}-${globalIndex}`}
                            word={word}
                            globalIndex={globalIndex}
                            currentWordIndex={currentWordIndex}
                            wordProgress={wordProgress}
                            isActiveSentence={isInActiveSentence}
                            isRead={isRead}
                            isPlaying={isPlaying}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom control bar */}
          <div className="flex items-center justify-center gap-4 px-6 py-5 border-t border-ink-4/50">
            {/* Speed down */}
            <button
              type="button"
              onClick={handleSpeedDown}
              disabled={SPEED_STEPS.indexOf(speed) === 0}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-ink-4 hover:text-white hover:bg-ink transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default"
              aria-label={raT.speedDown}
            >
              <ChevronDown className="w-4 h-4" />
            </button>

            <span className="text-sm font-bold text-brand-muted select-none tabular-nums w-10 text-center">
              {speed}x
            </span>

            {/* Speed up */}
            <button
              type="button"
              onClick={handleSpeedUp}
              disabled={SPEED_STEPS.indexOf(speed) === SPEED_STEPS.length - 1}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-ink-4 hover:text-white hover:bg-ink transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default"
              aria-label={raT.speedUp}
            >
              <ChevronUp className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-ink mx-2" />

            {/* Prev */}
            <button
              type="button"
              onClick={onPrev}
              className="w-11 h-11 rounded-xl flex items-center justify-center text-ink-4 hover:text-white hover:bg-ink transition-colors cursor-pointer"
              aria-label={raT.previousSentence}
            >
              <SkipBack className="w-5 h-5" />
            </button>

            {/* Play/Pause */}
            <button
              type="button"
              onClick={isPlaying ? onPause : onPlay}
              className="w-14 h-14 rounded-2xl flex items-center justify-center bg-brand text-white hover:bg-brand-muted transition-colors cursor-pointer shadow-lg shadow-brand/30"
              aria-label={isPlaying ? raT.pause : raT.play}
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </button>

            {/* Next */}
            <button
              type="button"
              onClick={onNext}
              className="w-11 h-11 rounded-xl flex items-center justify-center text-ink-4 hover:text-white hover:bg-ink transition-colors cursor-pointer"
              aria-label={raT.nextSentence}
            >
              <SkipForward className="w-5 h-5" />
            </button>

            <div className="w-px h-6 bg-ink mx-2" />

            {/* Exit immersive */}
            <button
              type="button"
              onClick={() => setImmersiveMode(false)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-ink-4 hover:text-white hover:bg-ink transition-colors cursor-pointer"
              aria-label={raT.exitImmersive}
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

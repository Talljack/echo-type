'use client';

import { useCallback, useEffect, useRef } from 'react';
import { type ContentBlock, splitContentBlocks } from '@/lib/content-format';
import { cn } from '@/lib/utils';
import { useReadAloudStore } from '@/stores/read-aloud-store';

interface ReadAloudContentProps {
  text: string;
  onWordClick?: (word: string) => void;
  showTranslation?: boolean;
  sentenceTranslations?: Array<{ startWordIndex: number; endWordIndex: number; translation: string }> | null;
}

function WordButton({
  word,
  globalIndex,
  currentWordIndex,
  currentSentenceIndex,
  sentenceIndex,
  wordProgress,
  isPlaying,
  onClick,
}: {
  word: string;
  globalIndex: number;
  currentWordIndex: number;
  currentSentenceIndex: number;
  sentenceIndex: number;
  wordProgress: number;
  isPlaying: boolean;
  onClick?: (word: string) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const isCurrent = isPlaying && globalIndex === currentWordIndex;
  const isRead = isPlaying && currentWordIndex >= 0 && globalIndex < currentWordIndex;
  const isActiveSentence = isPlaying && currentSentenceIndex >= 0 && sentenceIndex === currentSentenceIndex;

  useEffect(() => {
    if (isCurrent && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isCurrent]);

  const fillPercent = isCurrent ? Math.round(wordProgress * 100) : 0;

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onClick?.(word)}
      className={cn(
        'inline-block rounded-md px-1 py-0.5 cursor-pointer transition-all duration-300 ease-out',
        isCurrent
          ? 'font-semibold scale-[1.06] text-white'
          : isRead
            ? 'text-indigo-400'
            : isActiveSentence
              ? 'text-slate-800'
              : 'text-inherit hover:bg-slate-100 hover:text-slate-900',
      )}
      style={
        isCurrent
          ? {
              background: `linear-gradient(to right, #4F46E5 ${fillPercent}%, #818CF8 ${fillPercent}%)`,
              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)',
            }
          : undefined
      }
    >
      {word}
    </button>
  );
}

function SentenceBlock({
  block,
  currentSentenceIndex,
  currentWordIndex,
  wordProgress,
  isPlaying,
  getSentenceIndex,
  onWordClick,
  translation,
}: {
  block: ContentBlock;
  currentSentenceIndex: number;
  currentWordIndex: number;
  wordProgress: number;
  isPlaying: boolean;
  getSentenceIndex: (globalWordIndex: number) => number;
  onWordClick?: (word: string) => void;
  translation: string | null;
}) {
  return (
    <div>
      <div
        className={
          block.kind === 'title'
            ? 'text-xl font-semibold text-slate-900 leading-tight'
            : block.kind === 'label'
              ? 'text-xs font-semibold tracking-[0.2em] text-slate-400'
              : block.kind === 'quote'
                ? 'border-l-2 border-slate-200 pl-4 italic text-slate-600'
                : 'text-[17px] leading-8 text-slate-700'
        }
      >
        <div className="flex flex-wrap items-baseline gap-x-1 gap-y-2">
          {block.words.map((word, localIndex) => {
            const globalIndex = block.wordStart + localIndex;
            const wordSentenceIndex = getSentenceIndex(globalIndex);
            return (
              <WordButton
                key={`${block.id}-${globalIndex}`}
                word={word}
                globalIndex={globalIndex}
                currentWordIndex={currentWordIndex}
                currentSentenceIndex={currentSentenceIndex}
                sentenceIndex={wordSentenceIndex}
                wordProgress={wordProgress}
                isPlaying={isPlaying}
                onClick={onWordClick}
              />
            );
          })}
        </div>
      </div>
      {translation && <p className="text-sm text-indigo-400 leading-relaxed mt-1 pl-0.5">{translation}</p>}
    </div>
  );
}

export function ReadAloudContent({ text, onWordClick, showTranslation, sentenceTranslations }: ReadAloudContentProps) {
  const currentWordIndex = useReadAloudStore((s) => s.currentWordIndex);
  const currentSentenceIndex = useReadAloudStore((s) => s.currentSentenceIndex);
  const isPlaying = useReadAloudStore((s) => s.isPlaying);
  const sentences = useReadAloudStore((s) => s.sentences);
  const wordProgress = useReadAloudStore((s) => s.wordProgress);

  const contentBlocks = splitContentBlocks(text);

  const getSentenceIndex = useCallback(
    (globalWordIndex: number): number => {
      return sentences.findIndex((s) => globalWordIndex >= s.startWordIndex && globalWordIndex <= s.endWordIndex);
    },
    [sentences],
  );

  const getTranslationForBlock = useCallback(
    (block: ContentBlock): string | null => {
      if (!showTranslation || !sentenceTranslations?.length) return null;
      const translations = sentenceTranslations.filter(
        (t) => t.startWordIndex >= block.wordStart && t.startWordIndex <= block.wordEnd,
      );
      if (translations.length === 0) return null;
      return translations.map((t) => t.translation).join(' ');
    },
    [showTranslation, sentenceTranslations],
  );

  return (
    <div className="space-y-4" data-testid="read-aloud-content">
      {contentBlocks.map((block) => {
        const translation = getTranslationForBlock(block);
        return (
          <SentenceBlock
            key={block.id}
            block={block}
            currentSentenceIndex={currentSentenceIndex}
            currentWordIndex={currentWordIndex}
            wordProgress={wordProgress}
            isPlaying={isPlaying}
            getSentenceIndex={getSentenceIndex}
            onWordClick={onWordClick}
            translation={translation}
          />
        );
      })}
    </div>
  );
}

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
  onClick,
}: {
  word: string;
  globalIndex: number;
  currentWordIndex: number;
  currentSentenceIndex: number;
  sentenceIndex: number;
  onClick?: (word: string) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const isCurrent = globalIndex === currentWordIndex;
  const isRead = currentWordIndex >= 0 && globalIndex < currentWordIndex;
  const isActiveSentence = currentSentenceIndex >= 0 && sentenceIndex === currentSentenceIndex;

  useEffect(() => {
    if (isCurrent && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isCurrent]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onClick?.(word)}
      className={cn(
        'inline-block rounded-md px-0.5 py-0.5 cursor-pointer transition-all duration-150',
        isCurrent
          ? 'bg-indigo-500 text-white font-semibold shadow-sm shadow-indigo-300 scale-105'
          : isRead
            ? 'text-slate-400'
            : isActiveSentence
              ? 'bg-indigo-50 text-indigo-900'
              : 'text-inherit hover:bg-slate-100 hover:text-slate-900',
      )}
    >
      {word}
    </button>
  );
}

export function ReadAloudContent({ text, onWordClick, showTranslation, sentenceTranslations }: ReadAloudContentProps) {
  const currentWordIndex = useReadAloudStore((s) => s.currentWordIndex);
  const currentSentenceIndex = useReadAloudStore((s) => s.currentSentenceIndex);
  const sentences = useReadAloudStore((s) => s.sentences);

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
          <div key={block.id}>
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
                  const sentenceIndex = getSentenceIndex(globalIndex);
                  return (
                    <WordButton
                      key={`${block.id}-${globalIndex}`}
                      word={word}
                      globalIndex={globalIndex}
                      currentWordIndex={currentWordIndex}
                      currentSentenceIndex={currentSentenceIndex}
                      sentenceIndex={sentenceIndex}
                      onClick={onWordClick}
                    />
                  );
                })}
              </div>
            </div>
            {translation && <p className="text-sm text-indigo-400 leading-relaxed mt-1 pl-0.5">{translation}</p>}
          </div>
        );
      })}
    </div>
  );
}

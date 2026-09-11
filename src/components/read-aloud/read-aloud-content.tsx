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

function SelectableWord({
  word,
  globalIndex,
  currentWordIndex,
  currentSentenceIndex,
  sentenceIndex,
  isPlaying,
  onClick,
}: {
  word: string;
  globalIndex: number;
  currentWordIndex: number;
  currentSentenceIndex: number;
  sentenceIndex: number;
  isPlaying: boolean;
  onClick?: (word: string) => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isCurrent = currentWordIndex >= 0 && globalIndex === currentWordIndex;
  const isRead = currentWordIndex >= 0 && globalIndex < currentWordIndex;
  const isActiveSentence = currentSentenceIndex >= 0 && sentenceIndex === currentSentenceIndex;

  useEffect(() => {
    if (isCurrent && isPlaying && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isCurrent, isPlaying]);

  return (
    <span
      ref={ref}
      role="button"
      tabIndex={0}
      data-read-aloud-word={globalIndex}
      onClick={() => {
        if (window.getSelection()?.isCollapsed !== false) onClick?.(word);
      }}
      onKeyDown={(event) => {
        if (event.key === ' ') event.preventDefault();
        if (event.key === 'Enter' || event.key === ' ') onClick?.(word);
      }}
      className={cn(
        'inline rounded-md px-0.5 py-0.5 cursor-pointer select-text transition-all duration-300 ease-out',
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
              background: '#F97316',
              boxShadow: '0 2px 10px rgba(249, 115, 22, 0.4)',
            }
          : undefined
      }
    >
      {word}
    </span>
  );
}

function SentenceBlock({
  block,
  currentSentenceIndex,
  currentWordIndex,
  isPlaying,
  getSentenceIndex,
  onWordClick,
  translations,
}: {
  block: ContentBlock;
  currentSentenceIndex: number;
  currentWordIndex: number;
  isPlaying: boolean;
  getSentenceIndex: (globalWordIndex: number) => number;
  onWordClick?: (word: string) => void;
  translations: Map<number, string>;
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
        <div className="select-text">
          {block.words.map((word, localIndex) => {
            const globalIndex = block.wordStart + localIndex;
            const wordSentenceIndex = getSentenceIndex(globalIndex);
            return (
              <span key={`${block.id}-${globalIndex}`}>
                <SelectableWord
                  word={word}
                  globalIndex={globalIndex}
                  currentWordIndex={currentWordIndex}
                  currentSentenceIndex={currentSentenceIndex}
                  sentenceIndex={wordSentenceIndex}
                  isPlaying={isPlaying}
                  onClick={onWordClick}
                />
                {localIndex < block.words.length - 1 ? ' ' : null}
                {translations.has(globalIndex) && (
                  <span
                    data-testid="read-inline-translation"
                    className="block mt-1 mb-3 text-sm leading-relaxed text-slate-600"
                  >
                    {translations.get(globalIndex)}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ReadAloudContent({ text, onWordClick, showTranslation, sentenceTranslations }: ReadAloudContentProps) {
  const currentWordIndex = useReadAloudStore((s) => s.currentWordIndex);
  const currentSentenceIndex = useReadAloudStore((s) => s.currentSentenceIndex);
  const isPlaying = useReadAloudStore((s) => s.isPlaying);
  const sentences = useReadAloudStore((s) => s.sentences);

  const contentBlocks = splitContentBlocks(text);

  const getSentenceIndex = useCallback(
    (globalWordIndex: number): number => {
      return sentences.findIndex((s) => globalWordIndex >= s.startWordIndex && globalWordIndex <= s.endWordIndex);
    },
    [sentences],
  );

  const translations = new Map(
    showTranslation ? sentenceTranslations?.map((entry) => [entry.endWordIndex, entry.translation]) : [],
  );

  return (
    <div className="space-y-4" data-testid="read-aloud-content">
      {contentBlocks.map((block) => {
        return (
          <SentenceBlock
            key={block.id}
            block={block}
            currentSentenceIndex={currentSentenceIndex}
            currentWordIndex={currentWordIndex}
            isPlaying={isPlaying}
            getSentenceIndex={getSentenceIndex}
            onWordClick={onWordClick}
            translations={translations}
          />
        );
      })}
    </div>
  );
}

'use client';

import { Trash2, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFavoriteStore } from '@/stores/favorite-store';
import type { FavoriteItem } from '@/types/favorite';

interface Props {
  item: FavoriteItem;
  isExpanded: boolean;
  onToggle: () => void;
}

const TYPE_BADGE = {
  word: { label: 'Word', color: 'bg-info-soft text-info-ink' },
  phrase: { label: 'Phrase', color: 'bg-violet-50 text-violet-700' },
  sentence: { label: 'Sentence', color: 'bg-success-soft text-success-ink' },
} as const;

function getReviewStatus(item: FavoriteItem): { label: string; color: string } {
  if (!item.fsrsCard) return { label: 'New', color: 'bg-surface-3 text-ink-3' };
  const state = item.fsrsCard.state;
  if (state === 0) return { label: 'New', color: 'bg-surface-3 text-ink-3' };
  if (state === 1 || state === 3) return { label: 'Learning', color: 'bg-warning-soft text-warning' };
  if (state === 2) return { label: 'Mastered', color: 'bg-success-soft text-success' };
  return { label: 'Due', color: 'bg-warning-soft text-warning' };
}

export function FavoriteItemRow({ item, isExpanded, onToggle }: Props) {
  const removeFavorite = useFavoriteStore((s) => s.removeFavorite);
  const badge = TYPE_BADGE[item.type];
  const reviewStatus = getReviewStatus(item);

  const handleTTS = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.speechSynthesis?.cancel();
    const u = new SpeechSynthesisUtterance(item.text);
    u.lang = 'en-US';
    window.speechSynthesis?.speak(u);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await removeFavorite(item.id);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onToggle();
  };

  return (
    <div
      data-testid={`favorite-toggle-${item.id}`}
      aria-label={`favorite-toggle-${item.id}`}
      role="button"
      aria-expanded={isExpanded}
      tabIndex={0}
      className={cn(
        'flex items-center gap-3 cursor-pointer transition-colors group',
        'px-3 py-2.5 rounded-lg',
        isExpanded ? 'bg-brand-soft' : 'hover:bg-surface-2',
      )}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
    >
      <span className={cn('shrink-0 rounded-full text-[10px] font-medium', 'px-1.5 py-0.5 rounded', badge.color)}>
        {badge.label}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className={cn('truncate font-medium text-ink', 'text-sm')}>{item.text}</span>
          {item.type === 'word' && item.pronunciation && (
            <span className="text-xs text-ink-4 font-mono shrink-0">{item.pronunciation}</span>
          )}
        </div>
        <p className={cn('truncate text-ink-3', 'text-xs')}>{item.translation}</p>
        <div className={cn('flex flex-wrap items-center gap-2', 'mt-1')}>
          <span
            data-testid={`favorite-status-${item.id}`}
            className={cn('rounded-full font-medium', 'px-2 py-0.5 text-[10px]', reviewStatus.color)}
          >
            {reviewStatus.label}
          </span>
          {item.autoCollected ? (
            <span className={cn('rounded-full font-medium', 'bg-surface-3 px-2 py-0.5 text-[10px] text-ink-3')}>
              {'AI'}
            </span>
          ) : null}
        </div>
      </div>

      <div className={cn('flex items-center shrink-0 transition-opacity', 'gap-0.5 opacity-0 group-hover:opacity-100')}>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Play favorite ${item.text}`}
          className={cn('h-7 w-7')}
          onClick={handleTTS}
        >
          <Volume2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Delete favorite ${item.text}`}
          className={cn('h-7 w-7 text-danger hover:text-danger')}
          onClick={handleDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

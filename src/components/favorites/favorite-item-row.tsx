'use client';

import { Trash2, Volume2 } from 'lucide-react';
import { IOS_PILL_CLASS } from '@/components/shared/ios-native-ui';
import { Button } from '@/components/ui/button';
import { detectIOSNativeHost } from '@/lib/tauri';
import { cn } from '@/lib/utils';
import { useFavoriteStore } from '@/stores/favorite-store';
import type { FavoriteItem } from '@/types/favorite';

interface Props {
  item: FavoriteItem;
  isExpanded: boolean;
  onToggle: () => void;
}

const TYPE_BADGE = {
  word: { label: 'Word', color: 'bg-sky-50 text-sky-700' },
  phrase: { label: 'Phrase', color: 'bg-violet-50 text-violet-700' },
  sentence: { label: 'Sentence', color: 'bg-emerald-50 text-emerald-700' },
} as const;

function getReviewStatus(item: FavoriteItem): { label: string; color: string } {
  if (!item.fsrsCard) return { label: 'New', color: 'text-slate-500' };
  const state = item.fsrsCard.state;
  if (state === 0) return { label: 'New', color: 'text-slate-500' };
  if (state === 1 || state === 3) return { label: 'Learning', color: 'text-amber-600' };
  if (state === 2) return { label: 'Mastered', color: 'text-emerald-600' };
  return { label: 'Due', color: 'text-amber-600' };
}

export function FavoriteItemRow({ item, isExpanded, onToggle }: Props) {
  const isIOSNativeHost = detectIOSNativeHost();
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
        isIOSNativeHost
          ? 'rounded-[20px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.9)_100%)] px-4 py-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]'
          : 'px-3 py-2.5 rounded-lg',
        isExpanded
          ? isIOSNativeHost
            ? 'border-indigo-100 bg-[linear-gradient(180deg,rgba(238,242,255,0.96)_0%,rgba(255,255,255,0.9)_100%)] shadow-[0_14px_30px_rgba(79,70,229,0.08)]'
            : 'bg-indigo-50'
          : 'hover:bg-slate-50',
      )}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
    >
      <span
        className={cn(
          'shrink-0 rounded-full text-[10px] font-medium',
          isIOSNativeHost ? 'px-2.5 py-1 shadow-none' : 'px-1.5 py-0.5 rounded',
          badge.color,
        )}
      >
        {badge.label}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className={cn('truncate font-medium text-slate-900', isIOSNativeHost ? 'text-[15px]' : 'text-sm')}>
            {item.text}
          </span>
          {item.type === 'word' && item.pronunciation && (
            <span className="text-xs text-slate-400 font-mono shrink-0">{item.pronunciation}</span>
          )}
        </div>
        <p className={cn('truncate text-slate-500', isIOSNativeHost ? 'mt-0.5 text-[13px]' : 'text-xs')}>
          {item.translation}
        </p>
        {isIOSNativeHost ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={cn(IOS_PILL_CLASS, 'px-2.5 py-1 text-[10px] font-medium')}>{reviewStatus.label}</span>
            {item.autoCollected ? (
              <span className={cn(IOS_PILL_CLASS, 'px-2.5 py-1 text-[10px] font-medium')}>AI saved</span>
            ) : null}
          </div>
        ) : null}
      </div>

      {!isIOSNativeHost && item.autoCollected && (
        <span
          className={cn(
            'shrink-0 rounded-full bg-slate-100 text-slate-500',
            isIOSNativeHost ? 'px-2 py-1 text-[10px]' : 'px-1.5 py-0.5 text-[10px]',
          )}
        >
          AI
        </span>
      )}

      {!isIOSNativeHost ? (
        <span
          className={cn(
            'shrink-0 rounded-full border border-slate-200 bg-white text-[10px]',
            isIOSNativeHost ? 'px-2.5 py-1 font-medium' : 'px-0 py-0',
            reviewStatus.color,
          )}
        >
          {reviewStatus.label}
        </span>
      ) : null}

      <div
        className={cn(
          'flex items-center shrink-0 transition-opacity',
          isIOSNativeHost ? 'gap-1 opacity-100' : 'gap-0.5 opacity-0 group-hover:opacity-100',
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Play favorite ${item.text}`}
          className={cn(isIOSNativeHost ? 'h-8 w-8 rounded-full bg-slate-100/90 text-slate-600' : 'h-7 w-7')}
          onClick={handleTTS}
        >
          <Volume2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Delete favorite ${item.text}`}
          className={cn(
            isIOSNativeHost
              ? 'h-8 w-8 rounded-full bg-rose-50/90 text-rose-500 hover:bg-rose-100 hover:text-rose-600'
              : 'h-7 w-7 text-red-400 hover:text-red-600',
          )}
          onClick={handleDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

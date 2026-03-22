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
  word: { label: '单词', color: 'bg-blue-100 text-blue-700' },
  phrase: { label: '短语', color: 'bg-purple-100 text-purple-700' },
  sentence: { label: '句子', color: 'bg-emerald-100 text-emerald-700' },
} as const;

function getReviewStatus(item: FavoriteItem): { label: string; color: string } {
  if (!item.fsrsCard) return { label: '新', color: 'text-slate-400' };
  const state = item.fsrsCard.state;
  if (state === 0) return { label: '新', color: 'text-slate-400' };
  if (state === 1 || state === 3) return { label: '学习中', color: 'text-amber-500' };
  if (state === 2) return { label: '已掌握', color: 'text-green-500' };
  return { label: '待复习', color: 'text-amber-500' };
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

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors group',
        isExpanded ? 'bg-indigo-50' : 'hover:bg-slate-50',
      )}
      onClick={onToggle}
    >
      <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0', badge.color)}>{badge.label}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-slate-900 truncate">{item.text}</span>
          {item.type === 'word' && item.pronunciation && (
            <span className="text-xs text-slate-400 font-mono shrink-0">{item.pronunciation}</span>
          )}
        </div>
        <p className="text-xs text-slate-500 truncate">{item.translation}</p>
      </div>

      {item.autoCollected && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">🤖</span>
      )}

      <span className={cn('text-[10px] shrink-0', reviewStatus.color)}>{reviewStatus.label}</span>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleTTS}>
          <Volume2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={handleDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

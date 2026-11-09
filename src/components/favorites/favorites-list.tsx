'use client';

import { Heart, Play } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n/use-i18n';
import { cn } from '@/lib/utils';
import { useFavoriteStore } from '@/stores/favorite-store';
import { FavoriteDetail } from './favorite-detail';
import { FavoriteItemRow } from './favorite-item-row';
import { FolderChips } from './folder-chips';

export function FavoritesList() {
  const { messages: t } = useI18n('favorites');
  const isLoaded = useFavoriteStore((s) => s.isLoaded);
  const favorites = useFavoriteStore((s) => s.favorites);
  const activeFolderId = useFavoriteStore((s) => s.activeFolderId);
  const totalCount = favorites.length;
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const favoritesInActiveFolder = activeFolderId
    ? favorites.filter((item) => item.folderId === activeFolderId)
    : favorites;
  const dueCount = favorites.filter((item) => item.nextReview != null && item.nextReview <= Date.now()).length;

  const filtered = search
    ? favoritesInActiveFolder.filter(
        (f) =>
          f.text.toLowerCase().includes(search.toLowerCase()) ||
          f.translation.toLowerCase().includes(search.toLowerCase()),
      )
    : favoritesInActiveFolder;

  // Loading
  if (!isLoaded) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-line animate-pulse rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-surface-3 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between sm:block">
          <div>
            <h1 className="font-display text-xl font-bold text-ink md:text-2xl">{t.title}</h1>
            <p className="mt-0.5 text-xs text-ink-3 md:text-sm">
              {t.items.replace('{{count}}', String(totalCount))}
              {dueCount > 0 && (
                <span className="ml-2 text-warning">{t.dueForReview.replace('{{count}}', String(dueCount))}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            aria-label={t.searchAria}
            placeholder={t.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 flex-1 sm:w-48"
          />
          {dueCount > 0 && (
            <Link href="/favorites/review" className="hidden sm:block">
              <Button size="sm" className="gap-1.5">
                <Play className="h-3.5 w-3.5" />
                {t.startReview} ({dueCount})
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Folder chips */}
      <FolderChips />

      {/* Empty state */}
      {filtered.length === 0 && (
        <div
          data-testid="favorites-empty-state"
          className={cn('flex flex-col items-center justify-center py-20 text-center')}
        >
          <div className="w-16 h-16 rounded-full bg-surface-3 flex items-center justify-center mb-4">
            <Heart className="h-8 w-8 text-ink-4" />
          </div>
          <p className="text-lg font-medium text-ink-2">{t.emptyTitle}</p>
          <p className="text-sm text-ink-4 mt-1 max-w-sm">{t.emptyDescription}</p>
        </div>
      )}

      {/* List */}
      {filtered.length > 0 ? (
        <div className="space-y-1 mt-4">
          {filtered.map((item) => (
            <div key={item.id} data-testid={`favorite-row-${item.id}`}>
              <FavoriteItemRow
                item={item}
                isExpanded={expandedId === item.id}
                onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
              />
              {expandedId === item.id && <FavoriteDetail item={item} />}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

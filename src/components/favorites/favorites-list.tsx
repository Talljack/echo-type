'use client';

import { Heart, Play } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  IOS_INPUT_CLASS,
  IOS_PAGE_CONTAINER_CLASS,
  IOS_PILL_CLASS,
  IOS_SECTION_CARD_CLASS,
  IOS_SUBCARD_CLASS,
  IOS_TERTIARY_BUTTON_CLASS,
  IOSEmptyStateCard,
  IOSPageHeader,
} from '@/components/shared/ios-native-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n/use-i18n';
import { detectIOSNativeHost, reportNativeQAState } from '@/lib/tauri';
import { cn } from '@/lib/utils';
import { useFavoriteStore } from '@/stores/favorite-store';
import { FavoriteDetail } from './favorite-detail';
import { FavoriteItemRow } from './favorite-item-row';
import { FolderChips } from './folder-chips';

export function FavoritesList() {
  const isIOSNativeHost = detectIOSNativeHost();
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

  useEffect(() => {
    reportNativeQAState({
      page: 'favorites',
      totalCount,
      dueCount,
      filteredCount: filtered.length,
      isEmpty: filtered.length === 0,
      hasExpandedItem: !!expandedId,
    });
  }, [dueCount, expandedId, filtered.length, totalCount]);

  // Loading
  if (!isLoaded) {
    return (
      <div className={isIOSNativeHost ? 'max-w-4xl space-y-4' : 'space-y-4'}>
        <div className="h-8 w-48 bg-slate-200 animate-pulse rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className={isIOSNativeHost ? IOS_PAGE_CONTAINER_CLASS : 'max-w-4xl'}>
      {/* Header */}
      {isIOSNativeHost ? (
        <>
          <IOSPageHeader
            icon={Heart}
            tone="slate"
            title={t.title}
            description={t.description}
            action={
              <div className="flex shrink-0 items-center gap-2">
                {dueCount > 0 ? (
                  <Link href="/favorites/review" className="inline-flex">
                    <Button size="sm" className={cn(IOS_TERTIARY_BUTTON_CLASS, 'h-10 gap-1.5 px-4 text-slate-800')}>
                      <Play className="h-3.5 w-3.5" />
                      {t.startReview}
                    </Button>
                  </Link>
                ) : null}
              </div>
            }
          />
          <div className={`${IOS_SECTION_CARD_CLASS} space-y-4 p-4`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={IOS_PILL_CLASS}>{t.saved.replace('{{count}}', String(totalCount))}</span>
              <span className={IOS_PILL_CLASS}>{activeFolderId ? t.currentFolder : t.browsingAll}</span>
              <span className={IOS_PILL_CLASS}>
                {dueCount > 0 ? t.dueNow.replace('{{count}}', String(dueCount)) : t.reviewUpToDate}
              </span>
            </div>
            <Input
              aria-label={t.searchAria}
              placeholder={t.searchSaved}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={IOS_INPUT_CLASS}
              data-testid="favorites-search-input"
            />
          </div>
        </>
      ) : (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between sm:block">
            <div>
              <h1 className="font-[var(--font-poppins)] text-xl font-bold text-slate-900 md:text-2xl">{t.title}</h1>
              <p className="mt-0.5 text-xs text-slate-500 md:text-sm">
                {t.items.replace('{{count}}', String(totalCount))}
                {dueCount > 0 && (
                  <span className="ml-2 text-amber-600">{t.dueForReview.replace('{{count}}', String(dueCount))}</span>
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
      )}

      {/* Folder chips */}
      <FolderChips />

      {/* Empty state */}
      {filtered.length === 0 &&
        (isIOSNativeHost ? (
          <IOSEmptyStateCard
            testId="favorites-empty-state"
            accessibilityLabel="favorites-empty-state"
            icon={Heart}
            tone="slate"
            title={t.emptyTitle}
            description={t.emptyDescription}
            action={
              dueCount > 0 ? (
                <Link href="/favorites/review" className="inline-flex">
                  <Button className="h-10 rounded-full bg-indigo-600 px-4 text-white shadow-[0_12px_26px_rgba(79,70,229,0.2)]">
                    {t.startReview}
                  </Button>
                </Link>
              ) : null
            }
          />
        ) : (
          <div
            data-testid="favorites-empty-state"
            className={cn('flex flex-col items-center justify-center py-20 text-center')}
          >
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Heart className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-lg font-medium text-slate-600">{t.emptyTitle}</p>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">{t.emptyDescription}</p>
          </div>
        ))}

      {/* List */}
      {filtered.length > 0 ? (
        <div className={isIOSNativeHost ? `${IOS_SUBCARD_CLASS} mt-4 space-y-2 p-2.5` : 'space-y-1 mt-4'}>
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

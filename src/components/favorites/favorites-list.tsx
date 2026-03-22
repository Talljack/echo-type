'use client';

import { Heart, Play } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFavoriteStore } from '@/stores/favorite-store';
import { FavoriteDetail } from './favorite-detail';
import { FavoriteItemRow } from './favorite-item-row';
import { FolderChips } from './folder-chips';

export function FavoritesList() {
  const isLoaded = useFavoriteStore((s) => s.isLoaded);
  const getFilteredFavorites = useFavoriteStore((s) => s.getFilteredFavorites);
  const getDueForReview = useFavoriteStore((s) => s.getDueForReview);
  const favorites = getFilteredFavorites();
  const dueCount = getDueForReview().length;
  const totalCount = useFavoriteStore((s) => s.favorites.length);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = search
    ? favorites.filter(
        (f) =>
          f.text.toLowerCase().includes(search.toLowerCase()) ||
          f.translation.toLowerCase().includes(search.toLowerCase()),
      )
    : favorites;

  // Loading
  if (!isLoaded) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-slate-200 animate-pulse rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-[var(--font-poppins)]">Favorites</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {totalCount} items{dueCount > 0 && <span className="text-amber-600 ml-2">{dueCount} due for review</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 h-9"
          />
          {dueCount > 0 && (
            <Link href="/favorites/review">
              <Button size="sm" className="gap-1.5">
                <Play className="h-3.5 w-3.5" />
                开始复习 ({dueCount})
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Folder chips */}
      <FolderChips />

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Heart className="h-8 w-8 text-slate-300" />
          </div>
          <p className="text-lg font-medium text-slate-600">还没有收藏内容</p>
          <p className="text-sm text-slate-400 mt-1 max-w-sm">选中页面上的文字，即可翻译并收藏到此处进行复习</p>
        </div>
      )}

      {/* List */}
      <div className="space-y-1 mt-4">
        {filtered.map((item) => (
          <div key={item.id}>
            <FavoriteItemRow
              item={item}
              isExpanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
            />
            {expandedId === item.id && <FavoriteDetail item={item} />}
          </div>
        ))}
      </div>
    </div>
  );
}

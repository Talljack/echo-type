'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, BookMarked, Upload, BarChart2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { db } from '@/lib/db';
import { useContentStore } from '@/stores/content-store';
import { useTTSStore } from '@/stores/tts-store';
import type { ContentItem, ContentType } from '@/types/content';

// ─── Config ───────────────────────────────────────────────────────────────────

const typeColors: Record<ContentType, string> = {
  word: 'bg-blue-100 text-blue-700',
  phrase: 'bg-green-100 text-green-700',
  sentence: 'bg-purple-100 text-purple-700',
  article: 'bg-amber-100 text-amber-700',
};

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, color }: { icon: React.ElementType; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-5">
      <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center', color)}>
        <Icon className="w-8 h-8 text-white" />
      </div>
      <div>
        <p className="font-semibold text-indigo-900 text-lg">Your library is empty</p>
        <p className="text-sm text-indigo-400 mt-1 max-w-xs">
          Add content to start practicing. Browse our built-in word books or import your own.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/library/wordbooks">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
            <BookMarked className="w-4 h-4 mr-1.5" />
            Word Books
          </Button>
        </Link>
        <Link href="/library/import">
          <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer">
            <Upload className="w-4 h-4 mr-1.5" />
            Import Content
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ─── Content row ──────────────────────────────────────────────────────────────

function ContentRow({
  item,
  href,
  icon: Icon,
  iconBg,
  sessionCount,
  isActive,
}: {
  item: ContentItem;
  href: string;
  icon: React.ElementType;
  iconBg: string;
  sessionCount: number;
  isActive: boolean;
}) {
  return (
    <Link href={href}>
      <Card className={cn(
        'bg-white border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group',
        isActive && 'border-l-3 border-l-indigo-500 bg-indigo-50/50 shadow-md',
      )}>
        <CardContent className="flex items-center gap-4 p-4">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors', iconBg)}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <h3 className="font-medium text-indigo-900 truncate">{item.title}</h3>
              <Badge className={typeColors[item.type]} variant="secondary">{item.type}</Badge>
              {item.category && (
                <Badge variant="outline" className="border-indigo-200 text-indigo-400 text-xs">{item.category}</Badge>
              )}
              {isActive && (
                <Badge className="bg-indigo-100 text-indigo-600 text-xs">Practicing</Badge>
              )}
            </div>
            <p className="text-sm text-indigo-500 truncate">{item.text}</p>
          </div>
          {sessionCount > 0 && (
            <div className="shrink-0 flex items-center gap-1 text-xs text-indigo-400 bg-indigo-50 px-2.5 py-1 rounded-full">
              <BarChart2 className="w-3 h-3" />
              {sessionCount}×
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ContentListProps {
  title: string;
  description: string;
  module: 'listen' | 'speak' | 'read' | 'write';
  icon: React.ElementType;
  iconBg: string;        // Tailwind class for icon container background
  iconColor: string;     // Tailwind class for icon colour (used in empty state bg)
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ContentList({ title, description, module, icon: Icon, iconBg, iconColor }: ContentListProps) {
  const { loadContents, getFilteredItems, setFilter, filter } = useContentStore();
  const activeContentId = useContentStore((s) => s.activeContentId);
  const shadowReadingEnabled = useTTSStore((s) => s.shadowReadingEnabled);
  const [typeFilter, setTypeFilter] = useState<ContentType | ''>('');
  const [sessionCounts, setSessionCounts] = useState<Record<string, number>>({});
  const activeItemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    useTTSStore.getState().hydrate();
  }, []);

  useEffect(() => {
    loadContents();
  }, [loadContents]);

  // Load session counts for this module once
  useEffect(() => {
    db.sessions
      .where('module')
      .equals(module)
      .toArray()
      .then((sessions) => {
        const counts: Record<string, number> = {};
        for (const s of sessions) {
          counts[s.contentId] = (counts[s.contentId] || 0) + 1;
        }
        setSessionCounts(counts);
      });
  }, [module]);

  // Scroll active item into view when shadow reading is enabled
  useEffect(() => {
    if (shadowReadingEnabled && activeContentId && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [shadowReadingEnabled, activeContentId]);

  const items = getFilteredItems();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-[var(--font-poppins)] text-indigo-900">{title}</h1>
        <p className="text-indigo-600 mt-1">{description}</p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
          <Input
            placeholder="Search content..."
            value={filter.search}
            onChange={(e) => setFilter({ search: e.target.value })}
            className="pl-10 bg-white/70 border-indigo-200"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['', 'word', 'phrase', 'sentence', 'article'] as const).map((type) => (
            <Button
              key={type || 'all'}
              variant={typeFilter === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setTypeFilter(type as ContentType | '');
                setFilter({ type: (type as ContentType) || undefined });
              }}
              className={typeFilter === type ? 'bg-indigo-600 cursor-pointer' : 'border-indigo-200 text-indigo-600 cursor-pointer'}
            >
              {type || 'All'}
            </Button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Icon} color={iconColor} />
      ) : (
        <div className="grid gap-3">
          {items.map((item) => {
            const isActive = shadowReadingEnabled && activeContentId === item.id;
            return (
              <div key={item.id} ref={isActive ? activeItemRef : undefined}>
                <ContentRow
                  item={item}
                  href={`/${module}/${item.id}`}
                  icon={Icon}
                  iconBg={iconBg}
                  sessionCount={sessionCounts[item.id] || 0}
                  isActive={isActive}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

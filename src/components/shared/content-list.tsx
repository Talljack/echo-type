'use client';

import { BarChart2, BookMarked, ChevronRight, Layers, Search, Upload } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';
import { ALL_WORDBOOKS } from '@/lib/wordbooks';
import { useContentStore } from '@/stores/content-store';
import { useTTSStore } from '@/stores/tts-store';
import { useWordBookStore } from '@/stores/wordbook-store';
import type { ContentItem, ContentType } from '@/types/content';
import type { WordBook } from '@/types/wordbook';

// ─── Types ───────────────────────────────────────────────────────────────────

type ViewTab = 'wordbook' | 'phrase' | 'sentence' | 'article' | 'scenario';

const TAB_CONFIG: { key: ViewTab; label: string }[] = [
  { key: 'wordbook', label: 'Word Books' },
  { key: 'phrase', label: 'Phrase' },
  { key: 'sentence', label: 'Sentence' },
  { key: 'article', label: 'Article' },
  { key: 'scenario', label: 'Scenario' },
];

// ─── Config ───────────────────────────────────────────────────────────────────

const typeColors: Record<ContentType, string> = {
  word: 'bg-blue-100 text-blue-700',
  phrase: 'bg-green-100 text-green-700',
  sentence: 'bg-purple-100 text-purple-700',
  article: 'bg-amber-100 text-amber-700',
};

const difficultyColors: Record<string, string> = {
  beginner: 'bg-emerald-100 text-emerald-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-red-100 text-red-700',
};

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, color }: { icon: React.ElementType; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-5">
      <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center', color)}>
        <Icon className="w-8 h-8 text-white" />
      </div>
      <div>
        <p className="font-semibold text-indigo-900 text-lg">No content here yet</p>
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
          <Button
            size="sm"
            variant="outline"
            className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer"
          >
            <Upload className="w-4 h-4 mr-1.5" />
            Import Content
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ─── Word Book Card ──────────────────────────────────────────────────────────

function WordBookCard({ book, module, itemCount }: { book: WordBook; module: string; itemCount: number }) {
  const diff = difficultyColors[book.difficulty];

  return (
    <Link href={`/${module}/book/${book.id}`}>
      <Card className="bg-white border-indigo-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 cursor-pointer group">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-2xl shrink-0 group-hover:bg-indigo-100 transition-colors">
            {book.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <h3 className="font-semibold text-indigo-900 truncate">{book.nameEn}</h3>
              {diff && (
                <Badge className={diff} variant="secondary">
                  {book.difficulty}
                </Badge>
              )}
            </div>
            <p className="text-sm text-indigo-500 truncate">{book.description}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="border-indigo-200 text-indigo-400 text-xs">
                {itemCount} items
              </Badge>
              <Badge variant="outline" className="border-indigo-200 text-indigo-400 text-xs">
                {book.filterTag}
              </Badge>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-indigo-300 group-hover:text-indigo-500 transition-colors shrink-0" />
        </CardContent>
      </Card>
    </Link>
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
      <Card
        className={cn(
          'bg-white border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group',
          isActive && 'border-l-3 border-l-indigo-500 bg-indigo-50/50 shadow-md',
        )}
      >
        <CardContent className="flex items-center gap-4 p-4">
          <div
            className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors', iconBg)}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <h3 className="font-medium text-indigo-900 truncate">{item.title}</h3>
              <Badge className={typeColors[item.type]} variant="secondary">
                {item.type}
              </Badge>
              {item.category && (
                <Badge variant="outline" className="border-indigo-200 text-indigo-400 text-xs">
                  {item.category}
                </Badge>
              )}
              {isActive && <Badge className="bg-indigo-100 text-indigo-600 text-xs">Practicing</Badge>}
            </div>
            <p className="text-sm text-indigo-500 truncate">{item.text}</p>
            {item.tags.length > 0 && (
              <div className="flex items-center gap-1 mt-1">
                {item.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="border-slate-200 text-slate-500 text-xs py-0 h-5">
                    {tag}
                  </Badge>
                ))}
                {item.tags.length > 3 && <span className="text-xs text-slate-400">+{item.tags.length - 3}</span>}
              </div>
            )}
          </div>
          {sessionCount > 0 && (
            <div className="shrink-0 flex items-center gap-1 text-xs text-indigo-400 bg-indigo-50 px-2.5 py-1 rounded-full">
              <BarChart2 className="w-3 h-3" />
              {sessionCount}x
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
  iconBg: string;
  iconColor: string;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ContentList({ title, description, module, icon: Icon, iconBg, iconColor }: ContentListProps) {
  const { loadContents, setFilter, filter } = useContentStore();
  const allItems = useContentStore((s) => s.items);
  const activeContentId = useContentStore((s) => s.activeContentId);
  const shadowReadingEnabled = useTTSStore((s) => s.shadowReadingEnabled);
  const [activeTab, setActiveTab] = useState<ViewTab>('wordbook');
  const [sessionCounts, setSessionCounts] = useState<Record<string, number>>({});
  const activeItemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    useTTSStore.getState().hydrate();
  }, []);

  useEffect(() => {
    loadContents();
  }, [loadContents]);

  // Load wordbook imported state
  const { importedIds, loadImportedState } = useWordBookStore();

  useEffect(() => {
    loadImportedState();
  }, [loadImportedState]);

  // Imported books by kind
  const importedVocabBooks = useMemo(
    () => ALL_WORDBOOKS.filter((b) => importedIds.has(b.id) && b.kind === 'vocabulary'),
    [importedIds],
  );

  const importedScenarioBooks = useMemo(
    () => ALL_WORDBOOKS.filter((b) => importedIds.has(b.id) && b.kind === 'scenario'),
    [importedIds],
  );

  // Count items per book
  const bookItemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of allItems) {
      if (item.category) {
        counts[item.category] = (counts[item.category] || 0) + 1;
      }
    }
    return counts;
  }, [allItems]);

  // Items for phrase/sentence/article tabs (exclude word type)
  const tabItems = useMemo(() => {
    const typeMap: Record<string, ContentType> = {
      phrase: 'phrase',
      sentence: 'sentence',
      article: 'article',
    };
    const targetType = typeMap[activeTab];
    if (!targetType) return [];

    return allItems.filter((item) => {
      if (item.type !== targetType) return false;
      // Apply search filter
      if (filter.search) {
        const q = filter.search.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.text.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allItems, activeTab, filter.search]);

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

  // Clear content store type filter when switching tabs (to not interfere)
  useEffect(() => {
    setFilter({ type: undefined, category: undefined });
  }, [activeTab, setFilter]);

  const isBookTab = activeTab === 'wordbook' || activeTab === 'scenario';
  const displayBooks = activeTab === 'wordbook' ? importedVocabBooks : importedScenarioBooks;

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts: Record<ViewTab, number> = {
      wordbook: importedVocabBooks.length,
      phrase: allItems.filter((i) => i.type === 'phrase').length,
      sentence: allItems.filter((i) => i.type === 'sentence').length,
      article: allItems.filter((i) => i.type === 'article').length,
      scenario: importedScenarioBooks.length,
    };
    return counts;
  }, [allItems, importedVocabBooks.length, importedScenarioBooks.length]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-[var(--font-poppins)] text-indigo-900">{title}</h1>
        <p className="text-indigo-600 mt-1">{description}</p>
      </div>

      {/* Search + Tabs */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
          <Input
            placeholder="Search content..."
            value={filter.search}
            onChange={(e) => setFilter({ search: e.target.value })}
            className="pl-10 bg-white/70 border-indigo-200"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {TAB_CONFIG.map(({ key, label }) => (
            <Button
              key={key}
              variant={activeTab === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(key)}
              className={cn(
                activeTab === key ? 'bg-indigo-600 cursor-pointer' : 'border-indigo-200 text-indigo-600 cursor-pointer',
              )}
            >
              {key === 'wordbook' && <BookMarked className="w-3.5 h-3.5 mr-1" />}
              {key === 'scenario' && <Layers className="w-3.5 h-3.5 mr-1" />}
              {label}
              <span className="ml-1 text-xs opacity-70">({tabCounts[key]})</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isBookTab ? (
        // Word Books or Scenarios tab - show book cards
        displayBooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center', iconColor)}>
              {activeTab === 'wordbook' ? (
                <BookMarked className="w-8 h-8 text-white" />
              ) : (
                <Layers className="w-8 h-8 text-white" />
              )}
            </div>
            <div>
              <p className="font-semibold text-indigo-900 text-lg">
                No {activeTab === 'wordbook' ? 'word books' : 'scenarios'} imported
              </p>
              <p className="text-sm text-indigo-400 mt-1 max-w-xs">
                Import {activeTab === 'wordbook' ? 'vocabulary books' : 'scenario packs'} from the Word Books page to
                start practicing.
              </p>
            </div>
            <Link href="/library/wordbooks">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
                <BookMarked className="w-4 h-4 mr-1.5" />
                Browse Word Books
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {displayBooks
              .filter((book) => {
                if (!filter.search) return true;
                const q = filter.search.toLowerCase();
                return (
                  book.nameEn.toLowerCase().includes(q) ||
                  book.name.toLowerCase().includes(q) ||
                  book.description.toLowerCase().includes(q)
                );
              })
              .map((book) => (
                <WordBookCard key={book.id} book={book} module={module} itemCount={bookItemCounts[book.id] || 0} />
              ))}
          </div>
        )
      ) : tabItems.length === 0 ? (
        <EmptyState icon={Icon} color={iconColor} />
      ) : (
        <div className="grid gap-3">
          {tabItems.map((item) => {
            const isActive = shadowReadingEnabled && activeContentId === item.id;
            return (
              <div key={item.id} ref={isActive ? activeItemRef : undefined}>
                <ContentRow
                  item={item}
                  href={`/${module === 'speak' ? 'read' : module}/${item.id}`}
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

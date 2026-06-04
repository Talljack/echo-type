'use client';

import { BarChart2, BookMarked, ChevronRight, Layers, Search, Upload } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { IOSInlineChatButton } from '@/components/chat/ios-inline-chat-button';
import {
  IOS_INPUT_CLASS,
  IOS_LIST_CARD_CLASS,
  IOS_PAGE_CONTAINER_CLASS,
  IOS_PILL_CLASS,
  IOS_SECTION_CARD_CLASS,
  IOS_SEGMENTED_ACTIVE_CLASS,
  IOS_SEGMENTED_INACTIVE_CLASS,
  IOSPageHeader,
} from '@/components/shared/ios-native-ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SESSION_ACTIVITY_EVENT } from '@/lib/daily-plan-progress';
import { db } from '@/lib/db';
import { useI18n } from '@/lib/i18n/use-i18n';
import { detectIOSNativeHost, reportNativeQAState } from '@/lib/tauri';
import { cn } from '@/lib/utils';
import { ALL_WORDBOOKS } from '@/lib/wordbooks';
import { useContentStore } from '@/stores/content-store';
import { useShadowReadingStore } from '@/stores/shadow-reading-store';
import { useTTSStore } from '@/stores/tts-store';
import { useWordBookStore } from '@/stores/wordbook-store';
import type { ContentItem, ContentType } from '@/types/content';
import type { WordBook } from '@/types/wordbook';

// ─── Types ───────────────────────────────────────────────────────────────────

type ViewTab = 'wordbook' | 'phrase' | 'sentence' | 'article' | 'scenario';

const TAB_KEYS: ViewTab[] = ['wordbook', 'phrase', 'sentence', 'article', 'scenario'];

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

const moduleSessionCountCache = new Map<string, Record<string, number>>();
const moduleSessionCountRequests = new Map<string, Promise<Record<string, number>>>();

async function loadModuleSessionCounts(module: string): Promise<Record<string, number>> {
  const cached = moduleSessionCountCache.get(module);
  if (cached) return cached;

  const pending = moduleSessionCountRequests.get(module);
  if (pending) return pending;

  const request = db.sessions
    .where('module')
    .equals(module)
    .toArray()
    .then((sessions) => {
      const counts: Record<string, number> = {};
      for (const session of sessions) {
        counts[session.contentId] = (counts[session.contentId] || 0) + 1;
      }
      moduleSessionCountCache.set(module, counts);
      return counts;
    })
    .finally(() => {
      moduleSessionCountRequests.delete(module);
    });

  moduleSessionCountRequests.set(module, request);
  return request;
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  color,
  clMessages,
  isIOSNativeHost,
}: {
  icon: React.ElementType;
  color: string;
  clMessages: ReturnType<typeof useI18n<'contentList'>>['messages'];
  isIOSNativeHost: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 text-center space-y-5',
        isIOSNativeHost && `${IOS_SECTION_CARD_CLASS} px-6`,
      )}
    >
      <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center', color)}>
        <Icon className="w-8 h-8 text-white" />
      </div>
      <div>
        <p className="font-semibold text-indigo-900 text-lg">{clMessages.empty.title}</p>
        <p className="text-sm text-indigo-400 mt-1 max-w-xs">{clMessages.empty.description}</p>
      </div>
      <div className="flex gap-3">
        <Link href="/library/wordbooks">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
            <BookMarked className="w-4 h-4 mr-1.5" />
            {clMessages.empty.wordBooks}
          </Button>
        </Link>
        <Link href="/library/import">
          <Button
            size="sm"
            variant="outline"
            className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer"
          >
            <Upload className="w-4 h-4 mr-1.5" />
            {clMessages.empty.importContent}
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ─── Word Book Card ──────────────────────────────────────────────────────────

function WordBookCard({
  book,
  module,
  itemCount,
  isIOSNativeHost,
}: {
  book: WordBook;
  module: string;
  itemCount: number;
  isIOSNativeHost: boolean;
}) {
  const { messages: clMessages } = useI18n('contentList');
  const diff = difficultyColors[book.difficulty];

  return (
    <Link href={`/${module}/book/${book.id}`}>
      <Card
        data-testid={`${module}-book-card-${book.id}`}
        className={cn(
          'transition-all duration-200 cursor-pointer group',
          isIOSNativeHost
            ? `${IOS_LIST_CARD_CLASS} hover:-translate-y-0.5`
            : 'bg-white border-indigo-100 shadow-sm hover:shadow-md hover:border-indigo-200',
        )}
      >
        <CardContent className="flex items-center gap-3 p-2.5 md:p-3">
          <div
            className={cn(
              'flex items-center justify-center text-lg md:text-xl shrink-0 transition-colors',
              isIOSNativeHost
                ? 'h-11 w-11 rounded-[18px] bg-[linear-gradient(135deg,rgba(99,102,241,0.16)_0%,rgba(79,70,229,0.08)_100%)]'
                : 'w-8 h-8 md:w-9 md:h-9 rounded-lg bg-indigo-50 group-hover:bg-indigo-100',
            )}
          >
            {book.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className={cn(
                  'truncate font-semibold',
                  isIOSNativeHost ? 'text-[15px] text-slate-900' : 'text-sm text-indigo-900',
                )}
              >
                {book.nameEn}
              </h3>
              {diff && (
                <Badge className={cn(diff, 'text-[10px]')} variant="secondary">
                  {book.difficulty}
                </Badge>
              )}
            </div>
            <p
              className={cn('line-clamp-1', isIOSNativeHost ? 'text-[13px] text-slate-500' : 'text-xs text-indigo-500')}
            >
              {book.description}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge variant="outline" className="border-indigo-200 text-indigo-400 text-[10px]">
                {itemCount} {clMessages.items}
              </Badge>
              <Badge variant="outline" className="border-indigo-200 text-indigo-400 text-[10px]">
                {book.filterTag}
              </Badge>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-indigo-300 group-hover:text-indigo-500 transition-colors shrink-0" />
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── Content row ──────────────────────────────────────────────────────────────

function ContentRow({
  module,
  item,
  href,
  icon: Icon,
  iconBg,
  sessionCount,
  isActive,
  onNavigate,
}: {
  module: string;
  item: ContentItem;
  href: string;
  icon: React.ElementType;
  iconBg: string;
  sessionCount: number;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  const { messages: srMessages } = useI18n('shadowReading');
  const isIOSNativeHost = detectIOSNativeHost();
  return (
    <Link href={href} onClick={onNavigate}>
      <Card
        data-testid={`${module}-content-row-${item.id}`}
        className={cn(
          'transition-all duration-200 cursor-pointer group',
          isIOSNativeHost ? IOS_LIST_CARD_CLASS : 'bg-white border-slate-100 shadow-sm hover:shadow-md',
          isActive &&
            (isIOSNativeHost
              ? 'border-indigo-200 bg-indigo-50/75 shadow-[0_16px_34px_rgba(79,70,229,0.10)]'
              : 'border-l-3 border-l-indigo-500 bg-indigo-50/50 shadow-md'),
        )}
      >
        <CardContent className="flex items-center gap-3 md:gap-4 p-3 md:p-4">
          <div
            className={cn(
              'w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors',
              iconBg,
            )}
          >
            <Icon className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 flex-wrap">
              <h3 className="font-medium text-indigo-900 truncate text-sm md:text-base">{item.title}</h3>
              <Badge className={cn(typeColors[item.type], 'text-[10px] md:text-xs')} variant="secondary">
                {item.type}
              </Badge>
              {item.category && (
                <Badge
                  variant="outline"
                  className="border-indigo-200 text-indigo-400 text-[10px] md:text-xs hidden sm:inline-flex"
                >
                  {item.category}
                </Badge>
              )}
              {isActive && (
                <Badge className="bg-indigo-100 text-indigo-600 text-[10px] md:text-xs">
                  {srMessages.contentList.practicing}
                </Badge>
              )}
            </div>
            <p className="text-xs md:text-sm text-indigo-500 line-clamp-1">{item.text}</p>
            {item.tags.length > 0 && (
              <div className="flex items-center gap-1 mt-1">
                {item.tags.slice(0, 3).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="border-slate-200 text-slate-500 text-[10px] md:text-xs py-0 h-4 md:h-5"
                  >
                    {tag}
                  </Badge>
                ))}
                {item.tags.length > 3 && (
                  <span className="text-[10px] md:text-xs text-slate-400">+{item.tags.length - 3}</span>
                )}
              </div>
            )}
          </div>
          {sessionCount > 0 && (
            <div className="shrink-0 flex items-center gap-1 text-[10px] md:text-xs text-indigo-400 bg-indigo-50 px-2 md:px-2.5 py-0.5 md:py-1 rounded-full">
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
  const loadContents = useContentStore((s) => s.loadContents);
  const setFilter = useContentStore((s) => s.setFilter);
  const filter = useContentStore((s) => s.filter);
  const allItems = useContentStore((s) => s.items);
  const { messages: clMessages } = useI18n('contentList');
  const shadowReadingEnabled = useShadowReadingStore((s) => s.enabled);
  const shadowSession = useShadowReadingStore((s) => s.session);
  const startOrSwitchSession = useShadowReadingStore((s) => s.startOrSwitchSession);
  const [activeTab, setActiveTab] = useState<ViewTab>('wordbook');
  const [sessionCounts, setSessionCounts] = useState<Record<string, number>>({});
  const activeItemRef = useRef<HTMLDivElement>(null);
  const isIOSNativeHost = detectIOSNativeHost();

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

  useEffect(() => {
    const handleBootstrapReady = () => {
      void loadContents(true);
      void loadImportedState(true);
    };

    window.addEventListener('echotype:bootstrap-ready', handleBootstrapReady);
    return () => {
      window.removeEventListener('echotype:bootstrap-ready', handleBootstrapReady);
    };
  }, [loadContents, loadImportedState]);

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
    let cancelled = false;

    const applyCounts = async () => {
      const counts = await loadModuleSessionCounts(module);
      if (!cancelled) {
        setSessionCounts(counts);
      }
    };

    void applyCounts();

    const handleSessionActivity = (event: Event) => {
      const detail = (event as CustomEvent<{ module?: string }>).detail;
      if (detail?.module && detail.module !== module) return;

      moduleSessionCountCache.delete(module);
      void applyCounts();
    };

    window.addEventListener(SESSION_ACTIVITY_EVENT, handleSessionActivity as EventListener);

    return () => {
      cancelled = true;
      window.removeEventListener(SESSION_ACTIVITY_EVENT, handleSessionActivity as EventListener);
    };
  }, [module]);

  // Scroll active item into view when shadow reading is enabled
  useEffect(() => {
    if (shadowReadingEnabled && shadowSession?.contentId && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [shadowReadingEnabled, shadowSession?.contentId]);

  // Clear content store type filter when switching tabs (to not interfere)
  useEffect(() => {
    setFilter({ type: undefined, category: undefined });
  }, [setFilter]);

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

  useEffect(() => {
    reportNativeQAState({
      page: module,
      activeTab,
      isBookTab,
      displayBookCount: displayBooks.length,
      contentCount: tabItems.length,
      totalItems: allItems.length,
      wordbookCount: importedVocabBooks.length,
      scenarioCount: importedScenarioBooks.length,
    });
  }, [
    activeTab,
    allItems.length,
    displayBooks.length,
    importedScenarioBooks.length,
    importedVocabBooks.length,
    isBookTab,
    module,
    tabItems.length,
  ]);

  return (
    <div className={cn('max-w-6xl mx-auto space-y-6', isIOSNativeHost && IOS_PAGE_CONTAINER_CLASS)}>
      {isIOSNativeHost ? (
        <IOSPageHeader
          icon={Icon}
          title={title}
          description={description}
          tone="indigo"
          action={<IOSInlineChatButton compact className="shrink-0 self-start" />}
        />
      ) : (
        <div className="space-y-2">
          <div className={cn('inline-flex h-11 w-11 items-center justify-center rounded-2xl', iconBg)}>
            <Icon className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold text-indigo-900 font-[var(--font-poppins)] md:text-3xl">{title}</h1>
          <p className="text-sm text-indigo-600 md:text-base">{description}</p>
        </div>
      )}

      {/* Search + Tabs */}
      <div className={cn('space-y-3', isIOSNativeHost && `${IOS_SECTION_CARD_CLASS} px-4 py-4`)}>
        <div className="relative">
          <Search
            className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4',
              isIOSNativeHost ? 'text-slate-400' : 'text-indigo-400',
            )}
          />
          <Input
            placeholder={clMessages.search}
            value={filter.search}
            onChange={(e) => setFilter({ search: e.target.value })}
            className={cn('pl-10', isIOSNativeHost ? IOS_INPUT_CLASS : 'bg-white/70 border-indigo-200')}
          />
        </div>

        {isIOSNativeHost ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className={IOS_PILL_CLASS}>{tabCounts[activeTab]} ready</span>
            <span className={IOS_PILL_CLASS}>{isBookTab ? 'Collections' : 'Practice set'}</span>
            {filter.search ? <span className={IOS_PILL_CLASS}>Filtered</span> : null}
          </div>
        ) : null}

        <div className={cn('flex gap-2 flex-wrap', isIOSNativeHost && 'gap-2.5')}>
          {TAB_KEYS.map((key) => (
            <Button
              key={key}
              variant={activeTab === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(key)}
              className={cn(
                'cursor-pointer rounded-full',
                isIOSNativeHost
                  ? activeTab === key
                    ? IOS_SEGMENTED_ACTIVE_CLASS
                    : IOS_SEGMENTED_INACTIVE_CLASS
                  : activeTab === key
                    ? 'bg-indigo-600'
                    : 'border-indigo-200 text-indigo-600',
              )}
            >
              {key === 'wordbook' && <BookMarked className="w-3.5 h-3.5 mr-1" />}
              {key === 'scenario' && <Layers className="w-3.5 h-3.5 mr-1" />}
              {clMessages.tabs[key]}
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
                {activeTab === 'wordbook' ? clMessages.empty.noWordBooks : clMessages.empty.noScenarios}
              </p>
              <p className="text-sm text-indigo-400 mt-1 max-w-xs">
                {activeTab === 'wordbook' ? clMessages.empty.importWordBooksHint : clMessages.empty.importScenariosHint}
              </p>
            </div>
            <Link href="/library/wordbooks">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
                <BookMarked className="w-4 h-4 mr-1.5" />
                {clMessages.empty.browseWordBooks}
              </Button>
            </Link>
          </div>
        ) : (
          <div className={cn('grid gap-3', isIOSNativeHost && 'gap-3.5')}>
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
                <WordBookCard
                  key={book.id}
                  book={book}
                  module={module}
                  itemCount={bookItemCounts[book.id] || 0}
                  isIOSNativeHost={isIOSNativeHost}
                />
              ))}
          </div>
        )
      ) : tabItems.length === 0 ? (
        <EmptyState icon={Icon} color={iconColor} clMessages={clMessages} isIOSNativeHost={isIOSNativeHost} />
      ) : (
        <div className={cn('grid gap-3', isIOSNativeHost && 'gap-3.5')}>
          {tabItems.map((item) => {
            const isActive = shadowReadingEnabled && shadowSession?.contentId === item.id;
            return (
              <div key={item.id} ref={isActive ? activeItemRef : undefined}>
                <ContentRow
                  module={module}
                  item={item}
                  href={`/${module === 'speak' ? 'read' : module}/${item.id}`}
                  icon={Icon}
                  iconBg={iconBg}
                  sessionCount={sessionCounts[item.id] || 0}
                  isActive={isActive}
                  onNavigate={
                    shadowReadingEnabled && !shadowSession ? () => startOrSwitchSession(item.id, item.title) : undefined
                  }
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

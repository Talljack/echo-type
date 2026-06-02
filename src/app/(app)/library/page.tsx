'use client';

import {
  BookMarked,
  BookOpen,
  Check,
  CheckSquare,
  ChevronDown,
  FileText,
  Headphones,
  Layers,
  MessageSquare,
  Mic,
  PenTool,
  Plus,
  Search,
  Sparkles,
  Square,
  Tag,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { IOSInlineChatButton } from '@/components/chat/ios-inline-chat-button';
import { QuickAddDialog } from '@/components/library/quick-add-dialog';
import {
  IOS_INPUT_CLASS,
  IOS_LIST_CARD_CLASS,
  IOS_PILL_CLASS,
  IOS_PRIMARY_BUTTON_CLASS,
  IOS_SECTION_CARD_CLASS,
  IOS_SUBCARD_CLASS,
  IOS_TERTIARY_BUTTON_CLASS,
  IOS_TINTED_SUBCARD_CLASS,
  IOSEmptyStateCard,
  IOSPageHeader,
} from '@/components/shared/ios-native-ui';
import { TagCloud } from '@/components/shared/tag-cloud';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SCENARIO_CATEGORIES } from '@/lib/builtin-collections';
import { useI18n } from '@/lib/i18n/use-i18n';
import { detectIOSNativeHost } from '@/lib/tauri';
import { cn, normalizeTags } from '@/lib/utils';
import { ALL_WORDBOOKS } from '@/lib/wordbooks';
import { useBookStore } from '@/stores/book-store';
import { useCollectionStore } from '@/stores/collection-store';
import { useContentStore } from '@/stores/content-store';
import { useShadowReadingStore } from '@/stores/shadow-reading-store';
import { useTTSStore } from '@/stores/tts-store';
import { useWordBookStore } from '@/stores/wordbook-store';
import type { CollectionItem, ContentItem, ContentType, Difficulty } from '@/types/content';
import type { WordBook } from '@/types/wordbook';

// ─── Constants ───────────────────────────────────────────────────────────────

const ITEMS_PER_GROUP = 10;

type ViewTab = 'all' | 'collection' | 'wordbook' | 'book' | 'phrase' | 'sentence' | 'article' | 'scenario';

const VIEW_TAB_ICON_MAP: Record<ViewTab, typeof BookMarked | undefined> = {
  all: undefined,
  collection: Layers,
  wordbook: BookMarked,
  book: BookOpen,
  phrase: MessageSquare,
  sentence: FileText,
  article: BookOpen,
  scenario: Layers,
};

const typeConfigBase: Record<ContentType, { color: string; icon: typeof FileText }> = {
  word: { color: 'bg-blue-100 text-blue-700', icon: BookMarked },
  phrase: { color: 'bg-green-100 text-green-700', icon: MessageSquare },
  sentence: { color: 'bg-purple-100 text-purple-700', icon: FileText },
  article: { color: 'bg-amber-100 text-amber-700', icon: BookOpen },
};

const difficultyColors: Record<string, string> = {
  beginner: 'bg-emerald-100 text-emerald-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-red-100 text-red-700',
};

// ─── Content Row ─────────────────────────────────────────────────────────────

function ContentRow({
  item,
  onDelete,
  onSetActive,
  selectable,
  selected,
  onToggleSelect,
}: {
  item: ContentItem;
  onDelete: (id: string) => void;
  onSetActive: (id: string) => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const updateContent = useContentStore((s) => s.updateContent);
  const { messages } = useI18n('library');
  const isIOSNativeHost = detectIOSNativeHost();
  const [editing, setEditing] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const handleStartEdit = () => {
    setTagInput(item.tags.join(', '));
    setEditing(true);
  };

  const handleSaveTags = () => {
    const newTags = normalizeTags(tagInput);
    updateContent(item.id, { tags: newTags });
    setEditing(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    updateContent(item.id, { tags: item.tags.filter((t) => t !== tagToRemove) });
  };

  const getPreviewText = () => {
    const maxLength = item.type === 'article' ? 150 : item.type === 'sentence' ? 100 : 60;
    if (item.text.length <= maxLength) return item.text;
    return `${item.text.slice(0, maxLength)}...`;
  };

  return (
    <Card
      className={cn(
        'transition-all duration-200 group',
        isIOSNativeHost
          ? 'rounded-[22px] border-white/80 bg-slate-50/80 shadow-[0_10px_24px_rgba(15,23,42,0.04)] hover:shadow-[0_14px_28px_rgba(15,23,42,0.07)]'
          : 'bg-white border-slate-100 shadow-sm hover:shadow-md',
      )}
      data-testid={`library-content-row-${item.id}`}
    >
      <CardContent className="flex flex-col sm:flex-row sm:items-start justify-between p-3 md:p-4 gap-2 md:gap-4">
        {selectable && (
          <button
            type="button"
            onClick={() => onToggleSelect?.(item.id)}
            className={cn(
              'shrink-0 mt-0.5 cursor-pointer transition-colors',
              isIOSNativeHost ? 'text-slate-400 hover:text-slate-700' : 'text-indigo-400 hover:text-indigo-600',
            )}
          >
            {selected ? <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5" />}
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2 flex-wrap">
            <h3
              className={cn(
                'font-semibold',
                isIOSNativeHost ? 'text-[15px] text-slate-950' : 'text-sm md:text-base text-indigo-900',
              )}
            >
              {item.title}
            </h3>
            {item.metadata?.audioUrl && (
              <Video
                className={cn('shrink-0', isIOSNativeHost ? 'h-4 w-4 text-slate-400' : 'w-3.5 h-3.5 text-indigo-400')}
              />
            )}
            {item.difficulty && (
              <Badge className={difficultyColors[item.difficulty]} variant="secondary">
                {messages.difficulty[item.difficulty as keyof typeof messages.difficulty] ?? item.difficulty}
              </Badge>
            )}
            {item.category && (
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  isIOSNativeHost
                    ? 'rounded-full border-slate-200 text-slate-500'
                    : 'border-indigo-200 text-indigo-400',
                )}
              >
                {item.category}
              </Badge>
            )}
          </div>
          <p
            className={cn(
              'leading-relaxed mb-1 md:mb-2 line-clamp-2 md:line-clamp-none whitespace-pre-wrap',
              isIOSNativeHost ? 'text-[13px] text-slate-500' : 'text-xs md:text-sm text-indigo-600',
            )}
          >
            {getPreviewText()}
          </p>
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {editing ? (
              <div className="flex items-center gap-1.5 w-full">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTags();
                    if (e.key === 'Escape') setEditing(false);
                  }}
                  placeholder="tag1, tag2, tag3"
                  className={cn('h-8 flex-1 text-xs', isIOSNativeHost ? IOS_INPUT_CLASS : 'bg-white border-indigo-200')}
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSaveTags}
                  className={cn(
                    'h-7 w-7 cursor-pointer',
                    isIOSNativeHost
                      ? 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
                      : 'text-green-600 hover:text-green-700',
                  )}
                >
                  <Check className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditing(false)}
                  className={cn(
                    'h-7 w-7 cursor-pointer',
                    isIOSNativeHost
                      ? 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                      : 'text-slate-400 hover:text-slate-600',
                  )}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <>
                {item.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="border-slate-200 text-slate-500 text-xs py-0 h-5 group/tag"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveTag(tag);
                      }}
                      className="ml-0.5 opacity-0 group-hover/tag:opacity-100 transition-opacity cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </Badge>
                ))}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit();
                  }}
                  className={cn(
                    'flex items-center gap-0.5 text-xs transition-colors cursor-pointer',
                    isIOSNativeHost ? 'text-slate-400 hover:text-slate-700' : 'text-indigo-400 hover:text-indigo-600',
                  )}
                >
                  <Tag className="w-3 h-3" />
                  <span>{item.tags.length === 0 ? messages.actions.editTags : '+'}</span>
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
          <Link
            href={`/listen/${item.id}`}
            onClick={() => onSetActive(item.id)}
            data-testid={`library-action-listen-${item.id}`}
            aria-label={`Library listen ${item.title}`}
          >
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8 cursor-pointer transition-colors',
                isIOSNativeHost
                  ? 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
                  : 'text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700',
              )}
              title={messages.actions.listen}
            >
              <Headphones className="w-4 h-4" />
            </Button>
          </Link>
          <Link
            href={`/read/${item.id}`}
            onClick={() => onSetActive(item.id)}
            data-testid={`library-action-read-${item.id}`}
            aria-label={`Library read ${item.title}`}
          >
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8 cursor-pointer transition-colors',
                isIOSNativeHost
                  ? 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
                  : 'text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700',
              )}
              title={messages.actions.read}
            >
              <BookOpen className="w-4 h-4" />
            </Button>
          </Link>
          <Link
            href={`/write/${item.id}`}
            onClick={() => onSetActive(item.id)}
            data-testid={`library-action-write-${item.id}`}
            aria-label={`Library write ${item.title}`}
          >
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8 cursor-pointer transition-colors',
                isIOSNativeHost
                  ? 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
                  : 'text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700',
              )}
              title={messages.actions.write}
            >
              <PenTool className="w-4 h-4" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(item.id)}
            className={cn(
              'h-8 w-8 cursor-pointer transition-colors',
              isIOSNativeHost
                ? 'text-red-400 hover:bg-red-50 hover:text-red-600'
                : 'text-red-400 hover:bg-red-50 hover:text-red-600',
            )}
            title={messages.actions.delete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Content Group (for phrase/sentence/article) ─────────────────────────────

function ContentGroup({
  type,
  items,
  onDelete,
  onSetActive,
  selectable,
  selectedIds,
  onToggleSelect,
}: {
  type: ContentType;
  items: ContentItem[];
  onDelete: (id: string) => void;
  onSetActive: (id: string) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}) {
  const { messages } = useI18n('library');
  const isIOSNativeHost = detectIOSNativeHost();
  const [showCount, setShowCount] = useState(ITEMS_PER_GROUP);
  const config = typeConfigBase[type];
  const Icon = config.icon;
  const visible = items.slice(0, showCount);
  const remaining = items.length - showCount;
  const label = messages.contentTypes[type as keyof typeof messages.contentTypes] ?? type;

  return (
    <AccordionItem
      value={type}
      className={cn(
        'border px-4',
        isIOSNativeHost ? IOS_SECTION_CARD_CLASS : 'rounded-xl bg-white/50 backdrop-blur-sm border-indigo-100',
      )}
    >
      <AccordionTrigger className="hover:no-underline py-4 cursor-pointer">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex items-center justify-center',
              isIOSNativeHost ? 'h-10 w-10 rounded-2xl' : 'w-8 h-8 rounded-lg',
              config.color,
            )}
          >
            <Icon className="w-4 h-4" />
          </div>
          <span
            className={cn(
              'font-semibold',
              isIOSNativeHost ? 'text-[17px] text-slate-950' : 'text-base text-indigo-900',
            )}
          >
            {label}
          </span>
          <Badge
            variant="secondary"
            className={cn(
              isIOSNativeHost ? 'rounded-full bg-slate-100 px-2.5 text-slate-600' : 'bg-indigo-100 text-indigo-600',
            )}
          >
            {items.length}
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="grid gap-2 pb-2">
          {visible.map((item) => (
            <ContentRow
              key={item.id}
              item={item}
              onDelete={onDelete}
              onSetActive={onSetActive}
              selectable={selectable}
              selected={selectedIds?.has(item.id)}
              onToggleSelect={onToggleSelect}
            />
          ))}
          {remaining > 0 && (
            <Button
              variant="ghost"
              onClick={() => setShowCount((c) => c + ITEMS_PER_GROUP)}
              className="w-full text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 cursor-pointer"
            >
              <ChevronDown className="w-4 h-4 mr-2" />
              {messages.showMore
                .replace('{{count}}', String(Math.min(remaining, ITEMS_PER_GROUP)))
                .replace('{{remaining}}', String(remaining))}
            </Button>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function ScenarioCollectionsGroup({ collections }: { collections: CollectionItem[] }) {
  const { messages } = useI18n('library');

  return (
    <AccordionItem
      value="scenario-collections"
      className="border rounded-xl bg-white/50 backdrop-blur-sm border-indigo-100 px-4"
    >
      <AccordionTrigger className="hover:no-underline py-4 cursor-pointer">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4 text-indigo-700" />
          </div>
          <h2 className="font-semibold text-indigo-900 text-lg truncate">Scenario Collections</h2>
          <Badge variant="secondary" className="bg-indigo-100 text-indigo-600 shrink-0">
            {collections.length}
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-6 pb-2">
          <div className="flex justify-end">
            <Link href="/library/collections/generate">
              <Button
                size="sm"
                variant="outline"
                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                AI Generate
              </Button>
            </Link>
          </div>
          {SCENARIO_CATEGORIES.map((cat) => {
            const catCollections = collections.filter((c) => c.category === cat.id);
            if (catCollections.length === 0) return null;
            return (
              <div key={cat.id}>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2 flex-wrap">
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  <span className="text-slate-400 font-normal normal-case tracking-normal">
                    ({catCollections.length})
                  </span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {catCollections.map((collection) => (
                    <Link key={collection.id} href={`/library/collections/${collection.id}`}>
                      <Card className="bg-white/70 backdrop-blur-sm border-indigo-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 cursor-pointer h-full">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <span className="text-2xl shrink-0">{collection.icon}</span>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold text-indigo-900 text-sm truncate">{collection.title}</h4>
                              <p className="text-xs text-indigo-500 truncate">{collection.titleZh}</p>
                              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                <Badge className={difficultyColors[collection.difficulty]} variant="secondary">
                                  {messages.difficulty[collection.difficulty as keyof typeof messages.difficulty] ??
                                    collection.difficulty}
                                </Badge>
                                <span className="text-[11px] text-slate-400">{collection.itemIds.length} items</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
// ─── Word Book Group (for wordbook/scenario sections) ────────────────────────

function WordBookGroup({
  book,
  items,
  onDelete,
  onSetActive,
  selectable,
  selectedIds,
  onToggleSelect,
}: {
  book: WordBook;
  items: ContentItem[];
  onDelete: (id: string) => void;
  onSetActive: (id: string) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}) {
  const { messages } = useI18n('library');
  const isIOSNativeHost = detectIOSNativeHost();
  const [showCount, setShowCount] = useState(ITEMS_PER_GROUP);
  const visible = items.slice(0, showCount);
  const remaining = items.length - showCount;
  const diff = difficultyColors[book.difficulty];

  return (
    <AccordionItem
      value={book.id}
      className={cn(
        'border px-4',
        isIOSNativeHost ? IOS_SECTION_CARD_CLASS : 'rounded-xl bg-white/50 backdrop-blur-sm border-indigo-100',
      )}
    >
      <AccordionTrigger className="hover:no-underline py-4 cursor-pointer">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex items-center justify-center bg-indigo-50 text-lg',
              isIOSNativeHost ? 'h-10 w-10 rounded-2xl' : 'w-8 h-8 rounded-lg',
            )}
          >
            {book.emoji}
          </div>
          <span
            className={cn(
              'font-semibold',
              isIOSNativeHost ? 'text-[17px] text-slate-950' : 'text-base text-indigo-900',
            )}
          >
            {book.nameEn}
          </span>
          <Badge variant="secondary" className={cn('text-xs', diff)}>
            {messages.difficulty[book.difficulty as keyof typeof messages.difficulty] ?? book.difficulty}
          </Badge>
          <Badge
            variant="secondary"
            className={cn(
              isIOSNativeHost ? 'rounded-full bg-slate-100 px-2.5 text-slate-600' : 'bg-indigo-100 text-indigo-600',
            )}
          >
            {items.length}
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="grid gap-2 pb-2">
          {/* Practice whole book buttons */}
          <div className="mb-2 flex items-center gap-2 px-1 flex-wrap">
            <span className={cn('mr-1 text-xs', isIOSNativeHost ? 'text-slate-500' : 'text-indigo-400')}>
              {messages.practiceAll}:
            </span>
            <Link href={`/listen/book/${book.id}`}>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'text-xs cursor-pointer',
                  isIOSNativeHost
                    ? 'h-8 rounded-full border-slate-200 px-3 text-slate-700 hover:bg-slate-50'
                    : 'h-7 border-indigo-200 text-indigo-600',
                )}
              >
                <Headphones className="w-3 h-3 mr-1" /> {messages.actions.listen}
              </Button>
            </Link>
            <Link href={`/speak/book/${book.id}`}>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'text-xs cursor-pointer',
                  isIOSNativeHost
                    ? 'h-8 rounded-full border-slate-200 px-3 text-slate-700 hover:bg-slate-50'
                    : 'h-7 border-indigo-200 text-indigo-600',
                )}
              >
                <Mic className="w-3 h-3 mr-1" /> {messages.actions.speak}
              </Button>
            </Link>
            <Link href={`/read/book/${book.id}`}>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'text-xs cursor-pointer',
                  isIOSNativeHost
                    ? 'h-8 rounded-full border-slate-200 px-3 text-slate-700 hover:bg-slate-50'
                    : 'h-7 border-indigo-200 text-indigo-600',
                )}
              >
                <BookOpen className="w-3 h-3 mr-1" /> {messages.actions.read}
              </Button>
            </Link>
            <Link href={`/write/book/${book.id}`}>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'text-xs cursor-pointer',
                  isIOSNativeHost
                    ? 'h-8 rounded-full border-slate-200 px-3 text-slate-700 hover:bg-slate-50'
                    : 'h-7 border-indigo-200 text-indigo-600',
                )}
              >
                <PenTool className="w-3 h-3 mr-1" /> {messages.actions.write}
              </Button>
            </Link>
          </div>

          {visible.map((item) => (
            <ContentRow
              key={item.id}
              item={item}
              onDelete={onDelete}
              onSetActive={onSetActive}
              selectable={selectable}
              selected={selectedIds?.has(item.id)}
              onToggleSelect={onToggleSelect}
            />
          ))}
          {remaining > 0 && (
            <Button
              variant="ghost"
              onClick={() => setShowCount((c) => c + ITEMS_PER_GROUP)}
              className="w-full text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 cursor-pointer"
            >
              <ChevronDown className="w-4 h-4 mr-2" />
              {messages.showMore
                .replace('{{count}}', String(Math.min(remaining, ITEMS_PER_GROUP)))
                .replace('{{remaining}}', String(remaining))}
            </Button>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const isIOSNativeHost = detectIOSNativeHost();
  const loadContents = useContentStore((s) => s.loadContents);
  const getAllTags = useContentStore((s) => s.getAllTags);
  const setFilter = useContentStore((s) => s.setFilter);
  const filter = useContentStore((s) => s.filter);
  const deleteContent = useContentStore((s) => s.deleteContent);
  const updateContent = useContentStore((s) => s.updateContent);
  const setActiveContentId = useContentStore((s) => s.setActiveContentId);
  const items = useContentStore((s) => s.items);
  const { importedIds, loadImportedState } = useWordBookStore();
  const { collections, loadCollections, seedBuiltinCollections } = useCollectionStore();
  const { books: importedBooks, loadBooks } = useBookStore();
  const shadowReadingEnabled = useShadowReadingStore((s) => s.enabled);
  const startShadowSession = useShadowReadingStore((s) => s.startSession);
  const { messages } = useI18n('library');
  const [diffFilter, setDiffFilter] = useState<Difficulty | ''>('');
  const [viewMode, setViewMode] = useState<'all' | 'media'>('all');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState<ViewTab>('all');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchTagInput, setBatchTagInput] = useState('');
  const [showBatchTagInput, setShowBatchTagInput] = useState(false);
  const [showTagFilters, setShowTagFilters] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
    setShowBatchTagInput(false);
    setBatchTagInput('');
  };

  const handleBatchDelete = async () => {
    await Promise.all([...selectedIds].map((id) => deleteContent(id)));
    handleExitSelectMode();
  };

  const handleBatchTag = async () => {
    const newTags = normalizeTags(batchTagInput);
    if (newTags.length === 0) return;
    await Promise.all(
      [...selectedIds].map((id) => {
        const item = items.find((i) => i.id === id);
        if (item) {
          const merged = [...new Set([...item.tags, ...newTags])];
          return updateContent(id, { tags: merged });
        }
      }),
    );
    setShowBatchTagInput(false);
    setBatchTagInput('');
  };

  useEffect(() => {
    useTTSStore.getState().hydrate();
  }, []);

  useEffect(() => {
    loadContents();
    loadImportedState();
    loadBooks();
    void seedBuiltinCollections().then(() => loadCollections(true));
  }, [loadContents, loadImportedState, loadBooks, seedBuiltinCollections, loadCollections]);

  // Imported books by kind
  const importedVocabBooks = useMemo(
    () => ALL_WORDBOOKS.filter((b) => importedIds.has(b.id) && b.kind === 'vocabulary'),
    [importedIds],
  );

  const importedScenarioBooks = useMemo(
    () => ALL_WORDBOOKS.filter((b) => importedIds.has(b.id) && b.kind === 'scenario'),
    [importedIds],
  );

  const handleSetActive = (id: string) => {
    if (shadowReadingEnabled) {
      const item = items.find((i) => i.id === id);
      startShadowSession(id, item?.title || '');
      setActiveContentId(id);
    }
  };

  const handleTagToggle = (tag: string) => {
    const next = tagFilter.includes(tag) ? tagFilter.filter((t) => t !== tag) : [...tagFilter, tag];
    setTagFilter(next);
    setFilter({ tags: next.length > 0 ? next : undefined });
  };

  const handleDiffFilter = (diff: Difficulty | '') => {
    setDiffFilter(diff);
    setFilter({ difficulty: diff || undefined });
  };

  // Filter items based on current filters
  const filteredItems = useMemo(() => {
    let result = items;

    if (viewMode === 'media') {
      result = result.filter((item) => item.metadata?.audioUrl || item.metadata?.platform);
    }

    if (diffFilter) {
      result = result.filter((item) => item.difficulty === diffFilter);
    }

    if (tagFilter.length > 0) {
      result = result.filter((item) => tagFilter.every((t) => item.tags.includes(t)));
    }

    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.text.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [items, viewMode, diffFilter, tagFilter, filter.search]);

  // Group items by type (excluding words and book chapters for standalone display)
  const grouped = useMemo(() => {
    const groups: Record<string, ContentItem[]> = { phrase: [], sentence: [], article: [] };
    for (const item of filteredItems) {
      if (item.type !== 'word' && groups[item.type]) {
        // Exclude book chapters from the article group
        if (item.type === 'article' && item.category?.startsWith('book-')) continue;
        groups[item.type].push(item);
      }
    }
    return groups;
  }, [filteredItems]);

  // Group items by word book
  const vocabBookItems = useMemo(() => {
    const map: Record<string, ContentItem[]> = {};
    for (const book of importedVocabBooks) {
      map[book.id] = filteredItems.filter((item) => item.category === book.id);
    }
    return map;
  }, [filteredItems, importedVocabBooks]);

  const scenarioBookItems = useMemo(() => {
    const map: Record<string, ContentItem[]> = {};
    for (const book of importedScenarioBooks) {
      map[book.id] = filteredItems.filter((item) => item.category === book.id);
    }
    return map;
  }, [filteredItems, importedScenarioBooks]);

  const allTags = useMemo(() => getAllTags(), [getAllTags, items]);

  // Total item count
  const totalCount = filteredItems.length;

  // Determine which sections to show based on active tab
  const showCollections = activeViewTab === 'all' || activeViewTab === 'collection';
  const showWordBooks = activeViewTab === 'all' || activeViewTab === 'wordbook';
  const showBooks = activeViewTab === 'all' || activeViewTab === 'book';
  const showPhrases = activeViewTab === 'all' || activeViewTab === 'phrase';
  const showSentences = activeViewTab === 'all' || activeViewTab === 'sentence';
  const showArticles = activeViewTab === 'all' || activeViewTab === 'article';
  const showScenarios = activeViewTab === 'all' || activeViewTab === 'scenario';

  // Determine which sections have content
  const hasWordBooks = importedVocabBooks.some((b) => (vocabBookItems[b.id]?.length || 0) > 0);
  const hasBooks = importedBooks.length > 0;
  const hasPhrases = grouped.phrase.length > 0;
  const hasSentences = grouped.sentence.length > 0;
  const hasArticles = grouped.article.length > 0;
  const hasScenarios = importedScenarioBooks.some((b) => (scenarioBookItems[b.id]?.length || 0) > 0);

  const hasCollections = collections.length > 0;
  const showStandaloneCollections = false;
  const hasAnyContent =
    hasCollections || hasWordBooks || hasBooks || hasPhrases || hasSentences || hasArticles || hasScenarios;

  const hasAccordionSections =
    (showCollections && hasCollections) ||
    (showWordBooks && importedVocabBooks.some((b) => (vocabBookItems[b.id]?.length ?? 0) > 0)) ||
    (showBooks && importedBooks.length > 0) ||
    (showPhrases && grouped.phrase.length > 0) ||
    (showSentences && grouped.sentence.length > 0) ||
    (showArticles && grouped.article.length > 0) ||
    (showScenarios && importedScenarioBooks.some((b) => (scenarioBookItems[b.id]?.length ?? 0) > 0));

  // Default open accordion values
  const defaultAccordionValues = useMemo(() => {
    const vals: string[] = [];
    if (activeViewTab === 'collection' && hasCollections) vals.push('scenario-collections');
    if (hasBooks) vals.push('imported-books');
    // Phrases, sentences, articles open by default
    if (hasPhrases) vals.push('phrase');
    if (hasSentences) vals.push('sentence');
    if (hasArticles) vals.push('article');
    // Word books and scenarios collapsed by default (per user request)
    return vals;
  }, [activeViewTab, hasBooks, hasCollections, hasPhrases, hasSentences, hasArticles]);

  const showLibraryEmpty = !showStandaloneCollections && !hasAccordionSections;

  return (
    <div
      className={cn('max-w-6xl mx-auto space-y-6 pb-20', isIOSNativeHost && 'space-y-5 pb-16')}
      data-has-content={hasAnyContent}
    >
      <div className={isIOSNativeHost ? '' : 'flex flex-col sm:flex-row sm:items-center justify-between gap-3'}>
        {isIOSNativeHost ? (
          <IOSPageHeader
            icon={BookOpen}
            title={messages.page.title}
            description="Bring books, phrases, scenarios, and practice material into one native-feeling library."
            tone="indigo"
            badge={`${totalCount} items`}
            action={<IOSInlineChatButton compact className="shrink-0 self-start" />}
          />
        ) : (
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-[var(--font-poppins)] text-indigo-900">
              {messages.page.title}
            </h1>
            <p className="text-indigo-600 mt-1 text-sm md:text-base">
              {messages.itemCount.replace('{{count}}', String(totalCount))}
            </p>
          </div>
        )}
        <div className={cn('flex items-center gap-2 shrink-0', isIOSNativeHost && 'mt-4 flex-wrap px-1')}>
          <Button
            onClick={() => (selectMode ? handleExitSelectMode() : setSelectMode(true))}
            variant={selectMode ? 'default' : 'outline'}
            size="sm"
            className={
              selectMode
                ? cn(
                    'bg-indigo-600 cursor-pointer',
                    isIOSNativeHost && 'h-10 rounded-full px-4 shadow-[0_12px_26px_rgba(79,70,229,0.2)]',
                  )
                : cn(
                    'border-indigo-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer',
                    isIOSNativeHost && IOS_TERTIARY_BUTTON_CLASS,
                  )
            }
          >
            <CheckSquare className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">{selectMode ? messages.actions.cancel : messages.actions.select}</span>
          </Button>
          {!selectMode && (
            <>
              <Button
                onClick={() => setQuickAddOpen(true)}
                variant="outline"
                size="sm"
                className={
                  isIOSNativeHost
                    ? `${IOS_TERTIARY_BUTTON_CLASS} cursor-pointer`
                    : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer'
                }
              >
                <Plus className="w-4 h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">{messages.page.quickAdd}</span>
                <span className="sm:hidden">Add</span>
              </Button>
              <Link href="/library/import">
                <Button
                  size="sm"
                  className={
                    isIOSNativeHost
                      ? `${IOS_PRIMARY_BUTTON_CLASS} cursor-pointer`
                      : 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'
                  }
                >
                  {messages.page.importContent}
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <div
        className={
          isIOSNativeHost
            ? `sticky top-0 z-10 ${IOS_TINTED_SUBCARD_CLASS} px-4 py-4 backdrop-blur-xl`
            : 'sticky top-0 z-10 bg-[#EEF2FF]/80 backdrop-blur-md py-3 -mx-6 px-6 space-y-3'
        }
      >
        <div className="relative">
          <Search
            className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4',
              isIOSNativeHost ? 'text-slate-400' : 'text-indigo-400',
            )}
          />
          <Input
            placeholder={messages.search.placeholder}
            value={filter.search}
            onChange={(e) => setFilter({ search: e.target.value })}
            className={isIOSNativeHost ? `${IOS_INPUT_CLASS} pl-10` : 'pl-10 bg-white/70 border-indigo-200'}
          />
        </div>

        <div
          className={cn(
            'flex items-center gap-2 md:gap-4 flex-wrap',
            isIOSNativeHost && 'mt-3 flex-col items-stretch gap-3',
          )}
        >
          {/* View tabs: All, Word Books, Phrases, Sentences, Articles, Scenarios */}
          <div
            className={
              isIOSNativeHost
                ? 'flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
                : 'flex gap-1 md:gap-1.5 flex-wrap'
            }
          >
            {(Object.keys(VIEW_TAB_ICON_MAP) as ViewTab[]).map((key) => {
              const TabIcon = VIEW_TAB_ICON_MAP[key];
              const label = messages.tabs[key as keyof typeof messages.tabs] ?? key;
              return (
                <Button
                  key={key}
                  variant={activeViewTab === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveViewTab(key)}
                  className={cn(
                    'text-xs h-7 md:h-8 px-2 md:px-3',
                    isIOSNativeHost && 'shrink-0',
                    activeViewTab === key
                      ? isIOSNativeHost
                        ? 'rounded-full bg-slate-900 text-white shadow-[0_8px_18px_rgba(15,23,42,0.15)] cursor-pointer'
                        : 'bg-indigo-600 cursor-pointer'
                      : isIOSNativeHost
                        ? 'rounded-full border-slate-200 bg-white text-slate-600 cursor-pointer'
                        : 'border-indigo-200 text-indigo-600 cursor-pointer',
                  )}
                >
                  {TabIcon && <TabIcon className="w-3 h-3 mr-1" />}
                  {label}
                </Button>
              );
            })}
          </div>

          {!isIOSNativeHost && <div className="w-px h-6 bg-indigo-200 hidden md:block" />}

          <div className={cn('flex items-center gap-2 md:gap-4', isIOSNativeHost && 'flex-col items-stretch gap-2')}>
            {/* View mode */}
            <div
              className={
                isIOSNativeHost
                  ? 'flex w-fit gap-1 rounded-2xl bg-slate-100 p-1'
                  : 'flex gap-1 bg-slate-100 rounded-lg p-0.5'
              }
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('all')}
                className={`rounded-md text-xs cursor-pointer ${viewMode === 'all' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}
              >
                {messages.viewMode.allContent}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('media')}
                className={`rounded-md text-xs cursor-pointer ${viewMode === 'media' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}
              >
                <Video className="w-3.5 h-3.5 mr-1" />
                {messages.viewMode.media}
              </Button>
            </div>

            {/* Difficulty filters */}
            <div
              className={
                isIOSNativeHost
                  ? 'flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
                  : 'flex gap-1 md:gap-1.5 flex-wrap'
              }
            >
              {(['', 'beginner', 'intermediate', 'advanced'] as const).map((diff) => (
                <Button
                  key={diff || 'all-diff'}
                  variant={diffFilter === diff ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleDiffFilter(diff as Difficulty | '')}
                  className={cn(
                    'text-xs h-7 md:h-8 px-2 md:px-3',
                    isIOSNativeHost && 'shrink-0 rounded-full',
                    diffFilter === diff
                      ? 'bg-indigo-600'
                      : isIOSNativeHost
                        ? 'border-slate-200 text-slate-600 cursor-pointer'
                        : 'border-indigo-200 text-indigo-600 cursor-pointer',
                  )}
                >
                  {diff ? messages.difficulty[diff as keyof typeof messages.difficulty] : messages.difficulty.allLevels}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {isIOSNativeHost ? (
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={IOS_PILL_CLASS}>{filteredItems.length} visible</span>
              <span className={IOS_PILL_CLASS}>
                {messages.tabs[activeViewTab as keyof typeof messages.tabs] ?? activeViewTab}
              </span>
              <span className={IOS_PILL_CLASS}>{viewMode === 'media' ? 'Media focus' : 'All content'}</span>
              {allTags.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowTagFilters((value) => !value)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/92 px-3 text-[11px] font-semibold text-slate-600 shadow-[0_6px_18px_rgba(15,23,42,0.04)] transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  <Tag className="h-3.5 w-3.5" />
                  {tagFilter.length > 0
                    ? `${tagFilter.length} active tags`
                    : showTagFilters
                      ? 'Hide tags'
                      : `${allTags.length} tags`}
                </button>
              ) : null}
            </div>
            {allTags.length > 0 && (showTagFilters || tagFilter.length > 0) ? (
              <div className={`${IOS_SUBCARD_CLASS} px-3 py-3`}>
                <TagCloud tags={allTags} selectedTags={tagFilter} onToggle={handleTagToggle} maxVisible={6} />
              </div>
            ) : null}
          </div>
        ) : allTags.length > 0 ? (
          <TagCloud tags={allTags} selectedTags={tagFilter} onToggle={handleTagToggle} />
        ) : null}
      </div>

      <QuickAddDialog open={quickAddOpen} onOpenChange={setQuickAddOpen} />

      {selectMode && selectedIds.size > 0 && (
        <div className="sticky bottom-4 z-20 flex items-center justify-center">
          <div
            className={cn(
              'flex items-center gap-2 px-4 py-2.5',
              isIOSNativeHost
                ? 'rounded-[22px] border border-white/75 bg-white/88 shadow-[0_18px_38px_rgba(15,23,42,0.12)] backdrop-blur-xl'
                : 'bg-white border border-indigo-200 shadow-lg rounded-xl',
            )}
          >
            <span className={cn('text-sm font-medium', isIOSNativeHost ? 'text-slate-700' : 'text-indigo-700')}>
              {messages.actions.selected.replace('{{count}}', String(selectedIds.size))}
            </span>
            <div className={cn('w-px h-5', isIOSNativeHost ? 'bg-slate-200' : 'bg-indigo-200')} />
            {showBatchTagInput ? (
              <div className="flex items-center gap-1.5">
                <Input
                  value={batchTagInput}
                  onChange={(e) => setBatchTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleBatchTag();
                    if (e.key === 'Escape') setShowBatchTagInput(false);
                  }}
                  placeholder="tag1, tag2"
                  className={cn('h-8 w-40 text-xs', isIOSNativeHost ? IOS_INPUT_CLASS : 'bg-white border-indigo-200')}
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={handleBatchTag}
                  className="h-8 bg-indigo-600 hover:bg-indigo-700 text-xs cursor-pointer"
                >
                  {messages.actions.apply}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowBatchTagInput(false)}
                  className="h-7 text-xs cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowBatchTagInput(true)}
                className="h-7 text-xs border-indigo-200 text-indigo-600 cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5 mr-1" /> {messages.actions.addTags}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleBatchDelete}
              className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" /> {messages.actions.delete}
            </Button>
          </div>
        </div>
      )}

      {hasAccordionSections ? (
        <Accordion key={activeViewTab} type="multiple" defaultValue={defaultAccordionValues} className="space-y-3">
          {showCollections && hasCollections && <ScenarioCollectionsGroup collections={collections} />}

          {/* Word Books section */}
          {showWordBooks &&
            importedVocabBooks.map((book) => {
              const bookItems = vocabBookItems[book.id] || [];
              if (bookItems.length === 0) return null;
              return (
                <WordBookGroup
                  key={book.id}
                  book={book}
                  items={bookItems}
                  onDelete={deleteContent}
                  onSetActive={handleSetActive}
                  selectable={selectMode}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                />
              );
            })}

          {/* Imported Books section */}
          {showBooks && importedBooks.length > 0 && (
            <AccordionItem
              value="imported-books"
              className={cn(
                'border px-4',
                isIOSNativeHost ? IOS_SECTION_CARD_CLASS : 'rounded-xl bg-white/50 backdrop-blur-sm border-indigo-100',
              )}
            >
              <AccordionTrigger className="hover:no-underline py-4 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex items-center justify-center',
                      isIOSNativeHost
                        ? 'h-10 w-10 rounded-2xl bg-[linear-gradient(135deg,rgba(251,191,36,0.22)_0%,rgba(245,158,11,0.12)_100%)]'
                        : 'w-8 h-8 rounded-lg bg-amber-100',
                    )}
                  >
                    <BookOpen className={cn('w-4 h-4', isIOSNativeHost ? 'text-amber-700' : 'text-amber-700')} />
                  </div>
                  <span
                    className={cn(
                      'font-semibold',
                      isIOSNativeHost ? 'text-[17px] text-slate-950' : 'text-base text-indigo-900',
                    )}
                  >
                    {messages.importedBooks}
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      isIOSNativeHost
                        ? 'rounded-full bg-slate-100 px-2.5 text-slate-600'
                        : 'bg-indigo-100 text-indigo-600',
                    )}
                  >
                    {importedBooks.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-2 pb-2">
                  {importedBooks.map((book) => (
                    <Link key={book.id} href={`/library/books/${book.id}`}>
                      <Card
                        className={cn(
                          'transition-all duration-200 cursor-pointer',
                          isIOSNativeHost
                            ? `${IOS_LIST_CARD_CLASS} hover:-translate-y-0.5`
                            : 'bg-white border-slate-100 shadow-sm hover:shadow-md',
                        )}
                      >
                        <CardContent className="flex items-center gap-4 p-4">
                          <span className="text-3xl">{book.coverEmoji}</span>
                          <div className="flex-1 min-w-0">
                            <h3 className={cn('font-semibold', isIOSNativeHost ? 'text-slate-900' : 'text-indigo-900')}>
                              {book.title}
                            </h3>
                            <p className={cn('text-sm', isIOSNativeHost ? 'text-slate-500' : 'text-indigo-500')}>
                              by {book.author}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge className={difficultyColors[book.difficulty]} variant="secondary">
                                {messages.difficulty[book.difficulty as keyof typeof messages.difficulty] ??
                                  book.difficulty}
                              </Badge>
                              <Badge variant="outline" className="border-indigo-200 text-indigo-400 text-xs">
                                {messages.chapters.replace('{{count}}', String(book.chapterCount))}
                              </Badge>
                              <Badge variant="outline" className="border-indigo-200 text-indigo-400 text-xs">
                                {messages.words.replace('{{count}}', book.totalWords.toLocaleString())}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Phrases section */}
          {showPhrases && grouped.phrase.length > 0 && (
            <ContentGroup
              type="phrase"
              items={grouped.phrase}
              onDelete={deleteContent}
              onSetActive={handleSetActive}
              selectable={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          )}

          {/* Sentences section */}
          {showSentences && grouped.sentence.length > 0 && (
            <ContentGroup
              type="sentence"
              items={grouped.sentence}
              onDelete={deleteContent}
              onSetActive={handleSetActive}
              selectable={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          )}

          {/* Articles section */}
          {showArticles && grouped.article.length > 0 && (
            <ContentGroup
              type="article"
              items={grouped.article}
              onDelete={deleteContent}
              onSetActive={handleSetActive}
              selectable={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          )}

          {/* Scenarios section */}
          {showScenarios &&
            importedScenarioBooks.map((book) => {
              const bookItems = scenarioBookItems[book.id] || [];
              if (bookItems.length === 0) return null;
              return (
                <WordBookGroup
                  key={book.id}
                  book={book}
                  items={bookItems}
                  onDelete={deleteContent}
                  onSetActive={handleSetActive}
                  selectable={selectMode}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                />
              );
            })}
        </Accordion>
      ) : null}

      {showLibraryEmpty &&
        (isIOSNativeHost ? (
          <IOSEmptyStateCard
            icon={BookMarked}
            tone="indigo"
            title={messages.noContent}
            description="Import articles, phrases, books, or scenario packs and they will land here in the same iOS library system."
            action={
              activeViewTab === 'collection' ? (
                <Link href="/library/collections/generate">
                  <Button size="sm" variant="outline" className={`${IOS_TERTIARY_BUTTON_CLASS} cursor-pointer`}>
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    AI Generate
                  </Button>
                </Link>
              ) : null
            }
          />
        ) : (
          <div
            className={cn(
              'text-center py-12 space-y-4',
              isIOSNativeHost ? `${IOS_SECTION_CARD_CLASS} px-6 text-slate-500` : 'text-indigo-400',
            )}
          >
            <p>{messages.noContent}</p>
            {activeViewTab === 'collection' && (
              <Link href="/library/collections/generate">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  AI Generate
                </Button>
              </Link>
            )}
          </div>
        ))}
    </div>
  );
}

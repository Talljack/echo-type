'use client';

import {
  BookOpen,
  Check,
  ChevronDown,
  FileText,
  Headphones,
  MessageSquare,
  Mic,
  PenTool,
  Plus,
  Search,
  Tag,
  Trash2,
  Type,
  Video,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { TagCloud } from '@/components/shared/tag-cloud';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { normalizeTags } from '@/lib/utils';
import { useContentStore } from '@/stores/content-store';
import { useTTSStore } from '@/stores/tts-store';
import type { ContentItem, ContentType, Difficulty } from '@/types/content';

const ITEMS_PER_GROUP = 10;

const typeConfig: Record<ContentType, { color: string; icon: typeof Type; label: string }> = {
  word: { color: 'bg-blue-100 text-blue-700', icon: Type, label: 'Words' },
  phrase: { color: 'bg-green-100 text-green-700', icon: MessageSquare, label: 'Phrases' },
  sentence: { color: 'bg-purple-100 text-purple-700', icon: FileText, label: 'Sentences' },
  article: { color: 'bg-amber-100 text-amber-700', icon: BookOpen, label: 'Articles' },
};

const difficultyColors: Record<string, string> = {
  beginner: 'bg-emerald-100 text-emerald-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-red-100 text-red-700',
};

function ContentRow({
  item,
  onDelete,
  onSetActive,
}: {
  item: ContentItem;
  onDelete: (id: string) => void;
  onSetActive: (id: string) => void;
}) {
  const { updateContent } = useContentStore();
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

  return (
    <Card className="bg-white border-slate-100 shadow-sm hover:shadow-md transition-all duration-200">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-indigo-900 truncate">{item.title}</h3>
            {item.metadata?.audioUrl && <Video className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
            {item.difficulty && (
              <Badge className={difficultyColors[item.difficulty]} variant="secondary">
                {item.difficulty}
              </Badge>
            )}
            {item.category && (
              <Badge variant="outline" className="border-indigo-200 text-indigo-400 text-xs">
                {item.category}
              </Badge>
            )}
          </div>
          <p className="text-sm text-indigo-500 truncate">{item.text}</p>
          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
            {editing ? (
              <div className="flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTags();
                    if (e.key === 'Escape') setEditing(false);
                  }}
                  placeholder="tag1, tag2, tag3"
                  className="h-7 text-xs bg-white border-indigo-200 flex-1"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSaveTags}
                  className="h-6 w-6 text-green-600 hover:text-green-700 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditing(false)}
                  className="h-6 w-6 text-slate-400 hover:text-slate-600 cursor-pointer"
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit();
                  }}
                  className="flex items-center gap-0.5 text-xs text-indigo-400 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  <Tag className="w-3 h-3" />
                  <span>{item.tags.length === 0 ? 'Add tags' : '+'}</span>
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 ml-4 shrink-0">
          <Link href={`/listen/${item.id}`} onClick={() => onSetActive(item.id)}>
            <Button
              variant="ghost"
              size="icon"
              className="text-indigo-500 hover:text-indigo-700 cursor-pointer h-8 w-8"
            >
              <Headphones className="w-4 h-4" />
            </Button>
          </Link>
          <Link href={`/speak/${item.id}`} onClick={() => onSetActive(item.id)}>
            <Button
              variant="ghost"
              size="icon"
              className="text-indigo-500 hover:text-indigo-700 cursor-pointer h-8 w-8"
            >
              <Mic className="w-4 h-4" />
            </Button>
          </Link>
          <Link href={`/write/${item.id}`} onClick={() => onSetActive(item.id)}>
            <Button
              variant="ghost"
              size="icon"
              className="text-indigo-500 hover:text-indigo-700 cursor-pointer h-8 w-8"
            >
              <PenTool className="w-4 h-4" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(item.id)}
            className="text-red-400 hover:text-red-600 cursor-pointer h-8 w-8"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ContentGroup({
  type,
  items,
  onDelete,
  onSetActive,
}: {
  type: ContentType;
  items: ContentItem[];
  onDelete: (id: string) => void;
  onSetActive: (id: string) => void;
}) {
  const [showCount, setShowCount] = useState(ITEMS_PER_GROUP);
  const config = typeConfig[type];
  const Icon = config.icon;
  const visible = items.slice(0, showCount);
  const remaining = items.length - showCount;

  return (
    <AccordionItem value={type} className="border rounded-xl bg-white/50 backdrop-blur-sm border-indigo-100 px-4">
      <AccordionTrigger className="hover:no-underline py-4 cursor-pointer">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="font-semibold text-indigo-900 text-base">{config.label}</span>
          <Badge variant="secondary" className="bg-indigo-100 text-indigo-600">
            {items.length}
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="grid gap-2 pb-2">
          {visible.map((item) => (
            <ContentRow key={item.id} item={item} onDelete={onDelete} onSetActive={onSetActive} />
          ))}
          {remaining > 0 && (
            <Button
              variant="ghost"
              onClick={() => setShowCount((c) => c + ITEMS_PER_GROUP)}
              className="w-full text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 cursor-pointer"
            >
              <ChevronDown className="w-4 h-4 mr-2" />
              Show {Math.min(remaining, ITEMS_PER_GROUP)} more ({remaining} remaining)
            </Button>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export default function LibraryPage() {
  const { loadContents, getFilteredItems, getAllTags, setFilter, filter, deleteContent, setActiveContentId } =
    useContentStore();
  const shadowReadingEnabled = useTTSStore((s) => s.shadowReadingEnabled);
  const [diffFilter, setDiffFilter] = useState<Difficulty | ''>('');
  const [viewMode, setViewMode] = useState<'all' | 'media'>('all');
  const [tagFilter, setTagFilter] = useState<string[]>([]);

  useEffect(() => {
    useTTSStore.getState().hydrate();
  }, []);

  useEffect(() => {
    loadContents();
    const timer = setTimeout(() => loadContents(), 500);
    return () => clearTimeout(timer);
  }, [loadContents]);

  const handleSetActive = (id: string) => {
    if (shadowReadingEnabled) {
      setActiveContentId(id);
    }
  };

  const handleTagToggle = (tag: string) => {
    const next = tagFilter.includes(tag) ? tagFilter.filter((t) => t !== tag) : [...tagFilter, tag];
    setTagFilter(next);
    setFilter({ tags: next.length > 0 ? next : undefined });
  };

  const allItems = getFilteredItems();
  const items =
    viewMode === 'media' ? allItems.filter((item) => item.metadata?.audioUrl || item.metadata?.platform) : allItems;

  const allTags = getAllTags();

  const grouped = useMemo(() => {
    const groups: Record<ContentType, ContentItem[]> = { word: [], phrase: [], sentence: [], article: [] };
    for (const item of items) {
      groups[item.type].push(item);
    }
    return groups;
  }, [items]);

  const activeTypes = useMemo(
    () => (['word', 'phrase', 'sentence', 'article'] as const).filter((t) => grouped[t].length > 0),
    [grouped],
  );

  const handleDiffFilter = (diff: Difficulty | '') => {
    setDiffFilter(diff);
    setFilter({ difficulty: diff || undefined });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-[var(--font-poppins)] text-indigo-900">Content Library</h1>
          <p className="text-indigo-600 mt-1">
            {items.length} items across {activeTypes.length} categories
          </p>
        </div>
        <Link href="/library/import">
          <Button className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
            <Plus className="w-4 h-4 mr-2" />
            Import Content
          </Button>
        </Link>
      </div>

      <div className="sticky top-0 z-10 bg-[#EEF2FF]/80 backdrop-blur-md py-3 -mx-6 px-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
          <Input
            placeholder="Search content..."
            value={filter.search}
            onChange={(e) => setFilter({ search: e.target.value })}
            className="pl-10 bg-white/70 border-indigo-200"
          />
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('all')}
              className={`rounded-md text-xs cursor-pointer ${viewMode === 'all' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}
            >
              All Content
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('media')}
              className={`rounded-md text-xs cursor-pointer ${viewMode === 'media' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}
            >
              <Video className="w-3.5 h-3.5 mr-1" />
              Media Imports
            </Button>
          </div>

          <div className="flex gap-2 flex-wrap">
            {(['', 'beginner', 'intermediate', 'advanced'] as const).map((diff) => (
              <Button
                key={diff || 'all-diff'}
                variant={diffFilter === diff ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDiffFilter(diff as Difficulty | '')}
                className={diffFilter === diff ? 'bg-indigo-600' : 'border-indigo-200 text-indigo-600 cursor-pointer'}
              >
                {diff || 'All Levels'}
              </Button>
            ))}
          </div>
        </div>

        {allTags.length > 0 && <TagCloud tags={allTags} selectedTags={tagFilter} onToggle={handleTagToggle} />}
      </div>

      {activeTypes.length > 0 ? (
        <Accordion type="multiple" defaultValue={activeTypes} className="space-y-3">
          {activeTypes.map((type) => (
            <ContentGroup
              key={type}
              type={type}
              items={grouped[type]}
              onDelete={deleteContent}
              onSetActive={handleSetActive}
            />
          ))}
        </Accordion>
      ) : (
        <div className="text-center py-12 text-indigo-400">
          <p>No content found. Import some content to get started!</p>
        </div>
      )}
    </div>
  );
}

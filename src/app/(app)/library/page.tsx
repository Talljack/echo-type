'use client';

import { useEffect, useMemo, useState } from 'react';
import { useContentStore } from '@/stores/content-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, Plus, Trash2, Headphones, Mic, PenTool, BookOpen, MessageSquare, FileText, Type, ChevronDown } from 'lucide-react';
import Link from 'next/link';
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

function ContentRow({ item, onDelete }: { item: ContentItem; onDelete: (id: string) => void }) {
  return (
    <Card className="bg-white border-slate-100 shadow-sm hover:shadow-md transition-all duration-200">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-indigo-900 truncate">{item.title}</h3>
            {item.difficulty && (
              <Badge className={difficultyColors[item.difficulty]} variant="secondary">{item.difficulty}</Badge>
            )}
            {item.category && (
              <Badge variant="outline" className="border-indigo-200 text-indigo-400 text-xs">{item.category}</Badge>
            )}
          </div>
          <p className="text-sm text-indigo-500 truncate">{item.text}</p>
        </div>
        <div className="flex items-center gap-1 ml-4 shrink-0">
          <Link href={`/listen/${item.id}`}>
            <Button variant="ghost" size="icon" className="text-indigo-500 hover:text-indigo-700 cursor-pointer h-8 w-8">
              <Headphones className="w-4 h-4" />
            </Button>
          </Link>
          <Link href={`/speak/${item.id}`}>
            <Button variant="ghost" size="icon" className="text-indigo-500 hover:text-indigo-700 cursor-pointer h-8 w-8">
              <Mic className="w-4 h-4" />
            </Button>
          </Link>
          <Link href={`/write/${item.id}`}>
            <Button variant="ghost" size="icon" className="text-indigo-500 hover:text-indigo-700 cursor-pointer h-8 w-8">
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

function ContentGroup({ type, items, onDelete }: { type: ContentType; items: ContentItem[]; onDelete: (id: string) => void }) {
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
          <Badge variant="secondary" className="bg-indigo-100 text-indigo-600">{items.length}</Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="grid gap-2 pb-2">
          {visible.map((item) => (
            <ContentRow key={item.id} item={item} onDelete={onDelete} />
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
  const { loadContents, getFilteredItems, setFilter, filter, deleteContent } = useContentStore();
  const [diffFilter, setDiffFilter] = useState<Difficulty | ''>('');

  useEffect(() => {
    loadContents();
    const timer = setTimeout(() => loadContents(), 500);
    return () => clearTimeout(timer);
  }, [loadContents]);

  const items = getFilteredItems();

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

      {activeTypes.length > 0 ? (
        <Accordion type="multiple" defaultValue={activeTypes} className="space-y-3">
          {activeTypes.map((type) => (
            <ContentGroup key={type} type={type} items={grouped[type]} onDelete={deleteContent} />
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

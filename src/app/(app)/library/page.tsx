'use client';

import { useEffect, useState } from 'react';
import { useContentStore } from '@/stores/content-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Plus, Trash2, Headphones, Mic, PenTool } from 'lucide-react';
import Link from 'next/link';
import type { ContentItem, ContentType, Difficulty } from '@/types/content';

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

export default function LibraryPage() {
  const { loadContents, getFilteredItems, setFilter, filter, deleteContent } = useContentStore();
  const [typeFilter, setTypeFilter] = useState<ContentType | ''>('');
  const [diffFilter, setDiffFilter] = useState<Difficulty | ''>('');

  useEffect(() => {
    loadContents();
  }, [loadContents]);

  const items = getFilteredItems();

  const handleTypeFilter = (type: ContentType | '') => {
    setTypeFilter(type);
    setFilter({ type: type || undefined });
  };

  const handleDiffFilter = (diff: Difficulty | '') => {
    setDiffFilter(diff);
    setFilter({ difficulty: diff || undefined });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-[var(--font-poppins)] text-indigo-900">Content Library</h1>
          <p className="text-indigo-600 mt-1">Manage your English learning content</p>
        </div>
        <Link href="/library/import">
          <Button className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
            <Plus className="w-4 h-4 mr-2" />
            Import Content
          </Button>
        </Link>
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

        <div className="flex gap-2">
          {(['', 'word', 'phrase', 'sentence', 'article'] as const).map((type) => (
            <Button
              key={type || 'all'}
              variant={typeFilter === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTypeFilter(type as ContentType | '')}
              className={typeFilter === type ? 'bg-indigo-600' : 'border-indigo-200 text-indigo-600 cursor-pointer'}
            >
              {type || 'All'}
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
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

      <div className="grid gap-3">
        {items.map((item: ContentItem) => (
          <Card key={item.id} className="bg-white/70 backdrop-blur-xl border-indigo-100 hover:shadow-md transition-all duration-200">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-indigo-900 truncate">{item.title}</h3>
                  <Badge className={typeColors[item.type]} variant="secondary">{item.type}</Badge>
                  {item.difficulty && (
                    <Badge className={difficultyColors[item.difficulty]} variant="secondary">{item.difficulty}</Badge>
                  )}
                </div>
                <p className="text-sm text-indigo-500 truncate">{item.text}</p>
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                <Link href={`/listen/${item.id}`}>
                  <Button variant="ghost" size="icon" className="text-indigo-500 hover:text-indigo-700 cursor-pointer">
                    <Headphones className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href={`/speak/${item.id}`}>
                  <Button variant="ghost" size="icon" className="text-indigo-500 hover:text-indigo-700 cursor-pointer">
                    <Mic className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href={`/write/${item.id}`}>
                  <Button variant="ghost" size="icon" className="text-indigo-500 hover:text-indigo-700 cursor-pointer">
                    <PenTool className="w-4 h-4" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteContent(item.id)}
                  className="text-red-400 hover:text-red-600 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && (
          <div className="text-center py-12 text-indigo-400">
            <p>No content found. Import some content to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}

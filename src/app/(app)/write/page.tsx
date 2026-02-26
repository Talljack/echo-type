'use client';

import { useEffect, useState } from 'react';
import { useContentStore } from '@/stores/content-store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PenTool, Search } from 'lucide-react';
import Link from 'next/link';
import type { ContentType } from '@/types/content';

const typeColors: Record<ContentType, string> = {
  word: 'bg-blue-100 text-blue-700',
  phrase: 'bg-green-100 text-green-700',
  sentence: 'bg-purple-100 text-purple-700',
  article: 'bg-amber-100 text-amber-700',
};

export default function WritePage() {
  const { loadContents, getFilteredItems, setFilter, filter } = useContentStore();
  const [typeFilter, setTypeFilter] = useState<ContentType | ''>('');

  useEffect(() => {
    loadContents();
  }, [loadContents]);

  const items = getFilteredItems();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-[var(--font-poppins)] text-indigo-900">Write</h1>
        <p className="text-indigo-600 mt-1">Practice typing English with real-time feedback</p>
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
              onClick={() => {
                setTypeFilter(type as ContentType | '');
                setFilter({ type: (type as ContentType) || undefined });
              }}
              className={typeFilter === type ? 'bg-indigo-600' : 'border-indigo-200 text-indigo-600 cursor-pointer'}
            >
              {type || 'All'}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        {items.map((item) => (
          <Link key={item.id} href={`/write/${item.id}`}>
            <Card className="bg-white/70 backdrop-blur-xl border-indigo-100 hover:shadow-md transition-all duration-200 cursor-pointer group">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 group-hover:bg-purple-200 transition-colors">
                  <PenTool className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-medium text-indigo-900 truncate">{item.title}</h3>
                    <Badge className={typeColors[item.type]} variant="secondary">{item.type}</Badge>
                  </div>
                  <p className="text-sm text-indigo-500 truncate">{item.text}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {items.length === 0 && (
          <div className="text-center py-12 text-indigo-400">No content found.</div>
        )}
      </div>
    </div>
  );
}

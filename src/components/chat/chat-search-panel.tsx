'use client';

import { BookOpen, ExternalLink, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ALL_WORDBOOKS } from '@/lib/wordbooks/index';
import { useContentStore } from '@/stores/content-store';

interface SearchResult {
  type: 'wordbook' | 'content';
  title: string;
  description: string;
  id: string;
  difficulty?: string;
}

interface ChatSearchPanelProps {
  onClose: () => void;
  onSelectContent: (contentId: string) => void;
}

export function ChatSearchPanel({ onClose, onSelectContent }: ChatSearchPanelProps) {
  const [query, setQuery] = useState('');
  const items = useContentStore((s) => s.items);

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const found: SearchResult[] = [];

    // Search wordbooks
    for (const book of ALL_WORDBOOKS) {
      if (book.name.toLowerCase().includes(q) || book.description?.toLowerCase().includes(q)) {
        found.push({
          type: 'wordbook',
          title: book.name,
          description: book.description || '',
          id: book.id,
          difficulty: book.difficulty,
        });
      }
    }

    // Search content items
    for (const item of items) {
      if (
        item.title.toLowerCase().includes(q) ||
        item.text.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      ) {
        found.push({
          type: 'content',
          title: item.title,
          description: item.text.slice(0, 80),
          id: item.id,
          difficulty: item.difficulty,
        });
      }
    }

    return found.slice(0, 20);
  }, [query, items]);

  return (
    <div className="border-t border-indigo-100 bg-white/80 backdrop-blur-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-indigo-50">
        <span className="text-xs font-medium text-indigo-600">Search Resources</span>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-3 py-1.5">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search wordbooks, content..."
            className="w-full text-xs pl-6 pr-2 py-1.5 rounded-lg border border-slate-200 focus:border-indigo-300 focus:outline-none"
            autoFocus
          />
        </div>
      </div>

      <div className="max-h-36 overflow-y-auto px-3 pb-2 space-y-1">
        {query.trim() && results.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-3">No results found</p>
        )}
        {results.map((result) => (
          <div
            key={`${result.type}-${result.id}`}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-700 truncate">{result.title}</p>
              <p className="text-[10px] text-slate-400 truncate">{result.description}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                {result.type === 'wordbook' ? 'Book' : 'Content'}
              </span>
              {result.type === 'wordbook' && (
                <Link
                  href={`/library/wordbooks/${result.id}`}
                  className="flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors"
                >
                  <ExternalLink className="w-2.5 h-2.5" /> Browse
                </Link>
              )}
              {result.type === 'content' && (
                <button
                  type="button"
                  onClick={() => onSelectContent(result.id)}
                  className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-600 hover:bg-indigo-200 cursor-pointer transition-colors"
                >
                  Use
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

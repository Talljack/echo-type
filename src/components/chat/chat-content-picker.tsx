'use client';

import { Check, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useContentStore } from '@/stores/content-store';
import type { ContentItem, ContentType } from '@/types/content';

const TABS: { label: string; type: ContentType }[] = [
  { label: 'Words', type: 'word' },
  { label: 'Phrases', type: 'phrase' },
  { label: 'Sentences', type: 'sentence' },
  { label: 'Articles', type: 'article' },
];

interface ChatContentPickerProps {
  onSelect: (item: ContentItem) => void;
  onClose: () => void;
  activeContentId?: string | null;
}

export function ChatContentPicker({ onSelect, onClose, activeContentId }: ChatContentPickerProps) {
  const [activeTab, setActiveTab] = useState<ContentType>('word');
  const [search, setSearch] = useState('');
  const items = useContentStore((s) => s.items);

  const filtered = useMemo(() => {
    let result = items.filter((item) => item.type === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((item) => item.title.toLowerCase().includes(q) || item.text.toLowerCase().includes(q));
    }
    return result.slice(0, 50);
  }, [items, activeTab, search]);

  return (
    <div className="border-t border-indigo-100 bg-white/80 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-indigo-50">
        <span className="text-xs font-medium text-indigo-600">Library</span>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tab pills */}
      <div className="flex gap-1 px-3 py-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.type}
            type="button"
            onClick={() => setActiveTab(tab.type)}
            className={`text-[10px] px-2 py-1 rounded-full transition-colors cursor-pointer ${
              activeTab === tab.type ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-indigo-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-3 pb-1.5">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search content..."
            className="w-full text-xs pl-6 pr-2 py-1.5 rounded-lg border border-slate-200 focus:border-indigo-300 focus:outline-none"
          />
        </div>
      </div>

      {/* Item list */}
      <div className="max-h-36 overflow-y-auto px-3 pb-2 space-y-1">
        {filtered.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-3">No {activeTab}s found. Add content in the Library.</p>
        )}
        {filtered.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
              activeContentId === item.id
                ? 'bg-indigo-50 border border-indigo-200'
                : 'hover:bg-slate-50 border border-transparent'
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-700 truncate">{item.title}</p>
              <p className="text-slate-400 truncate">{item.text.slice(0, 60)}</p>
            </div>
            <button
              type="button"
              onClick={() => onSelect(item)}
              className={`shrink-0 text-[10px] px-2 py-0.5 rounded transition-colors cursor-pointer ${
                activeContentId === item.id
                  ? 'bg-green-100 text-green-700'
                  : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
              }`}
            >
              {activeContentId === item.id ? (
                <span className="flex items-center gap-0.5">
                  <Check className="w-3 h-3" /> Active
                </span>
              ) : (
                'Use'
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

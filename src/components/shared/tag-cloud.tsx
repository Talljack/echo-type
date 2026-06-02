'use client';

import { ChevronDown, ChevronUp, Tag, X } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { detectIOSNativeHost } from '@/lib/tauri';

interface TagCloudProps {
  tags: { tag: string; count: number }[];
  selectedTags: string[];
  onToggle: (tag: string) => void;
  maxVisible?: number;
}

export function TagCloud({ tags, selectedTags, onToggle, maxVisible = 8 }: TagCloudProps) {
  const [expanded, setExpanded] = useState(false);
  const isIOSNativeHost = detectIOSNativeHost();

  if (tags.length === 0) return null;

  const visibleTags = expanded ? tags : tags.slice(0, maxVisible);
  const hiddenCount = tags.length - maxVisible;

  return (
    <div className="space-y-2">
      {selectedTags.length > 0 && (
        <div className={isIOSNativeHost ? 'space-y-2' : 'flex items-center gap-1.5 flex-wrap'}>
          <span
            className={
              isIOSNativeHost
                ? 'block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400'
                : 'text-xs text-indigo-500 font-medium'
            }
          >
            Active
          </span>
          <div
            className={
              isIOSNativeHost
                ? 'flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
                : 'flex items-center gap-1.5 flex-wrap'
            }
          >
            {selectedTags.map((tag) => (
              <Badge
                key={tag}
                className={
                  isIOSNativeHost
                    ? 'shrink-0 rounded-full bg-slate-900 px-3 py-1 text-white cursor-pointer transition-colors'
                    : 'bg-indigo-100 text-indigo-700 cursor-pointer hover:bg-indigo-200 transition-colors gap-1 text-xs'
                }
                onClick={() => onToggle(tag)}
              >
                {tag}
                <X className="w-3 h-3" />
              </Badge>
            ))}
          </div>
        </div>
      )}
      <div className={isIOSNativeHost ? 'space-y-2' : 'flex items-center gap-1.5 flex-wrap'}>
        <div className={isIOSNativeHost ? 'flex items-center gap-1.5 px-0.5' : 'contents'}>
          <Tag
            className={isIOSNativeHost ? 'h-3.5 w-3.5 shrink-0 text-slate-400' : 'w-3.5 h-3.5 text-indigo-400 shrink-0'}
          />
          {isIOSNativeHost && (
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Tags</span>
          )}
        </div>
        <div
          className={
            isIOSNativeHost
              ? 'flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
              : 'flex items-center gap-1.5 flex-wrap'
          }
        >
          {selectedTags.map((tag) => (
            <Badge
              key={tag}
              className="bg-indigo-100 text-indigo-700 cursor-pointer hover:bg-indigo-200 transition-colors gap-1 text-xs"
              onClick={() => onToggle(tag)}
            >
              {tag}
              <X className="w-3 h-3" />
            </Badge>
          ))}
          {visibleTags.map(({ tag, count }) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <Badge
                key={tag}
                variant={isSelected ? 'default' : 'outline'}
                className={
                  isSelected
                    ? isIOSNativeHost
                      ? 'shrink-0 rounded-full bg-slate-900 px-3 py-1 text-white cursor-pointer transition-colors text-xs'
                      : 'bg-indigo-100 text-indigo-700 cursor-pointer hover:bg-indigo-200 transition-colors text-xs'
                    : isIOSNativeHost
                      ? 'shrink-0 rounded-full border-slate-200 bg-white px-3 py-1 text-slate-600 cursor-pointer transition-colors text-xs'
                      : 'border-slate-200 text-slate-500 cursor-pointer hover:border-indigo-300 hover:text-indigo-600 transition-colors text-xs'
                }
                onClick={() => onToggle(tag)}
              >
                {tag} ({count})
              </Badge>
            );
          })}
          {hiddenCount > 0 && !expanded && (
            <Badge
              variant="outline"
              className={
                isIOSNativeHost
                  ? 'shrink-0 rounded-full border-slate-200 bg-white px-3 py-1 text-indigo-600 cursor-pointer text-xs gap-0.5'
                  : 'border-indigo-200 bg-indigo-50/50 text-indigo-500 cursor-pointer hover:bg-indigo-100 hover:text-indigo-700 transition-colors text-xs gap-0.5'
              }
              onClick={() => setExpanded(true)}
            >
              <ChevronDown className="w-3 h-3" />+{hiddenCount} more
            </Badge>
          )}
          {expanded && hiddenCount > 0 && (
            <Badge
              variant="outline"
              className={
                isIOSNativeHost
                  ? 'shrink-0 rounded-full border-slate-200 bg-white px-3 py-1 text-indigo-600 cursor-pointer text-xs gap-0.5'
                  : 'border-indigo-200 bg-indigo-50/50 text-indigo-500 cursor-pointer hover:bg-indigo-100 hover:text-indigo-700 transition-colors text-xs gap-0.5'
              }
              onClick={() => setExpanded(false)}
            >
              <ChevronUp className="w-3 h-3" />
              Show less
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

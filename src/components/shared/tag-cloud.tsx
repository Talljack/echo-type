'use client';

import { ChevronDown, ChevronUp, Tag, X } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

interface TagCloudProps {
  tags: { tag: string; count: number }[];
  selectedTags: string[];
  onToggle: (tag: string) => void;
  maxVisible?: number;
}

export function TagCloud({ tags, selectedTags, onToggle, maxVisible = 8 }: TagCloudProps) {
  const [expanded, setExpanded] = useState(false);

  if (tags.length === 0) return null;

  const visibleTags = expanded ? tags : tags.slice(0, maxVisible);
  const hiddenCount = tags.length - maxVisible;

  return (
    <div className="space-y-2">
      {selectedTags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-brand-ink font-medium">Active</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {selectedTags.map((tag) => (
              <Badge
                key={tag}
                className="bg-brand-tint text-brand-ink cursor-pointer hover:bg-brand-line transition-colors gap-1 text-xs"
                onClick={() => onToggle(tag)}
              >
                {tag}
                <X className="w-3 h-3" />
              </Badge>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="contents">
          <Tag className="w-3.5 h-3.5 text-brand-muted shrink-0" />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {selectedTags.map((tag) => (
            <Badge
              key={tag}
              className="bg-brand-tint text-brand-ink cursor-pointer hover:bg-brand-line transition-colors gap-1 text-xs"
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
                    ? 'bg-brand-tint text-brand-ink cursor-pointer hover:bg-brand-line transition-colors text-xs'
                    : 'border-line text-ink-3 cursor-pointer hover:border-brand-line hover:text-brand-ink transition-colors text-xs'
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
              className="border-brand-line bg-brand-soft/50 text-brand-ink cursor-pointer hover:bg-brand-tint hover:text-brand-ink transition-colors text-xs gap-0.5"
              onClick={() => setExpanded(true)}
            >
              <ChevronDown className="w-3 h-3" />+{hiddenCount} more
            </Badge>
          )}
          {expanded && hiddenCount > 0 && (
            <Badge
              variant="outline"
              className="border-brand-line bg-brand-soft/50 text-brand-ink cursor-pointer hover:bg-brand-tint hover:text-brand-ink transition-colors text-xs gap-0.5"
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

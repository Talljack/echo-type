'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tag, ChevronDown, ChevronUp, X } from 'lucide-react';

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
          <span className="text-xs text-indigo-500 font-medium">Active:</span>
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
        </div>
      )}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Tag className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        {visibleTags.map(({ tag, count }) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <Badge
              key={tag}
              variant={isSelected ? 'default' : 'outline'}
              className={
                isSelected
                  ? 'bg-indigo-100 text-indigo-700 cursor-pointer hover:bg-indigo-200 transition-colors text-xs'
                  : 'border-slate-200 text-slate-500 cursor-pointer hover:border-indigo-300 hover:text-indigo-600 transition-colors text-xs'
              }
              onClick={() => onToggle(tag)}
            >
              {tag} ({count})
            </Badge>
          );
        })}
        {hiddenCount > 0 && !expanded && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(true)}
            className="text-xs text-indigo-500 hover:text-indigo-700 h-6 px-2 cursor-pointer"
          >
            <ChevronDown className="w-3 h-3 mr-0.5" />
            +{hiddenCount} more
          </Button>
        )}
        {expanded && hiddenCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(false)}
            className="text-xs text-indigo-500 hover:text-indigo-700 h-6 px-2 cursor-pointer"
          >
            <ChevronUp className="w-3 h-3 mr-0.5" />
            Show less
          </Button>
        )}
      </div>
    </div>
  );
}

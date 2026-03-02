'use client';

import { Tag, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { usePresetTagsStore } from '@/stores/preset-tags-store';

interface TagSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function TagSelector({
  value,
  onChange,
  placeholder = 'e.g. business, daily, idiom',
  className,
}: TagSelectorProps) {
  const { presetTags, hydrate } = usePresetTagsStore();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Parse value into selected tags
  useEffect(() => {
    const tags = value
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    setSelectedTags(tags);
  }, [value]);

  const handleTogglePreset = (tag: string) => {
    const current = value
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
    onChange(next.join(', '));
  };

  return (
    <div className="space-y-2">
      {presetTags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Tag className="w-3 h-3 text-indigo-400 shrink-0" />
          <span className="text-xs text-slate-500">Quick select:</span>
          {presetTags.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <Badge
                key={tag}
                variant={isSelected ? 'default' : 'outline'}
                className={
                  isSelected
                    ? 'bg-indigo-600 text-white cursor-pointer hover:bg-indigo-700 transition-colors text-xs'
                    : 'border-slate-200 text-slate-500 cursor-pointer hover:border-indigo-300 hover:text-indigo-600 transition-colors text-xs'
                }
                onClick={() => handleTogglePreset(tag)}
              >
                {tag}
                {isSelected && <X className="w-2.5 h-2.5 ml-0.5" />}
              </Badge>
            );
          })}
        </div>
      )}
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={className} />
    </div>
  );
}

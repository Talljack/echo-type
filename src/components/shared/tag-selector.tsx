'use client';

import { Tag, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n/use-i18n';
import { usePresetTagsStore } from '@/stores/preset-tags-store';

interface TagSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

export function TagSelector({ value, onChange, placeholder, ariaLabel, className }: TagSelectorProps) {
  const { presetTags, hydrate } = usePresetTagsStore();
  const { messages } = useI18n('library');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

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
          <Tag className="w-3 h-3 text-brand-muted shrink-0" />
          <span className="text-xs text-ink-3">{messages.textImport.quickSelect}</span>
          {presetTags.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <Badge
                key={tag}
                variant={isSelected ? 'default' : 'outline'}
                className={
                  isSelected
                    ? 'bg-brand text-white cursor-pointer hover:bg-brand-strong transition-colors text-xs'
                    : 'border-line text-ink-3 cursor-pointer hover:border-brand-line hover:text-brand-ink transition-colors text-xs'
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
      <Input
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? messages.textImport.tagSelectorPlaceholder}
        className={className}
      />
    </div>
  );
}

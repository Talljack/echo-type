'use client';

import { Plus, Tag, X } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n/use-i18n';
import { usePresetTagsStore } from '@/stores/preset-tags-store';

export function TagManagement() {
  const { presetTags, addPresetTag, removePresetTag } = usePresetTagsStore();
  const [input, setInput] = useState('');
  const { messages: copy, interfaceLanguage } = useI18n('tagManagement');

  const handleAdd = () => {
    if (!input.trim()) return;
    addPresetTag(input);
    setInput('');
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-3">{copy.description}</p>

      <div className="flex items-center gap-2 flex-wrap min-h-[40px] p-3 bg-surface-2 rounded-lg border border-line">
        {presetTags.length === 0 ? (
          <span className="text-sm text-ink-4">{copy.empty}</span>
        ) : (
          presetTags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="bg-brand-tint text-brand-ink gap-1.5 cursor-default overflow-visible"
            >
              <Tag className="w-3 h-3" />
              {tag}
              <button
                type="button"
                onClick={() => removePresetTag(tag)}
                aria-label={interfaceLanguage === 'zh' ? `移除标签 ${tag}` : `Remove tag ${tag}`}
                className="-my-1 -ml-1 -mr-1.5 inline-flex size-6 items-center justify-center rounded-full hover:text-ink transition-colors cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            </Badge>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <Input
          aria-label={copy.placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={copy.placeholder}
          className="flex-1 bg-surface border-line"
          disabled={presetTags.length >= 20}
        />
        <Button
          onClick={handleAdd}
          disabled={!input.trim() || presetTags.length >= 20}
          className="bg-brand hover:bg-brand-strong cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />
          {copy.add}
        </Button>
      </div>

      {presetTags.length >= 20 && <p className="text-xs text-warning">{copy.limitReached}</p>}
    </div>
  );
}

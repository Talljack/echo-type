'use client';

import { Plus, Tag, X } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePresetTagsStore } from '@/stores/preset-tags-store';

export function TagManagement() {
  const { presetTags, addPresetTag, removePresetTag } = usePresetTagsStore();
  const [input, setInput] = useState('');

  const handleAdd = () => {
    if (!input.trim()) return;
    addPresetTag(input);
    setInput('');
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Manage preset tags for quick selection when importing content. Maximum 20 tags.
      </p>

      <div className="flex items-center gap-2 flex-wrap min-h-[40px] p-3 bg-slate-50 rounded-lg border border-slate-200">
        {presetTags.length === 0 ? (
          <span className="text-sm text-slate-400">No preset tags yet. Add some below.</span>
        ) : (
          presetTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="bg-indigo-100 text-indigo-700 gap-1.5 cursor-default">
              <Tag className="w-3 h-3" />
              {tag}
              <button
                type="button"
                onClick={() => removePresetTag(tag)}
                className="hover:text-indigo-900 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Enter a tag name..."
          className="flex-1 bg-white border-slate-200"
          disabled={presetTags.length >= 20}
        />
        <Button
          onClick={handleAdd}
          disabled={!input.trim() || presetTags.length >= 20}
          className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Tag
        </Button>
      </div>

      {presetTags.length >= 20 && (
        <p className="text-xs text-amber-600">Maximum of 20 preset tags reached. Remove some to add new ones.</p>
      )}
    </div>
  );
}

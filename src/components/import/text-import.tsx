'use client';

import { FileText } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { TagSelector } from '@/components/shared/tag-selector';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { inferImportedContentType } from '@/lib/import-content';
import { normalizeTags } from '@/lib/utils';
import { useContentStore } from '@/stores/content-store';
import type { ContentItem, ContentType, Difficulty } from '@/types/content';

export function TextImport() {
  const router = useRouter();
  const { addContent } = useContentStore();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [type, setType] = useState<ContentType | ''>('');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [tags, setTags] = useState('');
  const [importing, setImporting] = useState(false);

  const detectedType = type || inferImportedContentType(text);

  const handleImport = async () => {
    if (!text.trim()) return;
    setImporting(true);

    const now = Date.now();
    const item: ContentItem = {
      id: nanoid(),
      title: title.trim() || text.trim().slice(0, 50),
      text: text.trim(),
      type: detectedType,
      tags: normalizeTags(tags),
      source: 'imported',
      difficulty,
      createdAt: now,
      updatedAt: now,
    };

    await addContent(item);
    setImporting(false);
    router.push('/library');
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="text-import-title" className="text-sm font-medium text-indigo-700 mb-1 block">
          Title (optional)
        </label>
        <Input
          id="text-import-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a title..."
          className="bg-white/50 border-indigo-200"
        />
      </div>

      <div>
        <label htmlFor="text-import-content" className="text-sm font-medium text-indigo-700 mb-1 block">
          English Content
        </label>
        <Textarea
          id="text-import-content"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste or type English content here..."
          rows={8}
          className="bg-white/50 border-indigo-200"
        />
      </div>

      {text && (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          <span className="text-sm text-indigo-600">
            Detected type: <Badge variant="secondary">{detectedType}</Badge>
          </span>
        </div>
      )}

      <div className="flex gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-indigo-700 mb-1 block">Type Override</p>
          <div className="flex gap-2">
            {(['word', 'phrase', 'sentence', 'article'] as const).map((t) => (
              <Button
                key={t}
                variant={type === t ? 'default' : 'outline'}
                size="sm"
                onClick={() => setType(type === t ? '' : t)}
                className={type === t ? 'bg-indigo-600' : 'border-indigo-200 text-indigo-600 cursor-pointer'}
              >
                {t}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-indigo-700 mb-1 block">Difficulty</p>
          <div className="flex gap-2">
            {(['beginner', 'intermediate', 'advanced'] as const).map((d) => (
              <Button
                key={d}
                variant={difficulty === d ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDifficulty(d)}
                className={difficulty === d ? 'bg-indigo-600' : 'border-indigo-200 text-indigo-600 cursor-pointer'}
              >
                {d}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-indigo-700 mb-1 block">Tags (comma separated)</p>
        <TagSelector value={tags} onChange={setTags} className="bg-white/50 border-indigo-200" />
      </div>

      <Button
        onClick={handleImport}
        disabled={!text.trim() || importing}
        className="w-full bg-green-500 hover:bg-green-600 text-white cursor-pointer"
      >
        {importing ? 'Importing...' : 'Import Content'}
      </Button>
    </div>
  );
}

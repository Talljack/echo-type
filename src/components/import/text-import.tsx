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
import { useI18n } from '@/lib/i18n/use-i18n';
import { inferImportedContentType } from '@/lib/import-content';
import { normalizeTags } from '@/lib/utils';
import { useContentStore } from '@/stores/content-store';
import type { ContentItem, ContentType, Difficulty } from '@/types/content';

export function TextImport() {
  const router = useRouter();
  const { addContent } = useContentStore();
  const { messages } = useI18n('library');
  const m = messages.textImport;
  const qa = messages.quickAdd;
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
          {m.labelTitle}
        </label>
        <Input
          id="text-import-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={m.placeholderTitle}
          className="bg-white/50 border-indigo-200"
        />
      </div>

      <div>
        <label htmlFor="text-import-content" className="text-sm font-medium text-indigo-700 mb-1 block">
          {m.labelContent}
        </label>
        <Textarea
          id="text-import-content"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={m.placeholderContent}
          rows={8}
          className="bg-white/50 border-indigo-200"
        />
      </div>

      {text && (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          <span className="text-sm text-indigo-600">
            {m.detected} <Badge variant="secondary">{detectedType}</Badge>
          </span>
        </div>
      )}

      <div className="flex gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-indigo-700 mb-1 block">{m.typeOverride}</p>
          <div className="flex gap-2">
            {(['word', 'phrase', 'sentence', 'article'] as const).map((t) => (
              <Button
                key={t}
                variant={type === t ? 'default' : 'outline'}
                size="sm"
                onClick={() => setType(type === t ? '' : t)}
                className={type === t ? 'bg-indigo-600' : 'border-indigo-200 text-indigo-600 cursor-pointer'}
              >
                {messages.contentTypes[t as keyof typeof messages.contentTypes] ?? t}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-indigo-700 mb-1 block">{m.difficulty}</p>
          <div className="flex gap-2">
            {(['beginner', 'intermediate', 'advanced'] as const).map((d) => (
              <Button
                key={d}
                variant={difficulty === d ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDifficulty(d)}
                className={difficulty === d ? 'bg-indigo-600' : 'border-indigo-200 text-indigo-600 cursor-pointer'}
              >
                {
                  qa[
                    `difficulty${d.charAt(0).toUpperCase()}${d.slice(1)}` as
                      | 'difficultyBeginner'
                      | 'difficultyIntermediate'
                      | 'difficultyAdvanced'
                  ]
                }
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-indigo-700 mb-1 block">{m.tags}</p>
        <TagSelector value={tags} onChange={setTags} className="bg-white/50 border-indigo-200" />
      </div>

      <Button
        onClick={handleImport}
        disabled={!text.trim() || importing}
        className="w-full bg-green-500 hover:bg-green-600 text-white cursor-pointer"
      >
        {importing ? m.importing : m.importContent}
      </Button>
    </div>
  );
}

'use client';

import { FileText, List, Plus, Type as TypeIcon } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useState } from 'react';
import { TagSelector } from '@/components/shared/tag-selector';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { inferImportedContentType } from '@/lib/import-content';
import { normalizeTags } from '@/lib/utils';
import { useContentStore } from '@/stores/content-store';
import type { ContentItem, ContentType, Difficulty } from '@/types/content';

const CATEGORIES = ['daily', 'polite', 'email', 'business', 'travel', 'idiom'] as const;

interface QuickAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickAddDialog({ open, onOpenChange }: QuickAddDialogProps) {
  const { addContent, addBulkContent } = useContentStore();
  const [mode, setMode] = useState<'single' | 'batch'>('single');

  // Single mode state
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [typeOverride, setTypeOverride] = useState<ContentType | ''>('');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');

  // Batch mode state
  const [batchText, setBatchText] = useState('');
  const [batchDifficulty, setBatchDifficulty] = useState<Difficulty>('beginner');
  const [batchCategory, setBatchCategory] = useState('');
  const [batchTags, setBatchTags] = useState('');

  const [saving, setSaving] = useState(false);

  const detectedType = typeOverride || inferImportedContentType(text);

  const batchLines = batchText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const resetForm = () => {
    setText('');
    setTitle('');
    setTypeOverride('');
    setDifficulty('beginner');
    setCategory('');
    setTags('');
    setBatchText('');
    setBatchDifficulty('beginner');
    setBatchCategory('');
    setBatchTags('');
    setSaving(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const handleSaveSingle = async () => {
    if (!text.trim()) return;
    setSaving(true);
    const now = Date.now();
    const item: ContentItem = {
      id: nanoid(),
      title: title.trim() || text.trim().slice(0, 50),
      text: text.trim(),
      type: detectedType,
      tags: normalizeTags(tags),
      source: 'imported',
      difficulty,
      category: category || undefined,
      createdAt: now,
      updatedAt: now,
    };
    await addContent(item);
    handleClose(false);
  };

  const handleSaveBatch = async () => {
    if (batchLines.length === 0) return;
    setSaving(true);
    const now = Date.now();
    const parsedTags = normalizeTags(batchTags);
    const items: ContentItem[] = batchLines.map((line, i) => ({
      id: nanoid(),
      title: line.slice(0, 50),
      text: line,
      type: inferImportedContentType(line),
      tags: parsedTags,
      source: 'imported' as const,
      difficulty: batchDifficulty,
      category: batchCategory || undefined,
      createdAt: now + i,
      updatedAt: now + i,
    }));
    await addBulkContent(items);
    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-indigo-900">Quick Add</DialogTitle>
          <DialogDescription>Add custom phrases, words, or sentences to your library.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5 w-fit">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMode('single')}
            className={`rounded-md text-xs cursor-pointer ${mode === 'single' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}
          >
            <TypeIcon className="w-3.5 h-3.5 mr-1" />
            Single
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMode('batch')}
            className={`rounded-md text-xs cursor-pointer ${mode === 'batch' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}
          >
            <List className="w-3.5 h-3.5 mr-1" />
            Batch
          </Button>
        </div>

        {mode === 'single' ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="quick-add-text" className="text-sm font-medium text-indigo-700 mb-1 block">
                Content
              </label>
              <Input
                id="quick-add-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a word, phrase, or sentence..."
                className="bg-white/50 border-indigo-200"
                autoFocus
              />
            </div>

            {text && (
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span className="text-sm text-indigo-600">
                  Detected: <Badge variant="secondary">{detectedType}</Badge>
                </span>
              </div>
            )}

            <div>
              <label htmlFor="quick-add-title" className="text-sm font-medium text-indigo-700 mb-1 block">
                Title (optional)
              </label>
              <Input
                id="quick-add-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={text ? text.slice(0, 50) : 'Auto-generated from content'}
                className="bg-white/50 border-indigo-200"
              />
            </div>

            <div>
              <p className="text-sm font-medium text-indigo-700 mb-1">Type Override</p>
              <div className="flex gap-2">
                {(['word', 'phrase', 'sentence'] as const).map((t) => (
                  <Button
                    key={t}
                    variant={typeOverride === t ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTypeOverride(typeOverride === t ? '' : t)}
                    className={
                      typeOverride === t
                        ? 'bg-indigo-600 cursor-pointer'
                        : 'border-indigo-200 text-indigo-600 cursor-pointer'
                    }
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-indigo-700 mb-1">Difficulty</p>
              <div className="flex gap-2">
                {(['beginner', 'intermediate', 'advanced'] as const).map((d) => (
                  <Button
                    key={d}
                    variant={difficulty === d ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDifficulty(d)}
                    className={
                      difficulty === d
                        ? 'bg-indigo-600 cursor-pointer'
                        : 'border-indigo-200 text-indigo-600 cursor-pointer'
                    }
                  >
                    {d}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-indigo-700 mb-1">Category (optional)</p>
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map((c) => (
                  <Button
                    key={c}
                    variant={category === c ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCategory(category === c ? '' : c)}
                    className={
                      category === c
                        ? 'bg-indigo-600 cursor-pointer'
                        : 'border-indigo-200 text-indigo-600 cursor-pointer'
                    }
                  >
                    {c}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-indigo-700 mb-1">Tags</p>
              <TagSelector value={tags} onChange={setTags} className="bg-white/50 border-indigo-200" />
            </div>

            <DialogFooter>
              <Button
                onClick={handleSaveSingle}
                disabled={!text.trim() || saving}
                className="w-full bg-green-500 hover:bg-green-600 text-white cursor-pointer"
              >
                {saving ? (
                  'Saving...'
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Library
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="quick-add-batch" className="text-sm font-medium text-indigo-700 mb-1 block">
                Phrases (one per line)
              </label>
              <Textarea
                id="quick-add-batch"
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder={'How are you?\nNice to meet you.\nThank you very much.'}
                rows={6}
                className="bg-white/50 border-indigo-200"
                autoFocus
              />
              {batchLines.length > 0 && (
                <p className="text-xs text-indigo-500 mt-1">
                  {batchLines.length} item{batchLines.length !== 1 ? 's' : ''} detected
                </p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-indigo-700 mb-1">Difficulty</p>
              <div className="flex gap-2">
                {(['beginner', 'intermediate', 'advanced'] as const).map((d) => (
                  <Button
                    key={d}
                    variant={batchDifficulty === d ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBatchDifficulty(d)}
                    className={
                      batchDifficulty === d
                        ? 'bg-indigo-600 cursor-pointer'
                        : 'border-indigo-200 text-indigo-600 cursor-pointer'
                    }
                  >
                    {d}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-indigo-700 mb-1">Category (optional)</p>
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map((c) => (
                  <Button
                    key={c}
                    variant={batchCategory === c ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBatchCategory(batchCategory === c ? '' : c)}
                    className={
                      batchCategory === c
                        ? 'bg-indigo-600 cursor-pointer'
                        : 'border-indigo-200 text-indigo-600 cursor-pointer'
                    }
                  >
                    {c}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-indigo-700 mb-1">Tags</p>
              <TagSelector value={batchTags} onChange={setBatchTags} className="bg-white/50 border-indigo-200" />
            </div>

            <DialogFooter>
              <Button
                onClick={handleSaveBatch}
                disabled={batchLines.length === 0 || saving}
                className="w-full bg-green-500 hover:bg-green-600 text-white cursor-pointer"
              >
                {saving ? (
                  'Saving...'
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add {batchLines.length} Item{batchLines.length !== 1 ? 's' : ''} to Library
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

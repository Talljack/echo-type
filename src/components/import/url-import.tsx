'use client';

import { AlertCircle, Check, ChevronDown, ExternalLink, Globe, Loader2, Sparkles } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useState } from 'react';
import { ImportPracticeActions } from '@/components/import/import-practice-actions';
import { TagSelector } from '@/components/shared/tag-selector';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n/use-i18n';
import { buildImportPracticeActions } from '@/lib/import-practice-actions';
import { normalizeTags } from '@/lib/utils';
import { useContentStore } from '@/stores/content-store';
import type { ContentItem, Difficulty } from '@/types/content';

interface FetchResult {
  title: string;
  text: string;
  url: string;
  wordCount: number;
}

export function UrlImport() {
  const { addContent } = useContentStore();
  const { messages } = useI18n('library');
  const m = messages.urlImport;
  const qa = messages.quickAdd;
  const [url, setUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<FetchResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('intermediate');
  const [tags, setTags] = useState('');
  const [showFullText, setShowFullText] = useState(false);
  const [savedItem, setSavedItem] = useState<ContentItem | null>(null);

  const handleFetch = async () => {
    if (!url.trim()) return;
    setFetching(true);
    setError('');
    setResult(null);
    setSaved(false);

    try {
      const res = await fetch('/api/import/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || m.fetchFailed);
        return;
      }

      setResult(data);
      setTitle(data.title);
    } catch {
      setError(m.networkError);
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    const now = Date.now();
    const item: ContentItem = {
      id: nanoid(),
      title: title.trim() || result.title,
      text: result.text,
      type: 'article',
      tags: normalizeTags(tags),
      source: 'imported',
      difficulty,
      metadata: { sourceUrl: result.url },
      createdAt: now,
      updatedAt: now,
    };
    await addContent(item);
    setSaving(false);
    setSaved(true);
    setSavedItem(item);
  };

  if (savedItem) {
    return (
      <ImportPracticeActions title={savedItem.title} actions={buildImportPracticeActions(savedItem, 'document')} />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="url-import-input" className="text-sm font-medium text-indigo-700 mb-1 block">
          {m.labelUrl}
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
            <Input
              id="url-import-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
              placeholder={m.placeholderUrl}
              className="pl-10 bg-white border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <Button
            onClick={handleFetch}
            disabled={!url.trim() || fetching}
            className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer shrink-0"
          >
            {fetching ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {m.fetching}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {m.fetch}
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <Card className="bg-white border-slate-100">
          <CardContent className="space-y-4 pt-4">
            {/* Metadata */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  {result.wordCount} {m.words}
                </Badge>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  {m.imported}
                </Badge>
              </div>
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-500 hover:text-indigo-700 flex items-center gap-1 text-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Article Preview */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-indigo-700">{m.articlePreview}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFullText(!showFullText)}
                  className="text-xs text-indigo-500 h-auto p-1"
                >
                  <ChevronDown
                    className={`w-3.5 h-3.5 mr-1 transition-transform ${showFullText ? 'rotate-180' : ''}`}
                  />
                  {showFullText ? m.articlePreview : m.fullText}
                </Button>
              </div>
              <div
                className={`bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700 overflow-y-auto whitespace-pre-wrap transition-all ${
                  showFullText ? 'max-h-96' : 'max-h-32'
                }`}
              >
                {result.text}
              </div>
            </div>

            {/* Title */}
            <div>
              <label htmlFor="url-import-title" className="text-sm font-medium text-indigo-700 mb-1 block">
                {m.labelTitle}
              </label>
              <Input
                id="url-import-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-white border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            {/* Difficulty */}
            <div>
              <p className="text-sm font-medium text-indigo-700 mb-2">{m.difficulty}</p>
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

            {/* Tags */}
            <div>
              <p className="text-sm font-medium text-indigo-700 mb-1">{m.tags}</p>
              <TagSelector
                value={tags}
                onChange={setTags}
                placeholder={m.tagSelectorPlaceholder}
                className="bg-white border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500"
              />
              <p className="text-xs text-indigo-500">{m.tagsPlaceholder}</p>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={saving || saved}
              className={`w-full h-12 text-base font-medium cursor-pointer transition-all duration-200 ${
                saved
                  ? 'bg-green-600 hover:bg-green-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg'
              }`}
              aria-label={m.saveToLibraryAriaLabel}
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {m.saving}
                </>
              ) : saved ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  {m.saved}
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  {m.saveToLibrary}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

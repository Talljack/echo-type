'use client';

import { AlertCircle, Check, ChevronDown, ExternalLink, Globe, Loader2, Sparkles } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ImportPracticeActions } from '@/components/import/import-practice-actions';
import { TagSelector } from '@/components/shared/tag-selector';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n/use-i18n';
import { buildImportPracticeActions } from '@/lib/import-practice-actions';
import { fetchUrlImportResult } from '@/lib/url-import-fetch';
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
  const searchParams = useSearchParams();
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

  useEffect(() => {
    const sourceUrl = searchParams.get('sourceUrl') || '';
    if (sourceUrl !== url) {
      setUrl(sourceUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.set('subtab', 'url');
    if (url.trim()) {
      nextParams.set('sourceUrl', url.trim());
    } else {
      nextParams.delete('sourceUrl');
    }
    const nextSearch = nextParams.toString();
    const nextUrl = nextSearch ? `${window.location.pathname}?${nextSearch}` : window.location.pathname;
    if (nextUrl !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, '', nextUrl);
    }
  }, [url]);

  const handleFetch = async () => {
    if (!url.trim()) return;
    setFetching(true);
    setError('');
    setResult(null);
    setSaved(false);

    try {
      const data = await fetchUrlImportResult(url.trim());
      setResult(data);
      setTitle(data.title);
    } catch (error) {
      setError(error instanceof Error ? error.message : m.networkError);
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
        <label htmlFor="url-import-input" className="text-sm font-medium text-brand-ink mb-1 block">
          {m.labelUrl}
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
            <Input
              id="url-import-input"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
              placeholder={m.placeholderUrl}
              className="pl-10 bg-surface border-brand-line focus:border-brand focus:ring-brand"
            />
          </div>
          <Button
            onClick={handleFetch}
            disabled={!url.trim() || fetching}
            className="bg-brand hover:bg-brand-strong cursor-pointer shrink-0"
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
        <p className="mt-1 text-xs text-brand-ink">{m.supportHint}</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-danger text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <Button type="button" size="sm" variant="outline" onClick={() => void handleFetch()} disabled={fetching}>
            Retry
          </Button>
        </div>
      )}

      {result && (
        <Card className="bg-surface border-line">
          <CardContent className="space-y-4 pt-4">
            {/* Metadata */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-info-soft text-info-ink">
                  {result.wordCount} {m.words}
                </Badge>
                <Badge variant="secondary" className="bg-success-soft text-success-ink">
                  {m.imported}
                </Badge>
              </div>
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-ink hover:text-brand-ink flex items-center gap-1 text-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Article Preview */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-brand-ink">{m.articlePreview}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFullText(!showFullText)}
                  className="text-xs text-brand-ink h-auto p-1"
                >
                  <ChevronDown
                    className={`w-3.5 h-3.5 mr-1 transition-transform ${showFullText ? 'rotate-180' : ''}`}
                  />
                  {showFullText ? m.articlePreview : m.fullText}
                </Button>
              </div>
              <div
                className={`bg-surface-2 border border-line rounded-lg p-3 text-sm text-ink-2 overflow-y-auto whitespace-pre-wrap transition-all ${
                  showFullText ? 'max-h-96' : 'max-h-32'
                }`}
              >
                {result.text}
              </div>
            </div>

            {/* Title */}
            <div>
              <label htmlFor="url-import-title" className="text-sm font-medium text-brand-ink mb-1 block">
                {m.labelTitle}
              </label>
              <Input
                id="url-import-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-surface border-brand-line focus:border-brand focus:ring-brand"
              />
            </div>

            {/* Difficulty */}
            <div>
              <p className="text-sm font-medium text-brand-ink mb-2">{m.difficulty}</p>
              <div className="flex gap-2">
                {(['beginner', 'intermediate', 'advanced'] as const).map((d) => (
                  <Button
                    key={d}
                    variant={difficulty === d ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDifficulty(d)}
                    className={
                      difficulty === d ? 'bg-brand cursor-pointer' : 'border-brand-line text-brand-ink cursor-pointer'
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
              <p className="text-sm font-medium text-brand-ink mb-1">{m.tags}</p>
              <TagSelector
                value={tags}
                onChange={setTags}
                placeholder={m.tagSelectorPlaceholder}
                className="bg-surface border-brand-line focus:border-brand focus:ring-brand"
              />
              <p className="text-xs text-brand-ink">{m.tagsPlaceholder}</p>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={saving || saved}
              className={`h-12 w-full text-base font-medium cursor-pointer transition-all duration-200 ${
                saved
                  ? 'bg-success hover:bg-success text-white'
                  : 'bg-success hover:bg-success text-white shadow-md hover:shadow-lg'
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

'use client';

import { AlertCircle, Check, ChevronDown, ExternalLink, Globe, Loader2, Sparkles } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { TagSelector } from '@/components/shared/tag-selector';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  const router = useRouter();
  const { addContent } = useContentStore();
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
        setError(data.error || 'Failed to fetch URL');
        return;
      }

      setResult(data);
      setTitle(data.title);
    } catch {
      setError('Network error. Please try again.');
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
      source: 'url-import',
      difficulty,
      metadata: { sourceUrl: result.url },
      createdAt: now,
      updatedAt: now,
    };

    await addContent(item);
    setSaved(true);
    setSaving(false);

    // Redirect after showing success state
    setTimeout(() => {
      router.push('/library');
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-indigo-900">Import from URL</h3>
        </div>
        <p className="text-sm text-indigo-600">
          Import the complete original text from any webpage without AI processing.
        </p>
      </div>

      {/* URL Input Form */}
      <div className="space-y-3">
        <label htmlFor="url-import-input" className="text-sm font-medium text-indigo-700 block">
          Webpage URL
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="url-import-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="h-11 bg-white border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500 transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && !fetching && url.trim() && handleFetch()}
              disabled={fetching}
              aria-label="Enter webpage URL to import"
            />
            {fetching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
              </div>
            )}
          </div>
          <Button
            onClick={handleFetch}
            disabled={!url.trim() || fetching}
            className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Fetch webpage content"
          >
            {fetching ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Fetch
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg animate-in fade-in slide-in-from-top-2 duration-200"
          role="alert"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Failed to fetch content</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Success Result Card */}
      {result && (
        <Card className="bg-white border-indigo-100 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CardContent className="space-y-5 pt-6">
            {/* Header with metadata */}
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-indigo-100">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 font-medium">
                  {result.wordCount.toLocaleString()} words
                </Badge>
                <Badge variant="secondary" className="bg-green-100 text-green-700 font-medium">
                  <Check className="w-3 h-3 mr-1" />
                  Imported
                </Badge>
              </div>
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 hover:underline transition-colors cursor-pointer"
                aria-label="Open original webpage in new tab"
              >
                <ExternalLink className="w-3 h-3" />
                Source
              </a>
            </div>

            {/* Title Input */}
            <div className="space-y-2">
              <label htmlFor="url-import-title" className="text-sm font-medium text-indigo-700 block">
                Title
              </label>
              <Input
                id="url-import-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11 bg-white border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500 transition-colors"
                placeholder="Enter a custom title..."
              />
            </div>

            {/* Content Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-indigo-700">Content Preview</p>
                {result.text.length > 500 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFullText(!showFullText)}
                    className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 cursor-pointer transition-all duration-200 group"
                    aria-label={showFullText ? 'Collapse content' : 'Expand full content'}
                    aria-expanded={showFullText}
                  >
                    <span className="text-xs font-medium">{showFullText ? 'Show less' : 'Show full text'}</span>
                    <ChevronDown
                      className={`w-4 h-4 ml-1 transition-transform duration-200 ${
                        showFullText ? 'rotate-180' : 'rotate-0'
                      }`}
                    />
                  </Button>
                )}
              </div>
              <div className="relative">
                <div
                  className={`bg-indigo-50/50 border border-indigo-200 rounded-lg p-4 text-sm text-indigo-900 overflow-y-auto whitespace-pre-wrap leading-relaxed transition-all duration-300 ease-out ${
                    showFullText ? 'max-h-96' : 'max-h-64'
                  }`}
                >
                  {showFullText ? result.text : `${result.text.slice(0, 500)}...`}
                </div>
                {!showFullText && result.text.length > 500 && (
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-indigo-50/90 to-transparent pointer-events-none rounded-b-lg" />
                )}
              </div>
            </div>

            {/* Difficulty Selection */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-indigo-700">Difficulty Level</p>
              <div className="flex gap-2">
                {(['beginner', 'intermediate', 'advanced'] as const).map((d) => (
                  <Button
                    key={d}
                    variant={difficulty === d ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDifficulty(d)}
                    className={`capitalize transition-all duration-200 cursor-pointer ${
                      difficulty === d
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                        : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300'
                    }`}
                    aria-label={`Set difficulty to ${d}`}
                    aria-pressed={difficulty === d}
                  >
                    {d}
                  </Button>
                ))}
              </div>
            </div>

            {/* Tags Input */}
            <div className="space-y-2">
              <label htmlFor="url-import-tags" className="text-sm font-medium text-indigo-700 block">
                Tags (optional)
              </label>
              <TagSelector
                value={tags}
                onChange={setTags}
                placeholder="e.g. blog, tech, imported"
                className="bg-white border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500"
              />
              <p className="text-xs text-indigo-500">Separate tags with commas</p>
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
              aria-label="Save article to library"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Saved! Redirecting...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Save to Library
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

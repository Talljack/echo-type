'use client';

import { AlertCircle, Link as LinkIcon, Loader2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { normalizeTags } from '@/lib/utils';
import { useContentStore } from '@/stores/content-store';
import type { ContentItem, Difficulty } from '@/types/content';

interface TranscriptData {
  videoId: string;
  segments: Array<{ text: string; offset: number; duration: number }>;
  fullText: string;
  segmentCount: number;
}

export function MediaUrlImport() {
  const router = useRouter();
  const { addContent } = useContentStore();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<TranscriptData | null>(null);
  const [showFull, setShowFull] = useState(false);
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [tags, setTags] = useState('');

  const handleFetch = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setData(null);

    try {
      const res = await fetch('/api/import/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Failed to fetch transcript');
        return;
      }

      setData(json);
      setTitle(`YouTube: ${json.videoId}`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!data) return;
    setImporting(true);

    const now = Date.now();
    const item: ContentItem = {
      id: nanoid(),
      title: title.trim() || `YouTube: ${data.videoId}`,
      text: data.fullText,
      type: 'article',
      tags: normalizeTags(tags),
      source: 'imported',
      difficulty,
      metadata: {
        sourceUrl: url.trim(),
        timestamps: data.segments,
      },
      createdAt: now,
      updatedAt: now,
    };

    await addContent(item);
    setImporting(false);
    router.push('/library');
  };

  const wordCount = data ? data.fullText.split(/\s+/).filter(Boolean).length : 0;
  const previewText = data ? (showFull ? data.fullText : data.fullText.slice(0, 500)) : '';

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="media-url-import" className="text-sm font-medium text-indigo-700 mb-1 block">
          Media URL
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
            <Input
              id="media-url-import"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a YouTube, Bilibili, or other media URL..."
              className="pl-10 bg-white/50 border-indigo-200"
              onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
            />
          </div>
          <Button
            onClick={handleFetch}
            disabled={!url.trim() || loading}
            className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Fetching...
              </>
            ) : (
              'Fetch Content'
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

      {data && (
        <Card className="bg-white border-slate-100 shadow-sm">
          <CardContent className="space-y-4 pt-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                {data.segmentCount} segments
              </Badge>
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                {wordCount.toLocaleString()} words
              </Badge>
            </div>

            <div>
              <p className="text-sm font-medium text-indigo-700 mb-1 block">Preview</p>
              <div className="bg-white/50 border border-indigo-200 rounded-lg p-3 text-sm text-indigo-800 max-h-48 overflow-y-auto">
                {previewText}
                {!showFull && data.fullText.length > 500 && '...'}
              </div>
              {data.fullText.length > 500 && (
                <button
                  type="button"
                  onClick={() => setShowFull(!showFull)}
                  className="text-xs text-indigo-500 hover:text-indigo-700 mt-1 cursor-pointer"
                >
                  {showFull ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>

            <div>
              <label htmlFor="youtube-import-title" className="text-sm font-medium text-indigo-700 mb-1 block">
                Title
              </label>
              <Input
                id="youtube-import-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title..."
                className="bg-white/50 border-indigo-200"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-indigo-700 mb-1 block">Difficulty</p>
                <div className="flex gap-2">
                  {(['beginner', 'intermediate', 'advanced'] as const).map((d) => (
                    <Button
                      key={d}
                      variant={difficulty === d ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDifficulty(d)}
                      className={
                        difficulty === d ? 'bg-indigo-600' : 'border-indigo-200 text-indigo-600 cursor-pointer'
                      }
                    >
                      {d}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <label htmlFor="youtube-import-tags" className="text-sm font-medium text-indigo-700 mb-1 block">
                  Tags (comma separated)
                </label>
                <Input
                  id="youtube-import-tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. youtube, lecture, TED"
                  className="bg-white/50 border-indigo-200"
                />
              </div>
            </div>

            <Button
              onClick={handleImport}
              disabled={importing}
              className="w-full bg-green-500 hover:bg-green-600 text-white cursor-pointer"
            >
              {importing ? 'Importing...' : 'Import as Article'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

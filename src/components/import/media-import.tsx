'use client';

import { AlertCircle, Download, Link2, Loader2, Mic } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LocalMediaUpload } from '@/components/import/local-media-upload';
import { TagSelector } from '@/components/shared/tag-selector';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PROVIDER_REGISTRY } from '@/lib/providers';
import { normalizeTags } from '@/lib/utils';
import { useContentStore } from '@/stores/content-store';
import { useProviderStore } from '@/stores/provider-store';
import type { ContentItem, Difficulty } from '@/types/content';

export function MediaImport() {
  const [importMode, setImportMode] = useState<'url' | 'local'>('url');
  const router = useRouter();
  const { addContent } = useContentStore();
  const activeProviderId = useProviderStore((s) => s.activeProviderId);
  const activeConfig = useProviderStore((s) => s.getActiveConfig());
  const providers = useProviderStore((s) => s.providers);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    title: string;
    text: string;
    platform: string;
    sourceUrl: string;
    audioUrl?: string;
    videoDuration?: number;
  } | null>(null);
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('');
  const [classifying, setClassifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState<'audio' | 'video' | null>(null);
  const [downloadError, setDownloadError] = useState('');

  const classifyContent = async (text: string, contentTitle: string) => {
    setClassifying(true);
    try {
      const apiKey = activeConfig.auth.apiKey || activeConfig.auth.accessToken || '';
      const headerKey = PROVIDER_REGISTRY[activeProviderId].headerKey;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers[headerKey] = apiKey;
      const res = await fetch('/api/tools/classify', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text,
          title: contentTitle,
          provider: activeProviderId,
          providerConfigs: providers,
        }),
      });
      const data = await res.json();
      if (data.title) setTitle(data.title);
      if (data.difficulty) setDifficulty(data.difficulty);
      if (Array.isArray(data.tags)) setTags(data.tags.join(', '));
    } catch {
      /* non-critical */
    } finally {
      setClassifying(false);
    }
  };

  const handleExtract = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    setCategory('');
    try {
      const res = await fetch('/api/tools/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Show error with hint if available
        const errorMsg = data.error || 'Extraction failed';
        const hint = data.hint ? `\n${data.hint}` : '';
        setError(errorMsg + hint);
        return;
      }
      setResult(data);
      setTitle(data.title);
      classifyContent(data.text, data.title);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format: 'audio' | 'video') => {
    if (!result) return;
    setDownloading(format);
    setDownloadError('');
    try {
      const res = await fetch('/api/tools/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: result.sourceUrl, format }),
      });
      if (!res.ok) {
        const data = await res.json();
        setDownloadError(data.error || 'Download failed');
        return;
      }
      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${result.title}.${format === 'audio' ? 'mp3' : 'mp4'}`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
    } catch {
      setDownloadError('Download failed. Please try again.');
    } finally {
      setDownloading(null);
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
      category: category || undefined,
      tags: normalizeTags(tags),
      source: 'imported',
      difficulty,
      metadata: {
        sourceUrl: result.sourceUrl,
        audioUrl: result.audioUrl,
        platform: result.platform,
        videoDuration: result.videoDuration,
      },
      createdAt: now,
      updatedAt: now,
    };
    await addContent(item);
    setSaving(false);
    router.push('/library');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Button
          variant={importMode === 'url' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setImportMode('url')}
          className={
            importMode === 'url' ? 'bg-indigo-600 cursor-pointer' : 'border-indigo-200 text-indigo-600 cursor-pointer'
          }
        >
          <Link2 className="w-4 h-4 mr-1" />
          URL Import
        </Button>
        <Button
          variant={importMode === 'local' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setImportMode('local')}
          className={
            importMode === 'local' ? 'bg-indigo-600 cursor-pointer' : 'border-indigo-200 text-indigo-600 cursor-pointer'
          }
        >
          <Mic className="w-4 h-4 mr-1" />
          Local Upload
        </Button>
      </div>

      {importMode === 'local' ? (
        <LocalMediaUpload />
      ) : (
        <>
          <p className="text-sm text-indigo-500">
            Import audio content from video platforms. Supports YouTube, Bilibili, TikTok, Twitter/X.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste a YouTube, Bilibili, TikTok, or Twitter URL..."
                className="pl-10 bg-white border-slate-200"
                onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
              />
            </div>
            <Button
              onClick={handleExtract}
              disabled={!url.trim() || loading}
              className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Extracting...
                </>
              ) : (
                'Extract'
              )}
            </Button>
          </div>
          {error && (
            <div className="flex items-start gap-2 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="whitespace-pre-line">{error}</span>
            </div>
          )}
          {result && (
            <Card className="bg-white border-slate-100">
              <CardContent className="space-y-4 pt-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                    {result.platform}
                  </Badge>
                  {result.videoDuration && (
                    <span className="text-xs text-slate-400">
                      {Math.floor(result.videoDuration / 60)}:
                      {String(Math.floor(result.videoDuration % 60)).padStart(2, '0')}
                    </span>
                  )}
                </div>
                {result.audioUrl && (
                  <div>
                    <p className="text-sm font-medium text-indigo-700 mb-1 block">Audio Preview</p>
                    <audio controls src={result.audioUrl} className="w-full h-10" preload="metadata">
                      <track kind="captions" label="Transcript unavailable" />
                    </audio>
                  </div>
                )}
                <div className="bg-white border border-slate-200 rounded-lg p-3 text-sm text-indigo-800 max-h-32 overflow-y-auto">
                  {result.text}
                </div>
                <div>
                  <label htmlFor="media-import-result-title" className="text-sm font-medium text-indigo-700 mb-1 block">
                    Title
                  </label>
                  <Input
                    id="media-import-result-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-white border-slate-200"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-indigo-700 mb-1 block">
                    Category {classifying && <Loader2 className="w-3 h-3 animate-spin inline ml-1" />}
                  </p>
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Technology, Travel..."
                    className="bg-white border-slate-200"
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
                  <div className="flex-1">
                    <p className="text-sm font-medium text-indigo-700 mb-1 block">Tags</p>
                    <TagSelector
                      value={tags}
                      onChange={setTags}
                      placeholder="e.g. video, lecture"
                      className="bg-white border-slate-200"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-indigo-700 mb-2 block">Direct Download</p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleDownload('audio')}
                      disabled={downloading !== null}
                      variant="outline"
                      className="flex-1 border-indigo-200 text-indigo-600 cursor-pointer"
                    >
                      {downloading === 'audio' ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Audio (MP3)
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => handleDownload('video')}
                      disabled={downloading !== null}
                      variant="outline"
                      className="flex-1 border-indigo-200 text-indigo-600 cursor-pointer"
                    >
                      {downloading === 'video' ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Video (MP4)
                        </>
                      )}
                    </Button>
                  </div>
                  {downloadError && (
                    <div className="flex items-center gap-2 text-red-500 text-sm mt-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{downloadError}</span>
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-green-500 hover:bg-green-600 text-white cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Import to Library'}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

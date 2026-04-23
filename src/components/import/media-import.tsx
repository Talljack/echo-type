'use client';

import { AlertCircle, ClipboardPaste, Download, Link2, Loader2, Mic } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LocalMediaUpload } from '@/components/import/local-media-upload';
import { TagSelector } from '@/components/shared/tag-selector';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/lib/i18n/use-i18n';
import { PROVIDER_REGISTRY } from '@/lib/providers';
import { normalizeTags } from '@/lib/utils';
import { useContentStore } from '@/stores/content-store';
import { useProviderStore } from '@/stores/provider-store';
import type { ContentItem, Difficulty } from '@/types/content';

interface ExtractionMeta {
  mode?: string;
  transcriptSource?: string;
  degraded?: boolean;
  partial?: boolean;
  warnings?: string[];
  code?: string;
}

interface ExtractionWarningMessages {
  degradedImportWarning?: string;
  partialTranscriptWarning?: string;
}

interface ExtractionWarningsProps {
  extractionMeta?: ExtractionMeta | null;
  messages: ExtractionWarningMessages;
}

export function ExtractionWarnings({ extractionMeta, messages }: ExtractionWarningsProps) {
  if (!extractionMeta) return null;

  const warnings = [
    extractionMeta.degraded ? messages.degradedImportWarning : null,
    extractionMeta.partial ? messages.partialTranscriptWarning : null,
  ].filter((warning): warning is string => typeof warning === 'string' && warning.length > 0);

  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {warnings.map((warning) => (
        <div
          key={warning}
          className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{warning}</span>
        </div>
      ))}
    </div>
  );
}

export function MediaImport() {
  const [importMode, setImportMode] = useState<'url' | 'local'>('url');
  const router = useRouter();
  const { addContent } = useContentStore();
  const { messages } = useI18n('library');
  const m = messages.mediaImport;
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
    extractionMeta?: ExtractionMeta;
  } | null>(null);
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('');
  const [classifying, setClassifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState<'audio' | 'video' | null>(null);
  const [downloadError, setDownloadError] = useState('');
  const [editedText, setEditedText] = useState('');

  const isTranscriptMissing = (text: string) => text.startsWith('Content imported from');

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
        const errorMsg = data.error || m.extractFailed;
        const hint = data.hint ? `\n${data.hint}` : '';
        setError(errorMsg + hint);
        return;
      }
      setResult(data);
      setTitle(data.title);
      setEditedText(data.text);
      classifyContent(data.text, data.title);
    } catch {
      setError(m.networkError);
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
        setDownloadError(data.error || m.downloadFailed);
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
      setDownloadError(m.downloadFailedRetry);
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
      text: editedText || result.text,
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
          {m.tabUrl}
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
          {m.tabLocal}
        </Button>
      </div>

      {importMode === 'local' ? (
        <LocalMediaUpload />
      ) : (
        <>
          <p className="text-sm text-indigo-500">{m.urlDescription}</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={messages.youtubeImport.placeholderUrl}
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
                  {m.extracting}
                </>
              ) : (
                m.extract
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
                    <p className="text-sm font-medium text-indigo-700 mb-1 block">{m.audioPreview}</p>
                    <audio controls src={result.audioUrl} className="w-full h-10" preload="metadata">
                      <track kind="captions" label={m.transcriptPlaceholder} />
                    </audio>
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-indigo-700">{m.transcript}</p>
                    {isTranscriptMissing(result.text) && (
                      <span className="text-xs text-amber-600 flex items-center gap-1">
                        <ClipboardPaste className="w-3 h-3" />
                        {m.pasteTranscriptFromYoutube}
                      </span>
                    )}
                  </div>
                  <ExtractionWarnings extractionMeta={result.extractionMeta} messages={m} />
                  {isTranscriptMissing(result.text) ? (
                    <div className="space-y-2">
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-700">
                        {m.transcriptFallbackHelp}
                      </div>
                      <Textarea
                        value={editedText === result.text ? '' : editedText}
                        onChange={(e) => {
                          setEditedText(e.target.value);
                        }}
                        onBlur={() => {
                          if (editedText && editedText !== result.text) {
                            classifyContent(editedText, title);
                          }
                        }}
                        placeholder={m.transcriptPlaceholder}
                        className="bg-white border-slate-200 min-h-24 text-sm"
                        rows={4}
                      />
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-lg p-3 text-sm text-indigo-800 max-h-32 overflow-y-auto">
                      {editedText}
                    </div>
                  )}
                </div>
                <div>
                  <label htmlFor="media-import-result-title" className="text-sm font-medium text-indigo-700 mb-1 block">
                    {m.labelTitle}
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
                    {m.labelCategory} {classifying && <Loader2 className="w-3 h-3 animate-spin inline ml-1" />}
                  </p>
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder={m.placeholderCategory}
                    className="bg-white border-slate-200"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-indigo-700 mb-1 block">{m.difficulty}</p>
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
                            messages.quickAdd[
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
                  <div className="flex-1">
                    <p className="text-sm font-medium text-indigo-700 mb-1 block">{m.tags}</p>
                    <TagSelector
                      value={tags}
                      onChange={setTags}
                      placeholder={m.tagsPlaceholder}
                      className="bg-white border-slate-200"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-indigo-700 mb-2 block">{m.directDownload}</p>
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
                          {m.downloading}
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          {m.downloadAudio}
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
                          {m.downloading}
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          {m.downloadVideo}
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
                  disabled={saving || (isTranscriptMissing(result.text) && (!editedText || editedText === result.text))}
                  className="w-full bg-green-500 hover:bg-green-600 text-white cursor-pointer"
                >
                  {saving
                    ? m.saving
                    : isTranscriptMissing(result.text) && (!editedText || editedText === result.text)
                      ? m.pasteTranscriptToImport
                      : m.importToLibrary}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

'use client';

import { AlertCircle, Check, Loader2, Mic, Upload } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  type BrowserTranscriptionResult,
  shouldUseDirectBrowserTranscription,
  transcribeInBrowser,
} from '@/lib/browser-transcription';
import { useI18n } from '@/lib/i18n/use-i18n';
import { saveMediaBlob } from '@/lib/media-storage';
import { normalizeTags } from '@/lib/utils';
import { useContentStore } from '@/stores/content-store';
import { useProviderStore } from '@/stores/provider-store';
import type { ContentItem, Difficulty } from '@/types/content';

const ACCEPTED_FORMATS = '.mp3,.wav,.m4a,.ogg,.flac,.mp4,.webm,.avi';
const MAX_FILE_SIZE = 25 * 1024 * 1024;

interface LocalMediaUploadProps {
  compact?: boolean;
  onImported?: () => void;
}

interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
  segments: Array<{ start: number; end: number; text: string }>;
  audioUrl: string;
  providerId?: string;
  fallbackApplied?: boolean;
  fallbackReason?: string;
}

interface ServerTranscriptionPayload extends BrowserTranscriptionResult {
  error?: string;
  classification?: {
    title?: string;
    difficulty?: Difficulty;
    tags?: string[];
  };
}

export function LocalMediaUpload({ compact, onImported }: LocalMediaUploadProps) {
  const router = useRouter();
  const { addContent } = useContentStore();
  const { messages } = useI18n('library');
  const m = messages.localMediaUpload;
  const qa = messages.quickAdd;
  const activeProviderId = useProviderStore((s) => s.activeProviderId);
  const providers = useProviderStore((s) => s.providers);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const [result, setResult] = useState<TranscriptionResult | null>(null);

  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFile = (nextFile: File) => {
    if (nextFile.size > MAX_FILE_SIZE) {
      setError(m.errorFileTooLarge);
      return;
    }

    setFile(nextFile);
    setError('');
    setResult(null);
    setTitle(nextFile.name.replace(/\.[^.]+$/, ''));
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  };

  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  const handleTranscribe = async () => {
    if (!file) return;

    setError('');
    setTranscribing(true);

    try {
      let data: ServerTranscriptionPayload;

      if (shouldUseDirectBrowserTranscription(file)) {
        data = await transcribeInBrowser({
          file,
          provider: activeProviderId,
          providerConfigs: providers,
        });
      } else {
        const transcribeForm = new FormData();
        transcribeForm.append('file', file);
        transcribeForm.append('provider', activeProviderId);
        transcribeForm.append('providerConfigs', JSON.stringify(providers));

        const response = await fetch('/api/import/transcribe', {
          method: 'POST',
          body: transcribeForm,
        });
        data = (await response.json()) as ServerTranscriptionPayload;

        if (!response.ok) {
          setError(data.error || m.transcriptionFailed);
          return;
        }
      }

      setResult({
        text: data.text,
        language: data.language,
        duration: data.duration,
        segments: data.segments || [],
        audioUrl: previewUrl,
        providerId: data.providerId,
        fallbackApplied: data.fallbackApplied,
        fallbackReason: data.fallbackReason,
      });

      if (data.classification?.title) setTitle(data.classification.title);
      if (data.classification?.difficulty) setDifficulty(data.classification.difficulty);
      if (Array.isArray(data.classification?.tags)) {
        setTags(data.classification.tags.join(', '));
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : m.networkError);
    } finally {
      setTranscribing(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;

    setSaving(true);

    const now = Date.now();
    const contentId = nanoid();
    const item: ContentItem = {
      id: contentId,
      title: title.trim() || file?.name || m.fallbackTitle,
      text: result.text,
      type: 'article',
      category: category || undefined,
      tags: normalizeTags(tags),
      source: 'imported',
      difficulty,
      metadata: {
        audioUrl: `idb:${contentId}`,
        sourceFilename: file?.name,
        platform: 'local',
        videoDuration: result.duration,
        timestamps: result.segments.map((segment) => ({
          offset: segment.start,
          duration: segment.end - segment.start,
          text: segment.text,
        })),
      },
      createdAt: now,
      updatedAt: now,
    };

    if (file) {
      await saveMediaBlob(contentId, file);
    }
    await addContent(item);
    setSaving(false);

    if (onImported) {
      onImported();
      return;
    }

    router.push('/library');
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {!compact && <p className="text-sm text-brand-ink">{m.description}</p>}

      <button
        type="button"
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={handleSelectFile}
        data-testid="local-media-upload-dropzone"
        className={`flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 transition-colors ${
          dragOver ? 'border-brand bg-brand-soft/50' : 'border-brand-line hover:border-brand'
        } cursor-pointer`}
      >
        <Mic className="h-8 w-8 text-brand-muted" />
        <span className="text-sm text-brand-ink">{m.dropzone}</span>
        <span className="text-xs text-brand-muted">{m.dropzoneFormats}</span>
      </button>
      <input
        id="local-media-upload-input"
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FORMATS}
        onChange={(event) => {
          const nextFile = event.target.files?.[0];
          if (nextFile) handleFile(nextFile);
        }}
        className="hidden"
      />

      {file && !result && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-brand-muted" />
            <span className="max-w-[200px] truncate text-sm text-brand-ink">{file.name}</span>
            <Badge variant="secondary" className="bg-brand-tint text-brand-ink">
              {formatFileSize(file.size)}
            </Badge>
          </div>
          <Button
            onClick={handleTranscribe}
            data-testid="local-media-transcribe"
            disabled={transcribing}
            className="cursor-pointer bg-brand hover:bg-brand-strong"
          >
            {transcribing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {m.transcribing}
              </>
            ) : (
              m.transcribe
            )}
          </Button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <Card className="border-line bg-surface">
          <CardContent className="space-y-4 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-brand-tint text-brand-ink">
                {m.source}
              </Badge>
              <Badge variant="secondary" className="bg-success-soft text-success-ink">
                <Check className="mr-1 h-3 w-3" />
                {m.sourceLabel}
              </Badge>
              {result.duration > 0 && <span className="text-xs text-ink-4">{formatDuration(result.duration)}</span>}
              {result.language && (
                <Badge variant="secondary" className="bg-surface-3 text-ink-2">
                  {result.language}
                </Badge>
              )}
              {result.fallbackApplied && result.providerId && (
                <Badge variant="secondary" className="bg-warning-soft text-warning-ink">
                  {m.fallbackPrefix}: {result.providerId}
                </Badge>
              )}
            </div>

            {result.fallbackApplied && result.fallbackReason && (
              <div className="rounded-lg border border-warning-line bg-warning-soft px-3 py-2 text-xs text-warning-ink">
                {result.fallbackReason}
              </div>
            )}

            {result.audioUrl && (
              <div>
                <p className="mb-1 block text-sm font-medium text-brand-ink">{m.audioPreview}</p>
                <audio controls src={result.audioUrl} className="h-10 w-full" preload="metadata">
                  <track kind="captions" label={m.transcriptUnavailable} />
                </audio>
              </div>
            )}

            <div className="max-h-32 overflow-y-auto rounded-lg border border-line bg-surface p-3 text-sm text-brand-ink">
              {result.text || <span className="italic text-ink-4">{m.noSpeechDetected}</span>}
            </div>

            <div>
              <label htmlFor="local-media-title" className="mb-1 block text-sm font-medium text-brand-ink">
                {m.labelTitle}
              </label>
              <Input
                id="local-media-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="border-line bg-surface"
              />
            </div>

            {!compact && (
              <div>
                <label htmlFor="local-media-category" className="mb-1 block text-sm font-medium text-brand-ink">
                  {m.labelCategory}
                </label>
                <Input
                  id="local-media-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder={m.placeholderCategory}
                  className="border-line bg-surface"
                />
              </div>
            )}

            <div className="flex gap-4">
              <div className="flex-1">
                <p className="mb-1 block text-sm font-medium text-brand-ink">{m.difficulty}</p>
                <div className="flex gap-2">
                  {(['beginner', 'intermediate', 'advanced'] as const).map((value) => (
                    <Button
                      key={value}
                      variant={difficulty === value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDifficulty(value)}
                      className={
                        difficulty === value
                          ? 'cursor-pointer bg-brand'
                          : 'cursor-pointer border-brand-line text-brand-ink'
                      }
                    >
                      {
                        qa[
                          `difficulty${value.charAt(0).toUpperCase()}${value.slice(1)}` as
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
                <label htmlFor="local-media-tags" className="mb-1 block text-sm font-medium text-brand-ink">
                  {m.tags}
                </label>
                <Input
                  id="local-media-tags"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder={m.tagsPlaceholder}
                  className="border-line bg-surface"
                />
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              data-testid="local-media-save"
              className="w-full cursor-pointer bg-success text-white hover:bg-success"
            >
              {saving ? m.saving : m.importToLibrary}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

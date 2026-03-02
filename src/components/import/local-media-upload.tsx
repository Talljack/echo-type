'use client';

import { AlertCircle, Check, Loader2, Mic, Upload } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PROVIDER_REGISTRY } from '@/lib/providers';
import { normalizeTags } from '@/lib/utils';
import { useContentStore } from '@/stores/content-store';
import { useProviderStore } from '@/stores/provider-store';
import type { ContentItem, Difficulty } from '@/types/content';

const ACCEPTED_FORMATS = '.mp3,.wav,.m4a,.ogg,.flac,.mp4,.webm,.avi';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB — Whisper API limit

interface LocalMediaUploadProps {
  compact?: boolean;
  onImported?: () => void;
}

export function LocalMediaUpload({ compact, onImported }: LocalMediaUploadProps) {
  const router = useRouter();
  const { addContent } = useContentStore();
  const activeProviderId = useProviderStore((s) => s.activeProviderId);
  const activeConfig = useProviderStore((s) => s.getActiveConfig());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  const [uploading, setUploading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [result, setResult] = useState<{
    text: string;
    language: string;
    duration: number;
    segments: Array<{ start: number; end: number; text: string }>;
    audioUrl: string;
  } | null>(null);

  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('');
  const [classifying, setClassifying] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFile = (f: File) => {
    if (f.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum 25MB. Try trimming the audio first.');
      return;
    }
    setFile(f);
    setError('');
    setResult(null);
    setTitle(f.name.replace(/\.[^.]+$/, ''));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

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
          modelId: activeConfig.selectedModelId,
          baseUrl: activeConfig.baseUrl || PROVIDER_REGISTRY[activeProviderId].baseUrl,
          apiPath: activeConfig.apiPath || PROVIDER_REGISTRY[activeProviderId].apiPath,
        }),
      });
      const data = await res.json();
      if (data.category) setCategory(data.category);
    } catch {
      /* non-critical */
    } finally {
      setClassifying(false);
    }
  };

  const handleTranscribe = async () => {
    if (!file) return;
    setError('');
    setUploading(true);

    try {
      const uploadForm = new FormData();
      uploadForm.append('file', file);
      const uploadRes = await fetch('/api/import/upload-media', {
        method: 'POST',
        body: uploadForm,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        setError(uploadData.error || 'Upload failed');
        setUploading(false);
        return;
      }

      setUploading(false);
      setTranscribing(true);

      const transcribeForm = new FormData();
      transcribeForm.append('file', file);

      const openaiKey =
        activeProviderId === 'openai'
          ? activeConfig.auth.apiKey || activeConfig.auth.accessToken || ''
          : process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';

      const transcribeHeaders: Record<string, string> = {};
      if (openaiKey) transcribeHeaders['x-openai-key'] = openaiKey;

      const transcribeRes = await fetch('/api/import/transcribe', {
        method: 'POST',
        headers: transcribeHeaders,
        body: transcribeForm,
      });
      const transcribeData = await transcribeRes.json();
      if (!transcribeRes.ok) {
        setError(transcribeData.error || 'Transcription failed');
        setTranscribing(false);
        return;
      }

      setResult({
        text: transcribeData.text,
        language: transcribeData.language,
        duration: transcribeData.duration,
        segments: transcribeData.segments || [],
        audioUrl: uploadData.audioUrl,
      });

      classifyContent(transcribeData.text, title);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setUploading(false);
      setTranscribing(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);

    const now = Date.now();
    const item: ContentItem = {
      id: nanoid(),
      title: title.trim() || file?.name || 'Audio Import',
      text: result.text,
      type: 'article',
      category: category || undefined,
      tags: normalizeTags(tags),
      source: 'imported',
      difficulty,
      metadata: {
        audioUrl: result.audioUrl,
        sourceFilename: file?.name,
        platform: 'local',
        videoDuration: result.duration,
        timestamps: result.segments.map((s) => ({
          offset: s.start,
          duration: s.end - s.start,
          text: s.text,
        })),
      },
      createdAt: now,
      updatedAt: now,
    };

    await addContent(item);
    setSaving(false);

    if (onImported) {
      onImported();
    } else {
      router.push('/library');
    }
  };

  const isProcessing = uploading || transcribing;

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {!compact && (
        <p className="text-sm text-indigo-500">
          Upload audio or video files from your device. Transcription powered by OpenAI Whisper.
        </p>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex flex-col items-center gap-2 px-4 py-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
          dragOver ? 'border-indigo-500 bg-indigo-50/50' : 'border-indigo-200 hover:border-indigo-400'
        }`}
      >
        <Mic className="w-8 h-8 text-indigo-400" />
        <span className="text-sm text-indigo-600">Drop an audio/video file here, or click to browse</span>
        <span className="text-xs text-indigo-400">MP3, WAV, M4A, OGG, FLAC, MP4, WebM (max 25MB)</span>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FORMATS}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
          className="hidden"
        />
      </div>

      {file && !result && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-400" />
            <span className="text-sm text-indigo-700 truncate max-w-[200px]">{file.name}</span>
            <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
              {formatFileSize(file.size)}
            </Badge>
          </div>
          <Button
            onClick={handleTranscribe}
            disabled={isProcessing}
            className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : transcribing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Transcribing...
              </>
            ) : (
              'Transcribe'
            )}
          </Button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <Card className="bg-white border-slate-100">
          <CardContent className="space-y-4 pt-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                local
              </Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                <Check className="w-3 h-3 mr-1" />
                transcribed
              </Badge>
              {result.duration > 0 && <span className="text-xs text-slate-400">{formatDuration(result.duration)}</span>}
              {result.language && (
                <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                  {result.language}
                </Badge>
              )}
            </div>

            {result.audioUrl && (
              <div>
                <label className="text-sm font-medium text-indigo-700 mb-1 block">Audio Preview</label>
                <audio controls src={result.audioUrl} className="w-full h-10" preload="metadata" />
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-lg p-3 text-sm text-indigo-800 max-h-32 overflow-y-auto">
              {result.text || <span className="text-slate-400 italic">No speech detected.</span>}
            </div>

            <div>
              <label className="text-sm font-medium text-indigo-700 mb-1 block">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-white border-slate-200" />
            </div>

            {!compact && (
              <div>
                <label className="text-sm font-medium text-indigo-700 mb-1 block">
                  Category {classifying && <Loader2 className="w-3 h-3 animate-spin inline ml-1" />}
                </label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Podcast, Lecture..."
                  className="bg-white border-slate-200"
                />
              </div>
            )}

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-indigo-700 mb-1 block">Difficulty</label>
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
                <label className="text-sm font-medium text-indigo-700 mb-1 block">Tags</label>
                <Input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. podcast, interview"
                  className="bg-white border-slate-200"
                />
              </div>
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
    </div>
  );
}

'use client';

import { AlertCircle, BookOpen, Loader2, Upload } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n/use-i18n';
import { normalizeTags } from '@/lib/utils';
import { useContentStore } from '@/stores/content-store';
import type { ContentItem, Difficulty } from '@/types/content';

interface PdfData {
  text: string;
  pageCount: number;
  metadata: { title: string | null; author: string | null };
}

export function PdfImport() {
  const router = useRouter();
  const { addContent } = useContentStore();
  const { messages } = useI18n('library');
  const m = messages.pdfImport;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<PdfData | null>(null);
  const [showFull, setShowFull] = useState(false);
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [tags, setTags] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f: File) => {
    if (f.type !== 'application/pdf') {
      setError(m.errorNoFile);
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError(m.errorFileSize);
      return;
    }
    setFile(f);
    setError('');
    setData(null);
    setTitle(f.name.replace(/\.pdf$/i, ''));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  const handleExtract = async () => {
    if (!file) return;
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/import/pdf', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || m.parseFailed);
        return;
      }

      setData(json);
      if (json.metadata?.title) {
        setTitle(json.metadata.title);
      }
    } catch {
      setError(m.networkError);
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
      title: title.trim() || file?.name || 'PDF Import',
      text: data.text,
      type: 'article',
      tags: normalizeTags(tags),
      source: 'imported',
      difficulty,
      metadata: {
        sourceFilename: file?.name,
      },
      createdAt: now,
      updatedAt: now,
    };

    await addContent(item);
    setImporting(false);
    router.push('/library');
  };

  const wordCount = data ? data.text.split(/\s+/).filter(Boolean).length : 0;
  const previewText = data ? (showFull ? data.text : data.text.slice(0, 500)) : '';

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={handleSelectFile}
        className={`flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 transition-colors ${
          dragOver ? 'border-brand bg-brand-soft/50' : 'border-brand-line hover:border-brand'
        } cursor-pointer`}
      >
        <BookOpen className="w-8 h-8 text-brand-muted" />
        <span className="text-sm text-brand-ink">{m.dropzone}</span>
        <span className="text-xs text-brand-muted">{m.maxSize}</span>
      </button>
      <input
        id="pdf-import-input"
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
        className="hidden"
      />

      {file && !data && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-brand-muted" />
            <span className="text-sm text-brand-ink">{file.name}</span>
            <Badge variant="secondary" className="bg-brand-tint text-brand-ink">
              {formatFileSize(file.size)}
            </Badge>
          </div>
          <Button onClick={handleExtract} disabled={loading} className="bg-brand hover:bg-brand-strong cursor-pointer">
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
      )}

      {error && (
        <div className="flex items-center gap-2 text-danger text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {data && (
        <Card className="bg-surface border-line shadow-sm">
          <CardContent className="space-y-4 pt-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="bg-brand-tint text-brand-ink">
                {data.pageCount} {m.pages}
              </Badge>
              <Badge variant="secondary" className="bg-brand-tint text-brand-ink">
                {wordCount.toLocaleString()} {m.words}
              </Badge>
              {data.metadata?.author && (
                <Badge variant="secondary" className="bg-brand-tint text-brand-ink">
                  {m.by} {data.metadata.author}
                </Badge>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-brand-ink mb-1 block">{m.preview}</p>
              <div className="bg-surface/50 border border-brand-line rounded-lg p-3 text-sm text-brand-ink max-h-48 overflow-y-auto">
                {previewText}
                {!showFull && data.text.length > 500 && '...'}
              </div>
              {data.text.length > 500 && (
                <button
                  type="button"
                  onClick={() => setShowFull(!showFull)}
                  className="text-xs text-brand-ink hover:text-brand-ink mt-1 cursor-pointer"
                >
                  {showFull ? m.showLess : m.showMore}
                </button>
              )}
            </div>

            <div>
              <label htmlFor="pdf-import-title" className="text-sm font-medium text-brand-ink mb-1 block">
                {m.labelTitle}
              </label>
              <Input
                id="pdf-import-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={m.placeholderTitle}
                className="bg-surface/50 border-brand-line"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-brand-ink mb-1 block">{m.difficulty}</p>
                <div className="flex gap-2">
                  {(['beginner', 'intermediate', 'advanced'] as const).map((d) => (
                    <Button
                      key={d}
                      variant={difficulty === d ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDifficulty(d)}
                      className={difficulty === d ? 'bg-brand' : 'border-brand-line text-brand-ink cursor-pointer'}
                    >
                      {
                        m[
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
                <label htmlFor="pdf-import-tags" className="text-sm font-medium text-brand-ink mb-1 block">
                  {m.tags}
                </label>
                <Input
                  id="pdf-import-tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder={m.tagsPlaceholder}
                  className="bg-surface/50 border-brand-line"
                />
              </div>
            </div>

            <Button
              onClick={handleImport}
              disabled={importing}
              className="w-full bg-success hover:bg-success text-white cursor-pointer"
            >
              {importing ? m.importing : m.importAsArticle}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

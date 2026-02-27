'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { useContentStore } from '@/stores/content-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Upload, Loader2, AlertCircle } from 'lucide-react';
import type { ContentItem, Difficulty } from '@/types/content';

interface PdfData {
  text: string;
  pageCount: number;
  metadata: { title: string | null; author: string | null };
}

export function PdfImport() {
  const router = useRouter();
  const { addContent } = useContentStore();
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
      setError('Please select a PDF file');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB');
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
        setError(json.error || 'Failed to parse PDF');
        return;
      }

      setData(json);
      if (json.metadata?.title) {
        setTitle(json.metadata.title);
      }
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
      title: title.trim() || file?.name || 'PDF Import',
      text: data.text,
      type: 'article',
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
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
  const previewText = data
    ? showFull
      ? data.text
      : data.text.slice(0, 500)
    : '';

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex flex-col items-center gap-2 px-4 py-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
          dragOver
            ? 'border-indigo-500 bg-indigo-50/50'
            : 'border-indigo-200 hover:border-indigo-400'
        }`}
      >
        <BookOpen className="w-8 h-8 text-indigo-400" />
        <span className="text-sm text-indigo-600">
          Drop a PDF file here, or click to browse
        </span>
        <span className="text-xs text-indigo-400">Maximum file size: 10MB</span>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
          className="hidden"
        />
      </div>

      {file && !data && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-400" />
            <span className="text-sm text-indigo-700">{file.name}</span>
            <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
              {formatFileSize(file.size)}
            </Badge>
          </div>
          <Button
            onClick={handleExtract}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Extracting...
              </>
            ) : (
              'Extract Text'
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

      {data && (
        <Card className="bg-white border-slate-100 shadow-sm">
          <CardContent className="space-y-4 pt-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                {data.pageCount} pages
              </Badge>
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                {wordCount.toLocaleString()} words
              </Badge>
              {data.metadata?.author && (
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                  by {data.metadata.author}
                </Badge>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-indigo-700 mb-1 block">
                Preview
              </label>
              <div className="bg-white/50 border border-indigo-200 rounded-lg p-3 text-sm text-indigo-800 max-h-48 overflow-y-auto">
                {previewText}
                {!showFull && data.text.length > 500 && '...'}
              </div>
              {data.text.length > 500 && (
                <button
                  onClick={() => setShowFull(!showFull)}
                  className="text-xs text-indigo-500 hover:text-indigo-700 mt-1 cursor-pointer"
                >
                  {showFull ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-indigo-700 mb-1 block">
                Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title..."
                className="bg-white/50 border-indigo-200"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-indigo-700 mb-1 block">
                  Difficulty
                </label>
                <div className="flex gap-2">
                  {(['beginner', 'intermediate', 'advanced'] as const).map((d) => (
                    <Button
                      key={d}
                      variant={difficulty === d ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDifficulty(d)}
                      className={
                        difficulty === d
                          ? 'bg-indigo-600'
                          : 'border-indigo-200 text-indigo-600 cursor-pointer'
                      }
                    >
                      {d}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-indigo-700 mb-1 block">
                  Tags (comma separated)
                </label>
                <Input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. textbook, chapter-1"
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

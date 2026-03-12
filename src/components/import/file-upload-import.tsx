'use client';

import { AlertCircle, BookOpen, FileText, FileUp, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { TagSelector } from '@/components/shared/tag-selector';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { normalizeTags } from '@/lib/utils';
import { useBookStore } from '@/stores/book-store';
import type { Difficulty } from '@/types/content';

const ACCEPTED_FORMATS = '.txt,.md,.text,.pdf,.docx,.epub';
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

interface ExtractResult {
  text: string;
  chapters?: { title: string; text: string }[];
  metadata: {
    title: string | null;
    author: string | null;
    pageCount: number | null;
    format: string;
    sourceFilename: string;
  };
  wordCount: number;
}

export function FileUploadImport() {
  const router = useRouter();
  const { importBook } = useBookStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<ExtractResult | null>(null);
  const [showFull, setShowFull] = useState(false);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [tags, setTags] = useState('');

  const hasChapters = data?.chapters && data.chapters.length >= 2;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFile = (f: File) => {
    if (f.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum 20MB.');
      return;
    }
    setFile(f);
    setError('');
    setData(null);
    setTitle(f.name.replace(/\.[^.]+$/, ''));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleExtract = async () => {
    if (!file) return;
    setExtracting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/import/extract-text', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Failed to extract text');
        return;
      }

      setData(json);
      if (json.metadata?.title) setTitle(json.metadata.title);
      if (json.metadata?.author) setAuthor(json.metadata.author);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setExtracting(false);
    }
  };

  const handleImportBook = async () => {
    if (!data) return;
    setImporting(true);

    try {
      // Use detected chapters, or fall back to single chapter with the full text
      const chapters = hasChapters ? data.chapters! : [{ title: title.trim() || 'Full Text', text: data.text }];

      const bookId = await importBook({
        title: title.trim() || file?.name || 'Imported Book',
        author: author.trim() || 'Unknown',
        difficulty,
        chapters,
        tags: normalizeTags(tags),
        metadata: { sourceFilename: data.metadata.sourceFilename },
      });
      setImporting(false);
      router.push(`/library/books/${bookId}`);
    } catch {
      setError('Failed to import book.');
      setImporting(false);
    }
  };

  const previewText = data ? (showFull ? data.text : data.text.slice(0, 500)) : '';

  return (
    <div className="space-y-4">
      <>
        <button
          type="button"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 transition-colors ${
            dragOver ? 'border-indigo-500 bg-indigo-50/50' : 'border-indigo-200 hover:border-indigo-400'
          } cursor-pointer`}
        >
          <FileUp className="w-8 h-8 text-indigo-400" />
          <span className="text-sm text-indigo-600">Drop a document here, or click to browse</span>
          <span className="text-xs text-indigo-400">TXT, MD, PDF, DOCX, EPUB (max 20MB)</span>
        </button>
        <input
          id="file-upload-import-input"
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FORMATS}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
          className="hidden"
        />
      </>

      {file && !data && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            <span className="text-sm text-indigo-700 truncate max-w-[200px]">{file.name}</span>
            <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
              {formatFileSize(file.size)}
            </Badge>
          </div>
          <Button
            onClick={handleExtract}
            disabled={extracting}
            className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
          >
            {extracting ? (
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
                {data.metadata.format}
              </Badge>
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                {data.wordCount.toLocaleString()} words
              </Badge>
              {data.metadata.pageCount && (
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                  {data.metadata.pageCount} {data.metadata.format === 'epub' ? 'chapters' : 'pages'}
                </Badge>
              )}
              {data.metadata.author && (
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                  by {data.metadata.author}
                </Badge>
              )}
              {hasChapters && (
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                  <BookOpen className="w-3 h-3 mr-1" />
                  Book detected ({data.chapters!.length} chapters)
                </Badge>
              )}
            </div>

            {/* Chapter list preview when book is detected */}
            {hasChapters && (
              <div>
                <p className="text-sm font-medium text-indigo-700 mb-1">Chapters</p>
                <div className="bg-white/50 border border-indigo-200 rounded-lg p-3 max-h-36 overflow-y-auto space-y-1">
                  {data.chapters!.map((ch, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-indigo-400 font-mono text-xs w-6 shrink-0">{i + 1}.</span>
                      <span className="text-indigo-800 truncate">{ch.title}</span>
                      <span className="text-indigo-400 text-xs ml-auto shrink-0">
                        {ch.text.split(/\s+/).length} words
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-indigo-700 mb-1 block">Preview</p>
              <div className="bg-white/50 border border-indigo-200 rounded-lg p-3 text-sm text-indigo-800 max-h-48 overflow-y-auto">
                {previewText}
                {!showFull && data.text.length > 500 && '...'}
              </div>
              {data.text.length > 500 && (
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
              <label htmlFor="file-upload-title" className="text-sm font-medium text-indigo-700 mb-1 block">
                Title
              </label>
              <Input
                id="file-upload-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title..."
                className="bg-white/50 border-indigo-200"
              />
            </div>

            {/* Author is always shown for book import */}
            <div>
              <label htmlFor="file-upload-author" className="text-sm font-medium text-indigo-700 mb-1 block">
                Author
              </label>
              <Input
                id="file-upload-author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Enter the author..."
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
                <p className="text-sm font-medium text-indigo-700 mb-1 block">Tags (comma separated)</p>
                <TagSelector value={tags} onChange={setTags} className="bg-white/50 border-indigo-200" />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleImportBook}
                disabled={importing}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <BookOpen className="w-4 h-4 mr-2" />
                    {hasChapters ? `Import as Book (${data.chapters!.length} chapters)` : 'Import as Book'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

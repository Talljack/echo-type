'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Video, FileText, Sparkles, Download, Loader2, AlertCircle, Check,
  Link2, Clipboard, Database, ArrowDownToLine, ArrowUpFromLine, Upload,
} from 'lucide-react';
import { useContentStore } from '@/stores/content-store';
import { db } from '@/lib/db';
import type { ContentItem, ContentType, Difficulty } from '@/types/content';

function MediaImportTab() {
  const router = useRouter();
  const { addContent } = useContentStore();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ title: string; text: string; platform: string; sourceUrl: string } | null>(null);
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

  const handleExtract = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/tools/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Extraction failed'); return; }
      setResult(data);
      setTitle(data.title);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    const now = Date.now();
    const item: ContentItem = {
      id: nanoid(), title: title.trim() || result.title, text: result.text,
      type: 'article', tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      source: 'imported', difficulty,
      metadata: { sourceUrl: result.sourceUrl },
      createdAt: now, updatedAt: now,
    };
    await addContent(item);
    setSaving(false);
    router.push('/library');
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-indigo-500">
        Import audio content from video platforms. Supports YouTube, Bilibili, TikTok, Twitter/X.
      </p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
          <Input
            value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="pl-10 bg-white/50 border-indigo-200"
            onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
          />
        </div>
        <Button onClick={handleExtract} disabled={!url.trim() || loading} className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Extracting...</> : 'Extract'}
        </Button>
      </div>
      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
        </div>
      )}
      {result && (
        <Card className="bg-white/50 backdrop-blur-sm border-indigo-100">
          <CardContent className="space-y-4 pt-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">{result.platform}</Badge>
            </div>
            <div className="bg-white/50 border border-indigo-200 rounded-lg p-3 text-sm text-indigo-800 max-h-32 overflow-y-auto">
              {result.text}
            </div>
            <div>
              <label className="text-sm font-medium text-indigo-700 mb-1 block">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-white/50 border-indigo-200" />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-indigo-700 mb-1 block">Difficulty</label>
                <div className="flex gap-2">
                  {(['beginner', 'intermediate', 'advanced'] as const).map((d) => (
                    <Button key={d} variant={difficulty === d ? 'default' : 'outline'} size="sm" onClick={() => setDifficulty(d)}
                      className={difficulty === d ? 'bg-indigo-600 cursor-pointer' : 'border-indigo-200 text-indigo-600 cursor-pointer'}>{d}</Button>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-indigo-700 mb-1 block">Tags</label>
                <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. video, lecture" className="bg-white/50 border-indigo-200" />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full bg-green-500 hover:bg-green-600 text-white cursor-pointer">
              {saving ? 'Saving...' : 'Import to Library'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TextExtractTab() {
  const router = useRouter();
  const { addContent } = useContentStore();
  const [text, setText] = useState('');
  const [processed, setProcessed] = useState<{ title: string; text: string; type: ContentType } | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);

  const detectType = (t: string): ContentType => {
    const wordCount = t.trim().split(/\s+/).length;
    if (wordCount <= 1) return 'word';
    if (wordCount <= 6) return 'phrase';
    if (wordCount <= 25) return 'sentence';
    return 'article';
  };

  const handleProcess = async () => {
    if (!text.trim()) return;
    setProcessing(true);
    setError('');
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: text.trim().slice(0, 100), difficulty: 'intermediate', contentType: 'article' }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Processing failed');
        return;
      }
      setProcessed({ title: text.trim().slice(0, 50), text: text.trim(), type: detectType(text) });
    } catch {
      setError('Network error.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = async (source: 'direct' | 'processed') => {
    const content = source === 'processed' && processed ? processed : { title: text.trim().slice(0, 50), text: text.trim(), type: detectType(text) };
    setSaving(true);
    const now = Date.now();
    const item: ContentItem = {
      id: nanoid(), title: content.title, text: content.text,
      type: content.type, tags: [], source: 'imported',
      createdAt: now, updatedAt: now,
    };
    await addContent(item);
    setSaving(false);
    router.push('/library');
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-indigo-500">
        Paste text content to import. Optionally use AI to auto-segment and classify.
      </p>
      <div>
        <label className="text-sm font-medium text-indigo-700 mb-1 block">Paste Text Content</label>
        <Textarea value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Paste English text here..." rows={8} className="bg-white/50 border-indigo-200" />
      </div>
      {text.trim() && (
        <div className="flex items-center gap-2">
          <Clipboard className="w-4 h-4 text-indigo-400" />
          <span className="text-sm text-indigo-600">
            {text.trim().split(/\s+/).length} words · Detected: <Badge variant="secondary">{detectType(text)}</Badge>
          </span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
        </div>
      )}
      {processed && (
        <Card className="bg-white/50 backdrop-blur-sm border-indigo-100">
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">{processed.type}</Badge>
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-xs text-green-600">Processed</span>
            </div>
            <Button onClick={() => handleSave('processed')} disabled={saving} className="w-full bg-green-500 hover:bg-green-600 text-white cursor-pointer">
              {saving ? 'Saving...' : 'Save to Library'}
            </Button>
          </CardContent>
        </Card>
      )}
      <div className="flex gap-2">
        <Button onClick={handleProcess} disabled={!text.trim() || processing} variant="outline" className="flex-1 border-indigo-200 text-indigo-600 cursor-pointer">
          {processing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : <><Sparkles className="w-4 h-4 mr-2" />AI Process</>}
        </Button>
        <Button onClick={() => handleSave('direct')} disabled={!text.trim() || saving} className="flex-1 bg-green-500 hover:bg-green-600 text-white cursor-pointer">
          {saving ? 'Saving...' : 'Save Directly'}
        </Button>
      </div>
    </div>
  );
}

function AIGenerateTab() {
  const router = useRouter();
  const { addContent } = useContentStore();
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [contentType, setContentType] = useState<ContentType>('sentence');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ title: string; text: string; type: ContentType } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), difficulty, contentType }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Generation failed'); return; }
      setResult(data);
    } catch {
      setError('Network error.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    const now = Date.now();
    const item: ContentItem = {
      id: nanoid(), title: result.title, text: result.text,
      type: result.type, tags: [topic.trim()], source: 'ai-generated', difficulty,
      createdAt: now, updatedAt: now,
    };
    await addContent(item);
    setSaving(false);
    router.push('/library');
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-indigo-500">
        Generate English learning content using AI. Choose a topic, difficulty, and content type.
      </p>
      <div>
        <label className="text-sm font-medium text-indigo-700 mb-1 block">Topic</label>
        <Input value={topic} onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. technology, travel, daily conversation, business..."
          className="bg-white/50 border-indigo-200" />
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium text-indigo-700 mb-1 block">Difficulty</label>
          <div className="flex gap-2">
            {(['beginner', 'intermediate', 'advanced'] as const).map((d) => (
              <Button key={d} variant={difficulty === d ? 'default' : 'outline'} size="sm" onClick={() => setDifficulty(d)}
                className={difficulty === d ? 'bg-indigo-600 cursor-pointer' : 'border-indigo-200 text-indigo-600 cursor-pointer'}>{d}</Button>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium text-indigo-700 mb-1 block">Content Type</label>
          <div className="flex gap-2">
            {([['word', 'Words'], ['sentence', 'Sentences'], ['article', 'Article']] as const).map(([t, label]) => (
              <Button key={t} variant={contentType === t ? 'default' : 'outline'} size="sm" onClick={() => setContentType(t as ContentType)}
                className={contentType === t ? 'bg-indigo-600 cursor-pointer' : 'border-indigo-200 text-indigo-600 cursor-pointer'}>{label}</Button>
            ))}
          </div>
        </div>
      </div>
      <Button onClick={handleGenerate} disabled={!topic.trim() || generating} className="w-full bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
        {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4 mr-2" />Generate Content</>}
      </Button>
      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
        </div>
      )}
      {result && (
        <Card className="bg-white/50 backdrop-blur-sm border-indigo-100">
          <CardContent className="space-y-3 pt-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">{result.type}</Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-700">{difficulty}</Badge>
            </div>
            <h4 className="font-medium text-indigo-900">{result.title}</h4>
            <div className="bg-white/50 border border-indigo-200 rounded-lg p-3 text-sm text-indigo-800 max-h-48 overflow-y-auto whitespace-pre-wrap">
              {result.text}
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full bg-green-500 hover:bg-green-600 text-white cursor-pointer">
              {saving ? 'Saving...' : <><Check className="w-4 h-4 mr-2" />Save to Library</>}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DataBackupTab() {
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState('');
  const [mergeMode, setMergeMode] = useState<'merge' | 'overwrite'>('merge');

  const downloadJson = (data: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportLibrary = async () => {
    const contents = await db.contents.toArray();
    downloadJson(contents, `echotype-library-${new Date().toISOString().slice(0, 10)}.json`);
    setExportStatus(`Exported ${contents.length} items`);
    setTimeout(() => setExportStatus(null), 3000);
  };

  const handleExportLearning = async () => {
    const records = await db.records.toArray();
    const sessions = await db.sessions.toArray();
    downloadJson({ records, sessions }, `echotype-learning-${new Date().toISOString().slice(0, 10)}.json`);
    setExportStatus(`Exported ${records.length} records, ${sessions.length} sessions`);
    setTimeout(() => setExportStatus(null), 3000);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    setImportStatus(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (Array.isArray(data)) {
        if (mergeMode === 'overwrite') await db.contents.clear();
        await db.contents.bulkPut(data);
        setImportStatus(`Imported ${data.length} content items (${mergeMode})`);
      } else if (data.records || data.sessions) {
        if (data.records?.length) {
          if (mergeMode === 'overwrite') await db.records.clear();
          await db.records.bulkPut(data.records);
        }
        if (data.sessions?.length) {
          if (mergeMode === 'overwrite') await db.sessions.clear();
          await db.sessions.bulkPut(data.sessions);
        }
        setImportStatus(`Imported ${data.records?.length || 0} records, ${data.sessions?.length || 0} sessions (${mergeMode})`);
      } else {
        setImportError('Unrecognized file format');
      }
    } catch {
      setImportError('Failed to parse file. Ensure it is valid JSON.');
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-indigo-500">
        Export your data for backup or import from a previous backup.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-white/50 backdrop-blur-sm border-indigo-100">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <ArrowDownToLine className="w-5 h-5 text-indigo-600" />
              <h4 className="font-medium text-indigo-900">Export Library</h4>
            </div>
            <p className="text-xs text-indigo-500">Download all content items as JSON</p>
            <Button onClick={handleExportLibrary} variant="outline" className="w-full border-indigo-200 text-indigo-600 cursor-pointer">
              <Download className="w-4 h-4 mr-2" />Export Library
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white/50 backdrop-blur-sm border-indigo-100">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              <h4 className="font-medium text-indigo-900">Export Learning Data</h4>
            </div>
            <p className="text-xs text-indigo-500">Download records and sessions as JSON</p>
            <Button onClick={handleExportLearning} variant="outline" className="w-full border-indigo-200 text-indigo-600 cursor-pointer">
              <Download className="w-4 h-4 mr-2" />Export Learning Data
            </Button>
          </CardContent>
        </Card>
      </div>

      {exportStatus && (
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <Check className="w-4 h-4" /><span>{exportStatus}</span>
        </div>
      )}

      <Card className="bg-white/50 backdrop-blur-sm border-indigo-100">
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <ArrowUpFromLine className="w-5 h-5 text-indigo-600" />
            <h4 className="font-medium text-indigo-900">Import from Backup</h4>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-indigo-700">Mode:</span>
            {(['merge', 'overwrite'] as const).map((mode) => (
              <Button key={mode} variant={mergeMode === mode ? 'default' : 'outline'} size="sm" onClick={() => setMergeMode(mode)}
                className={mergeMode === mode ? 'bg-indigo-600 cursor-pointer' : 'border-indigo-200 text-indigo-600 cursor-pointer'}>
                {mode === 'merge' ? 'Merge' : 'Overwrite'}
              </Button>
            ))}
          </div>
          {mergeMode === 'overwrite' && (
            <p className="text-xs text-red-500">Overwrite will delete existing data before importing.</p>
          )}
          <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-indigo-200 rounded-lg cursor-pointer hover:border-indigo-400 transition-colors">
            <Upload className="w-5 h-5 text-indigo-400" />
            <span className="text-sm text-indigo-500">Upload .json backup file</span>
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
          {importStatus && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <Check className="w-4 h-4" /><span>{importStatus}</span>
            </div>
          )}
          {importError && (
            <div className="flex items-center gap-2 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /><span>{importError}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ToolsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-[var(--font-poppins)] text-indigo-900">Tools</h1>
        <p className="text-indigo-600 mt-1">Import content, generate practice material, and manage your data</p>
      </div>

      <Card className="bg-white/70 backdrop-blur-xl border-indigo-100">
        <CardContent className="pt-6">
          <Tabs defaultValue="media">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="media" className="flex items-center gap-2 cursor-pointer">
                <Video className="w-4 h-4" />
                <span className="hidden sm:inline">Media Import</span>
              </TabsTrigger>
              <TabsTrigger value="text" className="flex items-center gap-2 cursor-pointer">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Text Extract</span>
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-2 cursor-pointer">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">AI Generate</span>
              </TabsTrigger>
              <TabsTrigger value="backup" className="flex items-center gap-2 cursor-pointer">
                <Database className="w-4 h-4" />
                <span className="hidden sm:inline">Backup</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="media"><MediaImportTab /></TabsContent>
            <TabsContent value="text"><TextExtractTab /></TabsContent>
            <TabsContent value="ai"><AIGenerateTab /></TabsContent>
            <TabsContent value="backup"><DataBackupTab /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { FileText, ImageIcon, Loader2, Sparkles, Trash2, Upload } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { providerSupportsVision } from '@/lib/provider-vision';
import { PROVIDER_REGISTRY } from '@/lib/providers';
import { cn } from '@/lib/utils';
import { useJournalStore } from '@/stores/journal-store';
import { useProviderStore } from '@/stores/provider-store';
import type { DialogueTurn } from '@/types/journal';

type Mode = 'text' | 'image';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function ImportDialog({ trigger }: { trigger: ReactNode }) {
  const router = useRouter();
  const addJournal = useJournalStore((s) => s.addJournal);

  const activeProviderId = useProviderStore((s) => s.activeProviderId);
  const providerConfigs = useProviderStore((s) => s.providers);
  const activeApiKey = useProviderStore((s) => {
    const config = s.providers[s.activeProviderId];
    return config?.auth.apiKey || config?.auth.accessToken || '';
  });

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('text');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [turns, setTurns] = useState<DialogueTurn[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const visionOk = providerSupportsVision(activeProviderId);

  const reset = () => {
    setMode('text');
    setTitle('');
    setText('');
    setImageDataUrl(null);
    setTurns(null);
    setError('');
    setLoading(false);
  };

  const callJournalApi = async (path: string, body: Record<string, unknown>) => {
    const headerKey = PROVIDER_REGISTRY[activeProviderId]?.headerKey;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (activeApiKey && headerKey) headers[headerKey] = activeApiKey;
    const res = await fetch(path, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...body, provider: activeProviderId, providerConfigs }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Request failed');
    return json as { turns: { speaker?: string; text: string; translation?: string }[] };
  };

  const handleDocFile = async (file: File) => {
    setError('');
    setLoading(true);
    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(isPdf ? '/api/import/pdf' : '/api/import/extract-text', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Extraction failed');
      setText((prev) => (prev ? `${prev}\n\n${json.text ?? ''}` : (json.text ?? '')));
      if (!title && json.metadata?.title) setTitle(json.metadata.title);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Extraction failed');
    } finally {
      setLoading(false);
    }
  };

  const handleImageFile = async (file: File) => {
    setError('');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setImageDataUrl(dataUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read image');
    }
  };

  const handleAnalyze = async () => {
    setError('');
    setLoading(true);
    try {
      const json =
        mode === 'image' && imageDataUrl
          ? await callJournalApi('/api/journal/ocr', { imageDataUrl })
          : await callJournalApi('/api/journal/structure', { text });
      setTurns(json.turns.map((t) => ({ id: nanoid(), speaker: t.speaker, text: t.text, translation: t.translation })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!turns || turns.length === 0) return;
    const id = await addJournal({
      title: title.trim() || 'Imported notebook',
      source: mode === 'image' ? 'uploaded' : 'ai-generated',
      turns,
    });
    setOpen(false);
    reset();
    router.push(`/journal/${id}`);
  };

  const canAnalyze = mode === 'image' ? Boolean(imageDataUrl) && visionOk : Boolean(text.trim());

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import into notebook</DialogTitle>
        </DialogHeader>

        {!turns ? (
          <div className="space-y-3">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setMode('text')}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-sm font-medium transition-colors',
                  mode === 'text' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                <FileText className="w-4 h-4" /> Text / document
              </button>
              <button
                type="button"
                onClick={() => setMode('image')}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-sm font-medium transition-colors',
                  mode === 'image' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                <ImageIcon className="w-4 h-4" /> Screenshot
              </button>
            </div>

            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" />

            {mode === 'text' ? (
              <>
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={6}
                  placeholder="Paste phrases, dialogue, sentence pairs, or notes here…"
                />
                <label className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline cursor-pointer">
                  <Upload className="w-4 h-4" /> or upload .txt / .md / .pdf / .docx
                  <input
                    type="file"
                    accept=".txt,.md,.pdf,.docx,.epub"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleDocFile(f);
                    }}
                  />
                </label>
              </>
            ) : (
              <>
                {!visionOk && (
                  <p className="text-xs text-amber-600 bg-amber-50 rounded-md px-3 py-2">
                    Your current provider ({activeProviderId}) can't read images. Switch to OpenAI, Anthropic, or Google
                    in Settings, or use the Text tab.
                  </p>
                )}
                <label
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg py-8 cursor-pointer transition-colors',
                    visionOk ? 'border-slate-200 hover:border-indigo-300' : 'border-slate-200 opacity-60',
                  )}
                >
                  {imageDataUrl ? (
                    // biome-ignore lint/performance/noImgElement: local data URL preview only
                    <img src={imageDataUrl} alt="preview" className="max-h-40 rounded-md" />
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 text-slate-300" />
                      <span className="text-sm text-slate-500">Click to choose a screenshot</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={!visionOk}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleImageFile(f);
                    }}
                  />
                </label>
              </>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <DialogFooter>
              <Button onClick={handleAnalyze} disabled={!canAnalyze || loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Analyze
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">{turns.length} entries detected. Review and edit before saving.</p>
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {turns.map((turn, idx) => (
                <div key={turn.id} className="rounded-lg border border-slate-200 p-2.5 space-y-2">
                  <div className="flex items-start gap-1.5">
                    <Input
                      value={turn.speaker ?? ''}
                      onChange={(e) =>
                        setTurns((prev) =>
                          prev!.map((t) =>
                            t.id === turn.id ? { ...t, speaker: e.target.value.trim() || undefined } : t,
                          ),
                        )
                      }
                      placeholder="Label / speaker (optional)"
                      className="h-8 w-44 shrink-0"
                    />
                    <button
                      type="button"
                      onClick={() => setTurns((prev) => prev!.filter((t) => t.id !== turn.id))}
                      className="ml-auto shrink-0 h-8 w-8 flex items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"
                      title={`Remove entry ${idx + 1}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <Textarea
                    value={turn.text}
                    onChange={(e) =>
                      setTurns((prev) => prev!.map((t) => (t.id === turn.id ? { ...t, text: e.target.value } : t)))
                    }
                    rows={2}
                    className="min-h-16"
                  />
                  <Input
                    value={turn.translation ?? ''}
                    onChange={(e) =>
                      setTurns((prev) =>
                        prev!.map((t) =>
                          t.id === turn.id ? { ...t, translation: e.target.value.trim() || undefined } : t,
                        ),
                      )
                    }
                    placeholder="Translation (optional)"
                    className="h-8"
                  />
                </div>
              ))}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setTurns(null)}>
                Back
              </Button>
              <Button onClick={handleSave} disabled={turns.length === 0}>
                Save notebook
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { AlertCircle, Check, Loader2, Sparkles } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { TagSelector } from '@/components/shared/tag-selector';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PROVIDER_REGISTRY } from '@/lib/providers';
import { normalizeTags } from '@/lib/utils';
import { useContentStore } from '@/stores/content-store';
import { useProviderStore } from '@/stores/provider-store';
import type { ContentItem, ContentType, Difficulty } from '@/types/content';

export function AIGenerate() {
  const router = useRouter();
  const { addContent } = useContentStore();
  const activeProviderId = useProviderStore((s) => s.activeProviderId);
  const activeConfig = useProviderStore((s) => s.getActiveConfig());
  const providers = useProviderStore((s) => s.providers);
  const [prompt, setPrompt] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [contentType, setContentType] = useState<ContentType>('sentence');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ title: string; text: string; type: ContentType; sourceUrl?: string } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [tags, setTags] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError('');
    setResult(null);
    try {
      const apiKey = activeConfig.auth.apiKey || activeConfig.auth.accessToken || '';
      const headerKey = PROVIDER_REGISTRY[activeProviderId].headerKey;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers[headerKey] = apiKey;
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: prompt.trim(),
          difficulty,
          contentType,
          provider: activeProviderId,
          providerConfigs: providers,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Generation failed');
        return;
      }
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
      id: nanoid(),
      title: result.title,
      text: result.text,
      type: result.type,
      tags: normalizeTags(tags),
      source: 'ai-generated',
      difficulty,
      metadata: result.sourceUrl ? { sourceUrl: result.sourceUrl } : undefined,
      createdAt: now,
      updatedAt: now,
    };
    await addContent(item);
    setSaving(false);
    router.push('/library');
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-indigo-500">
        Generate English learning content with a prompt, topic, or webpage URL. You can also add instructions in Chinese
        or English.
      </p>
      <div>
        <label htmlFor="ai-generate-prompt" className="text-sm font-medium text-indigo-700 mb-1 block">
          Prompt
        </label>
        <Input
          id="ai-generate-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Explain this article for beginners: https://example.com/article"
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
                  difficulty === d ? 'bg-indigo-600 cursor-pointer' : 'border-indigo-200 text-indigo-600 cursor-pointer'
                }
              >
                {d}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-indigo-700 mb-1 block">Content Type</p>
          <div className="flex gap-2">
            {(
              [
                ['word', 'Words'],
                ['sentence', 'Sentences'],
                ['article', 'Article'],
              ] as const
            ).map(([t, label]) => (
              <Button
                key={t}
                variant={contentType === t ? 'default' : 'outline'}
                size="sm"
                onClick={() => setContentType(t as ContentType)}
                className={
                  contentType === t
                    ? 'bg-indigo-600 cursor-pointer'
                    : 'border-indigo-200 text-indigo-600 cursor-pointer'
                }
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-indigo-700 mb-1 block">Tags</p>
        <TagSelector
          value={tags}
          onChange={setTags}
          placeholder="e.g. ai-generated, grammar"
          className="bg-white border-slate-200"
        />
        <p className="text-xs text-indigo-400 mt-1">Optional tags for organizing the generated content</p>
      </div>
      <Button
        onClick={handleGenerate}
        disabled={!prompt.trim() || generating}
        className="w-full bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
      >
        {generating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Content
          </>
        )}
      </Button>
      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {result && (
        <Card className="bg-white border-slate-100">
          <CardContent className="space-y-3 pt-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                {result.type}
              </Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                {difficulty}
              </Badge>
            </div>
            <h4 className="font-medium text-indigo-900">{result.title}</h4>
            <div className="bg-white border border-slate-200 rounded-lg p-3 text-sm text-indigo-800 max-h-48 overflow-y-auto whitespace-pre-wrap">
              {result.text}
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-green-500 hover:bg-green-600 text-white cursor-pointer"
            >
              {saving ? (
                'Saving...'
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save to Library
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

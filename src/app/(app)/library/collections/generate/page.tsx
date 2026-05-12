'use client';

import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { db } from '@/lib/db';
import { getDefaultModelId, PROVIDER_REGISTRY } from '@/lib/providers';
import { cn } from '@/lib/utils';
import { useCollectionStore } from '@/stores/collection-store';
import { useProviderStore } from '@/stores/provider-store';
import type { CollectionItem, ContentItem, Difficulty } from '@/types/content';

const difficultyOptions: Difficulty[] = ['beginner', 'intermediate', 'advanced'];

const exampleKeywords = [
  { label: '看医生', keyword: '看医生' },
  { label: 'Job interview', keyword: 'Job interview' },
  { label: '租房子', keyword: '租房子' },
  { label: 'Airport', keyword: 'Airport' },
  { label: '网上购物', keyword: '网上购物' },
  { label: 'First date', keyword: 'First date' },
  { label: '开会', keyword: '开会' },
  { label: 'Road trip', keyword: 'Road trip' },
];

interface GeneratedResult {
  collection: {
    title: string;
    titleZh: string;
    description: string;
    descriptionZh: string;
    scenario: string;
    category: string;
    difficulty: string;
    icon: string;
    tags: string[];
  };
  items: Array<{ text: string; type: 'phrase' | 'sentence' }>;
}

export default function GenerateCollectionPage() {
  const router = useRouter();
  const { addCollection } = useCollectionStore();
  const providers = useProviderStore((s) => s.providers);
  const activeProviderId = useProviderStore((s) => s.activeProviderId);

  const [keyword, setKeyword] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('intermediate');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedResult | null>(null);

  const providerConfig = providers[activeProviderId];
  const providerDef = PROVIDER_REGISTRY[activeProviderId];
  const isConfigured = providerConfig?.auth.type !== 'none' || providerDef?.noKeyRequired;

  const handleGenerate = async () => {
    if (!keyword.trim() || !isConfigured) return;
    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const apiKey =
        providerConfig?.auth.apiKey || providerConfig?.auth.accessToken || (providerDef?.noKeyRequired ? 'ollama' : '');
      const modelId = providerConfig?.selectedModelId || getDefaultModelId(activeProviderId);
      const baseUrl = providerConfig?.baseUrl || providerDef?.baseUrl || '';
      const apiPath = providerConfig?.apiPath || providerDef?.apiPath || '';

      const res = await fetch('/api/collections/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-provider-id': activeProviderId,
          'x-api-key': apiKey,
          ...(baseUrl && { 'x-base-url': baseUrl }),
          ...(apiPath && { 'x-api-path': apiPath }),
          ...(modelId && { 'x-model-id': modelId }),
        },
        body: JSON.stringify({ keyword: keyword.trim(), difficulty, count: 15 }),
        signal: AbortSignal.timeout(60000),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const now = Date.now();
      const aiCategoryPrefix = `collection:ai-${nanoid(6)}`;

      const contentItems: ContentItem[] = result.items.map((item) => ({
        id: nanoid(),
        title: item.text,
        text: item.text,
        type: item.type,
        category: aiCategoryPrefix,
        tags: result.collection.tags,
        source: 'ai-generated' as const,
        difficulty: (result.collection.difficulty as Difficulty) || difficulty,
        createdAt: now,
        updatedAt: now,
      }));

      await db.contents.bulkAdd(contentItems);

      const collectionId = nanoid();
      const collection: CollectionItem = {
        id: collectionId,
        title: result.collection.title,
        titleZh: result.collection.titleZh,
        description: result.collection.description,
        descriptionZh: result.collection.descriptionZh,
        scenario: result.collection.scenario,
        category: result.collection.category,
        difficulty: (result.collection.difficulty as Difficulty) || difficulty,
        icon: result.collection.icon,
        itemIds: contentItems.map((c) => c.id),
        tags: result.collection.tags,
        source: 'ai-generated',
        createdAt: now,
        updatedAt: now,
      };

      await addCollection(collection);
      router.push(`/library/collections/${collection.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div>
        <h1 className="text-2xl font-bold font-[var(--font-poppins)] text-indigo-900 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-indigo-500" />
          AI Generate Collection
        </h1>
        <p className="text-indigo-500 mt-1 text-sm">
          Enter a scenario keyword to generate a collection of phrases and sentences for practice.
        </p>
      </div>

      {!isConfigured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Please configure an AI provider in Settings first.
        </div>
      )}

      <Card className="bg-white/70 backdrop-blur-sm border-indigo-100">
        <CardContent className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Scenario Keyword</label>
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. 看医生, ordering coffee, job interview..."
              className="bg-white border-indigo-200"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !generating) handleGenerate();
              }}
              disabled={generating}
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {exampleKeywords.map((ex) => (
                <button
                  type="button"
                  key={ex.keyword}
                  onClick={() => setKeyword(ex.keyword)}
                  className="text-xs px-2.5 py-1 rounded-full border border-indigo-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Difficulty</label>
            <div className="flex gap-2">
              {difficultyOptions.map((d) => (
                <Button
                  key={d}
                  type="button"
                  variant={difficulty === d ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDifficulty(d)}
                  className={cn(
                    'capitalize cursor-pointer',
                    difficulty === d ? 'bg-indigo-600' : 'border-indigo-200 text-indigo-600',
                  )}
                >
                  {d}
                </Button>
              ))}
            </div>
          </div>

          <Button
            onClick={() => void handleGenerate()}
            disabled={!keyword.trim() || generating || !isConfigured}
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
                Generate Collection
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <div className="space-y-4">
          <Card className="bg-white/70 backdrop-blur-sm border-indigo-100">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{result.collection.icon}</span>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-indigo-900">{result.collection.title}</h2>
                  <p className="text-indigo-500 text-sm">{result.collection.titleZh}</p>
                  <p className="text-sm text-slate-500 mt-2">{result.collection.description}</p>
                  <p className="text-sm text-slate-400">{result.collection.descriptionZh}</p>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-600 capitalize">
                      {result.collection.difficulty}
                    </Badge>
                    <Badge variant="outline" className="border-indigo-200 text-indigo-400">
                      {result.items.length} items
                    </Badge>
                    {result.collection.tags.slice(0, 5).map((tag) => (
                      <Badge key={tag} variant="outline" className="border-slate-200 text-slate-400 text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-1.5">
            {result.items.map((item, i) => (
              <div
                key={item.text ? `${item.text}-${i}` : i}
                className="flex items-center gap-3 bg-white/70 backdrop-blur-sm rounded-lg border border-indigo-100 px-4 py-3"
              >
                <span className="text-xs font-medium text-slate-400 w-5 text-right shrink-0">{i + 1}</span>
                <p className="text-sm text-indigo-900 flex-1">{item.text}</p>
                <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-400 shrink-0">
                  {item.type}
                </Badge>
              </div>
            ))}
          </div>

          <Button
            onClick={() => void handleSave()}
            disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save to Library'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

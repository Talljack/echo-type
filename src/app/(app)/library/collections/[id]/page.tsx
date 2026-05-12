'use client';

import { ArrowLeft, BookOpen, Headphones, Mic, PenTool } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCollectionStore } from '@/stores/collection-store';
import { useContentStore } from '@/stores/content-store';
import { useShadowReadingStore } from '@/stores/shadow-reading-store';
import type { ContentItem } from '@/types/content';

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-amber-100 text-amber-700',
  advanced: 'bg-red-100 text-red-700',
};

export default function CollectionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const collections = useCollectionStore((s) => s.collections);
  const collectionsLoading = useCollectionStore((s) => s.loading);
  const loadCollections = useCollectionStore((s) => s.loadCollections);
  const getCollectionItems = useCollectionStore((s) => s.getCollectionItems);
  const setActiveContentId = useContentStore((s) => s.setActiveContentId);
  const shadowReadingEnabled = useShadowReadingStore((s) => s.enabled);
  const startShadowSession = useShadowReadingStore((s) => s.startSession);

  const [items, setItems] = useState<ContentItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);

  const id = typeof params?.id === 'string' ? params.id : '';

  const collection = useMemo(() => (id ? collections.find((c) => c.id === id) : undefined), [collections, id]);

  const handleSetActive = (contentId: string) => {
    if (shadowReadingEnabled) {
      const item = items.find((i) => i.id === contentId);
      startShadowSession(contentId, item?.title ?? '');
      setActiveContentId(contentId);
    }
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    void (async () => {
      setItemsLoading(true);
      await loadCollections();
      if (cancelled || !id) return;
      const result = await getCollectionItems(id);
      if (!cancelled) {
        setItems(result);
        setItemsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getCollectionItems, id, loadCollections]);

  const showNotFound = !collectionsLoading && !itemsLoading && !collection;

  if (showNotFound) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-slate-500">Collection not found.</p>
        <Link href="/library">
          <Button variant="outline" className="mt-4">
            Back to Library
          </Button>
        </Link>
      </div>
    );
  }

  const pageBusy = collectionsLoading || itemsLoading;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Library
      </button>

      {collection && (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-indigo-100 p-6">
          <div className="flex items-start gap-4">
            <span className="text-4xl">{collection.icon}</span>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold font-[var(--font-poppins)] text-indigo-900">{collection.title}</h1>
              <p className="text-indigo-500 mt-0.5">{collection.titleZh}</p>
              <p className="text-sm text-slate-500 mt-2">{collection.description}</p>
              <p className="text-sm text-slate-400 mt-0.5">{collection.descriptionZh}</p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Badge className={difficultyColors[collection.difficulty]} variant="secondary">
                  {collection.difficulty}
                </Badge>
                <Badge variant="outline" className="border-indigo-200 text-indigo-400">
                  {collection.itemIds.length} items
                </Badge>
                <Badge variant="outline" className="border-slate-200 text-slate-400">
                  {collection.source}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}

      {pageBusy ? (
        <div className="text-center py-12 text-indigo-400">Loading...</div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <Card key={item.id} className="bg-white/70 backdrop-blur-sm border-indigo-100">
              <CardContent className="flex items-center gap-4 p-4">
                <span className="text-xs font-medium text-slate-400 w-6 text-right shrink-0">{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-indigo-900">{item.text}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-400">
                      {item.type}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Link href={`/listen/${item.id}`} onClick={() => handleSetActive(item.id)}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-indigo-400 hover:text-indigo-600 cursor-pointer"
                    >
                      <Headphones className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                  <Link href={`/read/${item.id}`} onClick={() => handleSetActive(item.id)}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-indigo-400 hover:text-indigo-600 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                  <Link href={`/speak?text=${encodeURIComponent(item.text)}`}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-indigo-400 hover:text-indigo-600 cursor-pointer"
                    >
                      <Mic className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                  <Link href={`/write/${item.id}`} onClick={() => handleSetActive(item.id)}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-indigo-400 hover:text-indigo-600 cursor-pointer"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

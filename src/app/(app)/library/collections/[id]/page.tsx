'use client';

import { ArrowDown, ArrowLeft, ArrowUp, BookOpen, Headphones, Mic, Pencil, PenTool, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { reportNativeQAState } from '@/lib/tauri';
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
  const ensureBuiltinCollections = useCollectionStore((s) => s.ensureBuiltinCollections);
  const getCollectionItems = useCollectionStore((s) => s.getCollectionItems);
  const updateCollection = useCollectionStore((s) => s.updateCollection);
  const deleteCollection = useCollectionStore((s) => s.deleteCollection);
  const setActiveContentId = useContentStore((s) => s.setActiveContentId);
  const shadowReadingEnabled = useShadowReadingStore((s) => s.enabled);
  const startShadowSession = useShadowReadingStore((s) => s.startSession);

  const [bootstrapReady, setBootstrapReady] = useState(false);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const id = typeof params?.id === 'string' ? params.id : '';

  const collection = useMemo(() => (id ? collections.find((c) => c.id === id) : undefined), [collections, id]);

  const handleSetActive = (contentId: string) => {
    if (shadowReadingEnabled) {
      const item = items.find((i) => i.id === contentId);
      startShadowSession(contentId, item?.title ?? '');
      setActiveContentId(contentId);
    }
  };

  const moveItem = async (index: number, direction: -1 | 1) => {
    if (!collection || collection.source === 'builtin') return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const nextItems = [...items];
    [nextItems[index], nextItems[nextIndex]] = [nextItems[nextIndex], nextItems[index]];
    setItems(nextItems);
    await updateCollection(collection.id, { itemIds: nextItems.map((item) => item.id) });
  };

  const removeItem = async (contentId: string) => {
    if (!collection || collection.source === 'builtin') return;
    const itemIds = collection.itemIds.filter((id) => id !== contentId);
    await updateCollection(collection.id, { itemIds });
    setItems((current) => current.filter((item) => item.id !== contentId));
  };

  const removeCollection = async () => {
    if (!collection || collection.source === 'builtin') return;
    await deleteCollection(collection.id);
    router.replace('/library');
  };

  const editCollection = async () => {
    if (!collection || collection.source === 'builtin') return;
    const title = window.prompt('Collection name', collection.title)?.trim();
    if (!title) return;
    const description = window.prompt('Collection description', collection.description);
    await updateCollection(collection.id, {
      title,
      titleZh: title,
      description: description?.trim() || collection.description,
      descriptionZh: description?.trim() || collection.descriptionZh,
    });
  };

  useEffect(() => {
    const markReady = () => setBootstrapReady(true);
    if (typeof document !== 'undefined' && document.querySelector('[data-seeded="true"]')) {
      setBootstrapReady(true);
    }
    window.addEventListener('echotype:bootstrap-ready', markReady);
    return () => {
      window.removeEventListener('echotype:bootstrap-ready', markReady);
    };
  }, []);

  useEffect(() => {
    if (!id || !bootstrapReady) return;
    let cancelled = false;

    void (async () => {
      setItemsLoading(true);
      setLoadError(false);
      try {
        await ensureBuiltinCollections();
        if (cancelled || !id) return;
        const result = await getCollectionItems(id);
        if (!cancelled) {
          setItems(result);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setLoadError(true);
        }
      } finally {
        if (!cancelled) {
          setItemsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bootstrapReady, ensureBuiltinCollections, getCollectionItems, id]);

  useEffect(() => {
    reportNativeQAState({
      page: 'library-collection-detail',
      collectionId: id,
      loading: collectionsLoading || itemsLoading,
      hasCollection: Boolean(collection),
      itemCount: items.length,
    });
  }, [collection, collectionsLoading, id, items.length, itemsLoading]);

  const showNotFound = !loadError && !collectionsLoading && !itemsLoading && !collection;

  if (loadError) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-slate-500">Unable to load this collection.</p>
        <Link href="/library">
          <Button variant="outline" className="mt-4">
            Back to Library
          </Button>
        </Link>
      </div>
    );
  }

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
        aria-label="Back to library from collection detail"
        data-testid="library-collection-detail-back"
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
                {collection.source !== 'builtin' && (
                  <div className="ml-auto flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => void editCollection()}>
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void removeCollection()}
                      className="border-red-200 text-red-600"
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Delete collection
                    </Button>
                  </div>
                )}
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
                  {collection?.source !== 'builtin' && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={index === 0}
                        onClick={() => void moveItem(index, -1)}
                        className="h-7 w-7"
                        aria-label={`Move collection item ${index + 1} up`}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={index === items.length - 1}
                        onClick={() => void moveItem(index, 1)}
                        className="h-7 w-7"
                        aria-label={`Move collection item ${index + 1} down`}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void removeItem(item.id)}
                        className="h-7 w-7 text-red-400"
                        aria-label={`Remove collection item ${index + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                  <Link href={`/listen/${item.id}`} onClick={() => handleSetActive(item.id)}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-indigo-400 hover:text-indigo-600 cursor-pointer"
                      aria-label={`Collection item ${index + 1} Listen`}
                    >
                      <Headphones className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                  <Link href={`/read/${item.id}`} onClick={() => handleSetActive(item.id)}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-indigo-400 hover:text-indigo-600 cursor-pointer"
                      aria-label={`Collection item ${index + 1} Read`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                  <Link href={`/speak?text=${encodeURIComponent(item.text)}`}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-indigo-400 hover:text-indigo-600 cursor-pointer"
                      aria-label={`Collection item ${index + 1} Speak`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                  <Link href={`/write/${item.id}`} onClick={() => handleSetActive(item.id)}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-indigo-400 hover:text-indigo-600 cursor-pointer"
                      aria-label={`Collection item ${index + 1} Write`}
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

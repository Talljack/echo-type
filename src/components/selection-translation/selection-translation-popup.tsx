'use client';

import { Check, Copy, Headphones, Volume2, X } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useRouter } from 'next/navigation';
import { forwardRef, useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';
import { useContentStore } from '@/stores/content-store';
import { useFavoriteStore } from '@/stores/favorite-store';
import { useTTSStore } from '@/stores/tts-store';
import type { FavoriteType, RelatedData } from '@/types/favorite';
import { RelatedRecommendations } from './related-recommendations';
import { TranslationContent } from './translation-content';

interface SelectionInfo {
  text: string;
  type: FavoriteType;
  context?: string;
  rect: DOMRect;
  sourceModule?: string;
  sourceContentId?: string;
}

interface TranslationResult {
  translation: string;
  pronunciation?: string;
  related?: RelatedData;
}

interface Props {
  selection: SelectionInfo;
  result: TranslationResult | null;
  isLoading: boolean;
  error: string | null;
  onDismiss: () => void;
  onTranslateRelated: (word: string) => void;
}

export const SelectionTranslationPopup = forwardRef<HTMLDivElement, Props>(
  ({ selection, result, isLoading, error, onDismiss, onTranslateRelated }, ref) => {
    const [copied, setCopied] = useState(false);
    const isFavorited = useFavoriteStore((s) => s.isFavorited);
    const addFavorite = useFavoriteStore((s) => s.addFavorite);
    const removeFavorite = useFavoriteStore((s) => s.removeFavorite);
    const getFavoriteByText = useFavoriteStore((s) => s.getFavoriteByText);
    const folders = useFavoriteStore((s) => s.folders);
    const targetLang = useTTSStore((s) => s.targetLang);
    const [selectedFolderId, setSelectedFolderId] = useState('default');
    const router = useRouter();

    const alreadyFavorited = isFavorited(selection.text);

    // Position calculation
    const position = useMemo(() => {
      const { rect } = selection;
      const popupWidth = Math.min(340, window.innerWidth - 24);
      const margin = 12;
      const gap = 8;

      let top = rect.bottom + gap;
      let left = rect.left + rect.width / 2 - popupWidth / 2;

      // Adjust if below viewport
      if (top + 400 > window.innerHeight) {
        top = rect.top - gap - 200;
      }

      // Clamp horizontal
      left = Math.max(margin, Math.min(left, window.innerWidth - popupWidth - margin));

      return { top, left, width: popupWidth };
    }, [selection]);

    const handleCopy = useCallback(() => {
      const copyText = result ? `${selection.text}\n${result.translation}` : selection.text;
      navigator.clipboard.writeText(copyText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    }, [selection.text, result]);

    const handleTTS = useCallback(() => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(selection.text);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
      }
    }, [selection.text]);

    const handleListen = useCallback(async () => {
      // Create a temporary content item and navigate to listen page
      const id = nanoid();
      const now = Date.now();
      await db.contents.add({
        id,
        title: selection.text,
        text: selection.context || selection.text,
        type: selection.type === 'sentence' ? 'sentence' : selection.type === 'phrase' ? 'phrase' : 'word',
        tags: [],
        source: 'imported',
        createdAt: now,
        updatedAt: now,
      });
      useContentStore.getState().loadContents();
      onDismiss();
      router.push(`/listen/${id}`);
    }, [selection, onDismiss, router]);

    const handleFavorite = useCallback(async () => {
      if (alreadyFavorited) {
        const existing = getFavoriteByText(selection.text);
        if (existing) await removeFavorite(existing.id);
      } else if (result) {
        await addFavorite({
          text: selection.text,
          translation: result.translation,
          type: selection.type,
          folderId: selectedFolderId,
          sourceContentId: selection.sourceContentId,
          sourceModule: selection.sourceModule as any,
          context: selection.context,
          targetLang,
          pronunciation: result.pronunciation,
          related: result.related,
        });
      }
    }, [
      alreadyFavorited,
      selection,
      result,
      selectedFolderId,
      targetLang,
      addFavorite,
      removeFavorite,
      getFavoriteByText,
    ]);

    const typeBadge: Record<FavoriteType, { label: string; color: string }> = {
      word: { label: '单词', color: 'bg-blue-100 text-blue-700' },
      phrase: { label: '短语', color: 'bg-purple-100 text-purple-700' },
      sentence: { label: '句子', color: 'bg-emerald-100 text-emerald-700' },
    };

    const badge = typeBadge[selection.type];

    return createPortal(
      <div
        ref={ref}
        role="dialog"
        aria-label="Translation popup"
        className="fixed z-[9999] animate-in fade-in slide-in-from-bottom-2 duration-200"
        style={{ top: position.top, left: position.left, width: position.width }}
        onMouseDown={(e) => e.preventDefault()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        <div className="rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden max-h-[400px] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', badge.color)}>{badge.label}</span>
              <span className="text-sm font-medium text-slate-900 truncate">{selection.text}</span>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleTTS} aria-label="Speak">
                <Volume2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleListen} aria-label="Listen">
                <Headphones className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy} aria-label="Copy">
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDismiss} aria-label="Close">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Body */}
          <div className="px-3 py-2.5">
            {error && <p className="text-sm text-red-500">{error}</p>}
            {isLoading && !result && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" />
                Translating...
              </div>
            )}
            {result && (
              <TranslationContent
                type={selection.type}
                text={selection.text}
                translation={result.translation}
                pronunciation={result.pronunciation}
                context={selection.context}
              />
            )}
          </div>

          {/* Related recommendations */}
          {result?.related && (
            <RelatedRecommendations type={selection.type} related={result.related} onSelect={onTranslateRelated} />
          )}

          {/* Footer */}
          {result && (
            <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-100 bg-slate-50/30">
              <Button
                variant={alreadyFavorited ? 'default' : 'outline'}
                size="sm"
                className={cn('h-7 text-xs', alreadyFavorited && 'bg-green-500 hover:bg-green-600')}
                onClick={handleFavorite}
              >
                {alreadyFavorited ? '✓ 已收藏' : '♡ 收藏'}
              </Button>
              {!alreadyFavorited && (
                <select
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  className="h-7 text-xs border rounded px-1.5 bg-white text-slate-600"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.emoji} {f.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      </div>,
      document.body,
    );
  },
);

SelectionTranslationPopup.displayName = 'SelectionTranslationPopup';

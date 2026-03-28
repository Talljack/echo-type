'use client';

import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { PROVIDER_REGISTRY } from '@/lib/providers';
import { buildSelectionTextPayload } from '@/lib/selection-translation-text';
import { detectSelectionType, normalizeText } from '@/lib/text-normalize';
import { useContentStore } from '@/stores/content-store';
import { useFavoriteStore } from '@/stores/favorite-store';
import { useProviderStore } from '@/stores/provider-store';
import { useShortcutStore } from '@/stores/shortcut-store';
import { useTTSStore } from '@/stores/tts-store';
import type { FavoriteType, RelatedData } from '@/types/favorite';
import { SelectionTranslationPopup } from './selection-translation-popup';

interface TranslationResult {
  translation: string;
  itemTranslation?: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  pronunciation?: string;
  related?: RelatedData;
}

interface SelectionState {
  selectionId: string;
  text: string;
  displayText: string;
  speechText: string;
  favoriteText: string;
  type: FavoriteType;
  context?: string;
  rect: DOMRect;
  sourceModule?: string;
  sourceContentId?: string;
}

type SelectionPayload = Omit<SelectionState, 'selectionId'>;

interface SelectionTranslationContextValue {
  dismiss: () => void;
}

const SelectionTranslationContext = createContext<SelectionTranslationContextValue>({
  dismiss: () => {},
});

export function useSelectionTranslation() {
  return useContext(SelectionTranslationContext);
}

// Module-level translation cache (session-lived)
const translationCache = new Map<string, TranslationResult>();

const EXCLUSION_SELECTORS = 'input, textarea, select, [contenteditable], [data-no-selection-translate]';

function getModuleFromPathname(pathname: string): string | undefined {
  const match = pathname.match(/^\/(listen|speak|read|write|library)/);
  return match?.[1];
}

function extractContextSentence(selection: Selection): string | undefined {
  const range = selection.getRangeAt(0);
  const container = range.startContainer;
  if (container.nodeType !== Node.TEXT_NODE) return undefined;
  const fullText = container.textContent || '';
  // Find sentence boundaries around selection
  const selectedText = selection.toString().trim();
  const idx = fullText.indexOf(selectedText);
  if (idx === -1) return fullText.trim();
  // Look backward for sentence start
  let start = idx;
  while (start > 0 && !/[.!?]/.test(fullText[start - 1]!)) start--;
  // Look forward for sentence end
  let end = idx + selectedText.length;
  while (end < fullText.length && !/[.!?]/.test(fullText[end]!)) end++;
  if (end < fullText.length) end++; // include the punctuation
  return fullText.slice(start, end).trim();
}

export function SelectionTranslationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [selectionState, setSelectionState] = useState<SelectionState | null>(null);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController>(undefined);
  const selectionIdRef = useRef(0);

  const enabled = useFavoriteStore((s) => s.selectionTranslateEnabled);
  const targetLang = useTTSStore((s) => s.targetLang);
  const activeProviderId = useProviderStore((s) => s.activeProviderId);
  const activeApiKey = useProviderStore((s) => {
    const config = s.providers[s.activeProviderId];
    return config?.auth.apiKey || config?.auth.accessToken || '';
  });
  const providerConfigs = useProviderStore((s) => s.providers);

  const createSelectionState = useCallback((selection: Omit<SelectionState, 'selectionId'>): SelectionState => {
    selectionIdRef.current += 1;
    return {
      ...selection,
      selectionId: `${selectionIdRef.current}-${Date.now()}`,
    };
  }, []);

  const dismiss = useCallback(() => {
    setSelectionState(null);
    setResult(null);
    setError(null);
    setIsLoading(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
  }, []);

  // Dismiss on route change
  useEffect(() => {
    dismiss();
  }, [pathname, dismiss]);

  // Translate function: free Google Translate first, then AI enrichment
  const translate = useCallback(
    async (selection: SelectionPayload) => {
      const { text, type, context } = selection;
      const cacheKey = `${normalizeText(text)}::${targetLang}::${normalizeText(context ?? '')}`;
      const cached = translationCache.get(cacheKey);
      if (cached) {
        setResult(cached);
        setIsLoading(false);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);
      setError(null);

      try {
        // Phase 1: Free Google Translate (fast, no API key needed)
        const freeRes = await fetch('/api/translate/free', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, targetLang }),
          signal: controller.signal,
        });

        if (freeRes.ok) {
          const freeData = await freeRes.json();
          const basicResult: TranslationResult = { translation: freeData.translation };
          setResult(basicResult);
          setIsLoading(false);

          // Phase 2: AI enrichment (pronunciation, related words) — background, non-blocking
          if (activeApiKey) {
            try {
              const headerKey = PROVIDER_REGISTRY[activeProviderId]?.headerKey;
              const headers: Record<string, string> = { 'Content-Type': 'application/json' };
              if (activeApiKey && headerKey) headers[headerKey] = activeApiKey;

              const aiRes = await fetch('/api/translate', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  text,
                  context,
                  targetLang,
                  provider: activeProviderId,
                  providerConfigs,
                  includeRelated: true,
                  selectionType: type,
                }),
                signal: controller.signal,
              });

              if (aiRes.ok) {
                const aiData = await aiRes.json();
                const enrichedResult: TranslationResult = {
                  translation: aiData.translation || freeData.translation,
                  itemTranslation: aiData.itemTranslation || aiData.translation || freeData.translation,
                  exampleSentence: aiData.exampleSentence,
                  exampleTranslation: aiData.exampleTranslation,
                  pronunciation: aiData.pronunciation,
                  related: aiData.related,
                };
                translationCache.set(cacheKey, enrichedResult);
                setResult(enrichedResult);
              } else {
                // AI failed but we already have free translation — cache it
                translationCache.set(cacheKey, basicResult);
              }
            } catch {
              // AI enrichment failed silently, free translation already shown
              translationCache.set(cacheKey, basicResult);
            }
          } else {
            // No API key configured — just use free translation
            translationCache.set(cacheKey, basicResult);
          }

          // Update lookup history
          const finalResult = translationCache.get(cacheKey) || basicResult;
          updateLookupHistory(text, finalResult.translation, type, targetLang, getModuleFromPathname(pathname));
          return;
        }

        // Free translation also failed — show error
        const freeErr = await freeRes.json().catch(() => ({}));
        setError(freeErr.error || 'Translation failed');
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError('Network error');
      } finally {
        setIsLoading(false);
      }
    },
    [targetLang, activeProviderId, activeApiKey, providerConfigs, pathname],
  );

  // Mouseup handler
  useEffect(() => {
    if (!enabled) return;

    const handleMouseUp = (e: MouseEvent) => {
      // Check if click is inside popup
      if (popupRef.current?.contains(e.target as Node)) return;

      // Check exclusion zones
      const target = e.target instanceof HTMLElement ? e.target : (e.target as Node).parentElement;
      if (target?.closest(EXCLUSION_SELECTORS)) {
        return;
      }

      // Check if shortcuts are paused (dialog/palette open)
      if (useShortcutStore.getState().isPaused) return;

      const selection = document.getSelection();
      if (!selection || selection.isCollapsed) {
        dismiss();
        return;
      }

      const text = selection.toString().trim();
      if (!text || text.length > 500) {
        dismiss();
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const type = detectSelectionType(text);
      const context = type !== 'sentence' ? extractContextSentence(selection) : undefined;
      const sourceModule = getModuleFromPathname(pathname);
      const sourceContentId = useContentStore.getState().activeContentId ?? undefined;
      const payload = buildSelectionTextPayload(context, text);

      setSelectionState(
        createSelectionState({
          text,
          displayText: payload.displayText,
          speechText: payload.speechText,
          favoriteText: payload.favoriteText,
          type,
          context,
          rect,
          sourceModule,
          sourceContentId,
        }),
      );
      setResult(null);
      setError(null);

      // Debounce the translation call
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        translate({
          text,
          displayText: payload.displayText,
          speechText: payload.speechText,
          favoriteText: payload.favoriteText,
          type,
          context,
          rect,
          sourceModule,
          sourceContentId,
        });
      }, 300);
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [enabled, pathname, dismiss, translate, createSelectionState]);

  // Esc to dismiss
  useEffect(() => {
    if (!selectionState) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectionState, dismiss]);

  // Scroll repositioning
  useEffect(() => {
    if (!selectionState) return;
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    const handleScroll = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        const selection = document.getSelection();
        if (!selection || selection.isCollapsed) {
          dismiss();
          return;
        }
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelectionState((prev) => (prev ? { ...prev, rect } : null));
      }, 100);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [selectionState, dismiss]);

  const contextValue = { dismiss };

  return (
    <SelectionTranslationContext.Provider value={contextValue}>
      {children}
      {selectionState && (
        <SelectionTranslationPopup
          ref={popupRef}
          selection={selectionState}
          result={result}
          isLoading={isLoading}
          error={error}
          onDismiss={dismiss}
          onTranslateRelated={(word) => {
            const type = detectSelectionType(word);
            const rect = selectionState.rect;
            const payload = buildSelectionTextPayload(undefined, word);
            setSelectionState(
              createSelectionState({
                text: word,
                displayText: payload.displayText,
                speechText: payload.speechText,
                favoriteText: payload.favoriteText,
                type,
                rect,
                sourceModule: selectionState.sourceModule,
                sourceContentId: selectionState.sourceContentId,
              }),
            );
            setResult(null);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            translate({
              text: word,
              displayText: payload.displayText,
              speechText: payload.speechText,
              favoriteText: payload.favoriteText,
              type,
              rect,
              sourceModule: selectionState.sourceModule,
              sourceContentId: selectionState.sourceContentId,
            });
          }}
        />
      )}
    </SelectionTranslationContext.Provider>
  );
}

async function updateLookupHistory(
  text: string,
  translation: string,
  type: FavoriteType,
  targetLang: string,
  sourceModule?: string,
) {
  try {
    const { db } = await import('@/lib/db');
    const normalized = normalizeText(text);
    const existing = await db.lookupHistory.get(normalized);
    if (existing) {
      await db.lookupHistory.update(normalized, {
        count: existing.count + 1,
        lastLookedUp: Date.now(),
      });
    } else {
      await db.lookupHistory.add({ text: normalized, count: 1, lastLookedUp: Date.now() });
    }
    // Check if auto-collection threshold is met
    try {
      const { checkLookupAutoCollect } = await import('@/lib/auto-collect');
      await checkLookupAutoCollect(text, translation, type, targetLang, sourceModule);
    } catch {
      // auto-collect module not yet available
    }
  } catch {
    // lookup history update failed silently
  }
}

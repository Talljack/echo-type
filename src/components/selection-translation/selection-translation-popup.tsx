'use client';

import { Check, ChevronDown, Copy, Mic, MicOff, Plus, Volume2, X } from 'lucide-react';
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTTS } from '@/hooks/use-tts';
import { getFavoriteSelectionAction } from '@/lib/favorite-selection-action';
import { IS_IOS_NATIVE_HOST, IS_TAURI } from '@/lib/tauri';
import { normalizeText } from '@/lib/text-normalize';
import { cn } from '@/lib/utils';
import { useFavoriteStore } from '@/stores/favorite-store';
import { useTTSStore } from '@/stores/tts-store';
import type { FavoriteType, RelatedData } from '@/types/favorite';
import { RelatedRecommendations } from './related-recommendations';
import { TranslationContent } from './translation-content';

interface SelectionInfo {
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

interface TranslationResult {
  translation: string;
  itemTranslation?: string;
  exampleSentence?: string;
  exampleTranslation?: string;
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
    const [isRecording, setIsRecording] = useState(false);
    const [spokenText, setSpokenText] = useState<string | null>(null);
    const [favoriteError, setFavoriteError] = useState<string | null>(null);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [isSavingFolder, setIsSavingFolder] = useState(false);
    const favoriteFooterRef = useRef<HTMLDivElement>(null);
    const favorites = useFavoriteStore((s) => s.favorites);
    const addFavorite = useFavoriteStore((s) => s.addFavorite);
    const removeFavorite = useFavoriteStore((s) => s.removeFavorite);
    const updateFavorite = useFavoriteStore((s) => s.updateFavorite);
    const addFolder = useFavoriteStore((s) => s.addFolder);
    const loadFavorites = useFavoriteStore((s) => s.loadFavorites);
    const isFavoritesLoaded = useFavoriteStore((s) => s.isLoaded);
    const folders = useFavoriteStore((s) => s.folders);
    const activeFolderId = useFavoriteStore((s) => s.activeFolderId);
    const targetLang = useTTSStore((s) => s.targetLang);
    const { speak: speakSelection } = useTTS();
    const [selectedFolderId, setSelectedFolderId] = useState(activeFolderId || 'default');

    const existingFavorite = useMemo(() => {
      const normalized = normalizeText(selection.favoriteText);
      return favorites.find((f) => f.normalizedText === normalized);
    }, [favorites, selection.favoriteText]);
    const favoriteAction = getFavoriteSelectionAction(existingFavorite, selectedFolderId);

    const spokenMatchesFavorite = useMemo(() => {
      if (spokenText === null) return false;
      return normalizeText(spokenText) === normalizeText(selection.favoriteText);
    }, [selection.favoriteText, spokenText]);

    useEffect(() => {
      setFavoriteError(null);
      setCopied(false);
      setSpokenText(null);
      setIsCreatingFolder(false);
      setIsFolderMenuOpen(false);
      setNewFolderName('');
      setSelectedFolderId(activeFolderId || 'default');
    }, [activeFolderId, selection.selectionId]);

    useEffect(() => {
      if (!isFavoritesLoaded) {
        void loadFavorites();
      }
    }, [isFavoritesLoaded, loadFavorites]);

    useEffect(() => {
      if (folders.length === 0) return;
      if (!folders.some((folder) => folder.id === selectedFolderId)) {
        const preferredFolderId =
          activeFolderId && folders.some((folder) => folder.id === activeFolderId) ? activeFolderId : folders[0]!.id;
        setSelectedFolderId(preferredFolderId);
      }
    }, [activeFolderId, folders, selectedFolderId]);

    useEffect(() => {
      if (!isFolderMenuOpen) return;
      const handlePointerDown = (event: PointerEvent) => {
        if (!favoriteFooterRef.current?.contains(event.target as Node)) {
          setIsFolderMenuOpen(false);
        }
      };
      document.addEventListener('pointerdown', handlePointerDown);
      return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, [isFolderMenuOpen]);

    const position = useMemo(() => {
      const { rect } = selection;
      const popupWidth = Math.min(340, window.innerWidth - 24);
      const margin = 12;
      const gap = 8;

      let top = rect.bottom + gap;
      let left = rect.left + rect.width / 2 - popupWidth / 2;

      if (top + 400 > window.innerHeight) {
        top = rect.top - gap - 200;
      }

      left = Math.max(margin, Math.min(left, window.innerWidth - popupWidth - margin));

      return { top, left, width: popupWidth };
    }, [selection]);

    const handleCopy = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        const translatedText = result?.itemTranslation || result?.translation;
        const copyText = translatedText ? `${selection.displayText}\n${translatedText}` : selection.displayText;
        navigator.clipboard.writeText(copyText).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      },
      [selection.displayText, result],
    );

    const handleTTS = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        void speakSelection(selection.speechText);
      },
      [selection.speechText, speakSelection],
    );

    const handleMic = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isRecording) {
          setIsRecording(false);
          return;
        }

        if (
          (IS_TAURI && !IS_IOS_NATIVE_HOST) ||
          (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window))
        ) {
          setSpokenText('Speech recognition not available');
          setIsRecording(false);
          return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setSpokenText(transcript);
          setIsRecording(false);
        };

        recognition.onerror = () => {
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        setSpokenText(null);
        setIsRecording(true);
        recognition.start();
      },
      [isRecording],
    );

    const handleFavorite = useCallback(
      async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsFolderMenuOpen(false);
        setFavoriteError(null);
        if (favoriteAction === 'remove' && existingFavorite) {
          try {
            await removeFavorite(existingFavorite.id);
          } catch (err) {
            setFavoriteError(err instanceof Error ? err.message : 'Failed to remove favorite');
          }
        } else if (favoriteAction === 'move' && existingFavorite) {
          try {
            await updateFavorite(existingFavorite.id, {
              folderId: selectedFolderId,
              autoCollected: false,
            });
          } catch (err) {
            setFavoriteError(err instanceof Error ? err.message : 'Failed to move favorite');
          }
        } else if (result) {
          const translatedText = result.itemTranslation || result.translation;
          try {
            await addFavorite({
              text: selection.favoriteText,
              translation: translatedText,
              type: selection.type,
              folderId: selectedFolderId,
              sourceContentId: selection.sourceContentId,
              sourceModule: selection.sourceModule as any,
              context: selection.context,
              targetLang,
              pronunciation: result.pronunciation,
              related: result.related,
            });
          } catch (err) {
            setFavoriteError(err instanceof Error ? err.message : 'Failed to add favorite');
          }
        }
      },
      [
        favoriteAction,
        existingFavorite,
        selection,
        result,
        selectedFolderId,
        targetLang,
        addFavorite,
        removeFavorite,
        updateFavorite,
      ],
    );

    const handleCreateFolder = useCallback(
      async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const name = newFolderName.trim();
        if (!name) return;
        setIsSavingFolder(true);
        setFavoriteError(null);
        try {
          const maxOrder = Math.max(0, ...folders.map((f) => f.sortOrder));
          const id = await addFolder({ name, emoji: '', sortOrder: maxOrder + 1 });
          setSelectedFolderId(id);
          setIsFolderMenuOpen(false);
          setNewFolderName('');
          setIsCreatingFolder(false);
        } catch (err) {
          setFavoriteError(err instanceof Error ? err.message : 'Failed to create folder');
        } finally {
          setIsSavingFolder(false);
        }
      },
      [addFolder, folders, newFolderName],
    );

    const handleDismiss = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onDismiss();
      },
      [onDismiss],
    );

    const typeBadge: Record<FavoriteType, { label: string; color: string }> = {
      word: { label: '单词', color: 'bg-blue-100 text-blue-700' },
      phrase: { label: '短语', color: 'bg-purple-100 text-purple-700' },
      sentence: { label: '句子', color: 'bg-emerald-100 text-emerald-700' },
    };

    const badge = typeBadge[selection.type];
    const itemTranslation = result?.itemTranslation || result?.translation;
    const exampleSentence = result?.exampleSentence;
    const folderOptions = folders.length === 0 ? [{ id: 'default', name: '默认收藏' }] : folders;
    const selectedFolderName = folderOptions.find((folder) => folder.id === selectedFolderId)?.name ?? '默认收藏';

    return createPortal(
      <div
        ref={ref}
        role="dialog"
        aria-label="Translation popup"
        className="fixed z-[9999] animate-in fade-in slide-in-from-bottom-2 duration-200"
        style={{ top: position.top, left: position.left, width: position.width }}
        onMouseUp={(e) => e.stopPropagation()}
      >
        <div className="rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden max-h-[400px] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', badge.color)}>{badge.label}</span>
              <span className="text-sm font-medium text-slate-900 truncate">{selection.displayText}</span>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleTTS} aria-label="Speak">
                <Volume2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-7 w-7', isRecording && 'text-red-500 bg-red-50')}
                onClick={handleMic}
                aria-label="Record speech"
              >
                {isRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy} aria-label="Copy">
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDismiss} aria-label="Close">
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
            {result && itemTranslation && (
              <TranslationContent
                type={selection.type}
                itemTranslation={itemTranslation}
                exampleSentence={exampleSentence}
                exampleTranslation={result.exampleTranslation}
                pronunciation={result.pronunciation}
              />
            )}
          </div>

          {/* Speech recognition result */}
          {spokenText !== null && (
            <div className="px-3 pb-2">
              <div
                className={cn(
                  'text-xs px-2.5 py-1.5 rounded-lg',
                  spokenMatchesFavorite ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700',
                )}
              >
                <span className="text-slate-400 mr-1">You said:</span>
                {spokenText}
                {spokenMatchesFavorite && ' ✓'}
              </div>
            </div>
          )}

          {/* Recording indicator */}
          {isRecording && (
            <div className="px-3 pb-2">
              <div className="flex items-center gap-2 text-xs text-red-500">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                Listening...
              </div>
            </div>
          )}

          {/* Related recommendations */}
          {result?.related && (
            <RelatedRecommendations type={selection.type} related={result.related} onSelect={onTranslateRelated} />
          )}

          {/* Footer */}
          {result?.translation && (
            <div ref={favoriteFooterRef} className="border-t border-slate-100 bg-slate-50/30 px-3 py-2">
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <label htmlFor="selection-favorite-folder" className="text-[10px] font-medium text-slate-500">
                    收藏到
                  </label>
                  <div className="relative mt-1">
                    <button
                      id="selection-favorite-folder"
                      type="button"
                      aria-label="选择收藏夹"
                      aria-haspopup="true"
                      aria-expanded={isFolderMenuOpen}
                      aria-controls="selection-favorite-folder-list"
                      className="flex h-9 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 text-left text-xs font-medium text-slate-800 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsFolderMenuOpen((value) => !value);
                      }}
                    >
                      <span className="truncate">{selectedFolderName}</span>
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0 border-slate-200 bg-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFolderMenuOpen(false);
                    setIsCreatingFolder((value) => !value);
                  }}
                  aria-label="新建收藏夹"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant={favoriteAction === 'remove' ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'h-9 shrink-0 text-xs',
                    favoriteAction === 'remove' && 'bg-green-500 hover:bg-green-600',
                  )}
                  onClick={handleFavorite}
                >
                  {favoriteAction === 'remove' ? '取消收藏' : favoriteAction === 'move' ? '移动到此收藏夹' : '♡ 收藏'}
                </Button>
              </div>
              {isFolderMenuOpen && (
                <div
                  id="selection-favorite-folder-list"
                  role="group"
                  aria-label="收藏夹"
                  className="mt-2 max-h-36 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
                >
                  {folderOptions.map((folder) => (
                    <button
                      key={folder.id}
                      type="button"
                      aria-pressed={folder.id === selectedFolderId}
                      className={cn(
                        'flex h-8 w-full items-center justify-between rounded-md px-2 text-left text-xs text-slate-700 transition hover:bg-indigo-50',
                        folder.id === selectedFolderId && 'bg-indigo-50 font-semibold text-indigo-700',
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFolderId(folder.id);
                        setIsFolderMenuOpen(false);
                      }}
                    >
                      <span className="truncate">{folder.name}</span>
                      {folder.id === selectedFolderId && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              )}
              {isCreatingFolder && (
                <form className="mt-2 flex gap-2" onSubmit={handleCreateFolder}>
                  <Input
                    aria-label="新收藏夹名称"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="新收藏夹名称"
                    className="h-8 bg-white text-xs"
                    autoFocus
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8 shrink-0 text-xs"
                    disabled={isSavingFolder || !newFolderName.trim()}
                  >
                    创建
                  </Button>
                </form>
              )}
              {favoriteError && <p className="mt-1 text-[11px] leading-4 text-red-500">{favoriteError}</p>}
            </div>
          )}
        </div>
      </div>,
      document.body,
    );
  },
);

SelectionTranslationPopup.displayName = 'SelectionTranslationPopup';

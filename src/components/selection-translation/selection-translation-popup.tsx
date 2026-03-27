'use client';

import { Check, Copy, Mic, MicOff, Volume2, X } from 'lucide-react';
import { forwardRef, useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { IS_TAURI } from '@/lib/tauri';
import { normalizeText } from '@/lib/text-normalize';
import { cn } from '@/lib/utils';
import { useFavoriteStore } from '@/stores/favorite-store';
import { useTTSStore } from '@/stores/tts-store';
import type { FavoriteType, RelatedData } from '@/types/favorite';
import { RelatedRecommendations } from './related-recommendations';
import { TranslationContent } from './translation-content';

interface SelectionInfo {
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
    const favorites = useFavoriteStore((s) => s.favorites);
    const addFavorite = useFavoriteStore((s) => s.addFavorite);
    const removeFavorite = useFavoriteStore((s) => s.removeFavorite);
    const getFavoriteByText = useFavoriteStore((s) => s.getFavoriteByText);
    const folders = useFavoriteStore((s) => s.folders);
    const targetLang = useTTSStore((s) => s.targetLang);
    const [selectedFolderId, setSelectedFolderId] = useState('default');

    const alreadyFavorited = useMemo(() => {
      const normalized = normalizeText(selection.favoriteText);
      return favorites.some((f) => f.normalizedText === normalized);
    }, [favorites, selection.favoriteText]);

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
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(selection.speechText);
          utterance.lang = 'en-US';
          window.speechSynthesis.speak(utterance);
        }
      },
      [selection.speechText],
    );

    const handleMic = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isRecording) {
          setIsRecording(false);
          return;
        }

        if (IS_TAURI || (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window))) {
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
        if (alreadyFavorited) {
          const existing = getFavoriteByText(selection.favoriteText);
          if (existing) await removeFavorite(existing.id);
        } else if (result) {
          const translatedText = result.itemTranslation || result.translation;
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
        }
      },
      [
        alreadyFavorited,
        selection,
        result,
        selectedFolderId,
        targetLang,
        addFavorite,
        removeFavorite,
        getFavoriteByText,
      ],
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
    const exampleSentence = result?.exampleSentence || selection.displayText;

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
                  spokenText.toLowerCase().trim() === selection.speechText.toLowerCase().trim()
                    ? 'bg-green-50 text-green-700'
                    : 'bg-amber-50 text-amber-700',
                )}
              >
                <span className="text-slate-400 mr-1">You said:</span>
                {spokenText}
                {spokenText.toLowerCase().trim() === selection.speechText.toLowerCase().trim() && ' ✓'}
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

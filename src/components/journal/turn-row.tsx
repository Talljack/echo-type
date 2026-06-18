'use client';

import { Check, Languages, Pencil, Star, Trash2, Volume2, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { DialogueTurn } from '@/types/journal';

interface TurnRowProps {
  turn: DialogueTurn;
  onPlay: (text: string) => void;
  onToggleHighlight: () => void;
  onUpdate: (updates: Partial<DialogueTurn>) => void;
  onRemove: () => void;
}

export function TurnRow({ turn, onPlay, onToggleHighlight, onUpdate, onRemove }: TurnRowProps) {
  const speakerLabel = turn.speaker?.trim() || '';
  const isLabeled = speakerLabel.length > 0;
  const [editing, setEditing] = useState(false);
  const [draftSpeaker, setDraftSpeaker] = useState(speakerLabel);
  const [draftText, setDraftText] = useState(turn.text);
  const [draftTranslation, setDraftTranslation] = useState(turn.translation ?? '');
  const [showTranslation, setShowTranslation] = useState(false);

  const saveEdit = () => {
    onUpdate({
      speaker: draftSpeaker.trim() || undefined,
      text: draftText.trim(),
      translation: draftTranslation.trim() || undefined,
    });
    setEditing(false);
  };

  return (
    <div className="flex gap-2.5">
      <div className="max-w-[86%] flex flex-col">
        {editing ? (
          <div className="flex flex-col gap-2 w-72 max-w-full">
            <Input
              value={draftSpeaker}
              onChange={(e) => setDraftSpeaker(e.target.value)}
              placeholder="Label / speaker (optional)"
              className="h-8"
            />
            <Textarea value={draftText} onChange={(e) => setDraftText(e.target.value)} rows={2} placeholder="English" />
            <Textarea
              value={draftTranslation}
              onChange={(e) => setDraftTranslation(e.target.value)}
              rows={1}
              placeholder="Translation (optional)"
            />
            <div className="flex gap-1.5">
              <Button size="xs" onClick={saveEdit}>
                <Check className="w-3 h-3" /> Save
              </Button>
              <Button size="xs" variant="ghost" onClick={() => setEditing(false)}>
                <X className="w-3 h-3" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            {isLabeled && (
              <p className="mb-1 px-1 text-xs font-medium uppercase tracking-wide text-slate-400">{speakerLabel}</p>
            )}
            <div
              className={cn(
                'rounded-2xl px-4 py-2.5 text-sm leading-relaxed relative',
                isLabeled ? 'bg-indigo-50 text-indigo-900' : 'bg-slate-100 text-slate-900',
                turn.highlighted && 'ring-2 ring-amber-400',
              )}
            >
              <span className="whitespace-pre-wrap">{turn.text}</span>
            </div>

            <div className="ml-1 mt-1 flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => onPlay(turn.text)}
                className="h-6 w-6 flex items-center justify-center rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                title="Play"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onToggleHighlight}
                className={cn(
                  'h-6 w-6 flex items-center justify-center rounded-md transition-colors cursor-pointer',
                  turn.highlighted
                    ? 'text-amber-500 bg-amber-50'
                    : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50',
                )}
                title={turn.highlighted ? 'Remove from review' : 'Mark golden sentence (add to review)'}
              >
                <Star className={cn('w-3.5 h-3.5', turn.highlighted && 'fill-amber-400')} />
              </button>
              {turn.translation && (
                <button
                  type="button"
                  onClick={() => setShowTranslation((v) => !v)}
                  className={cn(
                    'h-6 w-6 flex items-center justify-center rounded-md transition-colors cursor-pointer',
                    showTranslation
                      ? 'text-indigo-600 bg-indigo-50'
                      : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50',
                  )}
                  title="Toggle translation"
                >
                  <Languages className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setDraftSpeaker(speakerLabel);
                  setDraftText(turn.text);
                  setDraftTranslation(turn.translation ?? '');
                  setEditing(true);
                }}
                className="h-6 w-6 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="h-6 w-6 flex items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {showTranslation && turn.translation && (
              <p className="mt-0.5 px-2 text-sm text-slate-500">{turn.translation}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

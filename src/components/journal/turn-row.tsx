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
            {isLabeled && <p className="mb-1 px-1 text-xs font-medium text-ink-4">{speakerLabel}</p>}
            <div
              className={cn(
                'rounded-2xl px-4 py-2.5 text-sm leading-relaxed relative',
                isLabeled ? 'bg-brand-soft text-ink' : 'bg-surface-3 text-ink',
                turn.highlighted && 'ring-2 ring-warning',
              )}
            >
              <span className="whitespace-pre-wrap">{turn.text}</span>
            </div>

            <div className="ml-1 mt-1 flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => onPlay(turn.text)}
                className="h-6 w-6 flex items-center justify-center rounded-md text-ink-4 hover:text-brand-ink hover:bg-brand-soft transition-colors cursor-pointer"
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
                    ? 'text-warning bg-warning-soft'
                    : 'text-ink-4 hover:text-warning hover:bg-warning-soft',
                )}
                title={turn.highlighted ? 'Remove from review' : 'Mark golden sentence (add to review)'}
              >
                <Star className={cn('w-3.5 h-3.5', turn.highlighted && 'fill-warning')} />
              </button>
              {turn.translation && (
                <button
                  type="button"
                  onClick={() => setShowTranslation((v) => !v)}
                  className={cn(
                    'h-6 w-6 flex items-center justify-center rounded-md transition-colors cursor-pointer',
                    showTranslation
                      ? 'text-brand-ink bg-brand-soft'
                      : 'text-ink-4 hover:text-brand-ink hover:bg-brand-soft',
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
                className="h-6 w-6 flex items-center justify-center rounded-md text-ink-4 hover:text-ink-2 hover:bg-surface-3 transition-colors cursor-pointer"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="h-6 w-6 flex items-center justify-center rounded-md text-ink-4 hover:text-danger hover:bg-danger-soft transition-colors cursor-pointer"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {showTranslation && turn.translation && (
              <p className="mt-0.5 px-2 text-sm text-ink-3">{turn.translation}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

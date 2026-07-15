'use client';

import { BookOpen, Headphones, Heart, MessageCircle, Pencil, Save, Trash2, Volume2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTTS } from '@/hooks/use-tts';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useJournalStore } from '@/stores/journal-store';
import type { UsefulPhrase } from '@/types/journal';

export function UsefulPhraseRow({ phrase }: { phrase: UsefulPhrase }) {
  const router = useRouter();
  const { speak } = useTTS();
  const { messages: t } = useI18n('journal');
  const updatePhrase = useJournalStore((s) => s.updatePhrase);
  const deletePhrase = useJournalStore((s) => s.deletePhrase);
  const toggleHighlight = useJournalStore((s) => s.toggleHighlight);
  const materializePhraseForPractice = useJournalStore((s) => s.materializePhraseForPractice);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(phrase.text);
  const [translation, setTranslation] = useState(phrase.translation ?? '');

  const practice = async (module: 'listen' | 'speak' | 'read' | 'write') => {
    const contentId = await materializePhraseForPractice(phrase.journalId, phrase.turnId);
    if (contentId) router.push(`/${module}/${contentId}`);
  };

  const save = async () => {
    if (!text.trim()) return;
    await updatePhrase(phrase.journalId, phrase.turnId, {
      text: text.trim(),
      translation: translation.trim() || undefined,
    });
    setEditing(false);
  };

  return (
    <article className="group py-3" data-testid={`useful-phrase-${phrase.turnId}`}>
      {editing ? (
        <div className="space-y-2">
          <Input
            aria-label={t.editPhrase.replace('{{phrase}}', phrase.text)}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Input
            aria-label={t.editTranslation}
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            placeholder={t.translation}
          />
          <Button size="sm" onClick={() => void save()}>
            <Save className="h-4 w-4" /> {t.save}
          </Button>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-900">{phrase.text}</p>
            {phrase.translation && <p className="mt-0.5 text-sm text-slate-500">{phrase.translation}</p>}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
              {(phrase.context || phrase.sourceTitle) && <span>{phrase.context || phrase.sourceTitle}</span>}
              {phrase.tags.map((tag) => (
                <span key={tag} className="rounded bg-slate-100 px-1.5 py-0.5">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-0.5 sm:max-w-none max-w-28">
            <IconButton label={t.playPhrase.replace('{{phrase}}', phrase.text)} onClick={() => void speak(phrase.text)}>
              <Volume2 />
            </IconButton>
            <IconButton
              label={(phrase.favoriteId ? t.removeFavorite : t.addFavorite).replace('{{phrase}}', phrase.text)}
              onClick={() => void toggleHighlight(phrase.journalId, phrase.turnId)}
              active={Boolean(phrase.favoriteId)}
            >
              <Heart />
            </IconButton>
            <IconButton label={t.editPhrase.replace('{{phrase}}', phrase.text)} onClick={() => setEditing(true)}>
              <Pencil />
            </IconButton>
            <IconButton
              label={t.deletePhrase.replace('{{phrase}}', phrase.text)}
              onClick={() => void deletePhrase(phrase.journalId, phrase.turnId)}
              danger
            >
              <Trash2 />
            </IconButton>
          </div>
        </div>
      )}
      {!editing && (
        <div className="mt-2 flex flex-wrap gap-1">
          <PracticeButton label={t.listen} onClick={() => void practice('listen')}>
            <Headphones />
          </PracticeButton>
          <PracticeButton label={t.speak} onClick={() => void practice('speak')}>
            <MessageCircle />
          </PracticeButton>
          <PracticeButton label={t.read} onClick={() => void practice('read')}>
            <BookOpen />
          </PracticeButton>
          <PracticeButton label={t.write} onClick={() => void practice('write')}>
            <Pencil />
          </PracticeButton>
        </div>
      )}
    </article>
  );
}

function IconButton({
  label,
  onClick,
  active,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  children: React.ReactElement;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`h-8 w-8 ${active ? 'text-rose-500' : danger ? 'text-red-500' : 'text-slate-500'}`}
    >
      {children}
    </Button>
  );
}

function PracticeButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactElement;
}) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} className="h-7 px-2 text-xs">
      {children}
      {label}
    </Button>
  );
}

'use client';

import { ArrowLeft, BookOpen, Headphones, Mic, PenTool, Plus, Star } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { TurnRow } from '@/components/journal/turn-row';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTTS } from '@/hooks/use-tts';
import { journalContentCategory, useJournalStore } from '@/stores/journal-store';

interface JournalDetailProps {
  journalId: string;
}

export function JournalDetail({ journalId }: JournalDetailProps) {
  const router = useRouter();
  const { speak } = useTTS();
  const journal = useJournalStore((s) => s.journals.find((j) => j.id === journalId));
  const loaded = useJournalStore((s) => s.loaded);
  const { updateJournal, deleteJournal, addTurn, updateTurn, removeTurn, toggleHighlight, materializeForPractice } =
    useJournalStore();

  // Draft state for the "add turn" composer.
  const [speaker, setSpeaker] = useState('');
  const [text, setText] = useState('');
  const [translation, setTranslation] = useState('');
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (journal) setTagInput(journal.tags.join(', '));
  }, [journal]);

  const highlightCount = useMemo(() => journal?.turns.filter((t) => t.highlighted).length ?? 0, [journal?.turns]);

  if (!journal) {
    return (
      <div className="p-8 text-center text-slate-500">
        {loaded ? 'Journal not found.' : 'Loading…'}
        <div className="mt-4">
          <Link href="/journal" className="text-indigo-600 hover:underline">
            Back to Practice Notebook
          </Link>
        </div>
      </div>
    );
  }

  const handleAddTurn = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    await addTurn(journalId, {
      speaker: speaker.trim() || undefined,
      text: trimmed,
      translation: translation.trim() || undefined,
    });
    setText('');
    setTranslation('');
    setSpeaker('');
  };

  const commitTags = () => {
    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    void updateJournal(journalId, { tags });
  };

  const startPractice = async (module: 'listen' | 'speak' | 'read' | 'write') => {
    await materializeForPractice(journalId);
    router.push(`/${module}/book/${encodeURIComponent(journalContentCategory(journalId))}`);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this notebook? Highlighted sentences will be removed from review.')) return;
    await deleteJournal(journalId);
    router.push('/journal');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <Link href="/journal" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> Practice Notebook
        </Link>

        <Input
          value={journal.title}
          onChange={(e) => updateJournal(journalId, { title: e.target.value })}
          className="text-lg font-semibold border-transparent hover:border-slate-200 focus-visible:border-slate-300 px-2 -mx-2"
          placeholder="Notebook title"
        />

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Input
            type="date"
            value={journal.lessonDate}
            onChange={(e) => updateJournal(journalId, { lessonDate: e.target.value })}
            className="h-8 w-auto"
          />
          <Input
            value={journal.topic ?? ''}
            onChange={(e) => updateJournal(journalId, { topic: e.target.value || undefined })}
            className="h-8 w-40"
            placeholder="Topic"
          />
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onBlur={commitTags}
            className="h-8 flex-1 min-w-40"
            placeholder="Tags (comma separated)"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {journal.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              #{tag}
            </Badge>
          ))}
          {highlightCount > 0 && (
            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {highlightCount} in review
            </Badge>
          )}
          <span className="ml-auto">
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={handleDelete}>
              Delete
            </Button>
          </span>
        </div>
      </div>

      {/* Turns */}
      <div className="space-y-4">
        {journal.turns.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">
            No entries yet. Add your first phrase, note, sentence, or dialogue line below.
          </p>
        ) : (
          journal.turns.map((turn) => (
            <TurnRow
              key={turn.id}
              turn={turn}
              onPlay={(t) => void speak(t)}
              onToggleHighlight={() => toggleHighlight(journalId, turn.id)}
              onUpdate={(updates) => updateTurn(journalId, turn.id, updates)}
              onRemove={() => removeTurn(journalId, turn.id)}
            />
          ))
        )}
      </div>

      {/* Add-turn composer */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
        <Input
          value={speaker}
          onChange={(e) => setSpeaker(e.target.value)}
          placeholder="Label / speaker (optional: A, B, Me, Teacher, Phrase...)"
          className="h-8"
        />
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Write a phrase, sentence, note, or dialogue line…"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void handleAddTurn();
          }}
        />
        <Input
          value={translation}
          onChange={(e) => setTranslation(e.target.value)}
          placeholder="Translation (optional)"
          className="h-8"
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={handleAddTurn} disabled={!text.trim()}>
            <Plus className="w-4 h-4" /> Add entry
          </Button>
        </div>
      </div>

      {/* Practice whole notebook */}
      {journal.turns.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-700">Practice these entries</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button variant="outline" size="sm" onClick={() => startPractice('listen')}>
              <Headphones className="w-4 h-4" /> Listen
            </Button>
            <Button variant="outline" size="sm" onClick={() => startPractice('speak')}>
              <Mic className="w-4 h-4" /> Speak
            </Button>
            <Button variant="outline" size="sm" onClick={() => startPractice('read')}>
              <BookOpen className="w-4 h-4" /> Read
            </Button>
            <Button variant="outline" size="sm" onClick={() => startPractice('write')}>
              <PenTool className="w-4 h-4" /> Write
            </Button>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-700">Notes</h3>
        <Textarea
          value={journal.notes ?? ''}
          onChange={(e) => updateJournal(journalId, { notes: e.target.value || undefined })}
          rows={3}
          placeholder="Anything to remember about these phrases, lines, or notes…"
        />
      </div>
    </div>
  );
}

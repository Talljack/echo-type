'use client';

import { BookmarkPlus, Check } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useJournalStore } from '@/stores/journal-store';
import type { DialogueTurn } from '@/types/journal';
import type { ConversationMessage } from '@/types/scenario';

interface SaveToJournalButtonProps {
  messages: ConversationMessage[];
  title: string;
}

export function canSaveConversationToJournal(messages: ConversationMessage[]): boolean {
  return messages.some((message) => message.role === 'user' && message.content.trim());
}

export function SaveToJournalButton({ messages, title }: SaveToJournalButtonProps) {
  const addJournal = useJournalStore((s) => s.addJournal);
  const [saved, setSaved] = useState(false);

  const usable = messages.filter((m) => m.role !== 'recording' && m.content.trim());
  const hasRealConversation = canSaveConversationToJournal(usable);

  const handleSave = async () => {
    const turns: DialogueTurn[] = usable.map((m) => ({
      id: nanoid(),
      speaker: m.role === 'user' ? 'Me' : 'Teacher',
      text: m.content,
      translation: m.translation || undefined,
    }));
    if (turns.length === 0 || !hasRealConversation) return;
    await addJournal({ title, source: 'from-speak', turns, tags: ['speak'] });
    setSaved(true);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSave}
      disabled={saved || usable.length === 0 || !hasRealConversation}
      className="border-indigo-200 text-indigo-600 shrink-0"
      title={
        hasRealConversation
          ? 'Save this conversation to your Practice Notebook'
          : 'Start the conversation first, then save it to your Practice Notebook'
      }
    >
      {saved ? (
        <>
          <Check className="w-4 h-4" /> Saved
        </>
      ) : (
        <>
          <BookmarkPlus className="w-4 h-4" /> Save
        </>
      )}
    </Button>
  );
}

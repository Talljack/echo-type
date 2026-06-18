'use client';

import { useEffect } from 'react';
import { JournalList } from '@/components/journal/journal-list';
import { useJournalStore } from '@/stores/journal-store';

export default function JournalPage() {
  const loadJournals = useJournalStore((s) => s.loadJournals);
  const loaded = useJournalStore((s) => s.loaded);

  useEffect(() => {
    if (!loaded) void loadJournals();
  }, [loaded, loadJournals]);

  return <JournalList />;
}

'use client';

import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { JournalDetail } from '@/components/journal/journal-detail';
import { useJournalStore } from '@/stores/journal-store';

export default function JournalDetailPage() {
  const params = useParams<{ id: string }>();
  const loadJournals = useJournalStore((s) => s.loadJournals);
  const loaded = useJournalStore((s) => s.loaded);

  useEffect(() => {
    if (!loaded) void loadJournals();
  }, [loaded, loadJournals]);

  return <JournalDetail journalId={params.id} />;
}

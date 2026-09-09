'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db, LOCAL_DATABASE_CHANGED_EVENT } from '@/lib/db';
import { reviewSummary } from '@/lib/review-summary';

export function useReviewSummary() {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener(LOCAL_DATABASE_CHANGED_EVENT, refresh);
    window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => {
      window.removeEventListener(LOCAL_DATABASE_CHANGED_EVENT, refresh);
      window.removeEventListener('focus', refresh);
      window.clearInterval(timer);
    };
  }, []);
  const result = useLiveQuery(async () => {
    const database = db;
    try {
      const now = Date.now();
      const records = (await database.records.toArray()).filter(
        (record) => (record.fsrsCard?.due ?? record.nextReview ?? Infinity) <= now,
      );
      const contents = await database.contents.bulkGet([...new Set(records.map((record) => record.contentId))]);
      const existing = contents.filter((content) => content !== undefined);
      const sources = await database.contents.bulkGet([
        ...new Set(
          existing.flatMap((content) => (content.metadata?.lessonSourceId ? [content.metadata.lessonSourceId] : [])),
        ),
      ]);
      const [favorites, weakSpots] = await Promise.all([database.favorites.toArray(), database.weakSpots.toArray()]);
      return {
        database,
        data: reviewSummary(
          records,
          [...existing, ...sources.filter((source) => source !== undefined)],
          favorites,
          weakSpots,
          now,
        ),
        error: false,
      };
    } catch {
      return { database, data: undefined, error: true };
    }
  }, [revision]);
  const current = result?.database === db ? result : undefined;
  return { data: current?.data, error: current?.error, retry: () => setRevision((value) => value + 1) };
}

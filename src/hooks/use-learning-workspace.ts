'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db, LOCAL_DATABASE_CHANGED_EVENT } from '@/lib/db';
import { reconcileLearningUnits } from '@/lib/learning-unit-repository';

export function useLearningWorkspace() {
  const [databaseVersion, setDatabaseVersion] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const change = () => {
      setReady(false);
      setDatabaseVersion((v) => v + 1);
    };
    window.addEventListener(LOCAL_DATABASE_CHANGED_EVENT, change);
    return () => window.removeEventListener(LOCAL_DATABASE_CHANGED_EVENT, change);
  }, []);
  const sources = useLiveQuery(async () => {
    const database = db;
    return {
      database,
      contents: await database.contents.toArray(),
      books: await database.books.toArray(),
      collections: await database.collections.toArray(),
    };
  }, [databaseVersion]);
  useEffect(() => {
    if (!sources || sources.database !== db) return;
    let cancelled = false;
    reconcileLearningUnits()
      .then(() => {
        if (!cancelled && sources.database === db) {
          setReady(true);
          setError('');
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not prepare courses');
      });
    return () => {
      cancelled = true;
    };
  }, [sources, retry, databaseVersion]);
  const data = useLiveQuery(async () => {
    const database = db;
    return {
      database,
      units: await database.learningUnits.toArray(),
      contents: await database.contents.toArray(),
      lessons: await database.lessons.toArray(),
      sessions: await database.sessions.toArray(),
      weakSpots: (await database.weakSpots.toArray())
        .filter((w) => !w.resolved)
        .sort((a, b) => b.lastSeenAt - a.lastSeenAt),
      records: await database.records.toArray(),
      favorites: await database.favorites.toArray(),
    };
  }, [databaseVersion, ready]);
  return { data: ready && data?.database === db ? data : undefined, error, retry: () => setRetry((v) => v + 1) };
}

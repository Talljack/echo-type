'use client';

import { type SetStateAction, useEffect, useRef, useState } from 'react';
import { db, LOCAL_DATABASE_CHANGED_EVENT } from '@/lib/db';
import { type ImportDraft, readImportDraft, writeImportDraft } from '@/lib/import-draft';

/** Serialize writes in event order; never put large sources in localStorage. */
export function useImportDraft<T extends Record<string, unknown>>(id: string, defaults: T) {
  const initial = useRef(defaults);
  const current = useRef(defaults);
  const [value, setValue] = useState(defaults);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [owner, setOwner] = useState(db);
  const revision = useRef(0);
  const queue = useRef(Promise.resolve());
  const loaded = useRef(false);
  const failed = useRef<unknown>(null);
  const generation = useRef(0);
  useEffect(() => {
    const changed = () => setOwner(db);
    window.addEventListener(LOCAL_DATABASE_CHANGED_EVENT, changed);
    return () => window.removeEventListener(LOCAL_DATABASE_CHANGED_EVENT, changed);
  }, []);
  useEffect(() => {
    let active = true;
    const run = ++generation.current;
    loaded.current = false;
    setStatus('loading');
    setError('');
    queue.current = Promise.resolve();
    failed.current = null;
    void readImportDraft(id, owner)
      .then((record) => {
        if (!active || run !== generation.current) return;
        revision.current = record?.revision ?? 0;
        current.current = { ...initial.current, ...record?.data } as T;
        setValue(current.current);
        loaded.current = true;
        setStatus(record ? 'saved' : 'empty');
      })
      .catch(() => {
        if (active) {
          setError('Could not restore draft. Keep this page open / 无法恢复草稿，请保持页面打开');
          setStatus('error');
        }
      });
    return () => {
      active = false;
    };
  }, [id, owner]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (status === 'saving' || status === 'error') {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [status]);
  function field<K extends keyof T>(key: K): [T[K], (next: SetStateAction<T[K]>) => void] {
    return [
      value[key],
      (next) => {
        update({
          ...current.current,
          [key]: typeof next === 'function' ? (next as (v: T[K]) => T[K])(current.current[key]) : next,
        });
      },
    ];
  }
  function update(patch: Partial<T>) {
    if (!loaded.current || owner !== db) return;
    const data = { ...current.current, ...patch };
    current.current = data;
    setValue(data);
    setStatus('saving');
    const run = generation.current;
    queue.current = queue.current
      .then(async () => {
        if (run !== generation.current || owner !== db) return;
        const result = await writeImportDraft(id, data, revision.current, owner);
        if (run !== generation.current || owner !== db) return;
        revision.current = result.revision;
        failed.current = null;
        if (current.current === data) {
          setStatus('saved');
          setError('');
        }
      })
      .catch((cause) => {
        if (run === generation.current) {
          failed.current = cause;
          setStatus('error');
          setError(
            `${cause instanceof Error ? cause.message : 'Draft save failed'}. Keep this page open / 请保持页面打开`,
          );
        }
      });
  }
  async function flush() {
    await queue.current;
    if (failed.current) throw failed.current;
  }
  async function commit(action: (revision: number, owner: typeof db) => Promise<ImportDraft>) {
    await flush();
    if (owner !== db || !loaded.current) throw new Error('Account changed. Reopen imports.');
    const record = await action(revision.current, owner);
    if (owner !== db) throw new Error('Account changed. Reopen imports.');
    revision.current = record.revision;
    current.current = record.data as T;
    setValue(current.current);
    setStatus('saved');
  }
  return { field, update, status, error, ready: loaded.current && owner === db, flush, commit };
}

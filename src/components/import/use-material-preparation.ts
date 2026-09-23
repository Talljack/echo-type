'use client';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { shouldUseDirectBrowserTranscription, transcribeInBrowser } from '@/lib/browser-transcription';
import { db, LOCAL_DATABASE_CHANGED_EVENT } from '@/lib/db';
import { describeImportError } from '@/lib/import-error';
import { parseSubtitles, recoverImportJob, shiftSubtitleBlocks, textSourceBlocks } from '@/lib/import-job';
import { captureImportScope, createImportJob, publishImportJob } from '@/lib/import-job-repository';
import { SUBTITLE_MAX_BYTES } from '@/lib/import-limits';
import { importPreflight } from '@/lib/import-preflight';
import { journalReview, rebaseReview, restoreReview } from '@/lib/import-review-journal';
import type { ProviderId } from '@/lib/providers';
import { fetchUrlImportResult } from '@/lib/url-import-fetch';
import { parseVocabulary } from '@/lib/vocabulary';
import { useAuthStore } from '@/stores/auth-store';
import { useLanguageStore } from '@/stores/language-store';
import { useProviderStore } from '@/stores/provider-store';
import type { ImportJob, ImportSourceBlock } from '@/types/import-job';

/** Headless source processing and account-scoped persistence. No presentation dependencies. */
export function useMaterialPreparation(onImported?: () => void) {
  const zh = useLanguageStore((state) => state.interfaceLanguage) === 'zh';
  const t = (en: string, cn: string) => (zh ? cn : en);
  const ownerId = useAuthStore((state) => state.user?.id || 'guest');
  const [database, setDatabase] = useState(db);
  const jobs = useLiveQuery(() => database.importJobs.orderBy('createdAt').reverse().toArray(), [database], []);
  const [selected, setSelected] = useState<ImportJob | null>(null);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const publishedSource = useLiveQuery(
    () => (selected?.materialIds?.[0] ? database.contents.get(selected.materialIds[0]) : undefined),
    [database, selected?.materialIds?.[0]],
  );
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sourceWarning, setSourceWarning] = useState('');
  const [saved, setSaved] = useState(false);
  const [stage, setStage] = useState('');
  const openedFromLink = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const writes = useRef(Promise.resolve());
  const localRevisions = useRef(new Map<string, number>());
  const [draftStatus, setDraftStatus] = useState('');
  const [supplement, setSupplement] = useState('');
  const selectForReview = (job: ImportJob | null) => {
    try {
      const next = job && job.id !== selected?.id ? restoreReview(sessionStorage, database.name, job) : job;
      if (next) journalReview(sessionStorage, database.name, next);
      setSelected(next);
    } catch {
      // Keep the user's edit and warn rather than claiming durability after quota failure.
      setSelected(job);
      setError('Recovery storage is full or unavailable. Wait for Draft saved before refreshing.');
    }
  };
  useEffect(() => setSupplement(''), [selected?.id]);
  useEffect(() => () => controller.current?.abort(), []);

  useEffect(() => {
    if (openedFromLink.current) return;
    const requested = new URLSearchParams(window.location.search).get('job');
    const job = jobs.find((entry) => entry.id === requested);
    if (job) {
      selectForReview(job);
      openedFromLink.current = true;
    }
  }, [jobs]);

  useEffect(() => {
    const changed = () => {
      controller.current?.abort();
      localRevisions.current.clear();
      setDatabase(db);
      setSelected(null);
      setActiveIds([]);
      setBusy(false);
      setError('');
      setSourceWarning('');
      openedFromLink.current = false;
    };
    window.addEventListener(LOCAL_DATABASE_CHANGED_EVENT, changed);
    return () => window.removeEventListener(LOCAL_DATABASE_CHANGED_EVENT, changed);
  }, []);

  const attempt = async (action: () => Promise<void>) => {
    setError('');
    setBusy(true);
    setSaved(false);
    try {
      await action();
      return true;
    } catch (failure) {
      if (!(failure instanceof DOMException && failure.name === 'AbortError'))
        setError(describeImportError(failure, zh));
      return false;
    } finally {
      setBusy(false);
      setStage('');
    }
  };

  const add = (file?: File) =>
    attempt(async () => {
      setSourceWarning('');
      if (file) {
        const check = importPreflight(file, useProviderStore.getState().providers);
        // Missing transcription credentials still permit keeping the source and attaching subtitles.
        if (check.error && !(check.media && check.error.startsWith('Media over'))) throw new Error(check.error);
        if (navigator.storage?.estimate) {
          const estimate = await navigator.storage.estimate().catch(() => ({}) as StorageEstimate);
          if (estimate.quota && estimate.quota - (estimate.usage || 0) < file.size * 2)
            throw new Error(
              t(
                'Not enough device storage. Free space or choose a smaller file.',
                '本机空间不足，请释放空间或选择较小文件。',
              ),
            );
        }
      }
      const scope = captureImportScope();
      if (selected?.status === 'needsReview') await persistSelected(selected);
      setStage(t('Saving original on this device', '正在保存原文件到本机'));
      const next = await createImportJob({ file, url: file ? undefined : url, ownerId });
      scope.assertActive();
      setActiveIds([next.id]);
      setSelected(next);
    });

  const persistSelected = async (next: ImportJob) => {
    if (!selected) return;
    const scope = captureImportScope();
    const task = writes.current
      .catch(() => {})
      .then(async () => {
        const previousRevision = localRevisions.current.get(selected.id) ?? selected.updatedAt;
        const stored = await scope.database.transaction('rw', scope.database.importJobs, async () => {
          scope.assertActive();
          const current = await scope.database.importJobs.get(selected.id);
          if (
            !current ||
            current.updatedAt !== (localRevisions.current.get(selected.id) ?? selected.updatedAt) ||
            current.status !== selected.status ||
            current.status === 'ready'
          )
            throw new Error('Task changed in another window. Open it again.');
          const updated = { ...next, updatedAt: Math.max(Date.now(), current.updatedAt + 1) };
          await scope.database.importJobs.put(updated);
          localRevisions.current.set(updated.id, updated.updatedAt);
          return updated;
        });
        scope.assertActive();
        try {
          rebaseReview(sessionStorage, scope.database.name, { ...selected, updatedAt: previousRevision }, stored);
        } catch {
          setError('Temporary recovery storage unavailable. Your latest database save completed.');
        }
        setSelected((latest) =>
          latest?.id !== selected.id
            ? latest
            : latest === selected
              ? stored
              : { ...latest, updatedAt: stored.updatedAt },
        );
      });
    writes.current = task;
    await task;
  };

  const addFiles = (files: File[]) => {
    setSourceWarning('');
    return attempt(async () => {
      const scope = captureImportScope();
      if (selected?.status === 'needsReview') await persistSelected(selected);
      const batchId = crypto.randomUUID();
      const failures: string[] = [];
      const importedIds: string[] = [];
      let first: ImportJob | undefined;
      for (const file of files) {
        scope.assertActive();
        const check = importPreflight(file, useProviderStore.getState().providers);
        if (check.error && !(check.media && check.error.startsWith('Media over'))) {
          failures.push(`${file.name}: ${check.error}`);
          continue;
        }
        try {
          if (navigator.storage?.estimate) {
            const estimate = await navigator.storage.estimate();
            if (estimate.quota && estimate.quota - (estimate.usage || 0) < file.size * 2)
              throw new Error('Not enough device storage. Free space before importing this file.');
          }
          const job = await createImportJob({ file, ownerId, batchId });
          scope.assertActive();
          importedIds.push(job.id);
          if (!first || (first.status === 'ready' && job.status !== 'ready')) first = job;
        } catch (cause) {
          scope.assertActive();
          failures.push(`${file.name}: ${cause instanceof Error ? cause.message : 'Save failed'}`);
        }
      }
      setActiveIds(importedIds);
      if (first) setSelected(first);
      if (failures.length) {
        // Processing a valid member clears transient errors, not rejected-file feedback.
        setSourceWarning(failures.join('\n'));
        if (!first) throw new Error(failures.join('\n'));
      }
    });
  };

  useEffect(() => {
    if (!selected || selected.status !== 'needsReview' || busy) return;
    let active = true;
    setDraftStatus('saving');
    const timer = setTimeout(() => {
      void (async () => {
        const current = await database.importJobs.get(selected.id);
        if (JSON.stringify(current) !== JSON.stringify(selected)) await persistSelected(selected);
        if (active) setDraftStatus('saved');
      })().catch((failure) => {
        if (active) {
          setDraftStatus('error');
          setError(
            `${failure instanceof Error ? failure.message : 'Draft save failed'} — keep this page open / 请保持页面打开`,
          );
        }
      });
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [selected, busy, database]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (selected?.status === 'needsReview' && draftStatus !== 'saved') {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [selected?.status, draftStatus]);

  const process = (transcriptionProviderId?: ProviderId) =>
    attempt(async () => {
      if (!selected) return;
      const scope = captureImportScope();
      const job = selected;
      const chosenProviderId = transcriptionProviderId ?? job.transcriptionProviderId;
      if (job.kind === 'media' && job.originalFile) {
        const check = importPreflight(
          { name: job.filename || '', size: job.originalFile.size },
          useProviderStore.getState().providers,
        );
        if (check.error) throw new Error(check.error);
      }
      const request = new AbortController();
      controller.current = request;
      const runId = crypto.randomUUID();
      await persistSelected({
        ...job,
        transcriptionProviderId: chosenProviderId,
        status: 'processing',
        runId,
        error: undefined,
      });
      setStage(
        job.kind === 'media'
          ? t('Transcribing speech', '正在转写语音')
          : job.kind === 'url'
            ? t('Fetching source text', '正在获取原文')
            : t('Extracting text', '正在提取正文'),
      );
      try {
        let text = '';
        let title = job.title;
        let blocks: ImportSourceBlock[] = [];
        if (job.kind === 'url') {
          const host = new URL(job.sourceUrl!).hostname;
          if (/(^|\.)youtube\.com$/.test(host) || host === 'youtu.be') {
            const response = await fetch('/api/import/youtube', {
              signal: request.signal,
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: job.sourceUrl }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
              const message = [result.error, result.hint].filter(Boolean).join(' ');
              throw new Error(message || 'Caption extraction failed');
            }
            title = result.title || `YouTube: ${result.videoId}`;
            text = result.segments.map((segment: { text: string }) => segment.text.trim()).join('\n\n');
            let cursor = 0;
            blocks = result.segments.map(
              (segment: { text: string; offset: number; duration: number }, index: number) => {
                const value = segment.text.trim();
                const start = cursor;
                cursor += value.length + 2;
                return {
                  id: `cue-${index + 1}`,
                  title: `Cue ${index + 1}`,
                  text: value,
                  start,
                  end: start + value.length,
                  timeStart: segment.offset / 1000,
                  timeEnd: (segment.offset + segment.duration) / 1000,
                };
              },
            );
          } else {
            const result = await fetchUrlImportResult(job.sourceUrl!, (input, init) =>
              fetch(input, { ...init, signal: request.signal }),
            );
            text = result.text;
            title = result.title;
            blocks = textSourceBlocks(text);
          }
        } else {
          if (!job.originalFile)
            throw new Error(
              t('Original file missing. Reselect the same file to restore it.', '原文件缺失，请重新选择同一个文件。'),
            );
          const file = new File([job.originalFile], job.filename!, { type: job.mimeType });
          if (/\.(csv|tsv)$/i.test(job.filename || '')) {
            text = await file.text();
            const parsed = parseVocabulary(text);
            if (parsed.errors.length || !parsed.rows.length) throw new Error(parsed.errors[0] || 'No valid vocabulary');
            blocks = textSourceBlocks(text);
          } else if (job.kind === 'subtitle') {
            blocks = parseSubtitles(await file.text());
            text = blocks.map((block) => block.text).join('\n\n');
          } else if (job.kind === 'media') {
            const { activeProviderId, providers } = useProviderStore.getState();
            const providerId = chosenProviderId ?? activeProviderId;
            const form = new FormData();
            form.append('file', file);
            form.append('provider', providerId);
            if (chosenProviderId) form.append('strictProvider', 'true');
            form.append('providerConfigs', JSON.stringify(providers));
            const result = shouldUseDirectBrowserTranscription(file)
              ? await transcribeInBrowser({
                  file,
                  provider: providerId,
                  providerConfigs: providers,
                  signal: request.signal,
                  strictProvider: !!chosenProviderId,
                })
              : await (async () => {
                  const response = await fetch('/api/import/transcribe', {
                    method: 'POST',
                    body: form,
                    signal: request.signal,
                  });
                  const payload = await response.json();
                  if (!response.ok) throw new Error(payload.error || 'Transcription failed');
                  return payload;
                })();
            text = result.text;
            blocks = textSourceBlocks(text);
            if (result.segments?.length) {
              text = result.segments.map((segment: { text: string }) => segment.text.trim()).join('\n\n');
              let cursor = 0;
              blocks = result.segments.map((segment: { text: string; start: number; end: number }, index: number) => {
                const value = segment.text.trim();
                const start = cursor;
                cursor += value.length + 2;
                return {
                  id: `cue-${index + 1}`,
                  title: `Cue ${index + 1}`,
                  text: value,
                  start,
                  end: start + value.length,
                  timeStart: segment.start,
                  timeEnd: segment.end,
                };
              });
            }
          } else {
            const form = new FormData();
            form.append('file', file);
            const response = await fetch('/api/import/extract-text', {
              method: 'POST',
              body: form,
              signal: request.signal,
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Extraction failed');
            title = result.metadata?.title || title;
            // Canonical extracted text is the exact chapter concatenation, so all source offsets remain verifiable.
            text = result.chapters?.length
              ? result.chapters.map((chapter: { text: string }) => chapter.text).join('\n\n')
              : result.text;
            blocks = textSourceBlocks(text, result.chapters);
          }
        }
        request.signal.throwIfAborted();
        if (!text?.trim() || !blocks.length)
          throw new Error('No readable text found. Try another source or OCR using the existing tools.');
        scope.assertActive();
        setStage(t('Preparing editable sections', '正在整理可校对内容'));
        await scope.database.transaction('rw', scope.database.importJobs, async () => {
          const current = await scope.database.importJobs.get(job.id);
          if (current?.runId !== runId || current.status !== 'processing') return;
          const next: ImportJob = {
            ...current,
            title,
            materialType: /\.(csv|tsv)$/i.test(job.filename || '')
              ? 'wordbook'
              : job.kind === 'url' && blocks.some((b) => b.timeStart !== undefined)
                ? 'video'
                : current.materialType,
            originalText: text,
            originalBlocks: blocks,
            timelineVersion: job.kind === 'url' && blocks.some((b) => b.timeStart !== undefined) ? 1 : undefined,
            blocks,
            status: 'needsReview',
            updatedAt: Date.now(),
          };
          await scope.database.importJobs.put(next);
          localRevisions.current.set(next.id, next.updatedAt);
          setSelected(next);
        });
      } catch (failure) {
        if (request.signal.aborted) return;
        scope.assertActive();
        await scope.database.transaction('rw', scope.database.importJobs, async () => {
          const current = await scope.database.importJobs.get(job.id);
          if (current?.runId !== runId || current.status !== 'processing') return;
          const next: ImportJob = {
            ...current,
            status: 'failed',
            error: describeImportError(failure, zh),
            updatedAt: Date.now(),
          };
          await scope.database.importJobs.put(next);
          localRevisions.current.set(next.id, next.updatedAt);
          setSelected(next);
        });
        throw failure;
      }
    });

  const save = async () => {
    if (!selected) return;
    if (selected.status !== 'needsReview') throw new Error('Task changed in another window. Open it again.');
    await persistSelected(selected);
    setSaved(true);
  };

  const publish = () =>
    attempt(async () => {
      if (!selected) return;
      const scope = captureImportScope();
      await save();
      const ready = await publishImportJob(selected.id);
      scope.assertActive();
      setSelected(ready);
      onImported?.();
    });
  const organizeAudio = () =>
    attempt(async () => {
      if (!selected || !selected.requiresAudioStructure) return;
      const scope = captureImportScope();
      const target = selected.materialType === 'scenario' ? 'scenario' : 'sentences';
      const { activeProviderId, providers } = useProviderStore.getState();
      const request = new AbortController();
      controller.current = request;
      const response = await fetch('/api/import/organize', {
        signal: request.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: selected.blocks.map((b) => b.text).join('\n\n'),
          target,
          provider: activeProviderId,
          providerConfigs: providers,
        }),
      });
      const result = await response.json();
      request.signal.throwIfAborted();
      if (!response.ok) throw new Error(result.error || 'AI organization failed');
      if (
        !Array.isArray(result.sentences) ||
        !result.sentences.length ||
        result.sentences.some((s: unknown) => typeof s !== 'string' || !s.trim())
      )
        throw new Error('AI returned invalid sentences');
      scope.assertActive();
      await persistSelected({
        ...selected,
        title: result.title,
        materialType: target,
        audioStructured: true,
        scenario: target === 'scenario' ? result.scenario : undefined,
        blocks: [
          {
            id: 'organized',
            title: result.title,
            text: result.sentences.join('\n'),
            start: 0,
            end: selected.originalText?.length ?? 0,
          },
        ],
      });
    });
  const editBlock = (id: string, patch: Partial<ImportSourceBlock>) => {
    if (selected) {
      selectForReview({
        ...selected,
        blocks: selected.blocks.map((block) => (block.id === id ? { ...block, ...patch } : block)),
      });
      setSaved(false);
    }
  };
  const attachSubtitles = (file: File) =>
    attempt(async () => {
      if (!selected) return;
      if (file.size > SUBTITLE_MAX_BYTES) throw new Error('Subtitles must be under 10 MB / 字幕最多 10 MB');
      const scope = captureImportScope();
      const raw = await file.text();
      const blocks = parseSubtitles(raw);
      scope.assertActive();
      const next: ImportJob = {
        ...selected,
        originalSubtitles: raw,
        materialType: selected.kind === 'url' ? 'video' : selected.materialType,
        originalText: selected.originalText || blocks.map((block) => block.text).join('\n\n'),
        originalBlocks: selected.originalBlocks || blocks,
        blocks,
        subtitleOffset: 0,
        audioStructured: false,
        scenario: undefined,
        status: 'needsReview',
        error: undefined,
        updatedAt: Date.now(),
      };
      await persistSelected(next);
    });

  const attachText = () =>
    attempt(async () => {
      if (!selected || !supplement.trim()) return;
      const text = supplement.trim();
      await persistSelected({
        ...selected,
        supplementalText: text,
        materialType: /\.(csv|tsv)$/i.test(selected.filename || '') ? 'wordbook' : selected.materialType,
        originalText: selected.originalText || text,
        originalBlocks: selected.originalBlocks || textSourceBlocks(text),
        blocks: textSourceBlocks(text),
        status: 'needsReview',
        error: undefined,
        audioStructured: false,
      });
    });

  const openJob = async (job: ImportJob) => {
    if (busy) return;
    await attempt(async () => {
      setSourceWarning('');
      if (selected?.status === 'needsReview') await save();
      const current = await database.importJobs.get(job.id);
      if (current) {
        const recovered = recoverImportJob(current);
        if (recovered.status !== current.status) {
          recovered.updatedAt = Date.now();
          await database.importJobs.put(recovered);
        }
        localRevisions.current.set(recovered.id, recovered.updatedAt);
        selectForReview(recovered);
      }
    });
  };
  const reloadSaved = () =>
    attempt(async () => {
      if (!selected) return;
      const scope = captureImportScope();
      await writes.current.catch(() => {});
      const current = await scope.database.importJobs.get(selected.id);
      scope.assertActive();
      if (!current) throw new Error('Import task no longer exists.');
      journalReview(sessionStorage, scope.database.name, current);
      localRevisions.current.set(current.id, current.updatedAt);
      setSelected(current);
    });
  const shiftSubtitles = (offset: number) => {
    if (!selected) return;
    try {
      const blocks = shiftSubtitleBlocks(selected.blocks, offset - (selected.subtitleOffset || 0));
      setError('');
      selectForReview({ ...selected, blocks, subtitleOffset: offset });
    } catch (failure) {
      setError(describeImportError(failure, zh));
    }
  };
  const cancel = () =>
    attempt(async () => {
      if (!selected) return;
      controller.current?.abort();
      await persistSelected({ ...selected, status: 'cancelled', runId: undefined });
    });
  const addText = (text: string) =>
    attempt(async () => {
      setSourceWarning('');
      const scope = captureImportScope();
      if (selected?.status === 'needsReview') await save();
      const file = new File([text], 'Pasted text.txt', { type: 'text/plain' });
      const created = await createImportJob({ file, ownerId });
      setActiveIds([created.id]);
      if (created.status === 'ready' || created.status === 'needsReview') {
        setSelected(created);
        return;
      }
      const wordbook = parseVocabulary(text);
      const blocks = textSourceBlocks(text);
      const next: ImportJob = {
        ...created,
        originalText: text,
        originalBlocks: blocks,
        blocks,
        status: 'needsReview',
        materialType:
          wordbook.rows.length && !wordbook.errors.length
            ? 'wordbook'
            : text.split('\n').filter((line) => /^[\w .'-]{1,30}:\s+\S/.test(line)).length >= 2
              ? 'dialogue'
              : 'reading',
      };
      scope.assertActive();
      await scope.database.importJobs.put(next);
      setSelected(next);
    });
  return {
    zh,
    t,
    jobs,
    activeIds,
    setActiveIds,
    selected,
    setSelected: selectForReview,
    publishedSource,
    url,
    setUrl,
    busy,
    error,
    sourceWarning,
    stage,
    draftStatus,
    supplement,
    setSupplement,
    add,
    addFiles,
    addText,
    process,
    publish,
    save,
    openJob,
    reloadSaved,
    shiftSubtitles,
    cancel,
    editBlock,
    attachSubtitles,
    attachText,
    organizeAudio,
  };
}

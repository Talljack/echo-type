'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, CheckCircle2, LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ImportActions, useImportStep } from '@/components/import/import-workbench';
import { MaterialBlockEditor } from '@/components/import/material-block-editor';
import { MaterialFilePicker } from '@/components/import/material-file-picker';
import { TagSelector } from '@/components/shared/tag-selector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { shouldUseDirectBrowserTranscription, transcribeInBrowser } from '@/lib/browser-transcription';
import { db, LOCAL_DATABASE_CHANGED_EVENT } from '@/lib/db';
import { includedImportBlocks, parseSubtitles, shiftSubtitleBlocks, textSourceBlocks } from '@/lib/import-job';
import { captureImportScope, createImportJob, publishImportJob } from '@/lib/import-job-repository';
import { SUBTITLE_MAX_BYTES } from '@/lib/import-limits';
import { importPreflight } from '@/lib/import-preflight';
import { unitIdForContent } from '@/lib/learning-units';
import { MATERIAL_LABELS } from '@/lib/material-types';
import { fetchUrlImportResult } from '@/lib/url-import-fetch';
import { normalizeTags } from '@/lib/utils';
import { parseVocabulary } from '@/lib/vocabulary';
import { useAuthStore } from '@/stores/auth-store';
import { useLanguageStore } from '@/stores/language-store';
import { useProviderStore } from '@/stores/provider-store';
import type { ImportJob, ImportSourceBlock } from '@/types/import-job';

const formats = '.txt,.md,.text,.pdf,.docx,.epub,.srt,.vtt,.mp3,.wav,.m4a,.ogg,.flac,.mp4,.webm,.avi';
const statusLabels: Record<ImportJob['status'], [string, string]> = {
  queued: ['Ready to process', '等待处理'],
  processing: ['Processing / resume if interrupted', '处理中 / 中断后可继续'],
  needsReview: ['Review before learning', '待校对'],
  ready: ['In your library', '已加入资料库'],
  failed: ['Needs retry', '需要重试'],
  cancelled: ['Paused — original retained', '已取消，保留原文件'],
};

export function DurableImport({
  onImported,
  embedded = false,
  entryMode,
  onVocabularyFile,
}: {
  onImported?: () => void;
  embedded?: boolean;
  entryMode?: 'file' | 'url' | 'media';
  onVocabularyFile?: (file: File) => void;
} = {}) {
  const zh = useLanguageStore((state) => state.interfaceLanguage) === 'zh';
  const t = (en: string, cn: string) => (zh ? cn : en);
  const ownerId = useAuthStore((state) => state.user?.id || 'guest');
  const [database, setDatabase] = useState(db);
  const jobs = useLiveQuery(() => database.importJobs.orderBy('createdAt').reverse().toArray(), [database], []);
  const [selected, setSelected] = useState<ImportJob | null>(null);
  const publishedSource = useLiveQuery(
    () => (selected?.materialIds?.[0] ? database.contents.get(selected.materialIds[0]) : undefined),
    [database, selected?.materialIds?.[0]],
  );
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [stage, setStage] = useState('');
  const openedFromLink = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const writes = useRef(Promise.resolve());
  const localRevisions = useRef(new Map<string, number>());
  const [draftStatus, setDraftStatus] = useState('');
  const [supplement, setSupplement] = useState('');
  useEffect(() => setSupplement(''), [selected?.id]);
  useEffect(() => () => controller.current?.abort(), []);
  useImportStep(selected?.status === 'ready' ? 4 : selected?.status === 'needsReview' ? 3 : selected ? 2 : 1);

  useEffect(() => {
    if (openedFromLink.current) return;
    const requested = new URLSearchParams(window.location.search).get('job');
    const job = jobs.find((entry) => entry.id === requested);
    if (job) {
      setSelected(job);
      openedFromLink.current = true;
    }
  }, [jobs]);

  useEffect(() => {
    const changed = () => {
      controller.current?.abort();
      localRevisions.current.clear();
      setDatabase(db);
      setSelected(null);
      setBusy(false);
      setError('');
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
    } catch (failure) {
      if (!(failure instanceof DOMException && failure.name === 'AbortError'))
        setError(failure instanceof Error ? failure.message : 'Import failed');
    } finally {
      setBusy(false);
      setStage('');
    }
  };

  const add = (file?: File) =>
    attempt(async () => {
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
      setSelected(next);
    });

  const persistSelected = async (next: ImportJob) => {
    if (!selected) return;
    const scope = captureImportScope();
    const task = writes.current
      .catch(() => {})
      .then(async () => {
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
    if (files.length === 1 && /\.(csv|tsv)$/i.test(files[0].name) && onVocabularyFile) {
      onVocabularyFile(files[0]);
      return;
    }
    return attempt(async () => {
      const scope = captureImportScope();
      if (selected?.status === 'needsReview') await persistSelected(selected);
      const batchId = crypto.randomUUID();
      const failures: string[] = [];
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
          first ??= job;
        } catch (cause) {
          scope.assertActive();
          failures.push(`${file.name}: ${cause instanceof Error ? cause.message : 'Save failed'}`);
        }
      }
      if (first) setSelected(first);
      if (failures.length) throw new Error(failures.join('\n'));
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

  const process = () =>
    attempt(async () => {
      if (!selected) return;
      const scope = captureImportScope();
      const job = selected;
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
      await persistSelected({ ...job, status: 'processing', runId, error: undefined });
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
            const form = new FormData();
            form.append('file', file);
            form.append('provider', activeProviderId);
            form.append('providerConfigs', JSON.stringify(providers));
            const result = shouldUseDirectBrowserTranscription(file)
              ? await transcribeInBrowser({
                  file,
                  provider: activeProviderId,
                  providerConfigs: providers,
                  signal: request.signal,
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
            error: failure instanceof Error ? failure.message : 'Import failed',
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
      setSelected({
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

  return (
    <section
      className={
        embedded
          ? 'flex flex-col gap-4 text-slate-800'
          : 'flex flex-col gap-5 rounded-xl bg-white p-4 text-slate-800 shadow-sm sm:p-6'
      }
      aria-label={t('Resumable import', '可恢复导入')}
    >
      <div>
        <h2 hidden={embedded} className="font-[var(--font-poppins)] text-xl font-semibold">
          {t('Prepare your material', '准备学习材料')}
        </h2>
        <p hidden={embedded} className="mt-1 text-sm text-slate-600">
          {embedded
            ? t(
                'Original files and drafts are kept on this device. Transcription may use your provider quota.',
                '原文件和校对稿保存在本机。音视频转写可能使用服务商额度。',
              )
            : t(
                'Original files and review drafts stay on this device. Keep this page open while processing; after interruption, resume here. Media transcription may use your configured provider and quota.',
                '原文件与校对稿保存在本机。处理时请保持页面打开；中断后可在这里继续。媒体转写可能使用已配置的服务商与额度。',
              )}
        </p>
      </div>
      {!selected && (
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">
            {entryMode === 'url'
              ? t('Learn from a link', '从链接开始学习')
              : t('Bring your own material', '导入你自己的材料')}
          </h3>
          <p className="text-sm leading-6 text-slate-500">
            {entryMode === 'url'
              ? t(
                  'A web article or a supported video link. Review the extracted text before saving.',
                  '粘贴网页文章或支持的视频链接，提取后先校对再保存。',
                )
              : t(
                  'English books, word lists, documents or video. We will help you prepare them.',
                  '英文书籍、词表、文档或视频，导入后再确认内容。',
                )}
          </p>
        </div>
      )}
      {entryMode !== 'url' && (
        <MaterialFilePicker
          accept={onVocabularyFile ? `${formats},.csv,.tsv` : formats}
          disabled={busy}
          zh={zh}
          source={
            selected ? { name: selected.filename || selected.title, size: selected.originalFile?.size } : undefined
          }
          onFile={(file) => {
            if (/\.(csv|tsv)$/i.test(file.name) && onVocabularyFile) onVocabularyFile(file);
            else void add(file);
          }}
          onFiles={(files) => void addFiles(files)}
        />
      )}
      {busy && stage && (
        <div
          role="status"
          aria-label="Import processing"
          className="rounded-xl bg-indigo-50 p-4 text-sm text-indigo-900"
        >
          <div className="flex items-center gap-2">
            <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" />
            <span className="font-medium">{stage}</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-indigo-700">
            {t(
              'Keep this page open. Duration depends on the material and your provider; the original is retained if processing fails.',
              '请保持页面打开。耗时取决于材料和服务商，处理失败时仍保留原文件。',
            )}
          </p>
        </div>
      )}
      <div hidden={entryMode === 'file'} className={entryMode === 'file' ? 'hidden' : 'flex flex-wrap gap-2'}>
        <Input
          aria-label={t('Source URL', '来源网址')}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://…"
          className="min-w-0 flex-1"
        />
        {!selected && entryMode !== 'file' && (
          <ImportActions>
            <Button className="bg-indigo-600 text-white" disabled={busy || !url.trim()} onClick={() => void add()}>
              {t('Add URL', '添加网址')}
            </Button>
          </ImportActions>
        )}
        {selected && entryMode !== 'file' && (
          <Button variant="outline" disabled={busy || !url.trim()} onClick={() => void add()}>
            {t('Add URL', '添加网址')}
          </Button>
        )}
      </div>
      {!selected && entryMode === 'file' && (
        <>
          <p className="text-xs leading-5 text-slate-500">
            {t(
              'Audio is transcribed, then organized into sentences or a scenario. It does not create a separate audio material.',
              '音频先转写，再整理为句集或场景，不单独生成音频类型材料。',
            )}
          </p>
          <ImportActions>
            <span className="text-xs text-slate-500">{t('Choose a file above to continue', '选择上方文件后继续')}</span>
          </ImportActions>
        </>
      )}
      {!!jobs.length && (
        <details className="order-last" open={!!selected?.batchId}>
          <summary className="cursor-pointer py-2 text-sm font-medium">
            {t('Saved import tasks', '已保存的导入任务')} ({jobs.length})
          </summary>
          <ul className="max-h-60 divide-y divide-slate-100 overflow-auto">
            {jobs.map((job) => (
              <li key={job.id} className="flex min-w-0 items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm">{job.title}</p>
                  <p className="text-xs text-slate-500">{t(...statusLabels[job.status])}</p>
                </div>
                <Button
                  data-testid="import-resume"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void attempt(async () => {
                      if (selected?.status === 'needsReview') await persistSelected(selected);
                      localRevisions.current.delete(job.id);
                      setSelected((await database.importJobs.get(job.id)) || job);
                      setError('');
                      setSaved(false);
                    })
                  }
                >
                  {t('Open', '打开')}
                </Button>
              </li>
            ))}
          </ul>
        </details>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {selected && error.includes('changed in another window') && (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() =>
            void attempt(async () => {
              await writes.current.catch(() => {});
              const scope = captureImportScope();
              const latest = await scope.database.importJobs.get(selected.id);
              scope.assertActive();
              if (!latest)
                throw new Error(t('This task was removed. Choose your source again.', '任务已移除，请重新选择来源。'));
              localRevisions.current.delete(selected.id);
              setSelected(latest);
              setDraftStatus('saved');
            })
          }
        >
          {t('Reload saved version (discard unsaved edits)', '重新载入已保存版本（放弃未保存修改）')}
        </Button>
      )}
      {selected && (
        <div className="space-y-4 border-t border-slate-100 pt-4">
          {selected.status !== 'needsReview' && <h3 className="break-words font-semibold">{selected.title}</h3>}
          {selected.status === 'needsReview' && (
            <p className="flex items-center gap-2 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              {t('Ready to review', '已准备好校对')} · {selected.blocks.length} {t('sections', '段内容')}
            </p>
          )}
          {selected.error && !error && <p className="text-sm text-amber-800">{selected.error}</p>}
          {['queued', 'failed', 'cancelled', 'processing'].includes(selected.status) && (
            <div className="space-y-3">
              {selected.status === 'processing' && !busy && (
                <p className="text-sm text-slate-600">
                  {t(
                    'Processing. If this was interrupted, retry restarts extraction safely; it does not create duplicate material.',
                    '处理中。如果任务已中断，可安全重试，不会重复创建资料。',
                  )}
                </p>
              )}
              <ImportActions>
                {selected.blocks.length > 0 && selected.status !== 'processing' ? (
                  <Button
                    disabled={busy}
                    onClick={() =>
                      void attempt(async () => {
                        const scope = captureImportScope();
                        const next: ImportJob = {
                          ...selected,
                          status: 'needsReview',
                          error: undefined,
                          updatedAt: Date.now(),
                        };
                        scope.assertActive();
                        await persistSelected(next);
                      })
                    }
                  >
                    {t('Continue review', '继续校对')}
                  </Button>
                ) : (
                  <Button data-testid="import-process" disabled={busy} onClick={() => void process()}>
                    {busy
                      ? t('Processing…', '处理中…')
                      : selected.kind === 'media'
                        ? t('Transcribe with AI', '使用 AI 转写')
                        : selected.status === 'queued'
                          ? t('Prepare material', '整理材料')
                          : t('Try again', '重试')}
                  </Button>
                )}
              </ImportActions>
            </div>
          )}
          {(selected.kind === 'media' || selected.kind === 'url') && selected.status !== 'ready' && (
            <div className="space-y-2">
              {selected.kind === 'media' && (
                <p className="text-sm text-slate-600">
                  {t(
                    'Transcription sends this file to a speech provider and may use paid quota. Start only when you are ready. Cancelling stops this page’s request; provider processing or charges may already have started.',
                    '转写会将文件发送至语音服务商，可能使用付费额度。确认后再开始；取消会中断本页请求，但服务商可能已开始处理或计费。',
                  )}
                </p>
              )}
              {selected.originalFile &&
                importPreflight(
                  { name: selected.filename || '', size: selected.originalFile.size },
                  useProviderStore.getState().providers,
                ).error && (
                  <p role="alert" className="text-sm text-amber-800">
                    {
                      importPreflight(
                        { name: selected.filename || '', size: selected.originalFile.size },
                        useProviderStore.getState().providers,
                      ).error
                    }{' '}
                    <Link href="/settings">{t('Open settings', '打开设置')}</Link>
                  </p>
                )}
              <label className="block space-y-2 text-sm">
                {t('Use an SRT/VTT transcript instead of transcribing', '使用 SRT/VTT 字幕，无需转写')}
                <input
                  type="file"
                  accept=".srt,.vtt"
                  disabled={busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void attachSubtitles(file);
                  }}
                />
              </label>
            </div>
          )}
          {selected.status === 'failed' && (
            <div className="space-y-3 rounded-xl bg-amber-50 p-4">
              <h4 className="font-medium">{t('Continue with your own text', '补充正文，继续这次导入')}</h4>
              <p className="text-sm text-amber-900">
                {t(
                  'Your source is retained. Paste the transcript or article text below.',
                  '来源已保留，可以粘贴转录文本或文章正文继续校对。',
                )}
              </p>
              <textarea
                aria-label={t('Supplemental text', '补充正文')}
                value={supplement}
                onChange={(e) => setSupplement(e.target.value)}
                disabled={busy}
                className="min-h-32 w-full rounded-lg bg-white p-3"
              />
              <Button variant="outline" disabled={busy || !supplement.trim()} onClick={() => void attachText()}>
                {t('Use this text', '使用这段正文')}
              </Button>
            </div>
          )}
          {selected.status === 'needsReview' && (
            <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
              <div className="order-last space-y-4 rounded-xl bg-slate-100 p-4 lg:order-none lg:col-start-2 lg:row-start-1">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <h4 className="font-semibold">{t('Review your material', '校对你的材料')}</h4>
                  <span className="text-xs tabular-nums text-slate-500">
                    {selected.blocks.length} {t('sections', '段内容')} ·{' '}
                    {MATERIAL_LABELS[selected.materialType || 'reading'][zh ? 1 : 0]}
                  </span>
                </div>
                {selected.requiresAudioStructure && (
                  <div className="space-y-3 rounded-xl bg-indigo-50 p-4">
                    <p className="text-sm">
                      {t(
                        'Audio is a source, not a library type. Use AI to prepare sentences or a scenario, then review before publishing. This uses your configured AI provider.',
                        '音频仅作为来源。使用已配置的 AI 生成句集或场景，校对后再加入资料库。',
                      )}
                    </p>
                    <label className="block text-sm">
                      {t('Audio result', '音频生成结果')}
                      <select
                        aria-label={t('Audio result', '音频生成结果')}
                        disabled={busy}
                        value={selected.materialType === 'scenario' ? 'scenario' : 'sentences'}
                        onChange={(e) =>
                          setSelected({
                            ...selected,
                            materialType: e.target.value as 'sentences' | 'scenario',
                            audioStructured: false,
                          })
                        }
                        className="ml-2 min-h-11 rounded-lg bg-white px-3"
                      >
                        <option value="sentences">{t('Sentences', '句集')}</option>
                        <option value="scenario">{t('Scenario', '场景')}</option>
                      </select>
                    </label>
                    <Button disabled={busy} onClick={() => void organizeAudio()}>
                      {selected.audioStructured
                        ? t('Regenerate with AI', '重新生成')
                        : t('Organize with AI', '使用 AI 整理')}
                    </Button>
                    {selected.audioStructured && (
                      <p role="status">
                        {t('AI draft ready. Review the text below.', 'AI 草稿已生成，请校对下方内容。')}
                      </p>
                    )}
                  </div>
                )}
                <label className="block space-y-1 text-sm">
                  {t('Material title', '资料标题')}
                  <Input
                    value={selected.title}
                    onChange={(event) => {
                      setSelected({ ...selected, title: event.target.value });
                      setSaved(false);
                    }}
                  />
                </label>
                {!selected.requiresAudioStructure &&
                  selected.materialType !== 'video' &&
                  selected.materialType !== 'wordbook' && (
                    <label className="block space-y-1 text-sm">
                      {t('Material type', '材料类型')}
                      <select
                        aria-label="Material type"
                        disabled={busy}
                        value={selected.materialType || 'reading'}
                        className="min-h-11 w-full rounded-lg bg-slate-100 px-3"
                        onChange={(event) => {
                          const materialType = event.target.value as 'reading' | 'dialogue' | 'sentences' | 'scenario';
                          setSelected({
                            ...selected,
                            materialType,
                            scenario:
                              materialType === 'scenario'
                                ? { situation: selected.title, role: 'Learner', goal: '' }
                                : undefined,
                          });
                          setSaved(false);
                        }}
                      >
                        {(['reading', 'dialogue', 'sentences', 'scenario'] as const).map((kind) => (
                          <option key={kind} value={kind}>
                            {MATERIAL_LABELS[kind][zh ? 1 : 0]}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                {selected.materialType === 'scenario' && selected.scenario && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm sm:col-span-2">
                      {t('Situation', '场景背景')}
                      <textarea
                        aria-label="Situation"
                        disabled={busy}
                        value={selected.scenario.situation}
                        className="mt-2 min-h-20 w-full rounded-lg bg-slate-100 p-3 text-sm focus-visible:ring-2 focus-visible:ring-indigo-500"
                        onChange={(event) => {
                          setSelected({
                            ...selected,
                            scenario: { ...selected.scenario!, situation: event.target.value },
                          });
                          setSaved(false);
                        }}
                      />
                    </label>
                    <label className="block text-sm">
                      {t('Your role', '你的角色')}
                      <Input
                        aria-label="Your role"
                        disabled={busy}
                        value={selected.scenario.role}
                        onChange={(event) => {
                          setSelected({ ...selected, scenario: { ...selected.scenario!, role: event.target.value } });
                          setSaved(false);
                        }}
                      />
                    </label>
                    <label className="block text-sm">
                      {t('Communication goal', '沟通目标')}
                      <Input
                        aria-label="Communication goal"
                        disabled={busy}
                        value={selected.scenario.goal}
                        onChange={(event) => {
                          setSelected({ ...selected, scenario: { ...selected.scenario!, goal: event.target.value } });
                          setSaved(false);
                        }}
                      />
                    </label>
                  </div>
                )}
                <label className="block space-y-1 text-sm">
                  {t('Difficulty', '难度')}
                  <select
                    className="min-h-10 rounded-lg bg-slate-100 p-2"
                    value={selected.difficulty || 'intermediate'}
                    onChange={(event) =>
                      setSelected({ ...selected, difficulty: event.target.value as ImportJob['difficulty'] })
                    }
                  >
                    <option value="beginner">{t('Beginner', '初级')}</option>
                    <option value="intermediate">{t('Intermediate', '中级')}</option>
                    <option value="advanced">{t('Advanced', '高级')}</option>
                  </select>
                </label>
                <label className="block space-y-1 text-sm">
                  {t('Tags', '标签')}
                  <TagSelector
                    value={selected.tagsText ?? (selected.tags ?? []).join(', ')}
                    onChange={(value) => {
                      setSelected({ ...selected, tagsText: value, tags: normalizeTags(value) });
                      setSaved(false);
                    }}
                    ariaLabel={t('Tags', '标签')}
                    placeholder={t('e.g. work, interview', '例如：职场，面试')}
                    className="bg-slate-100"
                  />
                </label>
                {selected.blocks.some((block) => block.timeStart !== undefined) && (
                  <label className="block space-y-1 text-sm">
                    {t('Subtitle offset (seconds)', '字幕偏移（秒）')}
                    <Input
                      type="number"
                      step="0.1"
                      value={selected.subtitleOffset || 0}
                      onChange={(event) => {
                        try {
                          const next = Number(event.target.value);
                          setSelected({
                            ...selected,
                            blocks: shiftSubtitleBlocks(selected.blocks, next - (selected.subtitleOffset || 0)),
                            subtitleOffset: next,
                          });
                          setSaved(false);
                          setError('');
                        } catch (failure) {
                          setError((failure as Error).message);
                        }
                      }}
                    />
                  </label>
                )}
                <p className="text-sm text-slate-600">
                  {t(
                    'Changes save automatically on this device. Wait for Saved before leaving. The original stays unchanged.',
                    '修改自动保存在本机，显示已保存后可离开。原始版本保持不变。',
                  )}
                </p>
              </div>
              <div className="min-w-0 space-y-4 lg:col-start-1 lg:row-start-1">
                <MaterialBlockEditor
                  key={selected.id}
                  job={selected}
                  editBlock={editBlock}
                  zh={zh}
                  disabled={busy}
                  onExclude={(id, excluded) =>
                    setSelected({
                      ...selected,
                      excludedBlockIds: excluded
                        ? [...(selected.excludedBlockIds ?? []), id]
                        : (selected.excludedBlockIds ?? []).filter((entry) => entry !== id),
                    })
                  }
                />
                <p data-testid="file-draft-status" role="status" className="text-xs text-slate-500">
                  {draftStatus === 'saved'
                    ? t('Saved on this device', '已保存到本机')
                    : draftStatus === 'error'
                      ? t('Not saved — keep this page open', '未保存，请保持页面打开')
                      : t('Saving draft…', '正在保存草稿…')}
                </p>
              </div>
              <ImportActions>
                <Button
                  data-testid="import-save-review"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void attempt(save)}
                >
                  {t('Save review', '保存校对')}
                </Button>
                <Button
                  data-testid="import-publish"
                  disabled={
                    busy ||
                    (selected.requiresAudioStructure && !selected.audioStructured) ||
                    (selected.materialType === 'scenario' &&
                      (!selected.scenario?.goal.trim() || !selected.scenario?.role.trim())) ||
                    !selected.title.trim() ||
                    !includedImportBlocks(selected).length ||
                    (selected.materialType === 'wordbook' &&
                      parseVocabulary(selected.blocks.map((block) => block.text).join('\n')).errors.length > 0) ||
                    includedImportBlocks(selected).some((block) => !block.text.trim())
                  }
                  onClick={() => void publish()}
                >
                  {t('Add to library', '加入资料库')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                {saved && (
                  <span role="status" className="text-sm text-green-700">
                    {t('Saved on this device', '已保存到本机')}
                  </span>
                )}
              </ImportActions>
            </div>
          )}
          {selected.status === 'ready' && (
            <div data-testid="import-ready" className="space-y-2">
              <p className="text-sm text-green-700">
                {t(
                  'Added to library. Original and reviewed versions are retained.',
                  '已加入资料库，原始与校对版本均已保留。',
                )}
              </p>
              <ImportActions>
                {publishedSource ? (
                  <Link
                    className="inline-flex min-h-11 items-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-transform active:scale-95 motion-reduce:transform-none focus-visible:ring-2"
                    href={`/learn/${encodeURIComponent(unitIdForContent(publishedSource))}`}
                  >
                    {t('Start learning', '开始学习')}
                  </Link>
                ) : (
                  <p className="text-sm text-slate-500">
                    {t(
                      'Loading published material… If it was removed, return to the library.',
                      '正在读取已导入资料… 若已删除，请返回资料库。',
                    )}
                  </p>
                )}
              </ImportActions>
            </div>
          )}
          {selected.status === 'ready' && (
            <section
              id="source-transcript"
              className="max-h-96 space-y-4 overflow-auto"
              aria-label={t('Source locations', '原文位置')}
              ref={(element) => {
                if (element && new URLSearchParams(window.location.search).get('block') === 'transcript')
                  element.scrollIntoView({ block: 'nearest' });
              }}
            >
              {selected.blocks.map((block) => (
                <section
                  key={block.id}
                  id={`source-${block.id}`}
                  className="rounded-lg bg-slate-50 p-3"
                  ref={(element) => {
                    if (element && new URLSearchParams(window.location.search).get('block') === block.id)
                      element.scrollIntoView({ block: 'nearest' });
                  }}
                >
                  <h4 className="font-medium">{block.title}</h4>
                  <p className="text-xs tabular-nums text-slate-500">
                    {block.timeStart !== undefined
                      ? `${block.timeStart.toFixed(2)}–${block.timeEnd?.toFixed(2)}s`
                      : `${t('Original characters', '原文字符')} ${block.start}–${block.end}`}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{block.text}</p>
                  <details>
                    <summary className="cursor-pointer py-2 text-xs">{t('Original source', '原始来源')}</summary>
                    <p className="whitespace-pre-wrap text-sm">
                      {selected.originalBlocks?.find((original) => original.id === block.id)?.text ||
                        selected.originalText?.slice(block.start, block.end)}
                    </p>
                  </details>
                </section>
              ))}
            </section>
          )}
          {selected.originalText && (
            <details>
              <summary className="cursor-pointer py-2 text-sm">
                {t('Original extraction (read-only)', '原始提取文本（只读）')}
              </summary>
              <p className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm">
                {selected.originalText}
              </p>
            </details>
          )}
          {selected.originalFile && (
            <Button
              variant="ghost"
              onClick={() => {
                const blobUrl = URL.createObjectURL(selected.originalFile!);
                const anchor = document.createElement('a');
                anchor.href = blobUrl;
                anchor.download = selected.filename || 'original';
                anchor.click();
                setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
              }}
            >
              {t('Download original file', '下载原文件')}
            </Button>
          )}
          {selected.status !== 'ready' && (
            <Button
              variant="ghost"
              onClick={() =>
                void attempt(async () => {
                  const scope = captureImportScope();
                  const next: ImportJob = { ...selected, status: 'cancelled', runId: undefined, updatedAt: Date.now() };
                  scope.assertActive();
                  await persistSelected(next);
                  controller.current?.abort();
                })
              }
            >
              {t('Cancel task (keep original)', '取消任务（保留原文件）')}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

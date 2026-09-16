'use client';
import { ChevronDown, FileUp, Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ImportActions, useImportStep } from '@/components/import/import-workbench';
import { useImportDraft } from '@/components/import/use-import-draft';
import { TagSelector } from '@/components/shared/tag-selector';
import { db } from '@/lib/db';
import { VOCABULARY_MAX_BYTES } from '@/lib/import-limits';
import { vocabularyCsv } from '@/lib/material-review';
import { parseVocabulary } from '@/lib/vocabulary';
import { importVocabulary } from '@/lib/vocabulary-repository';
import type { Difficulty } from '@/types/content';

export function VocabularyImport({
  zh,
  onImported,
  onImportAnother,
  embedded = false,
  initialFile,
}: {
  zh: boolean;
  onImported: (id: string) => void;
  onImportAnother?: () => void;
  embedded?: boolean;
  initialFile?: File;
}) {
  const t = (en: string, cn: string) => (zh ? cn : en);
  const draft = useImportDraft('vocabulary', {
    title: '',
    text: '',
    uneditedSource: '',
    page: 0,
    editedRows: null as ReturnType<typeof parseVocabulary>['rows'] | null,
    filename: '',
    done: false,
    bookId: '',
    tags: '',
    difficulty: 'beginner' as Difficulty,
  });
  const [title, setTitle] = draft.field('title');
  const [tags, setTags] = draft.field('tags');
  const [difficulty, setDifficulty] = draft.field('difficulty');
  const [text, setText] = draft.field('text');
  const [uneditedSource, setUneditedSource] = draft.field('uneditedSource');
  const [page, setPage] = draft.field('page');
  const [editedRows, setEditedRows] = draft.field('editedRows');
  const [filename, setFilename] = draft.field('filename');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(!initialFile);
  const [done, setDone] = draft.field('done');
  const [bookId, setBookId] = draft.field('bookId');
  useImportStep(done ? 4 : text.trim() ? 3 : 1);
  const request = useRef(0);
  const owner = useRef(db);
  const reviewedText = useMemo(() => (editedRows ? vocabularyCsv(editedRows) : text), [editedRows, text]);
  const [preview, setPreview] = useState<{
    text: string;
    reviewedText: string;
    parsed: ReturnType<typeof parseVocabulary>;
    sourceHasErrors: boolean;
  } | null>(null);
  const large = text.length > 100_000 || reviewedText.length > 100_000;
  const immediate = useMemo(() => {
    if (large) return null;
    const source = parseVocabulary(text);
    return {
      parsed: text === reviewedText ? source : parseVocabulary(reviewedText),
      sourceHasErrors: source.errors.length > 0,
    };
  }, [text, reviewedText, large]);
  useEffect(() => {
    if (!large) return;
    const worker = new Worker(new URL('../../lib/vocabulary-preview.worker.ts', import.meta.url));
    worker.onmessage = (event) => setPreview({ text, reviewedText, ...event.data });
    worker.onerror = () =>
      setPreview({
        text,
        reviewedText,
        parsed: {
          rows: [],
          duplicates: 0,
          errors: [t('Could not parse this wordbook. Try a smaller file.', '无法解析词书，请尝试较小的文件。')],
        },
        sourceHasErrors: true,
      });
    worker.postMessage({ source: text, reviewed: reviewedText });
    return () => worker.terminate();
  }, [text, reviewedText, large, zh]);
  const parsing = large && (preview?.text !== text || preview?.reviewedText !== reviewedText);
  const parsed = immediate?.parsed ?? (parsing ? { rows: [], duplicates: 0, errors: [] } : preview!.parsed);
  const sourceHasErrors = immediate?.sourceHasErrors ?? preview?.sourceHasErrors ?? false;
  const rows = editedRows ?? parsed.rows;
  const consumedFile = useRef<File | undefined>(undefined);
  useEffect(() => {
    if (draft.ready && initialFile && consumedFile.current !== initialFile) {
      consumedFile.current = initialFile;
      void upload(initialFile);
    }
  }, [initialFile, upload, draft.ready]);
  async function upload(file: File | undefined) {
    if (!file || !draft.ready) return;
    const run = ++request.current;
    if (file.size > VOCABULARY_MAX_BYTES || !/\.(csv|tsv|txt)$/i.test(file.name)) {
      setDone(false);
      setError(
        t(
          'Use UTF-8 CSV / TSV, up to 20 MB and 100,000 words. Export Excel as CSV first.',
          '请使用 20 MB 内、最多 10 万词条的 UTF-8 CSV / TSV；Excel 请先导出 CSV。',
        ),
      );
      return;
    }
    setBusy(true);
    setError('');
    try {
      const source = await file.text();
      if (run !== request.current || owner.current !== db) return;
      draft.update({
        text: source,
        uneditedSource: source,
        page: 0,
        filename: file.name,
        title: file.name.replace(/\.[^.]+$/, ''),
        editedRows: null,
        done: false,
        bookId: '',
      });
    } catch {
      setDone(false);
      setError(t('Could not read the file.', '无法读取文件。'));
    } finally {
      if (run === request.current) setBusy(false);
    }
  }
  async function save() {
    if (!draft.ready || busy) return;
    const run = ++request.current;
    setBusy(true);
    setError('');
    try {
      const id = await importVocabulary(title, reviewedText, filename, owner.current, uneditedSource || text, {
        tags,
        difficulty,
      });
      if (owner.current !== db) return;
      if (run === request.current) {
        setDone(true);
        setBookId(id);
      }
      onImported(id);
      await draft.flush();
    } catch (cause) {
      if (run === request.current) setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (run === request.current) setBusy(false);
    }
  }
  if (done)
    return (
      <div className="flex flex-wrap items-center gap-4">
        <p role="status">{t('Word book imported.', '词书已导入。')}</p>
        <ImportActions>
          <button
            type="button"
            disabled={busy}
            className="min-h-11 rounded-xl border border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500"
            onClick={() => {
              request.current++;
              onImportAnother?.();
              setTitle('');
              setTags('');
              setDifficulty('beginner');
              setText('');
              setEditedRows(null);
              setUneditedSource('');
              setPage(0);
              setFilename('');
              setError('');
              setSourceOpen(false);
              setDone(false);
            }}
          >
            {t('Import another word book', '继续导入词书')}
          </button>
          {bookId && (
            <Link
              href={`/learn/${encodeURIComponent(`unit:category:${bookId}`)}`}
              className="inline-flex min-h-11 items-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition-transform active:scale-95 motion-reduce:transform-none focus-visible:ring-2"
            >
              {t('Start learning', '开始学习')}
            </Link>
          )}
        </ImportActions>
      </div>
    );
  return (
    <details
      open={embedded ? true : undefined}
      className={
        embedded ? 'text-slate-700' : 'group rounded-xl bg-slate-100/70 text-slate-700 open:bg-white open:shadow-sm'
      }
    >
      <summary
        hidden={embedded}
        className={
          embedded
            ? 'hidden'
            : 'flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium focus-visible:ring-2 [&::-webkit-details-marker]:hidden'
        }
      >
        <Plus className="h-4 w-4 text-indigo-600" />
        <span>{t('Import your word book', '导入自己的词书')}</span>
        <span className="ml-auto hidden text-xs text-slate-500 sm:block">CSV / TSV</span>
        <ChevronDown className="ml-auto h-4 w-4 group-open:rotate-180 sm:ml-2" />
      </summary>
      <fieldset
        disabled={!draft.ready || busy}
        className={embedded ? 'flex min-w-0 flex-col gap-3' : 'flex min-w-0 flex-col gap-3 px-4 pb-5 pt-2 sm:px-5'}
      >
        <p
          data-testid="vocabulary-draft-status"
          role={draft.error ? 'alert' : 'status'}
          className="text-xs text-slate-500"
        >
          {draft.error ||
            (draft.status === 'saved'
              ? t('Saved on this device', '已保存到本机')
              : draft.status === 'saving'
                ? t('Saving draft…', '正在保存草稿…')
                : t('Drafts save automatically on this device', '草稿自动保存在本机'))}
        </p>
        {embedded && (
          <h3 className="text-lg font-semibold text-slate-900">{t('Review your word book', '校对你的词书')}</h3>
        )}
        <p hidden={!!text} className="text-sm text-slate-600">
          {t(
            'Upload a CSV / TSV file or paste your list. Word and meaning are required; example and pronunciation are optional.',
            '上传 CSV / TSV 或粘贴词表。单词、释义必填；例句和音标选填。',
          )}
        </p>
        {embedded && initialFile && text && (
          <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500">
            {filename} · {t('Original retained', '保留原文件')}
          </p>
        )}
        <label
          className={
            embedded && initialFile && text
              ? 'hidden'
              : 'relative flex cursor-pointer flex-wrap items-center gap-3 rounded-xl bg-slate-100 px-4 py-3 focus-within:ring-2 focus-within:ring-indigo-500'
          }
        >
          <FileUp className="h-6 w-6 shrink-0 text-indigo-600" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-indigo-900">
              {t('Upload CSV / TSV', '上传 CSV / TSV')}
            </span>
            <span className="mt-1 block break-all text-xs text-slate-500">
              {filename || t('Choose a file · UTF-8 · Up to 20 MB', '选择文件 · UTF-8 · 最大 20 MB')}
            </span>
          </span>
          <input
            type="file"
            accept=".csv,.tsv,.txt"
            disabled={busy}
            onChange={(e) => void upload(e.target.files?.[0])}
            aria-label={t('Upload CSV / TSV', '上传 CSV / TSV')}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
        </label>
        <label className="block text-sm font-medium">
          {t('Book title', '词书名')}
          <input
            value={title}
            disabled={busy}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={150}
            placeholder={t('e.g. Words from my daily reading', '例如：每日阅读生词')}
            className="mt-2 block min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-indigo-500"
          />
        </label>
        <div className="grid gap-4 rounded-xl bg-slate-100 p-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            {t('Difficulty', '难度')}
            <select
              aria-label={t('Difficulty', '难度')}
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="mt-2 min-h-11 w-full rounded-lg bg-white px-3"
            >
              <option value="beginner">{t('Beginner', '初级')}</option>
              <option value="intermediate">{t('Intermediate', '中级')}</option>
              <option value="advanced">{t('Advanced', '高级')}</option>
            </select>
          </label>
          <div>
            <p className="mb-2 text-sm font-medium">{t('Tags', '标签')}</p>
            <TagSelector ariaLabel={t('Tags', '标签')} value={tags} onChange={setTags} />
          </div>
        </div>
        <section className="order-2 rounded-lg bg-slate-50 p-3">
          <button
            type="button"
            aria-expanded={sourceOpen}
            className="min-h-8 text-sm text-slate-500 focus-visible:ring-2 focus-visible:ring-indigo-500"
            onClick={() => setSourceOpen(true)}
          >
            {t('Source CSV / TSV', '原始 CSV / TSV')}
          </button>
          {sourceOpen && (
            <label className="mt-2 block text-sm font-medium">
              {t('CSV or TSV text', 'CSV 或 TSV 文本')}
              <textarea
                aria-label={t('CSV or TSV text', 'CSV 或 TSV 文本')}
                value={text}
                disabled={busy}
                onChange={(e) => {
                  request.current++;
                  setText(e.target.value);
                  setEditedRows(null);
                  if (!filename) setUneditedSource(e.target.value);
                  setPage(0);
                }}
                rows={4}
                className="mt-2 block w-full rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-sm leading-6 focus-visible:ring-2 focus-visible:ring-indigo-500"
                placeholder={'word,meaning,example\nhelpful,有帮助的,A helpful reply.'}
              />
            </label>
          )}
        </section>
        {parsing && (
          <p role="status" className="text-sm text-indigo-700">
            {t('Checking words in the background…', '正在后台检查词条…')}
          </p>
        )}
        {busy && (
          <p role="status" className="text-sm text-indigo-700">
            {t('Reading or saving your wordbook… Keep this page open.', '正在读取或保存词书，请保持页面打开。')}
          </p>
        )}
        <p className="text-sm">
          {zh
            ? `${parsed.rows.length} 个词条 · ${parsed.duplicates} 个重复项`
            : `${parsed.rows.length} words · ${parsed.duplicates} duplicates`}
        </p>
        {parsed.errors.length > 0 && (
          <div role="alert" className="text-sm text-red-700">
            {parsed.errors.slice(0, 5).map((e) => (
              <p key={e}>{e}</p>
            ))}
          </div>
        )}
        {!!rows.length && (
          <div className="space-y-3">
            <div className="max-h-80 overflow-auto">
              <table className="w-full text-left text-sm [&_th]:bg-slate-100 [&_th]:p-3 [&_td]:px-3 [&_tr]:border-b [&_tr]:border-slate-100">
                <thead>
                  <tr>
                    <th>{t('Word', '单词')}</th>
                    <th>{t('Meaning', '释义')}</th>
                    <th>{t('Pronunciation', '音标')}</th>
                    <th>{t('Example', '例句')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(page * 20, (page + 1) * 20).map((r, i) => (
                    <tr key={page * 20 + i}>
                      {(['word', 'meaning', 'pronunciation', 'example'] as const).map((key) => (
                        <td key={key} className="py-2">
                          <input
                            disabled={busy || sourceHasErrors}
                            aria-label={`${key} ${page * 20 + i + 1}`}
                            value={r[key]}
                            className="min-h-11 min-w-28 w-full rounded-lg bg-slate-50 px-2 text-sm focus-visible:ring-2 focus-visible:ring-indigo-500"
                            onChange={(event) => {
                              setEditedRows(
                                rows.map((row, index) =>
                                  index === page * 20 + i ? { ...row, [key]: event.target.value } : row,
                                ),
                              );
                            }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <button
                type="button"
                disabled={page === 0}
                className="min-h-11 px-3 disabled:opacity-40"
                onClick={() => setPage(page - 1)}
              >
                {t('Previous', '上一页')}
              </button>
              <span>
                {page + 1} / {Math.max(1, Math.ceil(rows.length / 20))}
              </span>
              <button
                type="button"
                disabled={(page + 1) * 20 >= rows.length}
                className="min-h-11 px-3 disabled:opacity-40"
                onClick={() => setPage(page + 1)}
              >
                {t('Next', '下一页')}
              </button>
            </div>
          </div>
        )}
        <ImportActions>
          <button
            type="button"
            disabled={!draft.ready || busy || parsing || !title.trim() || !parsed.rows.length || !!parsed.errors.length}
            onClick={() => void save()}
            className="min-h-11 rounded-xl bg-indigo-600 px-4 py-2 text-white disabled:opacity-50 focus-visible:ring-2 active:scale-95 motion-reduce:transform-none"
          >
            {t('Import word book', '导入词书')}
          </button>
        </ImportActions>
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
      </fieldset>
    </details>
  );
}

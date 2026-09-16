'use client';

import { BookMarked, BookOpen, ChevronDown, List, MessagesSquare, Plus, Search, Target, Video } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useLearningWorkspace } from '@/hooks/use-learning-workspace';
import { db, LOCAL_DATABASE_CHANGED_EVENT } from '@/lib/db';
import { MATERIAL_LABELS, MATERIAL_TYPES } from '@/lib/material-types';
import { repairYouTubeHistory } from '@/lib/youtube-timeline-repair';
import { useContentStore } from '@/stores/content-store';
import { useLanguageStore } from '@/stores/language-store';
import type { MaterialType } from '@/types/content';
import { MaterialImportPanel } from './material-import-panel';

const icons = {
  wordbook: BookMarked,
  video: Video,
  reading: BookOpen,
  dialogue: MessagesSquare,
  sentences: List,
  scenario: Target,
};

export default function MaterialLibrary() {
  const [databaseKey, setDatabaseKey] = useState(db.name);
  const [timelineRepair, setTimelineRepair] = useState<{ repaired: number; pending: number } | null>(null);
  const [repairRun, setRepairRun] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const database = db;
    setTimelineRepair(null);
    void repairYouTubeHistory(database, fetch, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted && db === database) {
          setTimelineRepair(result);
          if (result.repaired) void useContentStore.getState().loadContents(true);
        }
      })
      .catch(() => {
        /* Do not block the library on unavailable local storage. */
      });
    const changed = () => controller.abort();
    window.addEventListener(LOCAL_DATABASE_CHANGED_EVENT, changed);
    return () => {
      controller.abort();
      window.removeEventListener(LOCAL_DATABASE_CHANGED_EVENT, changed);
    };
  }, [databaseKey, repairRun]);
  useEffect(() => {
    const changed = () => setDatabaseKey(db.name);
    window.addEventListener(LOCAL_DATABASE_CHANGED_EVENT, changed);
    return () => window.removeEventListener(LOCAL_DATABASE_CHANGED_EVENT, changed);
  }, []);
  const { data, error, retry } = useLearningWorkspace();
  const zh = useLanguageStore((s) => s.interfaceLanguage) === 'zh';
  const t = (en: string, cn: string) => (zh ? cn : en);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<MaterialType | 'all'>('all');
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState(false);
  const [initialFormat, setInitialFormat] = useState('file');
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState('');
  useEffect(() => {
    void useContentStore.getState().loadContents();
    const query = new URLSearchParams(window.location.search);
    if (query.has('import') || query.has('job')) {
      setInitialFormat(query.get('import') || 'file');
      setOpen(true);
      setOpened(true);
    }
    try {
      const saved = JSON.parse(sessionStorage.getItem('material-library-view') || '{}');
      if (typeof saved.search === 'string') setSearch(saved.search);
      if (saved.filter === 'all' || MATERIAL_TYPES.includes(saved.filter)) setFilter(saved.filter);
      if (Array.isArray(saved.collapsed)) setCollapsed(saved.collapsed.filter((s: unknown) => typeof s === 'string'));
    } catch {
      /* Ignore invalid view preferences. */
    }
  }, []);
  useEffect(() => {
    sessionStorage.setItem('material-library-view', JSON.stringify({ search, filter, collapsed }));
  }, [search, filter, collapsed]);
  const sources = useMemo(() => new Map(data?.contents.map((c) => [c.id, c]) ?? []), [data?.contents]);
  const recent = useMemo(() => {
    const times = new Map<string, number>();
    for (const s of data?.sessions ?? [])
      times.set(s.contentId, Math.max(times.get(s.contentId) || 0, s.endTime || s.startTime));
    return new Map(
      data?.units.map((u) => [
        u.id,
        Math.max(
          0,
          ...u.sourceIds.map((id) => times.get(id) || 0),
          ...data.lessons.filter((l) => l.unitId === u.id).flatMap((l) => l.exercises.map((e) => times.get(e.id) || 0)),
        ),
      ]) ?? [],
    );
  }, [data]);
  const units = (data?.units ?? [])
    .filter(
      (u) =>
        (!difficulty || u.difficulty === difficulty) &&
        (!search.trim() ||
          `${u.title} ${u.sourceIds
            .map((id) => {
              const c = sources.get(id);
              return `${c?.text ?? ''} ${c?.tags.join(' ') ?? ''}`;
            })
            .join(' ')}`
            .toLowerCase()
            .includes(search.trim().toLowerCase())),
    )
    .sort(
      (a, b) =>
        (recent.get(b.id) || 0) - (recent.get(a.id) || 0) ||
        b.updatedAt - a.updatedAt ||
        a.title.localeCompare(b.title),
    );
  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-24 text-slate-800">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {t('Learning materials', '学习材料')}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {t('One material. Listen, speak, read and write.', '一份材料，完成听、说、读、写。')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setOpened(true);
          }}
          className="flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-medium text-white active:scale-95 motion-reduce:transform-none"
        >
          <Plus className="h-4 w-4" />
          {t('Import material', '导入资料')}
        </button>
      </header>
      {timelineRepair && (timelineRepair.repaired > 0 || timelineRepair.pending > 0) && (
        <div role="status" className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-900">
          {timelineRepair.repaired > 0 && (
            <p>
              {t(
                'YouTube timing repaired; original timings are backed up.',
                'YouTube 时间轴已修复，原时间数据已备份。',
              )}
            </p>
          )}
          {timelineRepair.pending > 0 && (
            <p>
              {t(
                'Some legacy YouTube timings could not be verified. Originals are unchanged.',
                '部分历史 YouTube 时间轴暂未能核实，原数据未改动。',
              )}{' '}
              <button type="button" className="underline" onClick={() => setRepairRun((n) => n + 1)}>
                {t('Retry verification', '重新校验')}
              </button>
            </p>
          )}
        </div>
      )}
      {(opened || open) && (
        <MaterialImportPanel
          key={databaseKey}
          open={open}
          initialFormat={initialFormat}
          onClose={() => setOpen(false)}
          onImported={() => {
            void useContentStore.getState().loadContents(true);
          }}
        />
      )}
      <section aria-label={t('Filter materials', '筛选资料')} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex gap-3">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <input
              aria-label={t('Search materials', '搜索材料')}
              placeholder={t('Search materials…', '搜索材料…')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-h-11 w-full rounded-xl bg-slate-100 pl-10 pr-3 text-sm"
            />
          </div>
          <select
            aria-label={t('Difficulty', '难度')}
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="max-w-28 rounded-xl bg-slate-100 px-2 text-sm"
          >
            <option value="">{t('All levels', '所有难度')}</option>
            {['beginner', 'intermediate', 'advanced'].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          <button
            type="button"
            aria-pressed={filter === 'all'}
            onClick={() => setFilter('all')}
            className={`min-h-11 shrink-0 rounded-xl px-3 text-sm ${filter === 'all' ? 'bg-indigo-50 text-indigo-700' : ''}`}
          >
            {t('All', '全部')}
          </button>
          {MATERIAL_TYPES.map((kind) => {
            const Icon = icons[kind];
            return (
              <button
                key={kind}
                type="button"
                aria-pressed={filter === kind}
                onClick={() => setFilter(kind)}
                className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm ${filter === kind ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'}`}
              >
                <Icon className="h-4 w-4" />
                {MATERIAL_LABELS[kind][zh ? 1 : 0]}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500">
          {units.filter((u) => filter === 'all' || u.materialType === filter).length} {t('materials', '份材料')}
        </p>
      </section>
      {error && (
        <p role="alert">
          {error}{' '}
          <button type="button" onClick={retry}>
            {t('Retry', '重试')}
          </button>
        </p>
      )}
      {!data && !error && <p role="status">{t('Preparing materials…', '正在整理材料…')}</p>}
      {MATERIAL_TYPES.filter((kind) => filter === 'all' || filter === kind).map((kind) => {
        const group = units.filter((u) => u.materialType === kind);
        if (!group.length) return null;
        const expanded = !!search || !collapsed.includes(kind);
        const Icon = icons[kind];
        return (
          <section key={kind} className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setCollapsed((v) => (v.includes(kind) ? v.filter((k) => k !== kind) : [...v, kind]))}
              className="flex min-h-16 w-full items-center gap-3 px-5 py-3 text-left"
            >
              <Icon className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold">{MATERIAL_LABELS[kind][zh ? 1 : 0]}</h2>
              <span className="text-sm tabular-nums text-slate-400">{group.length}</span>
              <ChevronDown className={`ml-auto h-4 w-4 ${expanded ? '' : '-rotate-90'}`} />
            </button>
            {expanded && (
              <ul className="divide-y divide-slate-100 px-5">
                {group.map((unit) => (
                  <li key={unit.id} className="flex items-center justify-between gap-4 py-4">
                    <div className="min-w-0">
                      <h3 className="break-words text-sm font-semibold text-slate-800">{unit.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {unit.lessonIds.length} {t('lessons', '课')} · {unit.difficulty || t('Unrated', '未分级')}{' '}
                        {kind === 'reading' && unit.kind === 'book' ? ` · ${t('English book', '英文书籍')}` : ''}
                      </p>
                    </div>
                    <Link
                      href={`/learn/${encodeURIComponent(unit.id)}`}
                      aria-label={`${t('Study', '学习')} ${unit.title}`}
                      className="inline-flex min-h-11 shrink-0 items-center rounded-xl bg-indigo-50 px-3 text-sm font-medium text-indigo-700"
                    >
                      {recent.get(unit.id) ? t('Continue', '继续学习') : t('Start', '开始学习')}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
      {data && !units.some((u) => filter === 'all' || u.materialType === filter) && (
        <p className="py-12 text-center text-sm text-slate-500">
          {t(
            'No matching materials. Import a source or change the filters.',
            '没有匹配的材料。可以导入资料或调整筛选。',
          )}
        </p>
      )}
    </div>
  );
}

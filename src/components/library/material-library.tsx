'use client';

import { BookMarked, BookOpen, ChevronDown, List, MessagesSquare, Plus, Search, Target, Video, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState, PageHeader } from '@/components/layout/page-header';
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
  // Outcome of the verification attempted during this visit only; items tried within the last day are skipped,
  // so an earlier failure does not bring the banner back on every visit.
  const [timelineRepair, setTimelineRepair] = useState<{ repaired: number; pending: number } | null>(null);
  const [repairRun, setRepairRun] = useState(0);
  const forceRepairRef = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    const database = db;
    // Only an explicit "Retry verification" bypasses the once-per-day throttle; consume it for this run.
    const force = forceRepairRef.current;
    forceRepairRef.current = false;
    setTimelineRepair(null);
    void repairYouTubeHistory(database, fetch, controller.signal, { force })
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
    const requestedType = query.get('type');
    if (requestedType && MATERIAL_TYPES.includes(requestedType as MaterialType)) {
      setFilter(requestedType as MaterialType);
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
  const counts = new Map<MaterialType, number>();
  for (const unit of units)
    if (unit.materialType) counts.set(unit.materialType, (counts.get(unit.materialType) ?? 0) + 1);
  const visibleCount = units.filter((u) => filter === 'all' || u.materialType === filter).length;
  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-24 text-ink">
      <PageHeader
        eyebrow={t('Materials', '素材')}
        title={t('Library', '资料库')}
        description={t('One material. Listen, speak, read and write.', '一份材料，完成听、说、读、写。')}
        actions={
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setOpened(true);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-on-brand shadow-xs transition-colors hover:bg-brand-strong active:scale-[0.98] motion-reduce:transform-none"
          >
            <Plus className="size-4" />
            {t('Import material', '导入资料')}
          </button>
        }
      />
      {timelineRepair && (timelineRepair.repaired > 0 || timelineRepair.pending > 0) && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-info-line bg-info-soft p-3 text-sm text-info-ink"
        >
          <div className="min-w-0 flex-1 space-y-1">
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
                <button
                  type="button"
                  className="font-semibold underline"
                  onClick={() => {
                    forceRepairRef.current = true;
                    setRepairRun((n) => n + 1);
                  }}
                >
                  {t('Retry verification', '重新校验')}
                </button>
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label={t('Dismiss', '关闭')}
            onClick={() => setTimelineRepair(null)}
            className="-m-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-info/10"
          >
            <X className="size-4" aria-hidden />
          </button>
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
      <section aria-label={t('Filter materials', '筛选资料')} className="space-y-3">
        <div className="flex gap-2">
          <label className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-xl border border-line bg-surface px-4 shadow-xs focus-within:border-brand focus-within:ring-[3px] focus-within:ring-ring/15">
            <Search className="size-4 shrink-0 text-ink-4" />
            <input
              aria-label={t('Search materials', '搜索材料')}
              placeholder={t('Search materials…', '搜索材料…')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm text-ink outline-none"
            />
          </label>
          <select
            aria-label={t('Difficulty', '难度')}
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="h-11 max-w-36 rounded-xl border border-line bg-surface px-3 text-sm text-ink-2 shadow-xs"
          >
            <option value="">{t('All levels', '所有难度')}</option>
            {['beginner', 'intermediate', 'advanced'].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <button
            type="button"
            aria-pressed={filter === 'all'}
            onClick={() => setFilter('all')}
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors ${filter === 'all' ? 'bg-ink text-canvas' : 'bg-surface text-ink-2 ring-1 ring-line hover:bg-surface-2'}`}
          >
            {t('All', '全部')}
            <span className={`tabular-nums ${filter === 'all' ? 'text-canvas/70' : 'text-ink-4'}`}>{units.length}</span>
          </button>
          {MATERIAL_TYPES.map((kind) => {
            const Icon = icons[kind];
            const active = filter === kind;
            return (
              <button
                key={kind}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(kind)}
                className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors ${active ? 'bg-ink text-canvas' : 'bg-surface text-ink-2 ring-1 ring-line hover:bg-surface-2'}`}
              >
                <Icon className="size-3.5" />
                {MATERIAL_LABELS[kind][zh ? 1 : 0]}
                <span className={`tabular-nums ${active ? 'text-canvas/70' : 'text-ink-4'}`}>
                  {counts.get(kind) ?? 0}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-ink-4">
          {visibleCount} {visibleCount === 1 ? t('material', '份材料') : t('materials', '份材料')}
        </p>
      </section>
      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft p-4 text-sm text-danger-ink">
          {error}{' '}
          <button type="button" className="font-semibold underline" onClick={retry}>
            {t('Retry', '重试')}
          </button>
        </p>
      )}
      {!data && !error && (
        <div className="space-y-3" aria-busy="true">
          <p role="status" className="sr-only">
            {t('Preparing materials…', '正在整理材料…')}
          </p>
          {[0, 1].map((key) => (
            <div key={key} className="card-paper h-40 animate-pulse bg-surface-2" />
          ))}
        </div>
      )}
      {MATERIAL_TYPES.filter((kind) => filter === 'all' || filter === kind).map((kind) => {
        const group = units.filter((u) => u.materialType === kind);
        if (!group.length) return null;
        const expanded = !!search || !collapsed.includes(kind);
        const Icon = icons[kind];
        return (
          <section key={kind} className="card-paper overflow-hidden">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setCollapsed((v) => (v.includes(kind) ? v.filter((k) => k !== kind) : [...v, kind]))}
              className="flex min-h-14 w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-surface-2/60"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-surface-2 text-ink-2">
                <Icon className="size-4" />
              </span>
              <h2 className="text-[15px] font-semibold text-ink">{MATERIAL_LABELS[kind][zh ? 1 : 0]}</h2>
              <span className="text-sm tabular-nums text-ink-4">{group.length}</span>
              <ChevronDown
                className={`ml-auto size-4 text-ink-4 transition-transform ${expanded ? '' : '-rotate-90'}`}
              />
            </button>
            {expanded && (
              <ul className="divide-y divide-line border-t border-line">
                {group.map((unit) => (
                  <li
                    key={unit.id}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2/50"
                  >
                    <div className="min-w-0">
                      <h3 className="break-words text-sm font-semibold text-ink">{unit.title}</h3>
                      <p className="mt-0.5 text-xs text-ink-3">
                        {unit.lessonIds.length} {unit.lessonIds.length === 1 ? t('lesson', '课') : t('lessons', '课')} ·{' '}
                        <span className="capitalize">{unit.difficulty || t('Unrated', '未分级')}</span>
                        {kind === 'reading' && unit.kind === 'book' ? ` · ${t('English book', '英文书籍')}` : ''}
                      </p>
                    </div>
                    <Link
                      href={`/learn/${encodeURIComponent(unit.id)}`}
                      aria-label={`${t('Study', '学习')} ${unit.title}`}
                      className={`inline-flex h-9 shrink-0 items-center rounded-lg px-3.5 text-sm font-semibold transition-colors ${
                        recent.get(unit.id)
                          ? 'bg-brand text-on-brand hover:bg-brand-strong'
                          : 'bg-brand-soft text-brand-ink hover:bg-brand-tint'
                      }`}
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
        <EmptyState
          icon={<Search />}
          title={t('No matching materials', '没有匹配的材料')}
          description={t(
            'No matching materials. Import a source or change the filters.',
            '没有匹配的材料。可以导入资料或调整筛选。',
          )}
        />
      )}
    </div>
  );
}

'use client';

import { ArrowRight, BookMarked, BookOpen, CheckCircle2, Download, Layers, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/use-i18n';
import { cn } from '@/lib/utils';
import { ALL_WORDBOOKS } from '@/lib/wordbooks';
import { useContentStore } from '@/stores/content-store';
import { useLanguageStore } from '@/stores/language-store';
import { useWordBookStore } from '@/stores/wordbook-store';
import { getWordBookItemCount, type WordBook } from '@/types/wordbook';

// ─── Constants ────────────────────────────────────────────────────────────────

const VOCAB_FILTERS = [
  'All',
  'School',
  'Textbook',
  'College',
  'Graduate',
  'Domestic Exam',
  'Study Abroad',
  'Cambridge',
  'Core Vocabulary',
  'Professional',
  'Tech',
  'General',
  'Academic',
] as const;
const SCENARIO_FILTERS = [
  'All',
  'Travel',
  'Food & Drink',
  'Daily Life',
  'Business',
  'Health',
  'Social',
  'Emergency',
] as const;

const DIFFICULTY_CLASSNAMES = {
  beginner: 'bg-success-soft text-success-ink',
  intermediate: 'bg-warning-soft text-warning-ink',
  advanced: 'bg-danger-soft text-danger-ink',
} as const;

// ─── WordBook Card ─────────────────────────────────────────────────────────────

function WordBookCard({ book }: { book: WordBook }) {
  const zh = useLanguageStore((s) => s.interfaceLanguage) === 'zh';
  const { isImported, importWordBook, removeWordBook } = useWordBookStore();
  const { loadContents } = useContentStore();
  const { messages } = useI18n('wordbooks');
  const [loading, setLoading] = useState(false);
  const imported = isImported(book.id);
  const diffClassName = DIFFICULTY_CLASSNAMES[book.difficulty];

  const handleImport = async () => {
    setLoading(true);
    await importWordBook(book.id);
    await loadContents(true);
    setLoading(false);
  };

  const handleRemove = async () => {
    setLoading(true);
    await removeWordBook(book.id);
    await loadContents(true);
    setLoading(false);
  };

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-2xl border bg-surface/70 backdrop-blur-xl p-5 gap-3 transition-all duration-200',
        imported
          ? 'border-brand-line shadow-md shadow-brand'
          : 'border-line hover:border-brand-line hover:shadow-lg hover:shadow-brand',
      )}
    >
      {/* Imported badge */}
      {imported && (
        <div className="absolute top-3 right-3">
          <CheckCircle2 className="w-4.5 h-4.5 text-brand-ink" />
        </div>
      )}

      {/* Header: emoji icon + name */}
      <Link
        href={`/library/wordbooks/${book.id}`}
        className="flex items-start gap-3 cursor-pointer"
        data-testid={`wordbook-open-${book.id}`}
        aria-label={`Open word book ${book.nameEn}`}
      >
        <div className="w-12 h-12 rounded-xl bg-brand-soft flex items-center justify-center text-2xl shrink-0 transition-colors duration-200 group-hover:bg-brand-tint">
          {book.emoji}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <h3 className="font-semibold text-ink leading-tight line-clamp-1 group-hover:text-brand-ink transition-colors">
            {book.nameEn}
          </h3>
          <p className="text-xs text-brand-muted mt-0.5 font-medium">{book.filterTag}</p>
        </div>
      </Link>

      {/* Description */}
      <p className="text-sm text-brand-ink leading-relaxed line-clamp-2 flex-1">{book.description}</p>

      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="secondary" className={cn('text-xs font-medium', diffClassName)}>
          {messages.difficulty[book.difficulty]}
        </Badge>
        <Badge variant="outline" className="border-brand-line text-brand-muted text-xs">
          {messages.items.replace('{{count}}', String(getWordBookItemCount(book)))}
        </Badge>
      </div>

      {/* Action button */}
      <div className="mt-auto pt-1">
        {imported && (
          <Link
            href={`/learn/${encodeURIComponent(`unit:category:${book.id}`)}`}
            className="mb-2 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white focus-visible:ring-2 active:scale-95 motion-reduce:transform-none"
          >
            {zh ? '学习' : 'Study'} <ArrowRight className="h-4 w-4" />
          </Link>
        )}
        {imported ? (
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={handleRemove}
            className="w-full border-danger-line text-danger hover:bg-danger-soft hover:text-danger cursor-pointer transition-colors duration-150"
            aria-label={`Remove word book ${book.nameEn}`}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            {messages.actions.remove}
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={loading}
            onClick={handleImport}
            className="w-full bg-brand hover:bg-brand-strong cursor-pointer transition-colors duration-150"
            aria-label={`Add word book ${book.nameEn} to library`}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            {loading ? messages.actions.adding : messages.actions.addToLibrary}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Filter chips ─────────────────────────────────────────────────────────────

function FilterChips<T extends string>({
  options,
  active,
  onChange,
}: {
  options: readonly T[];
  active: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((opt) => (
        <button
          type="button"
          key={opt}
          onClick={() => onChange(opt)}
          data-testid={`wordbooks-filter-${opt.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
          className={cn(
            'px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-150 cursor-pointer whitespace-nowrap',
            active === opt
              ? 'bg-brand text-white shadow-sm shadow-brand'
              : 'bg-surface/80 text-brand-ink border border-brand-line hover:border-brand hover:bg-brand-soft',
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────

type Tab = 'vocabulary' | 'scenarios';

function TabButton({
  active,
  value,
  label,
  icon: Icon,
  count,
  onClick,
  testId,
}: {
  active: Tab;
  value: Tab;
  label: string;
  icon: React.ElementType;
  count: number;
  onClick: () => void;
  testId?: string;
}) {
  const isActive = active === value;
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={cn(
        'flex min-w-0 items-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-150 cursor-pointer',
        isActive ? 'bg-surface shadow-sm text-ink' : 'text-brand-ink hover:text-brand-ink hover:bg-surface/50',
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
      <span
        className={cn(
          'ml-0.5 text-xs px-1.5 py-0.5 rounded-full font-medium',
          isActive ? 'bg-brand-tint text-brand-ink' : 'bg-brand-soft text-brand-muted',
        )}
      >
        {count}
      </span>
    </button>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ filter }: { filter: string }) {
  const { messages } = useI18n('wordbooks');
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-brand-soft flex items-center justify-center mb-4">
        <BookOpen className="w-8 h-8 text-brand-muted" />
      </div>
      <p className="font-medium text-ink">
        {messages.empty.title} &ldquo;{filter}&rdquo;
      </p>
      <p className="text-sm text-brand-muted mt-1">{messages.empty.subtitle}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WordBookCatalog() {
  const { loadImportedState } = useWordBookStore();
  const { messages } = useI18n('wordbooks');
  const [activeTab, setActiveTab] = useState<Tab>('vocabulary');
  const [vocabFilter, setVocabFilter] = useState<(typeof VOCAB_FILTERS)[number]>('All');
  const [scenarioFilter, setScenarioFilter] = useState<(typeof SCENARIO_FILTERS)[number]>('All');

  useEffect(() => {
    loadImportedState();
  }, [loadImportedState]);

  const allVocab = useMemo(() => ALL_WORDBOOKS.filter((b) => b.kind === 'vocabulary'), []);
  const allScenarios = useMemo(() => ALL_WORDBOOKS.filter((b) => b.kind === 'scenario'), []);

  const filteredVocab = useMemo(
    () => (vocabFilter === 'All' ? allVocab : allVocab.filter((b) => b.filterTag === vocabFilter)),
    [allVocab, vocabFilter],
  );
  const filteredScenarios = useMemo(
    () => (scenarioFilter === 'All' ? allScenarios : allScenarios.filter((b) => b.filterTag === scenarioFilter)),
    [allScenarios, scenarioFilter],
  );
  const displayedBooks = activeTab === 'vocabulary' ? filteredVocab : filteredScenarios;
  const activeFilter = activeTab === 'vocabulary' ? vocabFilter : scenarioFilter;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* ── Tabs ── */}
      <div className="flex max-w-full gap-1 p-1 bg-brand-tint/70 rounded-xl w-fit">
        <TabButton
          active={activeTab}
          value="vocabulary"
          label={messages.tabs.vocabulary}
          icon={BookMarked}
          count={allVocab.length}
          onClick={() => setActiveTab('vocabulary')}
          testId="wordbooks-tab-vocabulary"
        />
        <TabButton
          active={activeTab}
          value="scenarios"
          label={messages.tabs.scenarios}
          icon={Layers}
          count={allScenarios.length}
          onClick={() => setActiveTab('scenarios')}
          testId="wordbooks-tab-scenarios"
        />
      </div>

      {/* ── Filter chips ── */}
      <div className="space-y-1">
        {activeTab === 'vocabulary' ? (
          <FilterChips options={VOCAB_FILTERS} active={vocabFilter} onChange={setVocabFilter} />
        ) : (
          <FilterChips options={SCENARIO_FILTERS} active={scenarioFilter} onChange={setScenarioFilter} />
        )}
        <p className="text-xs text-brand-muted pl-1 pt-1">
          {displayedBooks.length === 1
            ? messages.bookCount.replace('{{count}}', '1')
            : messages.bookCountPlural.replace('{{count}}', String(displayedBooks.length))}
          &ldquo;{activeFilter}&rdquo;
        </p>
      </div>

      {/* ── Grid ── */}
      {displayedBooks.length === 0 ? (
        <EmptyState filter={activeFilter} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayedBooks.map((book) => (
            <WordBookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useWordBookStore } from '@/stores/wordbook-store';
import { useContentStore } from '@/stores/content-store';
import { ALL_WORDBOOKS } from '@/lib/wordbooks';
import type { WordBook } from '@/types/wordbook';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, CheckCircle2, Download, Trash2, BookMarked, Layers } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const VOCAB_FILTERS = ['All', 'School', 'College', 'Graduate', 'Study Abroad', 'Professional', 'Daily Life'] as const;
const SCENARIO_FILTERS = ['All', 'Travel', 'Food & Drink', 'Daily Life', 'Business', 'Health', 'Social', 'Emergency'] as const;

const DIFFICULTY_CONFIG = {
  beginner: { label: 'Beginner', className: 'bg-emerald-100 text-emerald-700' },
  intermediate: { label: 'Intermediate', className: 'bg-amber-100 text-amber-700' },
  advanced: { label: 'Advanced', className: 'bg-rose-100 text-rose-700' },
} as const;

// ─── WordBook Card ─────────────────────────────────────────────────────────────

function WordBookCard({ book }: { book: WordBook }) {
  const { isImported, importWordBook, removeWordBook } = useWordBookStore();
  const { loadContents } = useContentStore();
  const [loading, setLoading] = useState(false);
  const imported = isImported(book.id);
  const diff = DIFFICULTY_CONFIG[book.difficulty];

  const handleImport = async () => {
    setLoading(true);
    await importWordBook(book.id);
    await loadContents();
    setLoading(false);
  };

  const handleRemove = async () => {
    setLoading(true);
    await removeWordBook(book.id);
    await loadContents();
    setLoading(false);
  };

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-2xl border bg-white/70 backdrop-blur-xl p-5 gap-3 transition-all duration-200',
        imported
          ? 'border-indigo-300 shadow-md shadow-indigo-50'
          : 'border-indigo-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50',
      )}
    >
      {/* Imported badge */}
      {imported && (
        <div className="absolute top-3 right-3">
          <CheckCircle2 className="w-4.5 h-4.5 text-indigo-500" />
        </div>
      )}

      {/* Header: emoji icon + name */}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-2xl shrink-0 transition-colors duration-200 group-hover:bg-indigo-100">
          {book.emoji}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <h3 className="font-semibold text-indigo-900 leading-tight line-clamp-1">{book.nameEn}</h3>
          <p className="text-xs text-indigo-400 mt-0.5 font-medium">{book.filterTag}</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-indigo-600 leading-relaxed line-clamp-2 flex-1">{book.description}</p>

      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="secondary" className={cn('text-xs font-medium', diff.className)}>
          {diff.label}
        </Badge>
        <Badge variant="outline" className="border-indigo-200 text-indigo-400 text-xs">
          {book.items.length} items
        </Badge>
      </div>

      {/* Action button */}
      <div className="mt-auto pt-1">
        {imported ? (
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={handleRemove}
            className="w-full border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600 cursor-pointer transition-colors duration-150"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Remove
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={loading}
            onClick={handleImport}
            className="w-full bg-indigo-600 hover:bg-indigo-700 cursor-pointer transition-colors duration-150"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            {loading ? 'Adding…' : 'Add to Library'}
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
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            'px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-150 cursor-pointer whitespace-nowrap',
            active === opt
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
              : 'bg-white/80 text-indigo-600 border border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50',
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
}: {
  active: Tab;
  value: Tab;
  label: string;
  icon: React.ElementType;
  count: number;
  onClick: () => void;
}) {
  const isActive = active === value;
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer',
        isActive
          ? 'bg-white shadow-sm text-indigo-900'
          : 'text-indigo-500 hover:text-indigo-700 hover:bg-white/50',
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
      <span
        className={cn(
          'ml-0.5 text-xs px-1.5 py-0.5 rounded-full font-medium',
          isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-indigo-50 text-indigo-400',
        )}
      >
        {count}
      </span>
    </button>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ filter }: { filter: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
        <BookOpen className="w-8 h-8 text-indigo-300" />
      </div>
      <p className="font-medium text-indigo-900">No books in &ldquo;{filter}&rdquo;</p>
      <p className="text-sm text-indigo-400 mt-1">Try selecting a different category above</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WordBooksPage() {
  const { loadImportedState, importedIds } = useWordBookStore();
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
    () =>
      scenarioFilter === 'All' ? allScenarios : allScenarios.filter((b) => b.filterTag === scenarioFilter),
    [allScenarios, scenarioFilter],
  );

  const importedCount = importedIds.size;
  const displayedBooks = activeTab === 'vocabulary' ? filteredVocab : filteredScenarios;
  const activeFilter = activeTab === 'vocabulary' ? vocabFilter : scenarioFilter;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-[var(--font-poppins)] text-indigo-900">Word Books</h1>
          <p className="text-indigo-500 mt-1 text-sm">
            Choose a vocabulary book or scenario pack and import it to start practicing
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {importedCount > 0 && (
            <div className="flex items-center gap-1.5 bg-indigo-100 text-indigo-700 text-sm font-medium px-3 py-1.5 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {importedCount} imported
            </div>
          )}
          <Link href="/library">
            <Button
              variant="outline"
              size="sm"
              className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 mr-1.5" />
              View Library
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 bg-indigo-100/70 rounded-xl w-fit">
        <TabButton
          active={activeTab}
          value="vocabulary"
          label="Vocabulary Books"
          icon={BookMarked}
          count={allVocab.length}
          onClick={() => setActiveTab('vocabulary')}
        />
        <TabButton
          active={activeTab}
          value="scenarios"
          label="Scenario Packs"
          icon={Layers}
          count={allScenarios.length}
          onClick={() => setActiveTab('scenarios')}
        />
      </div>

      {/* ── Filter chips ── */}
      <div className="space-y-1">
        {activeTab === 'vocabulary' ? (
          <FilterChips
            options={VOCAB_FILTERS}
            active={vocabFilter}
            onChange={setVocabFilter}
          />
        ) : (
          <FilterChips
            options={SCENARIO_FILTERS}
            active={scenarioFilter}
            onChange={setScenarioFilter}
          />
        )}
        <p className="text-xs text-indigo-400 pl-1 pt-1">
          {displayedBooks.length} book{displayedBooks.length !== 1 ? 's' : ''} in &ldquo;{activeFilter}&rdquo;
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

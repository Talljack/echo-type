'use client';

import { ArrowLeft, BookMarked, ChevronRight, Layers, Loader2, Search, Volume2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTTS } from '@/hooks/use-tts';
import enWBDetail from '@/lib/i18n/messages/wordbook-detail/en.json';
import zhWBDetail from '@/lib/i18n/messages/wordbook-detail/zh.json';
import { cn } from '@/lib/utils';
import { ALL_WORDBOOKS, getWordBook, loadWordBookItems } from '@/lib/wordbooks';
import { useLanguageStore } from '@/stores/language-store';
import { getWordBookItemCount, type WordBook, type WordItem } from '@/types/wordbook';

const WBD_LOCALES = { en: enWBDetail, zh: zhWBDetail } as const;

// ─── Config ──────────────────────────────────────────────────────────────────

const difficultyColors: Record<string, string> = {
  beginner: 'bg-success-soft text-success-ink',
  intermediate: 'bg-warning-soft text-warning-ink',
  advanced: 'bg-danger-soft text-danger-ink',
};

// ─── Related Books ───────────────────────────────────────────────────────────

function getRelatedBooks(book: WordBook, limit = 4): WordBook[] {
  return ALL_WORDBOOKS.filter((b) => b.id !== book.id && b.kind === book.kind)
    .map((b) => {
      let score = 0;
      // Same filterTag = strong match
      if (b.filterTag === book.filterTag) score += 3;
      // Same difficulty
      if (b.difficulty === book.difficulty) score += 2;
      // Overlapping tags
      const overlap = b.tags.filter((t) => book.tags.includes(t)).length;
      score += overlap;
      return { book: b, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.book);
}

// ─── Word Card ───────────────────────────────────────────────────────────────

function WordCard({
  title,
  text,
  difficulty,
  index,
}: {
  title: string;
  text: string;
  difficulty?: string;
  index: number;
}) {
  const [speaking, setSpeaking] = useState(false);
  const { speak, stop } = useTTS();

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (speaking) {
      stop();
      setSpeaking(false);
      return;
    }

    setSpeaking(true);
    void Promise.resolve(speak(title, { rate: 0.9 })).finally(() => {
      setSpeaking(false);
    });
  };

  return (
    <Card className="bg-surface border-line shadow-sm hover:shadow-md transition-all duration-200 group">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-xs text-brand-muted font-mono mt-1 w-6 text-right shrink-0">{index + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-ink text-lg">{title}</h3>
              <button
                type="button"
                onClick={handleSpeak}
                aria-label={`${speaking ? 'Stop' : 'Play'} pronunciation for ${title}`}
                aria-pressed={speaking}
                className={cn(
                  'p-1 rounded-full transition-colors cursor-pointer',
                  speaking
                    ? 'text-brand-ink bg-brand-tint'
                    : 'text-brand-muted hover:text-brand-ink hover:bg-brand-soft',
                )}
              >
                <Volume2 className="w-4 h-4" />
              </button>
              {difficulty && (
                <Badge className={cn('text-xs', difficultyColors[difficulty])} variant="secondary">
                  {difficulty}
                </Badge>
              )}
            </div>
            <p className="text-sm text-ink-2 leading-relaxed">{text}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Related Book Card ───────────────────────────────────────────────────────

function RelatedBookCard({ book }: { book: WordBook }) {
  const t = WBD_LOCALES[useLanguageStore((s) => s.interfaceLanguage)];
  return (
    <Link href={`/library/wordbooks/${book.id}`}>
      <Card className="bg-surface border-line shadow-sm hover:shadow-md hover:border-brand-line transition-all duration-200 cursor-pointer group">
        <CardContent className="flex items-center gap-3 p-3">
          <span className="text-2xl">{book.emoji}</span>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-ink text-sm truncate">{book.nameEn}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge className={cn('text-xs', difficultyColors[book.difficulty])} variant="secondary">
                {book.difficulty}
              </Badge>
              <span className="text-xs text-brand-muted">
                {t.wordCount.replace('{{count}}', String(getWordBookItemCount(book)))}
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-brand-muted group-hover:text-brand-ink transition-colors shrink-0" />
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function WordBookDetailPage() {
  const t = WBD_LOCALES[useLanguageStore((s) => s.interfaceLanguage)];
  const params = useParams();
  const router = useRouter();
  const bookId = params.bookId as string;
  const book = getWordBook(bookId);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<WordItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  // Load items lazily (from JSON or inline)
  useEffect(() => {
    if (!bookId) return;
    setLoadingItems(true);
    loadWordBookItems(bookId).then((loaded) => {
      setItems(loaded);
      setLoadingItems(false);
    });
  }, [bookId]);

  const filteredItems = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((item) => item.title.toLowerCase().includes(q) || item.text.toLowerCase().includes(q));
  }, [items, search]);

  const relatedBooks = useMemo(() => {
    if (!book) return [];
    return getRelatedBooks(book);
  }, [book]);

  if (!book) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <p className="text-lg text-ink font-semibold">{t.notFound}</p>
        <Button onClick={() => router.push('/library/wordbooks')} className="bg-brand">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          {t.backToWordBooks}
        </Button>
      </div>
    );
  }

  const diff = difficultyColors[book.difficulty];
  const isVocab = book.kind === 'vocabulary';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/library/wordbooks')}
          data-testid="wordbook-detail-back"
          className="text-brand-ink hover:text-brand-ink -ml-2 mb-3 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          {t.backToWordBooks}
        </Button>

        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-soft flex items-center justify-center text-3xl shrink-0">
            {book.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-ink">{book.nameEn}</h1>
              {diff && (
                <Badge className={diff} variant="secondary">
                  {book.difficulty}
                </Badge>
              )}
            </div>
            <p className="text-brand-ink mt-1">{book.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="border-brand-line text-brand-muted">
                {isVocab ? <BookMarked className="w-3 h-3 mr-1" /> : <Layers className="w-3 h-3 mr-1" />}
                {book.filterTag}
              </Badge>
              <Badge variant="outline" className="border-brand-line text-brand-muted">
                {t.wordCount.replace('{{count}}', String(getWordBookItemCount(book)))}
              </Badge>
              {book.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="border-line text-ink-4 text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Practice buttons */}
      <div className="flex gap-2 flex-wrap">
        <Link href={`/listen/book/${book.id}`}>
          <Button size="sm" className="bg-brand hover:bg-brand-strong cursor-pointer">
            {t.practice.listening}
          </Button>
        </Link>
        <Link href={`/speak/book/${book.id}`}>
          <Button size="sm" variant="outline" className="border-brand-line text-brand-ink cursor-pointer">
            {t.practice.speaking}
          </Button>
        </Link>
        <Link href={`/read/book/${book.id}`}>
          <Button size="sm" variant="outline" className="border-brand-line text-brand-ink cursor-pointer">
            {t.practice.reading}
          </Button>
        </Link>
        <Link href={`/write/book/${book.id}`}>
          <Button size="sm" variant="outline" className="border-brand-line text-brand-ink cursor-pointer">
            {t.practice.writing}
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
        <Input
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Word book search"
          className="pl-10 bg-surface/70 border-brand-line"
          data-testid="wordbook-detail-search"
        />
      </div>

      {/* Word count */}
      <p className="text-sm text-brand-muted">
        {loadingItems
          ? t.loadingWords
          : filteredItems.length === items.length
            ? t.wordCount.replace('{{count}}', String(items.length))
            : t.wordCountFiltered
                .replace('{{filtered}}', String(filteredItems.length))
                .replace('{{total}}', String(items.length))}
      </p>

      {/* Word list */}
      {loadingItems ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-brand-muted animate-spin" />
        </div>
      ) : (
        <div className="grid gap-2">
          {filteredItems.map((item, i) => (
            <WordCard
              key={`${item.title}-${i}`}
              title={item.title}
              text={item.text}
              difficulty={item.difficulty}
              index={i}
            />
          ))}
          {filteredItems.length === 0 && search && (
            <div className="py-12 text-center text-brand-muted">
              {t.noWordsMatching} &ldquo;{search}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* Related word books */}
      {relatedBooks.length > 0 && (
        <div className="pt-4 border-t border-line">
          <h2 className="text-lg font-semibold text-ink mb-3">{t.relatedWordBooks}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {relatedBooks.map((rb) => (
              <RelatedBookCard key={rb.id} book={rb} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

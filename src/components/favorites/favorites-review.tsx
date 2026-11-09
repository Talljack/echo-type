'use client';

import { ArrowLeft, Volume2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Rating } from 'ts-fsrs';
import { PageSpinner } from '@/components/shared/page-spinner';
import { Button } from '@/components/ui/button';
import { db, LOCAL_DATABASE_CHANGED_EVENT } from '@/lib/db';
import { previewRatings } from '@/lib/fsrs';
import { cn } from '@/lib/utils';
import { useFavoriteStore } from '@/stores/favorite-store';

export function FavoritesReview() {
  return (
    <Suspense fallback={<PageSpinner size="sm" className="min-h-[40vh]" />}>
      <FavoritesReviewRoute />
    </Suspense>
  );
}

function FavoritesReviewRoute() {
  const targetId = useSearchParams().get('item');
  const [databaseName, setDatabaseName] = useState(db.name);
  useEffect(() => {
    const change = () => setDatabaseName(db.name);
    window.addEventListener(LOCAL_DATABASE_CHANGED_EVENT, change);
    return () => window.removeEventListener(LOCAL_DATABASE_CHANGED_EVENT, change);
  }, []);
  return <FavoritesReviewSession key={`${databaseName}:${targetId ?? '*'}`} targetId={targetId} />;
}

function FavoritesReviewSession({ targetId }: { targetId: string | null }) {
  const gradeReview = useFavoriteStore((s) => s.gradeReview);
  const isLoaded = useFavoriteStore((s) => s.isLoaded);
  const [revealed, setRevealed] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [reviewedIds, setReviewedIds] = useState<string[]>([]);
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState('');
  const gradingLock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const currentIndex = completedCount;

  const favorites = useFavoriteStore((s) => s.favorites);
  const dueItems = useMemo(() => {
    const now = Date.now();
    return favorites.filter(
      (f) =>
        !reviewedIds.includes(f.id) &&
        (!targetId || f.id === targetId) &&
        (f.fsrsCard?.due ?? f.nextReview ?? Infinity) <= now,
    );
  }, [favorites, targetId, reviewedIds]);
  const totalCount = dueItems.length + completedCount;

  if (!isLoaded) {
    return <PageSpinner size="sm" className="min-h-[40vh]" />;
  }

  if (dueItems.length === 0 && !grading) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="max-w-lg mx-auto text-center py-20">
          <div className="text-4xl mb-4">&#127881;</div>
          <p className="text-lg font-medium text-ink-2">
            {completedCount > 0 ? `已完成 ${completedCount} 项复习！` : '没有待复习的收藏'}
          </p>
          <Link href="/favorites">
            <Button variant="outline" className="mt-4 gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              返回收藏列表
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!dueItems.length) return <PageSpinner size="sm" className="min-h-[40vh]" />;
  const item = dueItems[0]!;
  const previews = previewRatings(item.fsrsCard);

  const handleGrade = async (rating: Rating) => {
    if (gradingLock.current) return;
    const database = db;
    const isCurrent = () => mounted.current && database === db;
    gradingLock.current = true;
    setGrading(true);
    setGradeError('');
    try {
      await gradeReview(item.id, rating);
      if (!isCurrent()) return;
      setReviewedIds((ids) => [...ids, item.id]);
      setCompletedCount((c) => c + 1);
      setRevealed(false);
    } catch {
      if (isCurrent()) setGradeError('Review could not be saved. Please try again. / 复习保存失败，请重试。');
    } finally {
      gradingLock.current = false;
      if (isCurrent()) setGrading(false);
    }
  };

  const handleTTS = () => {
    window.speechSynthesis?.cancel();
    const u = new SpeechSynthesisUtterance(item.text);
    u.lang = 'en-US';
    window.speechSynthesis?.speak(u);
  };

  const RATING_BUTTONS = [
    { rating: Rating.Again, label: 'Again', color: 'bg-danger hover:bg-danger' },
    { rating: Rating.Hard, label: 'Hard', color: 'bg-warning hover:bg-warning' },
    { rating: Rating.Good, label: 'Good', color: 'bg-success hover:bg-success' },
    { rating: Rating.Easy, label: 'Easy', color: 'bg-info hover:bg-info' },
  ];

  return (
    <div className="max-w-lg mx-auto">
      {gradeError && (
        <p role="alert" className="mb-4 rounded-xl bg-danger-soft p-3 text-sm text-danger-ink">
          {gradeError}
        </p>
      )}
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/favorites"
            className="text-sm text-ink-3 hover:text-ink-2 flex items-center gap-1"
            aria-label="Back to favorites"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <span className="text-sm text-ink-3">
            {currentIndex + 1} / {totalCount}
          </span>
        </div>

        <div className="h-1.5 bg-surface-3 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all duration-300"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>

        <div
          className={cn(
            'rounded-2xl border border-line bg-surface shadow-sm p-8 text-center min-h-[240px] flex flex-col items-center justify-center',
            !revealed && 'cursor-pointer hover:bg-surface-2 transition-colors',
          )}
          data-testid="favorites-review-card"
          role="button"
          tabIndex={0}
          aria-label="favorites-review-card"
          onClick={() => !revealed && setRevealed(true)}
          onKeyDown={(event) => {
            if (revealed || (event.key !== 'Enter' && event.key !== ' ')) return;
            event.preventDefault();
            setRevealed(true);
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl font-bold text-ink" data-testid="favorites-review-current-text">
              {item.text}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                handleTTS();
              }}
            >
              <Volume2 className="h-4 w-4" />
            </Button>
          </div>

          {item.type === 'word' && item.pronunciation && (
            <p className="text-sm text-ink-4 font-mono mb-4">{item.pronunciation}</p>
          )}

          {revealed ? (
            <div className="mt-4 space-y-2">
              <p className="text-lg text-ink-2">{item.translation}</p>
              {item.context && <p className="text-xs text-ink-4 mt-2">{item.context}</p>}
            </div>
          ) : (
            <p className="text-sm text-ink-4 mt-4">点击翻转查看翻译</p>
          )}
        </div>

        {revealed && (
          <div className="grid grid-cols-4 gap-2 mt-6">
            {RATING_BUTTONS.map(({ rating, label, color }) => {
              const preview = previews[rating];
              return (
                <button
                  type="button"
                  key={rating}
                  disabled={grading}
                  onClick={() => handleGrade(rating)}
                  data-testid={`favorites-review-rate-${rating}`}
                  aria-label={`favorites-review-rate-${rating}`}
                  className={cn('py-3 rounded-xl text-white font-medium text-sm transition-colors', color)}
                >
                  <span className="block">{label}</span>
                  <span className="block text-[10px] opacity-80 mt-0.5">{preview.interval}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

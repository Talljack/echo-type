'use client';

import { ArrowLeft, Volume2 } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Rating } from 'ts-fsrs';
import { Button } from '@/components/ui/button';
import { previewRatings } from '@/lib/fsrs';
import { cn } from '@/lib/utils';
import { useFavoriteStore } from '@/stores/favorite-store';

export function FavoritesReview() {
  const getDueForReview = useFavoriteStore((s) => s.getDueForReview);
  const gradeReview = useFavoriteStore((s) => s.gradeReview);
  const isLoaded = useFavoriteStore((s) => s.isLoaded);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  const dueItems = useMemo(() => getDueForReview(), [getDueForReview]);
  const totalCount = dueItems.length;

  if (!isLoaded) {
    return <div className="h-64 flex items-center justify-center text-slate-400">Loading...</div>;
  }

  if (totalCount === 0 || currentIndex >= totalCount) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="text-4xl mb-4">&#127881;</div>
        <p className="text-lg font-medium text-slate-700">
          {completedCount > 0 ? `已完成 ${completedCount} 项复习！` : '没有待复习的收藏'}
        </p>
        <Link href="/favorites">
          <Button variant="outline" className="mt-4 gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            返回收藏列表
          </Button>
        </Link>
      </div>
    );
  }

  const item = dueItems[currentIndex]!;
  const previews = previewRatings(item.fsrsCard);

  const handleGrade = async (rating: Rating) => {
    await gradeReview(item.id, rating);
    setCompletedCount((c) => c + 1);
    setRevealed(false);
    setCurrentIndex((i) => i + 1);
  };

  const handleTTS = () => {
    window.speechSynthesis?.cancel();
    const u = new SpeechSynthesisUtterance(item.text);
    u.lang = 'en-US';
    window.speechSynthesis?.speak(u);
  };

  const RATING_BUTTONS = [
    { rating: Rating.Again, label: 'Again', color: 'bg-red-500 hover:bg-red-600' },
    { rating: Rating.Hard, label: 'Hard', color: 'bg-amber-500 hover:bg-amber-600' },
    { rating: Rating.Good, label: 'Good', color: 'bg-green-500 hover:bg-green-600' },
    { rating: Rating.Easy, label: 'Easy', color: 'bg-blue-500 hover:bg-blue-600' },
  ];

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/favorites" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <span className="text-sm text-slate-500">
          {currentIndex + 1} / {totalCount}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-100 rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
          style={{ width: `${(completedCount / totalCount) * 100}%` }}
        />
      </div>

      {/* Flashcard */}
      <div
        className={cn(
          'rounded-2xl border border-slate-200 bg-white shadow-sm p-8 text-center min-h-[240px] flex flex-col items-center justify-center',
          !revealed && 'cursor-pointer hover:bg-slate-50 transition-colors',
        )}
        onClick={() => !revealed && setRevealed(true)}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl font-bold text-slate-900">{item.text}</span>
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
          <p className="text-sm text-slate-400 font-mono mb-4">{item.pronunciation}</p>
        )}

        {revealed ? (
          <div className="mt-4 space-y-2">
            <p className="text-lg text-slate-700">{item.translation}</p>
            {item.context && <p className="text-xs text-slate-400 mt-2">{item.context}</p>}
          </div>
        ) : (
          <p className="text-sm text-slate-400 mt-4">点击翻转查看翻译</p>
        )}
      </div>

      {/* Rating buttons */}
      {revealed && (
        <div className="grid grid-cols-4 gap-2 mt-6">
          {RATING_BUTTONS.map(({ rating, label, color }) => {
            const preview = previews[rating];
            return (
              <button
                key={rating}
                onClick={() => handleGrade(rating)}
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
  );
}

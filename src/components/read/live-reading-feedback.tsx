'use client';

import type { ProgressiveWordResult } from '@/lib/levenshtein';

type LiveFeedbackWord = ProgressiveWordResult & {
  provisional?: boolean;
};

interface LiveReadingFeedbackProps {
  results: LiveFeedbackWord[];
}

const badgeStyles: Record<
  ProgressiveWordResult['accuracy'],
  {
    container: string;
    text: string;
    label: string;
  }
> = {
  correct: {
    container: 'border-green-200 bg-green-50/90',
    text: 'text-green-700',
    label: 'Correct',
  },
  close: {
    container: 'border-amber-200 bg-amber-50/90',
    text: 'text-amber-700',
    label: 'Close',
  },
  wrong: {
    container: 'border-red-200 bg-red-50/90',
    text: 'text-red-700',
    label: 'Try again',
  },
  missing: {
    container: 'border-slate-200 bg-slate-50/90',
    text: 'text-slate-400',
    label: 'Missed',
  },
  extra: {
    container: 'border-fuchsia-200 bg-fuchsia-50/90',
    text: 'text-fuchsia-700',
    label: 'Extra',
  },
  pending: {
    container: 'border-slate-200 bg-white/80',
    text: 'text-slate-400',
    label: 'Pending',
  },
};

export function LiveReadingFeedback({ results }: LiveReadingFeedbackProps) {
  const spokenCount = results.filter((result) => result.accuracy !== 'pending').length;
  const issueCount = results.filter((result) => result.accuracy === 'wrong' || result.accuracy === 'close').length;

  return (
    <div className="rounded-2xl border border-indigo-100/80 bg-white/75 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-indigo-900">Live Reading Feedback</h3>
          <p className="text-xs text-indigo-500">
            {spokenCount === 0
              ? 'Start reading. Feedback will appear as words are recognized.'
              : `${spokenCount} words processed${issueCount > 0 ? ` · ${issueCount} to revisit` : ''}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-indigo-400">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-400" />
            Correct
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Close
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            Retry
          </span>
        </div>
      </div>

      <div className="mt-3 max-h-40 overflow-y-auto pr-1">
        <div className="flex flex-wrap gap-1.5">
          {results.map((result, index) => {
            const style = badgeStyles[result.accuracy];

            return (
              <span
                key={`${result.word}-${index}`}
                className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-sm transition-colors ${
                  style.container
                } ${style.text} ${result.provisional ? 'border-dashed opacity-75' : ''}`}
                title={result.hint || style.label}
              >
                {result.word}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

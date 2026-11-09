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
    container: 'border-success-line bg-success-soft/90',
    text: 'text-success-ink',
    label: 'Correct',
  },
  close: {
    container: 'border-warning-line bg-warning-soft/90',
    text: 'text-warning-ink',
    label: 'Close',
  },
  wrong: {
    container: 'border-danger-line bg-danger-soft/90',
    text: 'text-danger-ink',
    label: 'Try again',
  },
  missing: {
    container: 'border-line bg-surface-2/90',
    text: 'text-ink-4',
    label: 'Missed',
  },
  extra: {
    container: 'border-fuchsia-200 bg-fuchsia-50/90',
    text: 'text-fuchsia-700',
    label: 'Extra',
  },
  pending: {
    container: 'border-line bg-surface/80',
    text: 'text-ink-4',
    label: 'Pending',
  },
};

export function LiveReadingFeedback({ results }: LiveReadingFeedbackProps) {
  const spokenCount = results.filter((result) => result.accuracy !== 'pending').length;
  const issueCount = results.filter((result) => result.accuracy === 'wrong' || result.accuracy === 'close').length;

  return (
    <div className="rounded-2xl border border-line/80 bg-surface/75 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">Live Reading Feedback</h3>
          <p className="text-xs text-brand-ink">
            {spokenCount === 0
              ? 'Start reading. Feedback will appear as words are recognized.'
              : `${spokenCount} words processed${issueCount > 0 ? ` · ${issueCount} to revisit` : ''}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-brand-muted">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-success" />
            Correct
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-warning" />
            Close
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-danger" />
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

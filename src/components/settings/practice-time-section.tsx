'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { Clock3 } from 'lucide-react';
import { useState } from 'react';
import { Section } from '@/components/settings/section';
import { useLearningWorkspace } from '@/hooks/use-learning-workspace';
import { DEFAULT_LEARNING_DAYS, saveDailyPreferences } from '@/lib/daily-preferences';
import { db } from '@/lib/db';
import { useI18n } from '@/lib/i18n/use-i18n';

export function PracticeTimeSection() {
  const { messages, interfaceLanguage } = useI18n('settings');
  const t = messages.practiceTime;
  const { data, error } = useLearningWorkspace();
  const database = data?.database;
  const state = useLiveQuery(
    async () => (database ? { settings: await database.dailyTasks.get('preferences:daily') } : undefined),
    [database],
  );
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState(false);
  const minutes = state?.settings?.minutes ?? 20;
  const days = state?.settings?.learningDays ?? DEFAULT_LEARNING_DAYS;
  const ready = !!state && database === db;
  async function save(patch: { minutes?: number; learningDays?: number[] }) {
    if (!database || database !== db) return;
    setBusy(true);
    setFailure(false);
    try {
      await saveDailyPreferences(database, patch);
    } catch {
      if (database === db) setFailure(true);
    } finally {
      if (database === db) setBusy(false);
    }
  }
  const choiceClass = (selected: boolean) =>
    `min-h-11 rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-indigo-500 ${selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-indigo-50'}`;
  return (
    <div id="practice-time" data-testid="practice-time-settings" className="scroll-mt-6">
      <Section title={t.title} icon={Clock3}>
        <div className="space-y-5">
          <p className="text-sm leading-6 text-slate-500">{t.description}</p>
          <div>
            <h3 id="practice-time-label" className="text-sm font-medium text-slate-700">
              {t.dailyTime}
            </h3>
            <div role="group" aria-labelledby="practice-time-label" className="mt-3 flex flex-wrap gap-2">
              {[...new Set([5, 10, 20, 30, 45, minutes])]
                .sort((a, b) => a - b)
                .map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={minutes === value}
                    disabled={!ready || busy}
                    className={choiceClass(minutes === value)}
                    onClick={() => void save({ minutes: value })}
                  >
                    {t.minutes.replace('{{minutes}}', String(value))}
                  </button>
                ))}
            </div>
          </div>
          <div>
            <h3 id="practice-days-label" className="text-sm font-medium text-slate-700">
              {t.learningDays}
            </h3>
            <div role="group" aria-labelledby="practice-days-label" className="mt-3 flex flex-wrap gap-2">
              {DEFAULT_LEARNING_DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  aria-pressed={days.includes(day)}
                  disabled={!ready || busy}
                  className={choiceClass(days.includes(day))}
                  onClick={() =>
                    void save({
                      learningDays: days.includes(day) ? days.filter((value) => value !== day) : [...days, day].sort(),
                    })
                  }
                >
                  {new Intl.DateTimeFormat(interfaceLanguage, { weekday: 'short', timeZone: 'UTC' }).format(
                    new Date(Date.UTC(2024, 0, 7 + day)),
                  )}
                </button>
              ))}
            </div>
          </div>
          {(failure || error) && (
            <p role="alert" className="text-sm text-red-600">
              {t.saveFailed}
            </p>
          )}
        </div>
      </Section>
    </div>
  );
}

'use client';

import { motion } from 'framer-motion';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { useI18n } from '@/lib/i18n/use-i18n';
import type { WordResult } from '@/lib/levenshtein';
import { calculateStats } from '@/lib/levenshtein';

function AccuracyRing({ accuracy }: { accuracy: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (accuracy / 100) * circumference;

  const color = accuracy >= 80 ? 'text-green-500' : accuracy >= 50 ? 'text-amber-500' : 'text-red-500';
  const trackColor = accuracy >= 80 ? 'text-green-100' : accuracy >= 50 ? 'text-amber-100' : 'text-red-100';

  return (
    <div className="relative w-24 h-24">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96" aria-hidden="true" focusable="false">
        <circle cx="48" cy="48" r={radius} fill="none" strokeWidth="6" className={`stroke-current ${trackColor}`} />
        <motion.circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          className={`stroke-current ${color}`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          strokeDasharray={circumference}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className={`text-xl font-bold ${color}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {accuracy}%
        </motion.span>
      </div>
    </div>
  );
}

function getEncouragementIcon(accuracy: number) {
  if (accuracy >= 70) return TrendingUp;
  if (accuracy >= 50) return Minus;
  return TrendingDown;
}

function getEncouragementKey(accuracy: number): 'excellentPronunciation' | 'goodJob' | 'gettingThere' | 'keepTrying' {
  if (accuracy >= 90) return 'excellentPronunciation';
  if (accuracy >= 70) return 'goodJob';
  if (accuracy >= 50) return 'gettingThere';
  return 'keepTrying';
}

interface SpeechStatsProps {
  results: WordResult[];
}

export function SpeechStats({ results }: SpeechStatsProps) {
  const { messages: t } = useI18n('speak');
  const stats = calculateStats(results);
  const Icon = getEncouragementIcon(stats.accuracy);
  const message = t.stats[getEncouragementKey(stats.accuracy)];

  const statItems = [
    { label: t.stats.correct, value: stats.correct, color: 'text-green-600', bg: 'bg-green-50' },
    { label: t.stats.close, value: stats.close, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: t.stats.wrong, value: stats.wrong, color: 'text-red-600', bg: 'bg-red-50' },
    { label: t.stats.missed, value: stats.missing, color: 'text-gray-500', bg: 'bg-gray-50' },
  ].filter((s) => s.value > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex items-center gap-6"
    >
      <AccuracyRing accuracy={stats.accuracy} />

      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${stats.accuracy >= 50 ? 'text-green-600' : 'text-red-500'}`} />
          <span className="text-sm font-medium text-indigo-800">{message}</span>
        </div>

        <div className="flex gap-2 flex-wrap">
          {statItems.map((item) => (
            <div key={item.label} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md ${item.bg}`}>
              <span className={`text-sm font-semibold ${item.color}`}>{item.value}</span>
              <span className="text-xs text-gray-500">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="text-xs text-indigo-400">
          {stats.total} {t.stats.wordsTotal}
          {stats.extra > 0 && ` · ${stats.extra} ${t.stats.extraWordsDetected}`}
        </div>
      </div>
    </motion.div>
  );
}

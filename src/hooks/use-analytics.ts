'use client';

import { useEffect, useState } from 'react';
import {
  getAccuracyTrend,
  getActivityHeatmapData,
  getDailySessionCounts,
  getModuleBreakdown,
  getReviewForecast,
  getStreakData,
  getVocabularyGrowth,
  getWpmTrend,
} from '@/lib/analytics';

export interface AnalyticsData {
  heatmap: Awaited<ReturnType<typeof getActivityHeatmapData>>;
  accuracyTrend: Awaited<ReturnType<typeof getAccuracyTrend>>;
  wpmTrend: Awaited<ReturnType<typeof getWpmTrend>>;
  dailySessions: Awaited<ReturnType<typeof getDailySessionCounts>>;
  vocabularyGrowth: Awaited<ReturnType<typeof getVocabularyGrowth>>;
  moduleBreakdown: Awaited<ReturnType<typeof getModuleBreakdown>>;
  streak: Awaited<ReturnType<typeof getStreakData>>;
  reviewForecast: Awaited<ReturnType<typeof getReviewForecast>>;
  totalSessions: number;
  avgAccuracy: number;
  avgWpm: number;
}

export function useAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [
          heatmap,
          accuracyTrend,
          wpmTrend,
          dailySessions,
          vocabularyGrowth,
          moduleBreakdown,
          streak,
          reviewForecast,
        ] = await Promise.all([
          getActivityHeatmapData(365),
          getAccuracyTrend(undefined, 30),
          getWpmTrend(30),
          getDailySessionCounts(30),
          getVocabularyGrowth(),
          getModuleBreakdown(),
          getStreakData(),
          getReviewForecast(7),
        ]);

        const totalSessions = moduleBreakdown.reduce((sum, m) => sum + m.sessions, 0);
        const accDays = accuracyTrend.filter((d) => d.accuracy > 0);
        const avgAccuracy =
          accDays.length > 0 ? Math.round(accDays.reduce((s, d) => s + d.accuracy, 0) / accDays.length) : 0;
        const wpmDays = wpmTrend.filter((d) => d.wpm > 0);
        const avgWpm = wpmDays.length > 0 ? Math.round(wpmDays.reduce((s, d) => s + d.wpm, 0) / wpmDays.length) : 0;

        if (!cancelled) {
          setData({
            heatmap,
            accuracyTrend,
            wpmTrend,
            dailySessions,
            vocabularyGrowth,
            moduleBreakdown,
            streak,
            reviewForecast,
            totalSessions,
            avgAccuracy,
            avgWpm,
          });
        }
      } catch (err) {
        if (!cancelled) setError(err as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}

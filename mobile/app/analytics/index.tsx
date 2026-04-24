import { MaterialCommunityIcons } from '@expo/vector-icons';
import { type Href, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Dimensions, LayoutChangeEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/contexts/ThemeContext';
import { computeReviewForecastCounts } from '@/lib/dashboard-time';
import { State } from '@/lib/fsrs';
import { haptics } from '@/lib/haptics';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useFavoriteStore } from '@/stores/useFavoriteStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useListenStore } from '@/stores/useListenStore';
import { useReadStore } from '@/stores/useReadStore';
import { useSpeakStore } from '@/stores/useSpeakStore';
import { useWriteStore } from '@/stores/useWriteStore';
import { moduleColors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';
import type { ContentType } from '@/types/content';

const SCREEN_W = Dimensions.get('window').width;

/** Bar colors: listen pink/red, speak blue, read purple, write amber (per product spec). */
const MODULE_BAR: Record<'listen' | 'speak' | 'read' | 'write', string> = {
  listen: moduleColors.listen.primary,
  speak: '#007AFF',
  read: moduleColors.read.primary,
  write: moduleColors.write.primary,
};

function formatDurationMinutes(totalMinutes: number): string {
  const m = Math.max(0, Math.floor(totalMinutes));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h <= 0) return `${rem}m`;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

/** Calendar day in UTC, matching `useDashboardStore.recordPracticeSession` activity keys. */
function utcDayISO(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function lastNDatesUTC(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    out.push(utcDayISO(d));
  }
  return out;
}

function LineSegment({ x0, y0, x1, y1, color }: { x0: number; y0: number; x1: number; y1: number; color: string }) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return null;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x0,
        top: y0 - 1,
        width: len,
        height: 2,
        backgroundColor: color,
        borderRadius: 1,
        transform: [{ rotate: `${angle}deg` }],
        transformOrigin: 'left center' as `${number}%` | `${number}px` | string,
      }}
    />
  );
}

function Sparkline({
  values,
  lineColor,
  dotColor,
  height,
}: {
  values: number[];
  lineColor: string;
  dotColor: string;
  height: number;
}) {
  const [w, setW] = useState(Math.min(SCREEN_W - 40, 360));

  const onLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0) setW(width);
  };

  const pts = useMemo(() => {
    if (values.length === 0) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const padX = 14;
    const innerW = Math.max(1, w - padX * 2);
    const innerH = height - 28;
    return values.map((v, i) => {
      const nx = values.length === 1 ? 0.5 : i / (values.length - 1);
      const x = padX + nx * innerW;
      const norm = (v - min) / span;
      const y = 10 + (1 - norm) * innerH;
      return { x, y };
    });
  }, [values, w, height]);

  if (values.length === 0) {
    return (
      <View style={[styles.sparkEmpty, { height }]}>
        <Text variant="bodySmall" style={{ color: dotColor, opacity: 0.7 }}>
          Complete speak or write sessions to see trends.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ height, width: '100%' }} onLayout={onLayout}>
      {pts.length > 1 &&
        pts.slice(0, -1).map((p0, i) => {
          const p1 = pts[i + 1]!;
          return <LineSegment key={`seg-${i}`} x0={p0.x} y0={p0.y} x1={p1.x} y1={p1.y} color={lineColor} />;
        })}
      {pts.map((p, i) => (
        <View
          key={`dot-${i}`}
          style={[
            styles.sparkDot,
            {
              left: p.x - 5,
              top: p.y - 5,
              backgroundColor: dotColor,
              borderColor: lineColor,
            },
          ]}
        />
      ))}
    </View>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  delay,
  colors,
}: {
  label: string;
  value: string;
  icon: string;
  delay: number;
  colors: ReturnType<typeof useAppTheme>['colors'];
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay)} style={{ width: '48%', flexGrow: 1 }}>
      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
            shadowColor: colors.shadowMedium ?? '#000',
          },
        ]}
      >
        <View style={styles.summaryRow}>
          <MaterialCommunityIcons name={icon as 'chart-line'} size={20} color={colors.primary} />
          <Text variant="labelSmall" style={[styles.summaryLabel, { color: colors.onSurfaceSecondary }]}>
            {label}
          </Text>
        </View>
        <Text variant="titleLarge" style={[styles.summaryValue, { color: colors.onSurface }]}>
          {value}
        </Text>
      </View>
    </Animated.View>
  );
}

function SectionCard({
  title,
  subtitle,
  delay,
  children,
  colors,
}: {
  title: string;
  subtitle?: string;
  delay: number;
  children: React.ReactNode;
  colors: ReturnType<typeof useAppTheme>['colors'];
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay)}
      style={[
        styles.sectionCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          shadowColor: colors.shadowMedium ?? '#000',
        },
      ]}
    >
      <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onSurface }]}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="bodySmall" style={{ color: colors.onSurfaceSecondary, marginTop: 4, marginBottom: 14 }}>
          {subtitle}
        </Text>
      ) : (
        <View style={{ height: 6 }} />
      )}
      {children}
    </Animated.View>
  );
}

function HeatmapGrid({
  days,
  colors,
}: {
  days: Array<{ date: string; count: number }>;
  colors: ReturnType<typeof useAppTheme>['colors'];
}) {
  const columns = useMemo(() => {
    const out: Array<Array<{ date: string; count: number }>> = [];
    for (let i = 0; i < days.length; i += 7) out.push(days.slice(i, i + 7));
    return out;
  }, [days]);

  const totalSessions = useMemo(() => days.reduce((sum, day) => sum + day.count, 0), [days]);
  const activeDays = useMemo(() => days.filter((day) => day.count > 0).length, [days]);

  const getCellColor = (count: number) => {
    if (count <= 0) return colors.surfaceVariant;
    if (count === 1) return `${colors.primary}45`;
    if (count <= 3) return `${colors.primary}75`;
    if (count <= 5) return colors.primary;
    return colors.secondary;
  };

  return (
    <View>
      <Text variant="bodySmall" style={{ color: colors.onSurfaceSecondary, marginBottom: 12 }}>
        {totalSessions} sessions across {activeDays} active days
      </Text>
      <View style={styles.heatmapWrap}>
        {columns.map((column, columnIndex) => (
          <View key={`col-${columnIndex}`} style={styles.heatmapColumn}>
            {column.map((day) => (
              <View key={day.date} style={[styles.heatmapCell, { backgroundColor: getCellColor(day.count) }]} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function StackedSessionBars({
  rows,
  colors,
}: {
  rows: Array<{ date: string; listen: number; speak: number; read: number; write: number }>;
  colors: ReturnType<typeof useAppTheme>['colors'];
}) {
  const maxTotal = useMemo(
    () => Math.max(1, ...rows.map((row) => row.listen + row.speak + row.read + row.write)),
    [rows],
  );
  const hasData = rows.some((row) => row.listen + row.speak + row.read + row.write > 0);

  if (!hasData) {
    return (
      <Text variant="bodySmall" style={{ color: colors.onSurfaceSecondary }}>
        Complete practice sessions to populate the daily sessions chart.
      </Text>
    );
  }

  return (
    <View style={styles.dailyRow}>
      {rows.map((row) => {
        const total = row.listen + row.speak + row.read + row.write;
        const day = new Date(`${row.date}T12:00:00.000Z`).toLocaleDateString(undefined, {
          weekday: 'narrow',
          timeZone: 'UTC',
        });
        const stackHeight = 16 + Math.round((total / maxTotal) * 84);
        const values = [
          { key: 'listen', value: row.listen, color: MODULE_BAR.listen },
          { key: 'speak', value: row.speak, color: MODULE_BAR.speak },
          { key: 'read', value: row.read, color: MODULE_BAR.read },
          { key: 'write', value: row.write, color: MODULE_BAR.write },
        ].filter((segment) => segment.value > 0);

        return (
          <View key={row.date} style={styles.dailyCol}>
            <Text variant="labelSmall" style={{ color: colors.onSurface, fontWeight: '700' }}>
              {total}
            </Text>
            <View style={[styles.stackedBarTrack, { backgroundColor: colors.surfaceVariant, height: stackHeight }]}>
              {values.map((segment) => {
                const height = `${(segment.value / total) * 100}%` as `${number}%`;
                return (
                  <View key={segment.key} style={[styles.stackedBarFill, { height, backgroundColor: segment.color }]} />
                );
              })}
            </View>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceSecondary, marginTop: 6 }}>
              {day}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ForecastBars({
  rows,
  colors,
}: {
  rows: Array<{ label: string; count: number }>;
  colors: ReturnType<typeof useAppTheme>['colors'];
}) {
  const maxCount = useMemo(() => Math.max(1, ...rows.map((row) => row.count)), [rows]);
  const total = useMemo(() => rows.reduce((sum, row) => sum + row.count, 0), [rows]);

  if (total === 0) {
    return (
      <Text variant="bodySmall" style={{ color: colors.onSurfaceSecondary }}>
        No upcoming reviews scheduled for the next 7 days.
      </Text>
    );
  }

  return (
    <View style={styles.dailyRow}>
      {rows.map((row) => {
        const height = 12 + Math.round((row.count / maxCount) * 76);
        return (
          <View key={row.label} style={styles.dailyCol}>
            <Text variant="labelSmall" style={{ color: colors.onSurface, fontWeight: '700' }}>
              {row.count}
            </Text>
            <View style={[styles.dailyBar, { height, backgroundColor: colors.primary }]} />
            <Text variant="labelSmall" style={{ color: colors.onSurfaceSecondary, marginTop: 6 }}>
              {row.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function AnalyticsScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const stats = useDashboardStore((s) => s.stats);
  const activities = useDashboardStore((s) => s.activities);

  const listenSessions = useListenStore((s) => s.sessions);
  const speakSessions = useSpeakStore((s) => s.sessions);
  const readSessions = useReadStore((s) => s.sessions);
  const writeSessions = useWriteStore((s) => s.sessions);

  const totalListenTime = useListenStore((s) => s.getTotalListenTime());
  const totalSpeakTime = useSpeakStore((s) => s.getTotalSpeakTime());
  const totalReadTime = useReadStore((s) => s.getTotalReadTime());
  const totalTypingTime = useWriteStore((s) => s.getTotalTypingTime());

  const favoriteItems = useFavoriteStore((s) => s.items);
  const libraryContents = useLibraryStore((s) => s.contents);

  const favCounts = useMemo(() => {
    const now = Date.now();
    const due = favoriteItems.filter((i) => !i.fsrsCard || i.fsrsCard.due <= now);
    return {
      total: favoriteItems.length,
      due: due.length,
      new: favoriteItems.filter((i) => i.fsrsCard?.state === State.New).length,
      learning: favoriteItems.filter(
        (i) => i.fsrsCard?.state === State.Learning || i.fsrsCard?.state === State.Relearning,
      ).length,
      review: favoriteItems.filter((i) => i.fsrsCard?.state === State.Review).length,
    };
  }, [favoriteItems]);

  const totalSessions = listenSessions.length + speakSessions.length + readSessions.length + writeSessions.length;

  const totalPracticeMinutes = Math.floor((totalListenTime + totalSpeakTime + totalReadTime + totalTypingTime) / 60);

  const { avgAccuracy, avgWpm } = useMemo(() => {
    const accuracySamples: number[] = [...writeSessions.map((s) => s.accuracy), ...speakSessions.map((s) => s.score)];
    const acc =
      accuracySamples.length > 0 ? Math.round(accuracySamples.reduce((a, b) => a + b, 0) / accuracySamples.length) : 0;
    const wpm =
      writeSessions.length > 0
        ? Math.round(writeSessions.reduce((sum, s) => sum + s.wpm, 0) / writeSessions.length)
        : 0;
    return { avgAccuracy: acc, avgWpm: wpm };
  }, [writeSessions, speakSessions]);

  const moduleSeconds = useMemo(
    () => ({
      listen: totalListenTime,
      speak: totalSpeakTime,
      read: totalReadTime,
      write: totalTypingTime,
    }),
    [totalListenTime, totalSpeakTime, totalReadTime, totalTypingTime],
  );

  const moduleRows = useMemo(() => {
    const total = Math.max(1, moduleSeconds.listen + moduleSeconds.speak + moduleSeconds.read + moduleSeconds.write);
    const keys = ['listen', 'speak', 'read', 'write'] as const;
    return keys.map((key) => {
      const sec = moduleSeconds[key];
      const pct = Math.round((sec / total) * 100);
      const min = sec / 60;
      return { key, label: key.charAt(0).toUpperCase() + key.slice(1), sec, pct, min, color: MODULE_BAR[key] };
    });
  }, [moduleSeconds]);

  const dailyLast7 = useMemo(() => {
    const dates = lastNDatesUTC(7);
    const map = new Map(activities.map((a) => [a.date, a.count] as const));
    const counts = dates.map((d) => map.get(d) ?? 0);
    const max = Math.max(1, ...counts);
    return { dates, counts, max };
  }, [activities]);

  const heatmapDays = useMemo(() => {
    const dates = lastNDatesUTC(56);
    const counts = new Map(activities.map((activity) => [activity.date, activity.count] as const));
    return dates.map((date) => ({ date, count: counts.get(date) ?? 0 }));
  }, [activities]);

  const accuracyTrend = useMemo(() => {
    type Row = { at: number; acc: number };
    const rows: Row[] = [
      ...writeSessions.map((s) => ({ at: s.completedAt, acc: s.accuracy })),
      ...speakSessions.map((s) => ({ at: s.completedAt, acc: s.score })),
    ];
    rows.sort((a, b) => a.at - b.at);
    const last = rows.slice(-10);
    return last.map((r) => r.acc);
  }, [writeSessions, speakSessions]);

  const wpmTrend = useMemo(() => {
    const sorted = [...writeSessions].sort((a, b) => a.completedAt - b.completedAt);
    return sorted.slice(-10).map((s) => s.wpm);
  }, [writeSessions]);

  const contentByType = useMemo(() => {
    const map = new Map<ContentType, number>();
    for (const c of libraryContents) {
      map.set(c.type, (map.get(c.type) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count }));
  }, [libraryContents]);

  const reviewForecast = useMemo(() => {
    const dueTs = libraryContents
      .map((c) => c.fsrsCard?.due)
      .filter((due): due is number => typeof due === 'number' && Number.isFinite(due));
    return computeReviewForecastCounts(dueTs);
  }, [libraryContents]);

  const dailySessionsRows = useMemo(() => {
    const dates = lastNDatesUTC(7);
    const seed = new Map(dates.map((date) => [date, { date, listen: 0, speak: 0, read: 0, write: 0 }]));

    for (const session of listenSessions) {
      const date = utcDayISO(new Date(session.completedAt));
      const row = seed.get(date);
      if (row) row.listen += 1;
    }
    for (const session of speakSessions) {
      const date = utcDayISO(new Date(session.completedAt));
      const row = seed.get(date);
      if (row) row.speak += 1;
    }
    for (const session of readSessions) {
      const date = utcDayISO(new Date(session.completedAt));
      const row = seed.get(date);
      if (row) row.read += 1;
    }
    for (const session of writeSessions) {
      const date = utcDayISO(new Date(session.completedAt));
      const row = seed.get(date);
      if (row) row.write += 1;
    }

    return dates.map((date) => seed.get(date)!);
  }, [listenSessions, readSessions, speakSessions, writeSessions]);

  const vocabularyGrowth = useMemo(() => {
    if (libraryContents.length === 0) return [] as number[];
    const buckets = new Map<string, number>();
    for (const item of libraryContents) {
      const date = utcDayISO(new Date(item.createdAt));
      buckets.set(date, (buckets.get(date) ?? 0) + 1);
    }
    let running = 0;
    return Array.from(buckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, count]) => {
        running += count;
        return running;
      });
  }, [libraryContents]);

  const reviewForecastRows = useMemo(() => {
    const today = new Date();
    const dueTs = [
      ...libraryContents.map((item) => item.fsrsCard?.due).filter((due): due is number => typeof due === 'number'),
      ...favoriteItems.map((item) => item.fsrsCard?.due).filter((due): due is number => typeof due === 'number'),
    ];

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + index));
      const iso = utcDayISO(date);
      const count = dueTs.filter((due) => utcDayISO(new Date(due)) === iso).length;
      const label = index === 0 ? 'T' : date.toLocaleDateString(undefined, { weekday: 'narrow', timeZone: 'UTC' });
      return { label, count };
    });
  }, [favoriteItems, libraryContents]);

  const maxTypeCount = useMemo(() => Math.max(1, ...contentByType.map((x) => x.count)), [contentByType]);

  const totalWordsPracticed = useMemo(() => {
    const fromRead = readSessions.reduce((sum, s) => sum + (s.wordsRead ?? 0), 0);
    const fromWrite = writeSessions.reduce((sum, s) => {
      const minutes = s.duration / 60;
      return sum + Math.max(0, Math.round(s.wpm * minutes));
    }, 0);
    return fromRead + fromWrite;
  }, [readSessions, writeSessions]);

  const isEmptyState = totalSessions === 0 && libraryContents.length === 0 && favoriteItems.length === 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => {
            void haptics.light();
            router.back();
          }}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.pageTitle, { color: colors.onBackground, fontFamily: fontFamily.headingBold }]}>
            Analytics
          </Text>
          <Text variant="bodySmall" style={{ color: colors.onSurfaceSecondary, marginTop: 2 }}>
            Learning stats & trends
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryGrid}>
          <SummaryCard
            label="Practice time"
            value={formatDurationMinutes(totalPracticeMinutes)}
            icon="timer-outline"
            delay={80}
            colors={colors}
          />
          <SummaryCard
            label="Sessions"
            value={String(totalSessions)}
            icon="chart-timeline-variant"
            delay={120}
            colors={colors}
          />
          <SummaryCard label="Streak" value={`${stats.streak}d`} icon="fire" delay={160} colors={colors} />
          <SummaryCard
            label="Avg accuracy"
            value={avgAccuracy > 0 ? `${avgAccuracy}%` : '—'}
            icon="target"
            delay={200}
            colors={colors}
          />
        </View>

        <Animated.View entering={FadeInDown.delay(220)} style={{ marginBottom: 10 }}>
          <View
            style={[
              styles.wpmBanner,
              {
                backgroundColor: colors.primaryContainer,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <MaterialCommunityIcons name="keyboard-outline" size={22} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text variant="labelMedium" style={{ color: colors.onPrimaryContainer, fontFamily: fontFamily.heading }}>
                Avg WPM (write)
              </Text>
              <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: '700', marginTop: 2 }}>
                {writeSessions.length > 0 ? avgWpm : '—'}
              </Text>
            </View>
          </View>
        </Animated.View>

        {isEmptyState ? (
          <SectionCard title="Analytics" subtitle="No learning data yet" delay={260} colors={colors}>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceSecondary, lineHeight: 20 }}>
              Complete a few Listen, Read, Speak, or Write sessions to populate charts and review forecasts.
            </Text>
          </SectionCard>
        ) : null}

        <SectionCard title="Activity heatmap" subtitle="Last 56 days of activity" delay={260} colors={colors}>
          <HeatmapGrid days={heatmapDays} colors={colors} />
        </SectionCard>

        <SectionCard title="Accuracy trend" subtitle="Last 10 speak and write sessions" delay={320} colors={colors}>
          <Sparkline values={accuracyTrend} lineColor={colors.primary} dotColor={colors.accent} height={110} />
        </SectionCard>

        <SectionCard title="WPM trend" subtitle="Last 10 write sessions" delay={380} colors={colors}>
          <Sparkline values={wpmTrend} lineColor={MODULE_BAR.write} dotColor={colors.primary} height={110} />
        </SectionCard>

        <SectionCard title="Daily sessions" subtitle="Practice sessions in the last 7 days" delay={440} colors={colors}>
          <StackedSessionBars rows={dailySessionsRows} colors={colors} />
        </SectionCard>

        <SectionCard title="Module breakdown" subtitle="Share of total practice time" delay={500} colors={colors}>
          {moduleRows.map((row) => (
            <View key={row.key} style={styles.moduleRow}>
              <View style={styles.moduleLabelCol}>
                <Text style={[styles.moduleLabel, { color: colors.onSurface }]}>{row.label}</Text>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceSecondary }}>
                  {formatDurationMinutes(row.min)} · {row.pct}%
                </Text>
              </View>
              <View style={[styles.barTrack, { backgroundColor: colors.surfaceVariant }]}>
                <View style={[styles.barFill, { width: `${row.pct}%`, backgroundColor: row.color }]} />
              </View>
            </View>
          ))}
        </SectionCard>

        <SectionCard
          title="Vocabulary growth"
          subtitle="Cumulative library items over time"
          delay={560}
          colors={colors}
        >
          <Sparkline values={vocabularyGrowth} lineColor={colors.primary} dotColor={colors.secondary} height={110} />
          <Text variant="bodySmall" style={{ color: colors.onSurfaceSecondary, marginTop: 6 }}>
            {libraryContents.length} library items · {totalWordsPracticed} estimated practiced words
          </Text>
        </SectionCard>

        <SectionCard title="Review forecast" subtitle="Due items in the next 7 days" delay={620} colors={colors}>
          <View style={styles.forecastRow}>
            <View style={[styles.forecastPill, { backgroundColor: colors.primaryContainer }]}>
              <Text variant="labelSmall" style={{ color: colors.onPrimaryContainer }}>
                Today
              </Text>
              <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: '700' }}>
                {reviewForecast.today}
              </Text>
            </View>
            <View style={[styles.forecastPill, { backgroundColor: colors.surfaceVariant }]}>
              <Text variant="labelSmall" style={{ color: colors.onSurfaceSecondary }}>
                Tomorrow
              </Text>
              <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: '700' }}>
                {reviewForecast.tomorrow}
              </Text>
            </View>
            <View style={[styles.forecastPill, { backgroundColor: colors.surfaceVariant }]}>
              <Text variant="labelSmall" style={{ color: colors.onSurfaceSecondary }}>
                This week
              </Text>
              <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: '700' }}>
                {reviewForecast.thisWeek}
              </Text>
            </View>
          </View>
          <View style={{ marginTop: 14 }}>
            <ForecastBars rows={reviewForecastRows} colors={colors} />
          </View>
        </SectionCard>

        <SectionCard title="Favorites (SRS)" subtitle="Spaced repetition deck" delay={680} colors={colors}>
          <View style={styles.favGrid}>
            {(
              [
                ['Total', favCounts.total],
                ['Due', favCounts.due],
                ['New', favCounts.new],
                ['Learning', favCounts.learning],
                ['Review', favCounts.review],
              ] as const
            ).map(([k, v]) => (
              <View key={k} style={[styles.favCell, { backgroundColor: colors.surfaceVariant }]}>
                <Text variant="labelSmall" style={{ color: colors.onSurfaceSecondary }}>
                  {k}
                </Text>
                <Text variant="titleLarge" style={{ color: colors.onSurface, fontWeight: '700', marginTop: 4 }}>
                  {v}
                </Text>
              </View>
            ))}
          </View>
        </SectionCard>

        <Pressable
          onPress={() => {
            void haptics.light();
            router.push('/(tabs)/vocabulary' as Href);
          }}
          style={({ pressed }) => [styles.linkOut, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={{ color: colors.primary, fontFamily: fontFamily.heading, fontWeight: '600' }}>
            Open Favorites
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.primary} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  backBtn: { padding: 4 },
  pageTitle: { fontSize: 28, fontWeight: '700', letterSpacing: 0.3 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  summaryCard: {
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  summaryLabel: { fontFamily: fontFamily.body, flex: 1 },
  summaryValue: { fontFamily: fontFamily.headingBold, fontWeight: '700' },
  wpmBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  sectionCard: {
    borderRadius: 18,
    borderCurve: 'continuous',
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: { fontFamily: fontFamily.heading, fontWeight: '700' },
  moduleRow: { marginBottom: 14 },
  moduleLabelCol: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  moduleLabel: { fontFamily: fontFamily.heading, fontWeight: '600', fontSize: 15 },
  barTrack: { height: 10, borderRadius: 8, borderCurve: 'continuous', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 8, borderCurve: 'continuous' },
  dailyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 8 },
  dailyCol: { alignItems: 'center', flex: 1 },
  dailyBar: { width: '56%', minHeight: 8, borderRadius: 6, borderCurve: 'continuous', marginTop: 6 },
  stackedBarTrack: {
    width: '56%',
    minHeight: 16,
    borderRadius: 6,
    borderCurve: 'continuous',
    marginTop: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  stackedBarFill: {
    width: '100%',
  },
  sparkEmpty: { justifyContent: 'center', paddingHorizontal: 8 },
  sparkDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderCurve: 'continuous',
  },
  favGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  favCell: {
    width: '31%',
    flexGrow: 1,
    minWidth: 96,
    padding: 12,
    borderRadius: 14,
    borderCurve: 'continuous',
  },
  forecastRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  forecastPill: { flex: 1, minWidth: 96, padding: 12, borderRadius: 14, borderCurve: 'continuous' },
  typeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  typeLabel: { width: 100, fontFamily: fontFamily.body, textTransform: 'capitalize' },
  typeBarBg: { flex: 1, height: 8, borderRadius: 6, borderCurve: 'continuous', overflow: 'hidden' },
  typeBarFill: { height: '100%', borderRadius: 6, borderCurve: 'continuous' },
  heatmapWrap: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'nowrap',
  },
  heatmapColumn: {
    gap: 4,
  },
  heatmapCell: {
    width: 12,
    height: 12,
    borderRadius: 4,
    borderCurve: 'continuous',
  },
  linkOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 4 },
});

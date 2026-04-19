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

  const maxTypeCount = useMemo(() => Math.max(1, ...contentByType.map((x) => x.count)), [contentByType]);

  const totalWordsPracticed = useMemo(() => {
    const fromRead = readSessions.reduce((sum, s) => sum + (s.wordsRead ?? 0), 0);
    const fromWrite = writeSessions.reduce((sum, s) => {
      const minutes = s.duration / 60;
      return sum + Math.max(0, Math.round(s.wpm * minutes));
    }, 0);
    return fromRead + fromWrite;
  }, [readSessions, writeSessions]);

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

        <SectionCard title="Time by module" subtitle="Share of total practice time" delay={260} colors={colors}>
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

        <SectionCard title="Last 7 days" subtitle="Sessions per day" delay={320} colors={colors}>
          <View style={styles.dailyRow}>
            {dailyLast7.counts.map((c, i) => {
              const h = 8 + Math.round((c / dailyLast7.max) * 72);
              const d = new Date(`${dailyLast7.dates[i]}T12:00:00.000Z`);
              const label = d.toLocaleDateString(undefined, { weekday: 'narrow', timeZone: 'UTC' });
              return (
                <View key={dailyLast7.dates[i]} style={styles.dailyCol}>
                  <Text variant="labelSmall" style={{ color: colors.onSurface, fontWeight: '700' }}>
                    {c}
                  </Text>
                  <View style={[styles.dailyBar, { height: h, backgroundColor: colors.primary }]} />
                  <Text variant="labelSmall" style={{ color: colors.onSurfaceSecondary, marginTop: 6 }}>
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>
        </SectionCard>

        <SectionCard title="Accuracy trend" subtitle="Last 10 speak & write sessions" delay={380} colors={colors}>
          <Sparkline values={accuracyTrend} lineColor={colors.primary} dotColor={colors.accent} height={110} />
        </SectionCard>

        <SectionCard title="WPM trend" subtitle="Last 10 write sessions" delay={440} colors={colors}>
          <Sparkline values={wpmTrend} lineColor={MODULE_BAR.write} dotColor={colors.primary} height={110} />
        </SectionCard>

        <SectionCard
          title="Vocabulary practice"
          subtitle="Estimated words touched in read & write sessions"
          delay={470}
          colors={colors}
        >
          <Text variant="headlineSmall" style={{ color: colors.onSurface, fontFamily: fontFamily.headingBold }}>
            {totalWordsPracticed >= 1000 ? totalWordsPracticed.toLocaleString() : totalWordsPracticed}
          </Text>
          <Text variant="bodySmall" style={{ color: colors.onSurfaceSecondary, marginTop: 6 }}>
            Dashboard words-learned counter: {stats.wordsLearned}
          </Text>
        </SectionCard>

        <SectionCard title="Favorites (SRS)" subtitle="Spaced repetition deck" delay={500} colors={colors}>
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

        <SectionCard
          title="Library review forecast"
          subtitle="FSRS due dates in your library"
          delay={540}
          colors={colors}
        >
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
        </SectionCard>

        <SectionCard title="Content by type" subtitle="Items in your library" delay={600} colors={colors}>
          {contentByType.length === 0 ? (
            <Text variant="bodySmall" style={{ color: colors.onSurfaceSecondary }}>
              No content yet.
            </Text>
          ) : (
            contentByType.map(({ type, count }) => (
              <View key={type} style={styles.typeRow}>
                <Text style={[styles.typeLabel, { color: colors.onSurface }]}>{type}</Text>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceSecondary, width: 36, textAlign: 'right' }}>
                  {count}
                </Text>
                <View style={[styles.typeBarBg, { backgroundColor: colors.surfaceVariant }]}>
                  <View
                    style={[
                      styles.typeBarFill,
                      { width: `${Math.round((count / maxTypeCount) * 100)}%`, backgroundColor: colors.secondary },
                    ]}
                  />
                </View>
              </View>
            ))
          )}
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
  linkOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 4 },
});

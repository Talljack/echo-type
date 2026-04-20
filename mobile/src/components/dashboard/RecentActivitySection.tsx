import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAppTheme } from '@/contexts/ThemeContext';
import { formatSessionDuration, formatTimeAgo } from '@/lib/dashboard-time';
import { moduleColors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

export type HomeModuleId = 'listen' | 'speak' | 'read' | 'write';

export interface NormalizedRecentSession {
  id: string;
  module: HomeModuleId;
  contentId: string;
  duration: number;
  completedAt: number;
}

const MODULE_ICONS: Record<HomeModuleId, string> = {
  listen: 'headphones',
  speak: 'microphone',
  read: 'book-open-variant',
  write: 'pencil',
};

/** Minimal fields used for the feed; extra keys (e.g. score, wpm) are ignored. */
export type SessionListItem = {
  id?: unknown;
  contentId?: unknown;
  duration?: unknown;
  completedAt?: unknown;
};

function normalizeSessionFields(s: SessionListItem): {
  id: string;
  contentId: string;
  duration: number;
  completedAt: number;
} {
  return {
    id: typeof s.id === 'string' ? s.id : String(s.id ?? ''),
    contentId: typeof s.contentId === 'string' ? s.contentId : String(s.contentId ?? ''),
    duration: typeof s.duration === 'number' && Number.isFinite(s.duration) ? Math.max(0, s.duration) : 0,
    completedAt: typeof s.completedAt === 'number' && Number.isFinite(s.completedAt) ? s.completedAt : 0,
  };
}

/** Each store keeps newest-first; only the newest `perStoreCap` per module are merged, then global top `limit`. */
function collectRecentSessions(
  listen: SessionListItem[],
  speak: SessionListItem[],
  read: SessionListItem[],
  write: SessionListItem[],
  limit: number,
  perStoreCap = 5,
): NormalizedRecentSession[] {
  const merged: NormalizedRecentSession[] = [
    ...listen.slice(0, perStoreCap).map((raw) => ({ ...normalizeSessionFields(raw), module: 'listen' as const })),
    ...speak.slice(0, perStoreCap).map((raw) => ({ ...normalizeSessionFields(raw), module: 'speak' as const })),
    ...read.slice(0, perStoreCap).map((raw) => ({ ...normalizeSessionFields(raw), module: 'read' as const })),
    ...write.slice(0, perStoreCap).map((raw) => ({ ...normalizeSessionFields(raw), module: 'write' as const })),
  ];
  merged.sort((a, b) => b.completedAt - a.completedAt);
  return merged.slice(0, limit);
}

interface RecentActivitySectionProps {
  listenSessions: SessionListItem[];
  speakSessions: SessionListItem[];
  readSessions: SessionListItem[];
  writeSessions: SessionListItem[];
  contentTitleById: Map<string, string>;
  animationDelay?: number;
}

export function RecentActivitySection({
  listenSessions,
  speakSessions,
  readSessions,
  writeSessions,
  contentTitleById,
  animationDelay = 1200,
}: RecentActivitySectionProps) {
  const { colors } = useAppTheme();

  const recent = useMemo(
    () =>
      collectRecentSessions(listenSessions, speakSessions, readSessions, writeSessions, 5).map((s) => ({
        ...s,
        summary: summarizeTitle(contentTitleById.get(s.contentId)?.trim() || 'Practice session'),
      })),
    [listenSessions, speakSessions, readSessions, writeSessions, contentTitleById],
  );

  return (
    <View style={styles.section}>
      <Text variant="titleLarge" style={[styles.sectionTitle, { color: colors.onBackground }]}>
        Recent Activity
      </Text>

      {recent.length === 0 ? (
        <Animated.View entering={FadeInDown.delay(animationDelay)}>
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <MaterialCommunityIcons name="run" size={36} color={colors.onSurfaceSecondary} />
            <Text variant="bodyLarge" style={[styles.emptyMessage, { color: colors.onSurfaceVariant }]}>
              No activity yet. Start practicing!
            </Text>
          </View>
        </Animated.View>
      ) : (
        recent.map((session, index) => {
          const mc = moduleColors[session.module];
          return (
            <Animated.View
              key={`${session.module}-${session.id}`}
              entering={FadeInDown.delay(animationDelay + index * 60)}
            >
              <View
                style={[
                  styles.activityCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                <View style={[styles.leftAccent, { backgroundColor: mc.primary }]} />
                <View style={[styles.iconWrap, { backgroundColor: mc.background }]}>
                  <MaterialCommunityIcons name={MODULE_ICONS[session.module] as any} size={22} color={mc.primary} />
                </View>
                <View style={styles.activityBody}>
                  <Text
                    variant="titleSmall"
                    numberOfLines={1}
                    style={[styles.activityTitle, { color: colors.onSurface }]}
                  >
                    {session.summary}
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                    {formatSessionDuration(session.duration)} · {formatTimeAgo(session.completedAt)}
                  </Text>
                </View>
              </View>
            </Animated.View>
          );
        })
      )}
    </View>
  );
}

function summarizeTitle(title: string): string {
  const t = title.replace(/\s+/g, ' ').trim();
  if (t.length <= 48) return t;
  return `${t.slice(0, 45)}…`;
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: fontFamily.heading,
    fontWeight: '700',
    marginBottom: 16,
    fontSize: 22,
  },
  emptyCard: {
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyMessage: {
    fontFamily: fontFamily.heading,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 1,
    marginBottom: 10,
    paddingVertical: 12,
    paddingRight: 14,
    paddingLeft: 4,
    overflow: 'hidden',
  },
  leftAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    opacity: 0.42,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderCurve: 'continuous',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    marginRight: 12,
  },
  activityBody: {
    flex: 1,
    minWidth: 0,
  },
  activityTitle: {
    fontFamily: fontFamily.heading,
    fontWeight: '600',
    marginBottom: 4,
  },
});

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { type Href, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { haptics } from '@/lib/haptics';
import { fontFamily } from '@/theme/typography';

export interface LibrarySectionHeaderProps {
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  /** When set, shows Practice All row (Listen / Read / Write) using first content id as entry */
  practiceEntryContentId?: string;
}

export function LibrarySectionHeader({
  title,
  count,
  expanded,
  onToggle,
  practiceEntryContentId,
}: LibrarySectionHeaderProps) {
  const { colors, getModuleColors } = useAppTheme();
  const listen = getModuleColors('listen');
  const read = getModuleColors('read');
  const write = getModuleColors('write');

  const handlePractice = (route: 'listen' | 'read' | 'write') => {
    if (!practiceEntryContentId) return;
    void haptics.light();
    router.push(`/practice/${route}/${practiceEntryContentId}` as Href);
  };

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: colors.surfaceVariant,
          borderColor: colors.borderLight,
        },
      ]}
    >
      <Pressable
        onPress={() => {
          void haptics.light();
          onToggle();
        }}
        style={({ pressed }) => [styles.headerRow, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title}, ${count} items`}
      >
        <Text style={[styles.title, { color: colors.onSurface }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={[styles.countBadge, { backgroundColor: colors.primaryContainer }]}>
          <Text style={[styles.countText, { color: colors.onPrimaryContainer }]}>{count}</Text>
        </View>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={colors.onSurfaceVariant}
        />
      </Pressable>

      {expanded && practiceEntryContentId ? (
        <View style={styles.practiceRow}>
          <Text style={[styles.practiceLabel, { color: colors.onSurfaceVariant }]}>Practice All</Text>
          <View style={styles.practiceButtons}>
            <Pressable
              onPress={() => handlePractice('listen')}
              style={({ pressed }) => [
                styles.practiceBtn,
                { backgroundColor: listen.background },
                pressed && { opacity: 0.85 },
              ]}
            >
              <MaterialCommunityIcons name="headphones" size={16} color={listen.primary} />
              <Text style={[styles.practiceBtnText, { color: listen.primary }]}>Listen</Text>
            </Pressable>
            <Pressable
              onPress={() => handlePractice('read')}
              style={({ pressed }) => [
                styles.practiceBtn,
                { backgroundColor: read.background },
                pressed && { opacity: 0.85 },
              ]}
            >
              <MaterialCommunityIcons name="book-open-variant" size={16} color={read.primary} />
              <Text style={[styles.practiceBtnText, { color: read.primary }]}>Read</Text>
            </Pressable>
            <Pressable
              onPress={() => handlePractice('write')}
              style={({ pressed }) => [
                styles.practiceBtn,
                { backgroundColor: write.background },
                pressed && { opacity: 0.85 },
              ]}
            >
              <MaterialCommunityIcons name="pencil" size={16} color={write.primary} />
              <Text style={[styles.practiceBtnText, { color: write.primary }]}>Write</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  title: {
    flex: 1,
    fontFamily: fontFamily.heading,
    fontSize: 16,
    fontWeight: '600',
  },
  countBadge: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
  },
  practiceRow: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 8,
  },
  practiceLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  practiceButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  practiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  practiceBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

/**
 * TTS Voice Selector — dynamically loads Edge cloud voices and device (browser/native) voices.
 * Groups into sections so users can pick across both sources.
 */
import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, IconButton, Modal, Portal, RadioButton, Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useVoiceCatalog } from '@/hooks/useVoiceCatalog';
import type { UnifiedVoice } from '@/lib/tts/voices';
import { componentRadius } from '@/theme/radius';
import { shadows } from '@/theme/shadows';
import { componentSpacing, spacing } from '@/theme/spacing';

export type Voice = UnifiedVoice;

interface VoiceSelectorProps {
  visible: boolean;
  selectedVoice: string;
  onDismiss: () => void;
  onSelect: (voiceId: string) => void;
  onPreview?: (voice: UnifiedVoice) => void;
}

interface Section {
  title: string;
  subtitle?: string;
  data: UnifiedVoice[];
  key: 'edge' | 'device';
}

export function VoiceSelector({ visible, selectedVoice, onDismiss, onSelect, onPreview }: VoiceSelectorProps) {
  const { colors } = useAppTheme();
  const { device, edge, edgeError, isLoading, reload } = useVoiceCatalog();
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  const sections: Section[] = useMemo(() => {
    const list: Section[] = [];
    if (edge.length > 0) {
      list.push({ key: 'edge', title: 'Cloud voices', subtitle: `${edge.length} · Edge`, data: edge });
    }
    if (device.length > 0) {
      list.push({ key: 'device', title: 'Device voices', subtitle: `${device.length} · Offline`, data: device });
    }
    return list;
  }, [edge, device]);

  const handlePreview = (voice: UnifiedVoice) => {
    setPreviewingId(voice.id);
    onPreview?.(voice);
    setTimeout(() => setPreviewingId(null), 2000);
  };

  const handleSelect = (voiceId: string) => {
    onSelect(voiceId);
    onDismiss();
  };

  const renderItem = ({ item }: { item: UnifiedVoice }) => {
    const isSelected = item.id === selectedVoice;
    const isPreviewing = item.id === previewingId;
    const genderLabel = item.gender === 'unknown' ? '' : ` • ${item.gender}`;
    const meta = `${item.language}${genderLabel}${item.description ? ` • ${item.description}` : ''}`;

    return (
      <Pressable
        style={[
          styles.voiceItem,
          { backgroundColor: colors.surface, borderColor: colors.border },
          isSelected && { borderColor: colors.primary, borderWidth: 2 },
        ]}
        onPress={() => handleSelect(item.id)}
        accessibilityRole="radio"
        accessibilityState={{ checked: isSelected }}
        accessibilityLabel={`${item.name}, ${item.language}${genderLabel}`}
      >
        <View style={styles.voiceInfo}>
          <RadioButton.Android
            value={item.id}
            status={isSelected ? 'checked' : 'unchecked'}
            onPress={() => handleSelect(item.id)}
            color={colors.primary}
          />
          <View style={styles.voiceDetails}>
            <Text
              variant="bodyLarge"
              style={[styles.voiceName, { color: colors.onSurface }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.name}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }} numberOfLines={1} ellipsizeMode="tail">
              {meta}
            </Text>
          </View>
        </View>
        <IconButton
          icon={isPreviewing ? 'loading' : 'play-circle-outline'}
          size={24}
          onPress={() => handlePreview(item)}
          iconColor={colors.primary}
          disabled={isPreviewing}
          accessibilityLabel={`Preview ${item.name}`}
        />
      </Pressable>
    );
  };

  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.surface }]}>
      <Text variant="labelLarge" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
        {section.title}
      </Text>
      {section.subtitle ? (
        <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
          {section.subtitle}
        </Text>
      ) : null}
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text variant="bodySmall" style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
            Loading voices…
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <Text variant="bodyMedium" style={[styles.emptyText, { color: colors.onSurface }]}>
          No voices available
        </Text>
        <Pressable onPress={reload} accessibilityRole="button" hitSlop={8}>
          <Text variant="labelLarge" style={{ color: colors.primary, marginTop: spacing.sm }}>
            Retry
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modal, { backgroundColor: colors.surface }]}
      >
        <View style={styles.header}>
          <Text variant="headlineSmall" style={[styles.title, { color: colors.onSurface }]}>
            Select Voice
          </Text>
          <IconButton icon="close" size={24} onPress={onDismiss} iconColor={colors.onSurfaceVariant} />
        </View>

        {edgeError && edge.length === 0 ? (
          <View style={[styles.banner, { backgroundColor: `${colors.primary}10` }]}>
            <Text variant="bodySmall" style={{ color: colors.onSurface }}>
              Cloud voices unavailable. Showing device voices only.
            </Text>
            <Pressable onPress={reload} accessibilityRole="button" hitSlop={8}>
              <Text variant="labelMedium" style={{ color: colors.primary, marginTop: spacing.xs }}>
                Retry
              </Text>
            </Pressable>
          </View>
        ) : null}

        <SectionList
          sections={sections}
          keyExtractor={(item) => `${item.source}:${item.id}`}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          initialNumToRender={12}
          windowSize={8}
        />
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: spacing.lg,
    borderRadius: componentRadius.modal,
    maxHeight: '80%',
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: componentSpacing.modalPadding,
    paddingTop: componentSpacing.modalPadding,
    paddingBottom: spacing.md,
  },
  title: {
    fontWeight: '600',
  },
  banner: {
    marginHorizontal: componentSpacing.modalPadding,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: componentRadius.card,
  },
  list: {
    paddingHorizontal: componentSpacing.modalPadding,
    paddingBottom: componentSpacing.modalPadding,
  },
  sectionHeader: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  voiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: componentRadius.card,
    borderWidth: 1,
  },
  voiceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  voiceDetails: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  voiceName: {
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    marginTop: spacing.sm,
  },
});

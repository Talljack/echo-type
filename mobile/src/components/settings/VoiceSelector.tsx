/**
 * TTS Voice Selector Component
 * Allows users to choose from available TTS voices
 */
import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { IconButton, Modal, Portal, RadioButton, Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import { componentRadius } from '@/theme/radius';
import { shadows } from '@/theme/shadows';
import { componentSpacing, spacing } from '@/theme/spacing';

export interface Voice {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female';
  preview: string;
}

export const AVAILABLE_VOICES: Voice[] = [
  {
    id: 'en-US-JennyNeural',
    name: 'Jenny (US)',
    language: 'en-US',
    gender: 'female',
    preview: 'Hello! This is how I sound.',
  },
  {
    id: 'en-US-GuyNeural',
    name: 'Guy (US)',
    language: 'en-US',
    gender: 'male',
    preview: 'Hello! This is how I sound.',
  },
  {
    id: 'en-GB-SoniaNeural',
    name: 'Sonia (UK)',
    language: 'en-GB',
    gender: 'female',
    preview: 'Hello! This is how I sound.',
  },
  {
    id: 'en-GB-RyanNeural',
    name: 'Ryan (UK)',
    language: 'en-GB',
    gender: 'male',
    preview: 'Hello! This is how I sound.',
  },
  {
    id: 'zh-CN-XiaoxiaoNeural',
    name: 'Xiaoxiao (CN)',
    language: 'zh-CN',
    gender: 'female',
    preview: '你好！这是我的声音。',
  },
  {
    id: 'zh-CN-YunxiNeural',
    name: 'Yunxi (CN)',
    language: 'zh-CN',
    gender: 'male',
    preview: '你好！这是我的声音。',
  },
];

interface VoiceSelectorProps {
  visible: boolean;
  selectedVoice: string;
  onDismiss: () => void;
  onSelect: (voiceId: string) => void;
  onPreview?: (voice: Voice) => void;
}

export function VoiceSelector({ visible, selectedVoice, onDismiss, onSelect, onPreview }: VoiceSelectorProps) {
  const { colors } = useAppTheme();
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  const handlePreview = (voice: Voice) => {
    setPreviewingVoice(voice.id);
    onPreview?.(voice);
    // Reset after 2 seconds
    setTimeout(() => setPreviewingVoice(null), 2000);
  };

  const handleSelect = (voiceId: string) => {
    onSelect(voiceId);
    onDismiss();
  };

  const renderVoiceItem = ({ item }: { item: Voice }) => {
    const isSelected = item.id === selectedVoice;
    const isPreviewing = item.id === previewingVoice;

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
        accessibilityLabel={`${item.name}, ${item.gender}, ${item.language}`}
      >
        <View style={styles.voiceInfo}>
          <RadioButton.Android
            value={item.id}
            status={isSelected ? 'checked' : 'unchecked'}
            onPress={() => handleSelect(item.id)}
            color={colors.primary}
          />
          <View style={styles.voiceDetails}>
            <Text variant="bodyLarge" style={[styles.voiceName, { color: colors.onSurface }]}>
              {item.name}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              {item.language} • {item.gender}
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

        <FlatList
          data={AVAILABLE_VOICES}
          keyExtractor={(item) => item.id}
          renderItem={renderVoiceItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
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
  list: {
    paddingHorizontal: componentSpacing.modalPadding,
    paddingBottom: componentSpacing.modalPadding,
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
});

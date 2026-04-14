import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button, Modal, Portal, SegmentedButtons, Text } from 'react-native-paper';
import { MvpNoticeCard } from '@/components/ui/MvpNoticeCard';
import { getImportOptions, type ImportMethod } from '@/features/library/import-capabilities';
import { generateWithAI } from '@/lib/import/ai';
import { importFromPDF } from '@/lib/import/pdf';
import { importFromText, importFromUrl, importFromYouTube } from '@/lib/import/url';
import { useLibraryStore } from '@/stores/useLibraryStore';

interface ImportModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export function ImportModal({ visible, onDismiss }: ImportModalProps) {
  const [method, setMethod] = useState<ImportMethod>('text');
  const [loading, setLoading] = useState(false);

  const importOptions = getImportOptions();
  const enabledButtons = importOptions
    .filter((item) => item.enabled)
    .map((item) => ({
      value: item.method,
      label: item.label,
    }));

  // URL/YouTube
  const [url, setUrl] = useState('');

  // Text
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');

  // AI
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');

  const addContent = useLibraryStore((state) => state.addContent);

  const handleImport = async () => {
    setLoading(true);
    try {
      let result;

      switch (method) {
        case 'url':
          if (!url.trim()) {
            Alert.alert('Error', 'Please enter a URL');
            return;
          }
          result = await importFromUrl(url);
          break;

        case 'youtube':
          if (!url.trim()) {
            Alert.alert('Error', 'Please enter a YouTube URL');
            return;
          }
          result = await importFromYouTube(url);
          break;

        case 'pdf':
          result = await importFromPDF();
          break;

        case 'text':
          if (!title.trim() || !text.trim()) {
            Alert.alert('Error', 'Please enter title and text');
            return;
          }
          result = importFromText(title, text);
          break;

        case 'ai':
          if (!topic.trim()) {
            Alert.alert('Error', 'Please enter a topic');
            return;
          }
          result = await generateWithAI({
            topic,
            difficulty,
            length,
            language: 'en',
          });
          break;
      }

      if (result.success && result.content) {
        addContent(result.content);
        Alert.alert('Success', 'Content imported successfully');
        resetForm();
        onDismiss();
      } else {
        Alert.alert('Error', result.error || 'Failed to import content');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUrl('');
    setTitle('');
    setText('');
    setTopic('');
    setDifficulty('intermediate');
    setLength('medium');
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
        <ScrollView>
          <Text variant="headlineSmall" style={styles.title}>
            Import Content
          </Text>

          <SegmentedButtons
            value={method}
            onValueChange={(value) => setMethod(value as ImportMethod)}
            buttons={enabledButtons}
            style={styles.segmented}
          />

          <MvpNoticeCard
            title="More import methods coming later"
            body="URL, YouTube, PDF, and AI generation are intentionally disabled in the current mobile MVP."
          />

          {(method === 'url' || method === 'youtube') && (
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder={method === 'url' ? 'Enter URL' : 'Enter YouTube URL'}
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          )}

          {method === 'text' && (
            <View style={styles.form}>
              <TextInput style={styles.input} placeholder="Title" value={title} onChangeText={setTitle} />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Paste or type your text here..."
                value={text}
                onChangeText={setText}
                multiline
                numberOfLines={8}
              />
            </View>
          )}

          {method === 'ai' && (
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Topic (e.g., 'Climate Change')"
                value={topic}
                onChangeText={setTopic}
              />

              <Text variant="labelLarge" style={styles.label}>
                Difficulty
              </Text>
              <SegmentedButtons
                value={difficulty}
                onValueChange={(value) => setDifficulty(value as any)}
                buttons={[
                  { value: 'beginner', label: 'Beginner' },
                  { value: 'intermediate', label: 'Intermediate' },
                  { value: 'advanced', label: 'Advanced' },
                ]}
                style={styles.segmented}
              />

              <Text variant="labelLarge" style={styles.label}>
                Length
              </Text>
              <SegmentedButtons
                value={length}
                onValueChange={(value) => setLength(value as any)}
                buttons={[
                  { value: 'short', label: 'Short' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'long', label: 'Long' },
                ]}
                style={styles.segmented}
              />
            </View>
          )}

          {method === 'pdf' && (
            <View style={styles.form}>
              <Text variant="bodyMedium" style={styles.hint}>
                Tap "Import" to select a PDF file from your device
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            <Button mode="outlined" onPress={onDismiss} style={styles.button}>
              Cancel
            </Button>
            <Button mode="contained" onPress={handleImport} loading={loading} disabled={loading} style={styles.button}>
              Import
            </Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: 'white',
    padding: 24,
    margin: 20,
    borderRadius: 16,
    maxHeight: '80%',
  },
  title: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  segmented: {
    marginBottom: 16,
  },
  form: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  label: {
    marginBottom: 8,
    marginTop: 8,
  },
  hint: {
    color: '#6B7280',
    textAlign: 'center',
    padding: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  button: {
    minWidth: 100,
  },
});

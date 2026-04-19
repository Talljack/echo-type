import React, { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button, Modal, Portal, SegmentedButtons, Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import { getTextInputA11yProps, MIN_TOUCH_TARGET_SIZE } from '@/lib/accessibility';
import { getErrorMessage, isNetworkError, logError, ValidationError } from '@/lib/errors';
import { generateWithAI } from '@/lib/import/ai';
import { pickAndTranscribeMedia } from '@/lib/import/media';
import { importFromPDF } from '@/lib/import/pdf';
import { importFromText, importFromUrl, importFromYouTube } from '@/lib/import/url';
import { toast } from '@/lib/toast';
import { useLibraryStore } from '@/stores/useLibraryStore';

interface ImportModalProps {
  visible: boolean;
  onDismiss: () => void;
}

type MainCategory = 'document' | 'media' | 'ai';
type DocumentSubTab = 'paste' | 'upload' | 'url';
type MediaSubTab = 'url' | 'local';
type ContentType = 'word' | 'phrase' | 'sentence' | 'article';

export function ImportModal({ visible, onDismiss }: ImportModalProps) {
  const { colors } = useAppTheme();
  const inputSurfaceStyle = { borderColor: colors.borderLight, backgroundColor: colors.surfaceVariant };
  const [mainCategory, setMainCategory] = useState<MainCategory>('document');
  const [documentTab, setDocumentTab] = useState<DocumentSubTab>('paste');
  const [mediaTab, setMediaTab] = useState<MediaSubTab>('url');
  const [loading, setLoading] = useState(false);

  // Document - Paste Text
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteText, setPasteText] = useState('');

  // Document - URL
  const [docUrl, setDocUrl] = useState('');

  // Media - URL (YouTube/Video)
  const [mediaUrl, setMediaUrl] = useState('');

  // AI Generate
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiDifficulty, setAiDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [aiContentType, setAiContentType] = useState<ContentType>('sentence');

  const addContent = useLibraryStore((state) => state.addContent);

  const handleImport = async () => {
    setLoading(true);
    try {
      let result;

      if (mainCategory === 'document') {
        if (documentTab === 'paste') {
          if (!pasteTitle.trim() || !pasteText.trim()) {
            throw new ValidationError('Please enter title and text');
          }
          result = importFromText(pasteTitle, pasteText);
        } else if (documentTab === 'upload') {
          result = await importFromPDF();
        } else if (documentTab === 'url') {
          if (!docUrl.trim()) {
            throw new ValidationError('Please enter a URL');
          }
          result = await importFromUrl(docUrl);
        }
      } else if (mainCategory === 'media') {
        if (mediaTab === 'url') {
          if (!mediaUrl.trim()) {
            throw new ValidationError('Please enter a YouTube or video URL');
          }
          // Try YouTube first, fallback to generic URL
          result = await importFromYouTube(mediaUrl);
        } else if (mediaTab === 'local') {
          result = await pickAndTranscribeMedia();
        }
      } else if (mainCategory === 'ai') {
        if (!aiPrompt.trim()) {
          throw new ValidationError('Please enter a prompt');
        }
        result = await generateWithAI({
          topic: aiPrompt,
          difficulty: aiDifficulty,
          language: 'en',
          contentType: aiContentType,
        });
      }

      if (result?.success && result.content) {
        const appContent = {
          ...result.content,
          type: 'article' as const,
          content: result.content.text,
          isStarred: false,
          progress: 0,
        };
        addContent(appContent);
        toast.success({
          title: 'Success',
          message: 'Content imported successfully',
        });
        resetForm();
        onDismiss();
      } else {
        throw new Error(result?.error || 'Failed to import content');
      }
    } catch (error) {
      logError(error, 'ImportModal.handleImport');

      if (error instanceof ValidationError) {
        toast.validationError(error.message);
      } else if (isNetworkError(error)) {
        toast.networkError();
      } else {
        toast.error({
          title: 'Import Failed',
          message: getErrorMessage(error),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPasteTitle('');
    setPasteText('');
    setDocUrl('');
    setMediaUrl('');
    setAiPrompt('');
    setAiDifficulty('intermediate');
    setAiContentType('sentence');
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modal, { backgroundColor: colors.surface }]}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text variant="headlineSmall" style={styles.title}>
            Import Content
          </Text>

          {/* Main Category Tabs */}
          <SegmentedButtons
            value={mainCategory}
            onValueChange={(value) => setMainCategory(value as MainCategory)}
            buttons={[
              { value: 'document', label: 'Document' },
              { value: 'media', label: 'Media' },
              { value: 'ai', label: 'AI' },
            ]}
            style={styles.segmented}
          />

          {/* Document Category */}
          {mainCategory === 'document' && (
            <>
              <SegmentedButtons
                value={documentTab}
                onValueChange={(value) => setDocumentTab(value as DocumentSubTab)}
                buttons={[
                  { value: 'paste', label: 'Paste' },
                  { value: 'upload', label: 'Upload' },
                  { value: 'url', label: 'URL' },
                ]}
                style={styles.subSegmented}
              />

              {documentTab === 'paste' && (
                <View style={styles.form}>
                  <TextInput
                    style={[styles.input, inputSurfaceStyle]}
                    placeholder="Title"
                    value={pasteTitle}
                    onChangeText={setPasteTitle}
                    {...getTextInputA11yProps('Title', pasteTitle, true)}
                  />
                  <TextInput
                    style={[styles.input, styles.textArea, inputSurfaceStyle]}
                    placeholder="Paste or type your text here..."
                    value={pasteText}
                    onChangeText={setPasteText}
                    multiline
                    numberOfLines={8}
                    {...getTextInputA11yProps('Content text', pasteText, true)}
                  />
                </View>
              )}

              {documentTab === 'upload' && (
                <View style={styles.form}>
                  <Text variant="bodyMedium" style={[styles.hint, { color: colors.onSurfaceSecondary }]}>
                    Tap "Import" to select a PDF or document file from your device
                  </Text>
                </View>
              )}

              {documentTab === 'url' && (
                <View style={styles.form}>
                  <TextInput
                    style={[styles.input, inputSurfaceStyle]}
                    placeholder="Enter article URL"
                    value={docUrl}
                    onChangeText={setDocUrl}
                    autoCapitalize="none"
                    keyboardType="url"
                    {...getTextInputA11yProps('Document URL', docUrl, true)}
                  />
                </View>
              )}
            </>
          )}

          {/* Media Category */}
          {mainCategory === 'media' && (
            <>
              <SegmentedButtons
                value={mediaTab}
                onValueChange={(value) => setMediaTab(value as MediaSubTab)}
                buttons={[
                  { value: 'url', label: 'URL' },
                  { value: 'local', label: 'Local' },
                ]}
                style={styles.subSegmented}
              />

              {mediaTab === 'url' && (
                <View style={styles.form}>
                  <Text variant="bodySmall" style={[styles.description, { color: colors.primary }]}>
                    Import from YouTube or other video platforms
                  </Text>
                  <TextInput
                    style={[styles.input, inputSurfaceStyle]}
                    placeholder="Enter YouTube or video URL"
                    value={mediaUrl}
                    onChangeText={setMediaUrl}
                    autoCapitalize="none"
                    keyboardType="url"
                    {...getTextInputA11yProps('Media URL', mediaUrl, true)}
                  />
                </View>
              )}

              {mediaTab === 'local' && (
                <View style={styles.form}>
                  <Text variant="bodyMedium" style={[styles.hint, { color: colors.onSurfaceSecondary }]}>
                    Tap "Import" to select an audio or video file from your device for transcription
                  </Text>
                </View>
              )}
            </>
          )}

          {/* AI Category */}
          {mainCategory === 'ai' && (
            <View style={styles.form}>
              <Text variant="bodySmall" style={[styles.description, { color: colors.primary }]}>
                Generate learning content with AI based on your topic
              </Text>
              <TextInput
                style={[styles.input, inputSurfaceStyle]}
                placeholder="Topic (e.g., 'Climate Change', 'Business English')"
                value={aiPrompt}
                onChangeText={setAiPrompt}
                {...getTextInputA11yProps('Topic', aiPrompt, true)}
              />

              <Text variant="labelLarge" style={styles.label}>
                Difficulty
              </Text>
              <SegmentedButtons
                value={aiDifficulty}
                onValueChange={(value) => setAiDifficulty(value as any)}
                buttons={[
                  { value: 'beginner', label: 'Beginner' },
                  { value: 'intermediate', label: 'Intermediate' },
                  { value: 'advanced', label: 'Advanced' },
                ]}
                style={styles.segmented}
              />

              <Text variant="labelLarge" style={styles.label}>
                Content Type
              </Text>
              <SegmentedButtons
                value={aiContentType}
                onValueChange={(value) => setAiContentType(value as ContentType)}
                buttons={[
                  { value: 'word', label: 'Words' },
                  { value: 'phrase', label: 'Phrases' },
                  { value: 'sentence', label: 'Sentences' },
                  { value: 'article', label: 'Article' },
                ]}
                style={styles.segmented}
              />
            </View>
          )}

          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={onDismiss}
              style={styles.button}
              accessibilityLabel="Cancel import"
              accessibilityRole="button"
              accessibilityHint="Closes the import modal without importing"
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleImport}
              loading={loading}
              disabled={loading}
              style={styles.button}
              accessibilityLabel="Import content"
              accessibilityRole="button"
              accessibilityHint="Imports the content with the selected method"
              accessibilityState={{ disabled: loading, busy: loading }}
            >
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
  subSegmented: {
    marginBottom: 12,
    marginTop: 8,
  },
  form: {
    marginBottom: 16,
  },
  description: {
    marginBottom: 12,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    minHeight: MIN_TOUCH_TARGET_SIZE,
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
    minHeight: MIN_TOUCH_TARGET_SIZE,
  },
});

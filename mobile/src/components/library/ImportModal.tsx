import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button, Modal, Portal, SegmentedButtons, Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/hooks/useI18n';
import { getTextInputA11yProps, MIN_TOUCH_TARGET_SIZE } from '@/lib/accessibility';
import { getErrorMessage, isNetworkError, logError, ValidationError } from '@/lib/errors';
import { generateWithAI } from '@/lib/import/ai';
import { pickAndImportDocumentFile } from '@/lib/import/file';
import { pickAndTranscribeMedia } from '@/lib/import/media';
import { type ImportContentOverrides, importFromText, importFromUrl, importFromYouTube } from '@/lib/import/url';
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
type DocDifficulty = 'beginner' | 'intermediate' | 'advanced';
type DocLanguage = 'auto' | 'en' | 'zh' | 'ja' | 'ko';

function parseCommaTags(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function localizeFileImportError(code: string | undefined, t: (key: string, fallback?: string) => string): string {
  switch (code) {
    case 'FILE_TOO_LARGE':
      return t('import.error.fileTooLarge');
    case 'EMPTY_FILE':
      return t('import.error.emptyFile');
    case 'UNSUPPORTED_FORMAT':
      return t('import.error.unsupportedFormat');
    case 'NO_FILE_SELECTED':
      return t('import.error.generic');
    case 'DOCUMENT_PICK_CANCELLED':
      return '';
    default:
      return code?.trim() ? code : t('import.error.generic');
  }
}

export function ImportModal({ visible, onDismiss }: ImportModalProps) {
  const { colors } = useAppTheme();
  const { t } = useI18n();
  const inputSurfaceStyle = { borderColor: colors.borderLight, backgroundColor: colors.surfaceVariant };
  const [mainCategory, setMainCategory] = useState<MainCategory>('document');
  const [documentTab, setDocumentTab] = useState<DocumentSubTab>('paste');
  const [mediaTab, setMediaTab] = useState<MediaSubTab>('url');
  const [loading, setLoading] = useState(false);

  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [docUrl, setDocUrl] = useState('');

  const [docDifficulty, setDocDifficulty] = useState<DocDifficulty>('intermediate');
  const [docTagsInput, setDocTagsInput] = useState('');
  const [docLanguage, setDocLanguage] = useState<DocLanguage>('auto');

  const [mediaUrl, setMediaUrl] = useState('');

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiDifficulty, setAiDifficulty] = useState<DocDifficulty>('intermediate');
  const [aiContentType, setAiContentType] = useState<ContentType>('sentence');

  const addContent = useLibraryStore((state) => state.addContent);

  const documentOverrides: ImportContentOverrides = {
    difficulty: docDifficulty,
    tags: parseCommaTags(docTagsInput),
    language: docLanguage,
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      let result;

      if (mainCategory === 'document') {
        if (documentTab === 'paste') {
          if (!pasteTitle.trim() || !pasteText.trim()) {
            throw new ValidationError(t('import.validation.titleAndText'));
          }
          result = importFromText(pasteTitle, pasteText, {
            difficulty: docDifficulty,
            tags: parseCommaTags(docTagsInput),
            language: docLanguage,
          });
        } else if (documentTab === 'upload') {
          result = await pickAndImportDocumentFile({
            difficulty: docDifficulty,
            tags: parseCommaTags(docTagsInput),
            language: docLanguage,
          });
          if (!result.success && result.error === 'DOCUMENT_PICK_CANCELLED') {
            return;
          }
          if (!result.success && result.error) {
            const msg = localizeFileImportError(result.error, t);
            if (msg) {
              toast.error({ title: t('import.toast.failTitle'), message: msg });
            }
            return;
          }
        } else if (documentTab === 'url') {
          if (!docUrl.trim()) {
            throw new ValidationError(t('import.validation.url'));
          }
          result = await importFromUrl(docUrl.trim(), documentOverrides);
        }
      } else if (mainCategory === 'media') {
        if (mediaTab === 'url') {
          if (!mediaUrl.trim()) {
            throw new ValidationError(t('import.validation.videoUrl'));
          }
          result = await importFromYouTube(mediaUrl);
        } else if (mediaTab === 'local') {
          result = await pickAndTranscribeMedia();
        }
      } else if (mainCategory === 'ai') {
        if (!aiPrompt.trim()) {
          throw new ValidationError(t('import.validation.prompt'));
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
          title: t('import.success.title'),
          message: t('import.success.message'),
        });
        resetForm();
        onDismiss();
      } else {
        throw new Error(result?.error || t('import.error.generic'));
      }
    } catch (error) {
      logError(error, 'ImportModal.handleImport');

      if (error instanceof ValidationError) {
        toast.validationError(error.message);
      } else if (isNetworkError(error)) {
        toast.networkError();
      } else {
        toast.error({
          title: t('import.toast.failTitle'),
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
    setDocDifficulty('intermediate');
    setDocTagsInput('');
    setDocLanguage('auto');
  };

  const renderDocumentMeta = () => (
    <View style={styles.metaBlock}>
      <Text variant="labelLarge" style={[styles.label, { color: colors.onSurface }]}>
        {t('import.label.difficulty')}
      </Text>
      <SegmentedButtons
        value={docDifficulty}
        onValueChange={(value) => setDocDifficulty(value as DocDifficulty)}
        buttons={[
          { value: 'beginner', label: t('import.difficulty.beginner') },
          { value: 'intermediate', label: t('import.difficulty.intermediate') },
          { value: 'advanced', label: t('import.difficulty.advanced') },
        ]}
        style={styles.segmentedTight}
      />

      <Text variant="labelLarge" style={[styles.label, { color: colors.onSurface }]}>
        {t('import.label.tags')}
      </Text>
      <TextInput
        style={[styles.input, inputSurfaceStyle]}
        placeholder={t('import.placeholder.tags')}
        placeholderTextColor={colors.onSurfaceSecondary}
        value={docTagsInput}
        onChangeText={setDocTagsInput}
        autoCapitalize="none"
        {...getTextInputA11yProps(t('import.label.tags'), docTagsInput, false)}
      />

      <Text variant="labelLarge" style={[styles.label, { color: colors.onSurface }]}>
        {t('import.label.language')}
      </Text>
      <SegmentedButtons
        value={docLanguage}
        onValueChange={(value) => setDocLanguage(value as DocLanguage)}
        buttons={[
          { value: 'auto', label: t('import.language.auto') },
          { value: 'en', label: t('import.language.en') },
          { value: 'zh', label: t('import.language.zh') },
          { value: 'ja', label: t('import.language.ja') },
          { value: 'ko', label: t('import.language.ko') },
        ]}
        style={styles.segmentedTight}
      />
    </View>
  );

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modal, { backgroundColor: colors.surface }]}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text variant="headlineSmall" style={[styles.title, { color: colors.onSurface }]}>
            {t('import.title')}
          </Text>

          <SegmentedButtons
            value={mainCategory}
            onValueChange={(value) => setMainCategory(value as MainCategory)}
            buttons={[
              { value: 'document', label: t('import.tab.document') },
              { value: 'media', label: t('import.tab.media') },
              { value: 'ai', label: t('import.tab.ai') },
            ]}
            style={styles.segmented}
          />

          {mainCategory === 'document' && (
            <>
              <SegmentedButtons
                value={documentTab}
                onValueChange={(value) => setDocumentTab(value as DocumentSubTab)}
                buttons={[
                  { value: 'paste', label: t('import.tab.paste') },
                  { value: 'upload', label: t('import.tab.upload') },
                  { value: 'url', label: t('import.tab.url') },
                ]}
                style={styles.subSegmented}
              />

              {documentTab === 'paste' && (
                <View style={styles.form}>
                  <TextInput
                    style={[styles.input, inputSurfaceStyle]}
                    placeholder={t('import.placeholder.title')}
                    placeholderTextColor={colors.onSurfaceSecondary}
                    value={pasteTitle}
                    onChangeText={setPasteTitle}
                    {...getTextInputA11yProps(t('import.placeholder.title'), pasteTitle, true)}
                  />
                  <TextInput
                    style={[styles.input, styles.textArea, inputSurfaceStyle]}
                    placeholder={t('import.placeholder.pasteText')}
                    placeholderTextColor={colors.onSurfaceSecondary}
                    value={pasteText}
                    onChangeText={setPasteText}
                    multiline
                    numberOfLines={8}
                    {...getTextInputA11yProps(t('import.placeholder.pasteText'), pasteText, true)}
                  />
                </View>
              )}

              {documentTab === 'upload' && (
                <View style={styles.form}>
                  <Text variant="bodyMedium" style={[styles.hint, { color: colors.onSurfaceSecondary }]}>
                    {t('import.hint.uploadDocument')}
                  </Text>
                </View>
              )}

              {documentTab === 'url' && (
                <View style={styles.form}>
                  <TextInput
                    style={[styles.input, inputSurfaceStyle]}
                    placeholder={t('import.placeholder.articleUrl')}
                    placeholderTextColor={colors.onSurfaceSecondary}
                    value={docUrl}
                    onChangeText={setDocUrl}
                    autoCapitalize="none"
                    keyboardType="url"
                    {...getTextInputA11yProps(t('import.placeholder.articleUrl'), docUrl, true)}
                  />
                </View>
              )}

              {renderDocumentMeta()}
            </>
          )}

          {mainCategory === 'media' && (
            <>
              <SegmentedButtons
                value={mediaTab}
                onValueChange={(value) => setMediaTab(value as MediaSubTab)}
                buttons={[
                  { value: 'url', label: t('import.tab.url') },
                  { value: 'local', label: t('import.tab.local') },
                ]}
                style={styles.subSegmented}
              />

              {mediaTab === 'url' && (
                <View style={styles.form}>
                  <Text variant="bodySmall" style={[styles.description, { color: colors.primary }]}>
                    {t('import.media.fromVideo')}
                  </Text>
                  <TextInput
                    style={[styles.input, inputSurfaceStyle]}
                    placeholder={t('import.placeholder.videoUrl')}
                    placeholderTextColor={colors.onSurfaceSecondary}
                    value={mediaUrl}
                    onChangeText={setMediaUrl}
                    autoCapitalize="none"
                    keyboardType="url"
                    {...getTextInputA11yProps(t('import.placeholder.videoUrl'), mediaUrl, true)}
                  />
                </View>
              )}

              {mediaTab === 'local' && (
                <View style={styles.form}>
                  <Text variant="bodyMedium" style={[styles.hint, { color: colors.onSurfaceSecondary }]}>
                    {t('import.hint.transcribeLocal')}
                  </Text>
                </View>
              )}
            </>
          )}

          {mainCategory === 'ai' && (
            <View style={styles.form}>
              <Text variant="bodySmall" style={[styles.description, { color: colors.primary }]}>
                {t('import.description.ai')}
              </Text>
              <TextInput
                style={[styles.input, inputSurfaceStyle]}
                placeholder={t('import.placeholder.aiTopic')}
                placeholderTextColor={colors.onSurfaceSecondary}
                value={aiPrompt}
                onChangeText={setAiPrompt}
                {...getTextInputA11yProps(t('import.placeholder.aiTopic'), aiPrompt, true)}
              />

              <Text variant="labelLarge" style={[styles.label, { color: colors.onSurface }]}>
                {t('import.label.difficulty')}
              </Text>
              <SegmentedButtons
                value={aiDifficulty}
                onValueChange={(value) => setAiDifficulty(value as DocDifficulty)}
                buttons={[
                  { value: 'beginner', label: t('import.difficulty.beginner') },
                  { value: 'intermediate', label: t('import.difficulty.intermediate') },
                  { value: 'advanced', label: t('import.difficulty.advanced') },
                ]}
                style={styles.segmented}
              />

              <Text variant="labelLarge" style={[styles.label, { color: colors.onSurface }]}>
                {t('import.label.contentType')}
              </Text>
              <SegmentedButtons
                value={aiContentType}
                onValueChange={(value) => setAiContentType(value as ContentType)}
                buttons={[
                  { value: 'word', label: t('import.contentType.word') },
                  { value: 'phrase', label: t('import.contentType.phrase') },
                  { value: 'sentence', label: t('import.contentType.sentence') },
                  { value: 'article', label: t('import.contentType.article') },
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
              accessibilityLabel={t('import.a11y.cancel')}
              accessibilityRole="button"
              accessibilityHint={t('import.a11y.cancelHint')}
            >
              {t('common.cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleImport}
              loading={loading}
              disabled={loading}
              style={styles.button}
              accessibilityLabel={t('import.a11y.confirm')}
              accessibilityRole="button"
              accessibilityHint={t('import.a11y.confirmHint')}
              accessibilityState={{ disabled: loading, busy: loading }}
            >
              {t('import.submit')}
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
  segmentedTight: {
    marginBottom: 12,
  },
  form: {
    marginBottom: 16,
  },
  metaBlock: {
    marginBottom: 8,
  },
  description: {
    marginBottom: 12,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
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
    marginTop: 4,
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

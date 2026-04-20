import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Menu, Modal, Portal, SegmentedButtons, Text, TextInput } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useFavoriteStore } from '@/stores/useFavoriteStore';
import type { FavoriteType } from '@/types/favorite';

interface AddFavoriteModalProps {
  visible: boolean;
  selectedWord: string;
  context?: string;
  onDismiss: () => void;
}

export function AddFavoriteModal({ visible, selectedWord, context, onDismiss }: AddFavoriteModalProps) {
  const { colors } = useAppTheme();
  const addFavorite = useFavoriteStore((state) => state.addFavorite);
  const folders = useFavoriteStore((state) => state.folders);

  const [text, setText] = useState(selectedWord);
  const [translation, setTranslation] = useState('');
  const [pronunciation, setPronunciation] = useState('');
  const [notes, setNotes] = useState('');
  const [example, setExample] = useState(context || '');
  const [type, setType] = useState<FavoriteType>('word');
  const [folderId, setFolderId] = useState('default');
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setText(selectedWord);
      setExample(context || '');
    }
  }, [visible, selectedWord, context]);

  const selectedFolder = useMemo(() => folders.find((f) => f.id === folderId) ?? folders[0], [folders, folderId]);

  const handleSave = () => {
    if (text.trim() && translation.trim()) {
      addFavorite({
        text: text.trim(),
        translation: translation.trim(),
        type,
        folderId,
        context: example.trim() || undefined,
        pronunciation: pronunciation.trim() || undefined,
        notes: notes.trim() || undefined,
        sourceModule: 'read',
        targetLang: 'en',
      });
      onDismiss();
      setText('');
      setTranslation('');
      setPronunciation('');
      setNotes('');
      setExample('');
      setType('word');
      setFolderId('default');
    }
  };

  const handleCancel = () => {
    setText(selectedWord);
    setTranslation('');
    setPronunciation('');
    setNotes('');
    setExample(context || '');
    setType('word');
    setFolderId('default');
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleCancel}
        contentContainerStyle={[styles.modal, { backgroundColor: colors.surface }]}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text variant="headlineSmall" style={[styles.header, { color: colors.onSurface }]}>
            Add to Favorites
          </Text>

          <Text variant="labelLarge" style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>
            Type
          </Text>
          <SegmentedButtons
            value={type}
            onValueChange={(v) => setType(v as FavoriteType)}
            buttons={[
              { value: 'word', label: 'Word' },
              { value: 'phrase', label: 'Phrase' },
              { value: 'sentence', label: 'Sentence' },
            ]}
            style={styles.segmented}
          />

          <Text variant="labelLarge" style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>
            Folder
          </Text>
          <Menu
            visible={folderMenuOpen}
            onDismiss={() => setFolderMenuOpen(false)}
            anchor={
              <Button mode="outlined" onPress={() => setFolderMenuOpen(true)} style={styles.folderButton}>
                {selectedFolder ? `${selectedFolder.emoji} ${selectedFolder.name}` : 'Select folder'}
              </Button>
            }
          >
            {folders.map((f) => (
              <Menu.Item
                key={f.id}
                onPress={() => {
                  setFolderId(f.id);
                  setFolderMenuOpen(false);
                }}
                title={`${f.emoji} ${f.name}`}
              />
            ))}
          </Menu>

          <TextInput
            label="Text"
            value={text}
            onChangeText={setText}
            mode="outlined"
            style={styles.input}
            autoCapitalize="none"
          />

          <TextInput
            label="Translation"
            value={translation}
            onChangeText={setTranslation}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
            placeholder="Definition or translation"
          />

          <TextInput
            label="Pronunciation (optional)"
            value={pronunciation}
            onChangeText={setPronunciation}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Context (optional)"
            value={example}
            onChangeText={setExample}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
            placeholder="Example sentence"
          />

          <TextInput
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            mode="outlined"
            multiline
            numberOfLines={2}
            style={styles.input}
          />

          <View style={styles.actions}>
            <Button mode="outlined" onPress={handleCancel} style={styles.button}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              style={styles.button}
              disabled={!text.trim() || !translation.trim()}
            >
              Add
            </Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    padding: 20,
    margin: 20,
    borderRadius: 16,
    borderCurve: 'continuous',
    maxHeight: '85%',
  },
  header: {
    marginBottom: 16,
    fontWeight: '700',
  },
  sectionLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
  segmented: {
    marginBottom: 16,
  },
  folderButton: {
    marginBottom: 16,
    alignSelf: 'stretch',
  },
  input: {
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
  },
});

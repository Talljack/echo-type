import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Modal, Portal, Text, TextInput } from 'react-native-paper';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { Content } from '@/types/content';

interface EditContentModalProps {
  visible: boolean;
  content: Content;
  onDismiss: () => void;
}

export function EditContentModal({ visible, content, onDismiss }: EditContentModalProps) {
  const updateContent = useLibraryStore((state) => state.updateContent);

  const [title, setTitle] = useState(content.title);
  const [text, setText] = useState(content.text || content.content);
  const [tags, setTags] = useState(content.tags?.join(', ') || '');
  const [difficulty, setDifficulty] = useState(content.difficulty);

  const handleSave = () => {
    updateContent(content.id, {
      title,
      text,
      content: text, // Update both fields for compatibility
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      difficulty,
    });
    onDismiss();
  };

  const handleCancel = () => {
    // Reset to original values
    setTitle(content.title);
    setText(content.text || content.content);
    setTags(content.tags?.join(', ') || '');
    setDifficulty(content.difficulty);
    onDismiss();
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={handleCancel} contentContainerStyle={styles.modal}>
        <ScrollView>
          <Text variant="headlineSmall" style={styles.header}>
            Edit Content
          </Text>

          <TextInput label="Title" value={title} onChangeText={setTitle} mode="outlined" style={styles.input} />

          <TextInput
            label="Content"
            value={text}
            onChangeText={setText}
            mode="outlined"
            multiline
            numberOfLines={8}
            style={styles.input}
          />

          <TextInput
            label="Tags (comma-separated)"
            value={tags}
            onChangeText={setTags}
            mode="outlined"
            placeholder="e.g. business, technology, beginner"
            style={styles.input}
          />

          <View style={styles.difficultyContainer}>
            <Text variant="labelLarge" style={styles.difficultyLabel}>
              Difficulty
            </Text>
            <View style={styles.difficultyButtons}>
              {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                <Button
                  key={level}
                  mode={difficulty === level ? 'contained' : 'outlined'}
                  onPress={() => setDifficulty(level)}
                  style={styles.difficultyButton}
                >
                  {level}
                </Button>
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            <Button mode="outlined" onPress={handleCancel} style={styles.button}>
              Cancel
            </Button>
            <Button mode="contained" onPress={handleSave} style={styles.button}>
              Save
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
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '90%',
  },
  header: {
    marginBottom: 16,
    fontWeight: '700',
  },
  input: {
    marginBottom: 16,
  },
  difficultyContainer: {
    marginBottom: 16,
  },
  difficultyLabel: {
    marginBottom: 8,
  },
  difficultyButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  difficultyButton: {
    flex: 1,
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

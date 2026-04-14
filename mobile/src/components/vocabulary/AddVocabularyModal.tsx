import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Modal, Portal, Text, TextInput } from 'react-native-paper';
import { useReviewStore } from '@/stores/useReviewStore';

interface AddVocabularyModalProps {
  visible: boolean;
  selectedWord: string;
  context?: string;
  onDismiss: () => void;
}

export function AddVocabularyModal({ visible, selectedWord, context, onDismiss }: AddVocabularyModalProps) {
  const addCard = useReviewStore((state) => state.addCard);

  const [word, setWord] = useState(selectedWord);
  const [meaning, setMeaning] = useState('');
  const [example, setExample] = useState(context || '');

  const handleSave = () => {
    if (word.trim() && meaning.trim()) {
      addCard(word.trim(), meaning.trim(), example.trim() || undefined);
      onDismiss();
      // Reset form
      setWord('');
      setMeaning('');
      setExample('');
    }
  };

  const handleCancel = () => {
    setWord(selectedWord);
    setMeaning('');
    setExample(context || '');
    onDismiss();
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={handleCancel} contentContainerStyle={styles.modal}>
        <ScrollView>
          <Text variant="headlineSmall" style={styles.header}>
            Add to Vocabulary
          </Text>

          <TextInput
            label="Word"
            value={word}
            onChangeText={setWord}
            mode="outlined"
            style={styles.input}
            autoCapitalize="none"
          />

          <TextInput
            label="Meaning"
            value={meaning}
            onChangeText={setMeaning}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
            placeholder="Enter the definition or translation"
          />

          <TextInput
            label="Example (optional)"
            value={example}
            onChangeText={setExample}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
            placeholder="Enter an example sentence"
          />

          <View style={styles.actions}>
            <Button mode="outlined" onPress={handleCancel} style={styles.button}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              style={styles.button}
              disabled={!word.trim() || !meaning.trim()}
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
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  header: {
    marginBottom: 16,
    fontWeight: '700',
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

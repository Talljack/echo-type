import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Text } from 'react-native-paper';

interface TypingInputProps {
  expectedText: string;
  currentInput: string;
  onInputChange: (text: string) => void;
  onError?: () => void;
}

export function TypingInput({ expectedText, currentInput, onInputChange, onError }: TypingInputProps) {
  const handleTextChange = (text: string) => {
    // Check if the new character matches expected
    if (text.length > currentInput.length) {
      const newChar = text[text.length - 1];
      const expectedChar = expectedText[text.length - 1];
      if (newChar !== expectedChar) {
        onError?.();
      }
    }
    onInputChange(text);
  };

  const renderText = () => {
    const chars = expectedText.split('');
    return chars.map((char, index) => {
      let style: any = styles.char;
      if (index < currentInput.length) {
        // Already typed
        if (currentInput[index] === char) {
          style = [styles.char, styles.correct];
        } else {
          style = [styles.char, styles.incorrect];
        }
      } else if (index === currentInput.length) {
        // Current position
        style = [styles.char, styles.current];
      }

      return (
        <Text key={index} style={style}>
          {char}
        </Text>
      );
    });
  };

  const progress = expectedText.length > 0 ? (currentInput.length / expectedText.length) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>

      {/* Text display */}
      <View style={styles.textDisplay}>
        <Text variant="bodyLarge" style={styles.text}>
          {renderText()}
        </Text>
      </View>

      {/* Hidden input for capturing keystrokes */}
      <TextInput
        style={styles.hiddenInput}
        value={currentInput}
        onChangeText={handleTextChange}
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        maxLength={expectedText.length}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#6366F1',
  },
  textDisplay: {
    minHeight: 200,
  },
  text: {
    lineHeight: 32,
    fontSize: 18,
  },
  char: {
    color: '#9CA3AF',
  },
  correct: {
    color: '#10B981',
  },
  incorrect: {
    color: '#EF4444',
    backgroundColor: '#FEE2E2',
  },
  current: {
    backgroundColor: '#FEF3C7',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },
});

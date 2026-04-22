import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';

interface ReadableTextProps {
  text: string;
  onTextSelect?: (selectedText: string) => void;
}

export function ReadableText({ text }: ReadableTextProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      <Text variant="bodyLarge" style={[styles.text, { color: colors.onSurface }]} selectable onTextLayout={() => {}}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  text: {
    lineHeight: 32,
    fontSize: 18,
  },
});

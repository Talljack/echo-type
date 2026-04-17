import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { fontFamily } from '@/theme/typography';

interface ConversationBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  colors: {
    primary: string;
    primaryContainer: string;
    surface: string;
    onSurface: string;
    onPrimaryContainer: string;
    onPrimary: string;
  };
  showTranslation?: boolean;
  translation?: string;
}

export function ConversationBubble({ role, content, colors, showTranslation, translation }: ConversationBubbleProps) {
  const isUser = role === 'user';

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      <View
        style={[
          styles.bubble,
          isUser
            ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
            : { backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
        ]}
      >
        <Text style={[styles.text, { color: isUser ? colors.onPrimary : colors.onSurface }]}>{content}</Text>
        {showTranslation && translation ? (
          <Text style={[styles.translation, { color: isUser ? 'rgba(255,255,255,0.7)' : colors.onPrimaryContainer }]}>
            {translation}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderCurve: 'continuous',
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: fontFamily.body,
  },
  translation: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    fontStyle: 'italic',
    fontFamily: fontFamily.body,
  },
});

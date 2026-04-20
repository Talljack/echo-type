import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import { haptics } from '@/lib/haptics';
import type { ChatMessage } from '@/stores/useChatStore';

interface ChatBubbleProps {
  message: ChatMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const { colors } = useAppTheme();

  if (message.role === 'system') return null;

  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';

  const handleLongPress = () => {
    if (!message.content.trim()) return;
    void haptics.medium();
    Alert.alert('Message', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Share / Copy',
        onPress: async () => {
          try {
            await Share.share({ message: message.content });
            void haptics.success();
          } catch {
            // user canceled
          }
        },
      },
      ...(!isUser && !isTool
        ? [
            {
              text: 'Speak',
              onPress: () => {
                void Speech.speak(message.content, { language: 'en-US', rate: 1.0 });
              },
            },
          ]
        : []),
    ]);
  };

  if (isTool) {
    return (
      <Pressable onLongPress={handleLongPress} delayLongPress={300}>
        <View style={[styles.toolRow, styles.toolAlign]}>
          <View style={[styles.toolBubble, { backgroundColor: colors.infoLight }]}>
            <MaterialCommunityIcons name="hammer-wrench" size={16} color={colors.info} style={styles.toolIcon} />
            <Text variant="bodySmall" style={[styles.toolText, { color: colors.onPrimaryContainer }]}>
              {message.content}
            </Text>
          </View>
          <Text variant="labelSmall" style={[styles.timestamp, { color: colors.onSurfaceSecondary }]}>
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onLongPress={handleLongPress} delayLongPress={300}>
      <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
        <View
          style={[
            styles.bubble,
            isUser
              ? [styles.userBubble, { backgroundColor: colors.primary }]
              : [styles.assistantBubble, { backgroundColor: colors.surfaceVariant }],
          ]}
        >
          <Text variant="bodyMedium" style={[styles.text, { color: isUser ? colors.onPrimary : colors.onSurface }]}>
            {message.content || ' '}
          </Text>
        </View>
        <Text variant="labelSmall" style={[styles.timestamp, { color: colors.onSurfaceSecondary }]}>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  toolRow: {
    marginVertical: 6,
    maxWidth: '92%',
  },
  toolAlign: {
    alignSelf: 'center',
  },
  toolBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toolIcon: {
    marginRight: 8,
  },
  toolText: {
    flex: 1,
    lineHeight: 18,
  },
  userContainer: {
    alignSelf: 'flex-end',
  },
  assistantContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
  },
  text: {
    lineHeight: 22,
  },
  timestamp: {
    marginTop: 4,
    fontSize: 10,
  },
});

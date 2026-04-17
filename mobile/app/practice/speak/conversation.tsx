import { MaterialCommunityIcons } from '@expo/vector-icons';
import Voice from '@react-native-voice/voice';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { PracticeCompletionSummary } from '@/components/practice/PracticeCompletionSummary';
import { ConversationBubble } from '@/components/speak/ConversationBubble';
import { useAppTheme } from '@/contexts/ThemeContext';
import { type ChatMessage, streamChatResponse } from '@/services/chat-api';
import { fontFamily } from '@/theme/typography';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are a friendly English conversation partner. Help the user practice speaking English naturally.
Keep your responses conversational, short (2-3 sentences), and at an appropriate difficulty level.
If the user makes grammar or vocabulary mistakes, gently correct them while continuing the conversation.
Start by greeting the user and suggesting a topic to discuss.`;

export default function ConversationScreen() {
  const { colors, getModuleColors } = useAppTheme();
  const speakColors = getModuleColors('speak');

  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [completedDurationSec, setCompletedDurationSec] = useState(0);
  const sessionStartedAtRef = useRef<number>(Date.now());
  const flatListRef = useRef<FlatList>(null);

  const sendToAI = useCallback((chatHistory: Message[]) => {
    setIsAIThinking(true);

    const apiMessages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...chatHistory.map((m) => ({ role: m.role, content: m.content })),
    ];

    const aiMsgId = `ai_${Date.now()}`;

    void streamChatResponse(apiMessages, {
      onToken: (token) => {
        setMessages((prev) => {
          const exists = prev.find((m) => m.id === aiMsgId);
          if (exists) {
            return prev.map((m) => (m.id === aiMsgId ? { ...m, content: token } : m));
          }
          return [...prev, { id: aiMsgId, role: 'assistant', content: token }];
        });
      },
      onDone: (fullText) => {
        setIsAIThinking(false);
        setMessages((prev) => prev.map((m) => (m.id === aiMsgId ? { ...m, content: fullText } : m)));
        Speech.speak(fullText, { language: 'en-US', rate: 0.9 });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      },
      onError: (error) => {
        setIsAIThinking(false);
        setMessages((prev) => [...prev, { id: aiMsgId, role: 'assistant', content: `Error: ${error.message}` }]);
      },
    });
  }, []);

  useEffect(() => {
    sendToAI([]);
  }, [sendToAI]);

  useEffect(() => {
    Voice.onSpeechResults = (e) => {
      if (e.value?.[0]) {
        setCurrentTranscript(e.value[0]);
      }
    };
    Voice.onSpeechPartialResults = (e) => {
      if (e.value?.[0]) {
        setCurrentTranscript(e.value[0]);
      }
    };
    Voice.onSpeechEnd = () => {
      setIsRecording(false);
    };
    Voice.onSpeechError = () => {
      setIsRecording(false);
    };

    return () => {
      void Voice.destroy().then(() => {
        Voice.removeAllListeners();
      });
      Speech.stop();
    };
  }, []);

  const handleFinishSession = async () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (isRecording) {
      await Voice.stop();
      setIsRecording(false);
    }
    setCompletedDurationSec(Math.floor((Date.now() - sessionStartedAtRef.current) / 1000));
    setSessionCompleted(true);
  };

  const handleToggleRecording = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isRecording) {
      await Voice.stop();
      setIsRecording(false);
      if (currentTranscript.trim()) {
        const userMsg: Message = {
          id: `user_${Date.now()}`,
          role: 'user',
          content: currentTranscript.trim(),
        };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setCurrentTranscript('');
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        sendToAI(newMessages);
      }
    } else {
      setCurrentTranscript('');
      await Voice.start('en-US');
      setIsRecording(true);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={speakColors.gradient} style={styles.headerGradient}>
        <Appbar.Header style={styles.appbar}>
          <Appbar.BackAction onPress={() => router.back()} color={colors.onPrimary} />
          <Appbar.Content
            title="AI Conversation"
            titleStyle={[styles.headerTitle, { color: colors.onPrimary, fontFamily: fontFamily.heading }]}
          />
          {!sessionCompleted ? (
            <Appbar.Action
              icon="flag-checkered"
              color={colors.onPrimary}
              onPress={() => void handleFinishSession()}
              accessibilityLabel="Finish session"
            />
          ) : null}
        </Appbar.Header>
      </LinearGradient>

      {sessionCompleted ? (
        <View style={[styles.summaryWrap, { backgroundColor: colors.background }]}>
          <PracticeCompletionSummary
            module="speak"
            stats={{
              duration: completedDurationSec,
              messagesCount: messages.length,
            }}
            onGoBack={() => router.back()}
          />
        </View>
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ConversationBubble role={item.role} content={item.content} colors={colors} />}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />

          {currentTranscript ? (
            <View style={[styles.transcriptBar, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[styles.transcriptText, { color: colors.onSurface }]} numberOfLines={2}>
                {currentTranscript}
              </Text>
            </View>
          ) : null}

          {isAIThinking && (
            <View style={[styles.thinkingBar, { backgroundColor: colors.surfaceVariant }]}>
              <MaterialCommunityIcons name="dots-horizontal" size={24} color={speakColors.primary} />
              <Text style={[styles.thinkingText, { color: colors.onSurfaceVariant }]}>AI is thinking...</Text>
            </View>
          )}

          <View style={[styles.controls, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <Pressable
              onPress={handleToggleRecording}
              style={({ pressed }) => [
                styles.recordButton,
                { backgroundColor: isRecording ? colors.error : speakColors.primary },
                pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
              ]}
            >
              <MaterialCommunityIcons name={isRecording ? 'stop' : 'microphone'} size={32} color={colors.onPrimary} />
            </Pressable>
            <Text style={[styles.recordHint, { color: colors.onSurfaceSecondary }]}>
              {isRecording ? 'Tap to send' : 'Tap to speak'}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerGradient: {
    paddingBottom: 8,
  },
  appbar: {
    backgroundColor: 'transparent',
    elevation: 0,
  },
  headerTitle: {
    fontWeight: '600',
  },
  messageList: {
    paddingVertical: 16,
    paddingBottom: 80,
  },
  transcriptBar: {
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderCurve: 'continuous',
  },
  transcriptText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  thinkingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 8,
    borderCurve: 'continuous',
  },
  thinkingText: {
    fontSize: 14,
  },
  controls: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingBottom: 40,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderCurve: 'continuous',
  },
  recordHint: {
    marginTop: 8,
    fontSize: 13,
  },
});

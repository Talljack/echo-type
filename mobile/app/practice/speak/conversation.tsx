import { MaterialCommunityIcons } from '@expo/vector-icons';
import Voice from '@react-native-voice/voice';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { PracticeCompletionSummary } from '@/components/practice/PracticeCompletionSummary';
import { ConversationBubble } from '@/components/speak/ConversationBubble';
import { useAppTheme } from '@/contexts/ThemeContext';
import { haptics } from '@/lib/haptics';
import { buildFreeConversationSystemPrompt, buildScenarioSystemPrompt, getScenarioById } from '@/lib/scenarios';
import { type ChatMessage, streamChatResponse } from '@/services/chat-api';
import { fontFamily } from '@/theme/typography';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function paramString(v: string | string[] | undefined): string | undefined {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

export default function ConversationScreen() {
  const params = useLocalSearchParams<{ scenarioId?: string | string[]; topic?: string | string[] }>();
  const scenarioId = paramString(params.scenarioId);
  const topic = paramString(params.topic);

  const scenario = useMemo(() => (scenarioId ? getScenarioById(scenarioId) : undefined), [scenarioId]);

  const systemPrompt = useMemo(() => {
    if (scenario) return buildScenarioSystemPrompt(scenario);
    return buildFreeConversationSystemPrompt(topic);
  }, [scenario, topic]);

  const sessionKey = `${scenarioId ?? ''}|${topic ?? ''}`;

  const { colors, getModuleColors } = useAppTheme();
  const speakColors = getModuleColors('speak');

  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [completedDurationSec, setCompletedDurationSec] = useState(0);
  const [goalsExpanded, setGoalsExpanded] = useState(true);
  const [draftText, setDraftText] = useState('');
  const sessionStartedAtRef = useRef<number>(Date.now());
  const flatListRef = useRef<FlatList>(null);

  const screenTitle = scenario?.title ?? (topic ? `Free · ${topic}` : 'Free conversation');

  const sendToAI = useCallback(
    (chatHistory: Message[]) => {
      setIsAIThinking(true);

      const apiMessages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
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
    },
    [systemPrompt],
  );

  useEffect(() => {
    setMessages([]);
    setCurrentTranscript('');
    setDraftText('');
    setSessionCompleted(false);
    setGoalsExpanded(true);
    sessionStartedAtRef.current = Date.now();
    sendToAI([]);
  }, [sessionKey, sendToAI]);

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

  const submitUserText = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed || isAIThinking) return;
      void haptics.light();
      const userMsg: Message = {
        id: `user_${Date.now()}`,
        role: 'user',
        content: trimmed,
      };
      setMessages((prev) => {
        const newMessages = [...prev, userMsg];
        queueMicrotask(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
          sendToAI(newMessages);
        });
        return newMessages;
      });
      setDraftText('');
      Keyboard.dismiss();
    },
    [isAIThinking, sendToAI],
  );

  const handleFinishSession = async () => {
    void haptics.success();
    if (isRecording) {
      await Voice.stop();
      setIsRecording(false);
    }
    setCompletedDurationSec(Math.floor((Date.now() - sessionStartedAtRef.current) / 1000));
    setSessionCompleted(true);
  };

  const handleToggleRecording = async () => {
    void haptics.medium();
    if (isRecording) {
      await Voice.stop();
      setIsRecording(false);
      if (currentTranscript.trim()) {
        submitUserText(currentTranscript);
        setCurrentTranscript('');
      }
    } else {
      setCurrentTranscript('');
      await Voice.start('en-US');
      setIsRecording(true);
    }
  };

  const handleSendDraft = () => {
    void haptics.light();
    submitUserText(draftText);
  };

  const goalsHeader = (
    <Pressable
      onPress={() => {
        void haptics.light();
        setGoalsExpanded((e) => !e);
      }}
      style={({ pressed }) => [
        styles.goalsHeader,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.85 },
      ]}
    >
      <MaterialCommunityIcons name="flag-checkered" size={20} color={speakColors.primary} />
      <Text style={[styles.goalsHeaderTitle, { color: colors.onSurface, fontFamily: fontFamily.heading }]}>Goals</Text>
      <MaterialCommunityIcons
        name={goalsExpanded ? 'chevron-up' : 'chevron-down'}
        size={22}
        color={colors.onSurfaceSecondary}
      />
    </Pressable>
  );

  const listHeader =
    scenario && scenario.goals.length > 0 ? (
      <View style={styles.listHeaderWrap}>
        {goalsHeader}
        {goalsExpanded ? (
          <View style={[styles.goalsBody, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
            {scenario.goals.map((g, i) => (
              <View key={`${g}-${i}`} style={styles.goalRow}>
                <Text style={[styles.goalBullet, { color: speakColors.primary }]}>•</Text>
                <Text style={[styles.goalText, { color: colors.onSurface, fontFamily: fontFamily.body }]}>{g}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    ) : null;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <LinearGradient colors={speakColors.gradient} style={styles.headerGradient}>
        <Appbar.Header style={styles.appbar}>
          <Appbar.BackAction onPress={() => router.back()} color={colors.onPrimary} />
          <Appbar.Content
            title={screenTitle}
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
            ListHeaderComponent={listHeader}
            renderItem={({ item }) => <ConversationBubble role={item.role} content={item.content} colors={colors} />}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />

          {scenario?.suggestedPhrases?.length ? (
            <View style={styles.phrasesWrap}>
              <Text
                style={[styles.phrasesLabel, { color: colors.onSurfaceSecondary, fontFamily: fontFamily.bodyMedium }]}
              >
                Suggested phrases
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.phrasesRow}>
                {scenario.suggestedPhrases.map((phrase) => (
                  <Pressable
                    key={phrase}
                    onPress={() => {
                      void haptics.light();
                      submitUserText(phrase);
                    }}
                    style={({ pressed }) => [
                      styles.phraseChip,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                      pressed && { opacity: 0.75 },
                    ]}
                  >
                    <Text
                      style={[styles.phraseChipText, { color: colors.onSurface, fontFamily: fontFamily.body }]}
                      numberOfLines={2}
                    >
                      {phrase}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {currentTranscript ? (
            <View style={[styles.transcriptBar, { backgroundColor: colors.surfaceVariant }]}>
              <Text
                style={[styles.transcriptText, { color: colors.onSurface, fontFamily: fontFamily.body }]}
                numberOfLines={2}
              >
                {currentTranscript}
              </Text>
            </View>
          ) : null}

          {isAIThinking && (
            <View style={[styles.thinkingBar, { backgroundColor: colors.surfaceVariant }]}>
              <MaterialCommunityIcons name="dots-horizontal" size={24} color={speakColors.primary} />
              <Text style={[styles.thinkingText, { color: colors.onSurfaceVariant, fontFamily: fontFamily.body }]}>
                AI is thinking...
              </Text>
            </View>
          )}

          <View style={[styles.controls, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <View style={[styles.inputRow, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
              <TextInput
                value={draftText}
                onChangeText={setDraftText}
                placeholder="Type a message…"
                placeholderTextColor={colors.onSurfaceSecondary}
                style={[styles.textInput, { color: colors.onSurface, fontFamily: fontFamily.body }]}
                multiline
                maxLength={2000}
                editable={!isAIThinking}
                onSubmitEditing={handleSendDraft}
                blurOnSubmit={false}
              />
              <Pressable
                onPress={handleSendDraft}
                disabled={!draftText.trim() || isAIThinking}
                style={({ pressed }) => [
                  styles.sendBtn,
                  { backgroundColor: speakColors.primary },
                  (!draftText.trim() || isAIThinking) && { opacity: 0.4 },
                  pressed && draftText.trim() && !isAIThinking && { opacity: 0.85 },
                ]}
              >
                <MaterialCommunityIcons name="send" size={22} color={colors.onPrimary} />
              </Pressable>
            </View>

            <Pressable
              onPress={handleToggleRecording}
              style={({ pressed }) => [
                styles.recordButton,
                { backgroundColor: isRecording ? colors.error : speakColors.primary },
                pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
              ]}
            >
              <MaterialCommunityIcons name={isRecording ? 'stop' : 'microphone'} size={32} color={colors.onPrimary} />
            </Pressable>
            <Text style={[styles.recordHint, { color: colors.onSurfaceSecondary, fontFamily: fontFamily.body }]}>
              {isRecording ? 'Tap to send what you said' : 'Optional: tap mic to speak'}
            </Text>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
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
  listHeaderWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  goalsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
  },
  goalsHeaderTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  goalsBody: {
    marginTop: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  goalBullet: {
    width: 18,
    fontSize: 16,
    fontWeight: '700',
  },
  goalText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  messageList: {
    paddingVertical: 12,
    paddingBottom: 24,
  },
  phrasesWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  phrasesLabel: {
    fontSize: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  phrasesRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  phraseChip: {
    maxWidth: 280,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
  },
  phraseChipText: {
    fontSize: 13,
    lineHeight: 18,
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
    alignItems: 'stretch',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 36,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: 12,
    paddingVertical: 6,
    marginBottom: 14,
    borderCurve: 'continuous',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    fontSize: 16,
    paddingVertical: 8,
    paddingRight: 8,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    marginBottom: 2,
    borderCurve: 'continuous',
  },
  recordButton: {
    alignSelf: 'center',
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
    textAlign: 'center',
  },
});

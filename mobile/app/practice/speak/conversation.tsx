import { MaterialCommunityIcons } from '@expo/vector-icons';
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
import { ScenarioGoalsCard } from '@/components/speak/ScenarioGoalsCard';
import { SpeakRecommendationSection } from '@/components/speak/SpeakRecommendationSection';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/hooks/useI18n';
import { useTranslation } from '@/hooks/useTranslation';
import { haptics } from '@/lib/haptics';
import {
  buildFreeConversationSystemPrompt,
  buildScenarioSystemPrompt,
  FREE_CONVERSATION_OPENING_MESSAGE,
  FREE_CONVERSATION_TOPICS,
  getFreeConversationTopicHint,
  getScenarioById,
} from '@/lib/scenarios';
import { getNativeVoiceModule, hasNativeVoiceModule } from '@/lib/voice/index';
import { type ChatMessage, streamChatResponse } from '@/services/chat-api';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useSpeakStore } from '@/stores/useSpeakStore';
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
  const Voice = getNativeVoiceModule();
  const params = useLocalSearchParams<{
    scenarioId?: string | string[];
    contentId?: string | string[];
    topic?: string | string[];
    restart?: string | string[];
  }>();
  const scenarioId = paramString(params.scenarioId);
  const contentId = paramString(params.contentId);
  const topic = paramString(params.topic);
  const restartNonce = paramString(params.restart);

  const scenario = useMemo(() => (scenarioId ? getScenarioById(scenarioId) : undefined), [scenarioId]);
  const getContent = useLibraryStore((state) => state.getContent);
  const content = contentId ? getContent(contentId) : undefined;

  const contentPrompt = useMemo(() => {
    if (!content) return undefined;
    const excerpt = content.text.trim().slice(0, 1200);
    return `You are a friendly English conversation partner helping the learner discuss a study passage.
The source passage is titled "${content.title}".
Here is the passage:
"""
${excerpt}
"""
Start with a short greeting and one question about the passage. Keep replies conversational, short (2-3 sentences), and gently correct English mistakes while staying on the topic unless the learner changes it.`;
  }, [content]);

  const systemPrompt = useMemo(() => {
    if (scenario) return buildScenarioSystemPrompt(scenario);
    if (contentPrompt) return contentPrompt;
    return buildFreeConversationSystemPrompt(getFreeConversationTopicHint(topic) ?? topic);
  }, [contentPrompt, scenario, topic]);

  const initialAssistantMessage = useMemo(() => {
    if (scenario?.openingMessage) return scenario.openingMessage;
    if (!content) return FREE_CONVERSATION_OPENING_MESSAGE;
    return undefined;
  }, [content, scenario?.openingMessage]);

  const conversationSeed = `${scenarioId ?? ''}|${contentId ?? ''}|${topic ?? ''}|${restartNonce ?? ''}`;

  const { colors, getModuleColors } = useAppTheme();
  const speakColors = getModuleColors('speak');
  const { t } = useI18n();
  const { translate } = useTranslation();
  const startSession = useSpeakStore((state) => state.startSession);
  const endSession = useSpeakStore((state) => state.endSession);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [completedDurationSec, setCompletedDurationSec] = useState(0);
  const [goalsExpanded, setGoalsExpanded] = useState(true);
  const [draftText, setDraftText] = useState('');
  const [assistantTranslationById, setAssistantTranslationById] = useState<Record<string, string>>({});
  const [assistantTranslationVisible, setAssistantTranslationVisible] = useState<Record<string, boolean>>({});
  const [translatingAssistantId, setTranslatingAssistantId] = useState<string | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const sessionStartedAtRef = useRef<number>(Date.now());
  const sessionSavedRef = useRef(false);
  const flatListRef = useRef<FlatList>(null);

  const screenTitle =
    scenario?.title ?? content?.title ?? (topic ? `${t('speak.freeShort')} · ${topic}` : t('speak.freeConversation'));

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
    setAssistantTranslationById({});
    setAssistantTranslationVisible({});
    setTranslatingAssistantId(null);
    setPlayingMessageId(null);
    sessionStartedAtRef.current = Date.now();
    sessionSavedRef.current = false;
    // Reset the conversation whenever route identity changes, including manual restart.
    void conversationSeed;
    const seedMessages = initialAssistantMessage
      ? [{ id: `seed_${Date.now()}`, role: 'assistant' as const, content: initialAssistantMessage }]
      : [];
    setMessages(seedMessages);
    startSession(contentId ?? scenarioId ?? topic ?? 'free-conversation', {
      title: screenTitle,
      route: scenarioId
        ? { type: 'scenario', scenarioId }
        : contentId
          ? { type: 'content', contentId }
          : { type: 'free', topic: topic ?? screenTitle },
    });
    if (!initialAssistantMessage) {
      sendToAI([]);
    }
  }, [contentId, conversationSeed, initialAssistantMessage, scenarioId, screenTitle, sendToAI, startSession, topic]);

  const handleAssistantTranslate = useCallback(
    async (messageId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const existing = assistantTranslationById[messageId];
      const visible = assistantTranslationVisible[messageId];

      if (existing && visible) {
        setAssistantTranslationVisible((prev) => ({ ...prev, [messageId]: false }));
        return;
      }
      if (existing && !visible) {
        setAssistantTranslationVisible((prev) => ({ ...prev, [messageId]: true }));
        return;
      }

      void haptics.light();
      setTranslatingAssistantId(messageId);
      const result = await translate(trimmed, 'speak conversation');
      setTranslatingAssistantId(null);
      if (result?.itemTranslation) {
        setAssistantTranslationById((prev) => ({ ...prev, [messageId]: result.itemTranslation }));
        setAssistantTranslationVisible((prev) => ({ ...prev, [messageId]: true }));
      }
    },
    [assistantTranslationById, assistantTranslationVisible, translate],
  );

  const continueTopicParam = topic ?? scenario?.title ?? '';
  const shouldShowTopicSuggestions = !scenario && !content && messages.length <= 1;

  const recommendationCards = useMemo(
    () => [
      {
        key: 'scenario',
        title: t('speak.continueAnotherScenario'),
        subtitle: t('speak.continueAnotherScenarioDesc'),
        icon: 'theater' as const,
        colors: speakColors.gradient,
        onPress: () => {
          void haptics.light();
          router.push('/(tabs)/speak');
        },
      },
      {
        key: 'library',
        title: t('speak.continueVocabulary'),
        subtitle: t('speak.continueVocabularyDesc'),
        icon: 'book-alphabet' as const,
        colors: ['#6366F1', '#4F46E5'] as const,
        onPress: () => {
          void haptics.light();
          router.push('/(tabs)/library');
        },
      },
      {
        key: 'free',
        title: t('speak.continueFreeSameTopic'),
        subtitle: t('speak.continueFreeSameTopicDesc'),
        icon: 'chat-processing' as const,
        colors: speakColors.gradient,
        onPress: () => {
          void haptics.light();
          router.replace({
            pathname: '/practice/speak/conversation',
            params: {
              topic: continueTopicParam || t('speak.freeConversation'),
              restart: String(Date.now()),
            },
          });
        },
      },
    ],
    [continueTopicParam, speakColors.gradient, t],
  );

  useEffect(() => {
    if (!Voice) {
      return () => {
        Speech.stop();
      };
    }

    Voice.onSpeechResults = (e: { value?: string[] }) => {
      if (e.value?.[0]) {
        setCurrentTranscript(e.value[0]);
      }
    };
    Voice.onSpeechPartialResults = (e: { value?: string[] }) => {
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
  }, [Voice]);

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
    if (isRecording && Voice) {
      await Voice.stop();
      setIsRecording(false);
    }
    const durationSec = Math.floor((Date.now() - sessionStartedAtRef.current) / 1000);
    setCompletedDurationSec(durationSec);
    if (!sessionSavedRef.current) {
      endSession(Math.min(100, Math.max(messages.length - 1, 1) * 20), durationSec);
      sessionSavedRef.current = true;
    }
    setSessionCompleted(true);
  };

  const handleToggleRecording = async () => {
    void haptics.medium();
    if (!Voice || !hasNativeVoiceModule()) {
      setCurrentTranscript(t('speak.speechNotAvailable'));
      return;
    }
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

  const handlePlayVoice = useCallback(
    (messageId: string, text: string) => {
      if (!text.trim()) return;

      if (playingMessageId === messageId) {
        Speech.stop();
        setPlayingMessageId(null);
        return;
      }

      Speech.stop();
      setPlayingMessageId(messageId);
      Speech.speak(text, {
        language: 'en-US',
        rate: 0.9,
        onDone: () => setPlayingMessageId(null),
        onStopped: () => setPlayingMessageId(null),
        onError: () => setPlayingMessageId(null),
      });
    },
    [playingMessageId],
  );

  const handleTopicRestart = (nextTopic: string) => {
    void haptics.light();
    router.replace({
      pathname: '/practice/speak/conversation',
      params: {
        topic: nextTopic,
        restart: String(Date.now()),
      },
    });
  };

  const listHeader =
    scenario && scenario.goals.length > 0 ? (
      <View style={styles.listHeaderWrap}>
        <ScenarioGoalsCard
          title={scenario.title}
          subtitle={scenario.titleZh}
          difficulty={scenario.difficulty}
          goalsLabel={t('speak.goals')}
          goals={scenario.goals}
          expanded={goalsExpanded}
          onToggle={() => {
            void haptics.light();
            setGoalsExpanded((expanded) => !expanded);
          }}
        />
      </View>
    ) : content ? (
      <View style={styles.listHeaderWrap}>
        <View style={[styles.contentCardHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="text-box-outline" size={20} color={speakColors.primary} />
          <Text style={[styles.contentCardTitle, { color: colors.onSurface, fontFamily: fontFamily.heading }]}>
            {content.title}
          </Text>
        </View>
        <View style={[styles.contentCardBody, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
          <Text
            style={[styles.contentCardText, { color: colors.onSurface, fontFamily: fontFamily.body }]}
            numberOfLines={4}
          >
            {content.text}
          </Text>
        </View>
      </View>
    ) : shouldShowTopicSuggestions ? (
      <View style={styles.listHeaderWrap}>
        <Text style={[styles.freeTopicLabel, { color: colors.onSurfaceSecondary, fontFamily: fontFamily.bodyMedium }]}>
          {t('speak.suggestedTopics')}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.freeTopicRow}>
          {FREE_CONVERSATION_TOPICS.map((suggestedTopic) => (
            <Pressable
              key={suggestedTopic}
              onPress={() => handleTopicRestart(suggestedTopic)}
              style={({ pressed }) => [
                styles.freeTopicChip,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={[styles.freeTopicChipText, { color: colors.onSurface, fontFamily: fontFamily.bodyMedium }]}>
                {suggestedTopic}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
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
          <Appbar.BackAction
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/speak');
              }
            }}
            color={colors.onPrimary}
          />
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
        <View style={styles.headerInfo}>
          <Text style={[styles.headerMeta, { color: colors.onPrimary, fontFamily: fontFamily.body }]}>
            {scenario
              ? `${scenario.titleZh} · ${scenario.difficulty}`
              : content
                ? content.title
                : topic || t('speak.freeConversationSubtitle')}
          </Text>
        </View>
      </LinearGradient>

      {sessionCompleted ? (
        <ScrollView
          style={[styles.summaryWrap, { backgroundColor: colors.background }]}
          contentContainerStyle={styles.summaryScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <PracticeCompletionSummary
            module="speak"
            stats={{
              duration: completedDurationSec,
              messagesCount: messages.length,
            }}
            onGoBack={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/speak');
              }
            }}
          />

          <SpeakRecommendationSection title={t('speak.continueLearning')} cards={recommendationCards} />
        </ScrollView>
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={listHeader}
            renderItem={({ item }) =>
              item.role === 'assistant' ? (
                <ConversationBubble
                  role={item.role}
                  content={item.content}
                  colors={colors}
                  onPlayVoicePress={() => handlePlayVoice(item.id, item.content)}
                  isPlayingVoice={playingMessageId === item.id}
                  onAssistantTranslatePress={() => void handleAssistantTranslate(item.id, item.content)}
                  assistantTranslation={assistantTranslationById[item.id] ?? null}
                  assistantTranslationVisible={assistantTranslationVisible[item.id] ?? false}
                  assistantTranslationLoading={translatingAssistantId === item.id}
                />
              ) : (
                <ConversationBubble
                  role={item.role}
                  content={item.content}
                  colors={colors}
                  onPlayVoicePress={() => handlePlayVoice(item.id, item.content)}
                  isPlayingVoice={playingMessageId === item.id}
                />
              )
            }
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />

          {scenario?.suggestedPhrases?.length ? (
            <View style={styles.phrasesWrap}>
              <Text
                style={[styles.phrasesLabel, { color: colors.onSurfaceSecondary, fontFamily: fontFamily.bodyMedium }]}
              >
                {t('speak.suggestedPhrases')}
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
                {t('speak.aiThinking')}
              </Text>
            </View>
          )}

          <View style={[styles.controls, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <View style={[styles.inputRow, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
              <TextInput
                value={draftText}
                onChangeText={setDraftText}
                placeholder={t('speak.typeMessagePlaceholder')}
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
              {isRecording ? t('speak.tapToSendSpeech') : t('speak.optionalMic')}
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
  summaryScrollContent: {
    paddingBottom: 32,
    flexGrow: 1,
  },
  continueSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
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
  headerInfo: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerMeta: {
    fontSize: 13,
    opacity: 0.88,
  },
  listHeaderWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  freeTopicLabel: {
    fontSize: 12,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  freeTopicRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  freeTopicChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  freeTopicChipText: {
    fontSize: 13,
  },
  contentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
  },
  contentCardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  contentCardBody: {
    marginTop: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
  },
  contentCardText: {
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

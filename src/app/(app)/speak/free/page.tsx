'use client';

import { ArrowLeft, MessageCircle, Send } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RecommendationPanel } from '@/components/shared/recommendation-panel';
import { ConversationArea } from '@/components/speak/conversation-area';
import { VoiceInputButton } from '@/components/speak/voice-input-button';
import { TranslationBar } from '@/components/translation/translation-bar';
import { Button } from '@/components/ui/button';
import { useConversation } from '@/hooks/use-conversation';
import enSpeakFree from '@/lib/i18n/messages/speak-free/en.json';
import zhSpeakFree from '@/lib/i18n/messages/speak-free/zh.json';
import { useI18n } from '@/lib/i18n/use-i18n';
import { detectIOSNativeHost, reportNativeQAState } from '@/lib/tauri';
import { useLanguageStore } from '@/stores/language-store';
import { useSpeakStore } from '@/stores/speak-store';
import { useTTSStore } from '@/stores/tts-store';

const SF_LOCALES = { en: enSpeakFree, zh: zhSpeakFree } as const;

const TOPIC_EMOJIS = ['🏠', '✈️', '🍕', '🎨', '🎬', '💼', '💻', '🌍'];
const TOPIC_KEYS = [
  'dailyLife',
  'travel',
  'food',
  'hobbies',
  'moviesMusic',
  'workCareer',
  'technology',
  'culture',
] as const;

export default function FreeConversationPage() {
  const { messages: speakMessages } = useI18n('speak');
  const sfT = SF_LOCALES[useLanguageStore((s) => s.interfaceLanguage)];
  const topicSuggestions = TOPIC_KEYS.map((key, i) => ({
    label: sfT.topics[key].label,
    emoji: TOPIC_EMOJIS[i],
    hint: sfT.topics[key].hint,
  }));
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const messages = useSpeakStore((s) => s.messages);
  const recommendationsEnabled = useTTSStore((s) => s.recommendationsEnabled);

  const {
    isStreaming,
    isRecording,
    isFallbackTranscribing,
    textInput,
    setTextInput,
    handleToggleRecording,
    handleSendText,
    handleKeyDown,
    handlePlayVoice,
    handleToggleTranslation,
  } = useConversation({
    openingMessage: sfT.opening,
    topicHint: selectedTopic || undefined,
  });

  const hasStarted = messages.length > 1;
  const isIOSNativeHost = detectIOSNativeHost();
  const pageShellClassName = isIOSNativeHost
    ? 'mx-auto flex min-h-full max-w-2xl flex-col gap-3'
    : 'mx-auto flex h-[calc(100vh-8rem)] max-w-2xl flex-col md:h-[calc(100vh-4rem)]';

  useEffect(() => {
    reportNativeQAState({
      page: 'speak-free',
      topicCount: topicSuggestions.length,
      hasStarted,
      messageCount: messages.length,
    });
  }, [hasStarted, messages.length, topicSuggestions.length]);

  return (
    <div className={pageShellClassName}>
      {/* Header */}
      {!isIOSNativeHost && (
        <div className="flex items-center gap-3 py-3 md:py-4 shrink-0">
          <Link href="/speak">
            <Button variant="ghost" size="icon" className="text-indigo-600 cursor-pointer">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-[var(--font-poppins)] text-indigo-900">
                {speakMessages.freeConversation.pageTitle}
              </h1>
              <p className="text-xs text-indigo-400">{speakMessages.freeConversation.pageSubtitle}</p>
            </div>
          </div>
          <TranslationBar module="speak" />
        </div>
      )}

      {/* Topic suggestions - shown when conversation just started */}
      {!hasStarted && (
        <div className="shrink-0 mb-3">
          <p className="text-xs font-medium text-indigo-400 mb-2 uppercase tracking-wide">
            {speakMessages.freeConversation.suggestedTopics}
          </p>
          <div className="flex flex-wrap gap-2">
            {topicSuggestions.map((topic) => (
              <button
                key={topic.label}
                type="button"
                onClick={() => setSelectedTopic(topic.hint)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all duration-200 cursor-pointer ${
                  selectedTopic === topic.hint
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'bg-white/80 text-indigo-700 border border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50'
                }`}
              >
                <span>{topic.emoji}</span>
                <span>{topic.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conversation area */}
      <div className="flex min-h-[18rem] flex-1 flex-col overflow-hidden rounded-[28px] border border-white/72 bg-white/84 shadow-[0_16px_36px_rgba(79,70,229,0.07)] backdrop-blur-xl">
        <ConversationArea
          messages={messages}
          scenarioTitle={speakMessages.freeConversation.pageTitle}
          onPlayVoice={handlePlayVoice}
          onToggleTranslation={handleToggleTranslation}
        />
      </div>

      {/* Input area */}
      <div className="shrink-0 space-y-3 rounded-[28px] border border-white/72 bg-white/84 px-4 py-4 shadow-[0_14px_32px_rgba(15,23,42,0.05)] backdrop-blur-xl">
        <VoiceInputButton
          isRecording={isRecording}
          isDisabled={isStreaming || isFallbackTranscribing}
          onToggle={handleToggleRecording}
        />
        {isFallbackTranscribing && (
          <p className="text-xs text-amber-600 font-medium text-center">{speakMessages.conversation.processing}</p>
        )}
        <div className="flex items-center gap-2">
          <input
            aria-label="Speak free input"
            data-testid="speak-free-input"
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={speakMessages.conversation.typePlaceholder}
            disabled={isStreaming || isRecording}
            className="h-12 flex-1 rounded-full border border-indigo-200/80 bg-white px-4 text-sm text-indigo-900 placeholder:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Button
            aria-label="Send speak free message"
            data-testid="speak-free-send"
            onClick={handleSendText}
            disabled={!textInput.trim() || isStreaming || isRecording}
            size="icon"
            className="h-12 w-12 rounded-full bg-indigo-600 shadow-[0_10px_24px_rgba(79,70,229,0.22)] hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {recommendationsEnabled && selectedTopic && <RecommendationPanel text={selectedTopic} contentType="phrase" />}
    </div>
  );
}

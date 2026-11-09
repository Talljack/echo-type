'use client';

import { ArrowLeft, MessageCircle, Send } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { RecommendationPanel } from '@/components/shared/recommendation-panel';
import { ConversationArea } from '@/components/speak/conversation-area';
import { VoiceInputButton } from '@/components/speak/voice-input-button';
import { TranslationBar } from '@/components/translation/translation-bar';
import { Button } from '@/components/ui/button';
import { useConversation } from '@/hooks/use-conversation';
import enSpeakFree from '@/lib/i18n/messages/speak-free/en.json';
import zhSpeakFree from '@/lib/i18n/messages/speak-free/zh.json';
import { useI18n } from '@/lib/i18n/use-i18n';
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
  const pageShellClassName = 'mx-auto flex h-[calc(100vh-8rem)] max-w-2xl flex-col md:h-[calc(100vh-4rem)]';

  return (
    <div className={pageShellClassName}>
      {/* Header */}
      <div className="flex items-center gap-3 py-3 md:py-4 shrink-0">
        <Button asChild variant="ghost" size="icon" className="text-brand-ink cursor-pointer">
          <Link href="/speak" aria-label={speakMessages.scenarios.backToScenarios}>
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </Link>
        </Button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-brand-tint flex items-center justify-center shrink-0">
            <MessageCircle className="w-4 h-4 text-brand-ink" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-display text-ink">{speakMessages.freeConversation.pageTitle}</h1>
            <p className="text-xs text-brand-muted">{speakMessages.freeConversation.pageSubtitle}</p>
          </div>
        </div>
        <TranslationBar module="speak" />
      </div>

      {/* Topic suggestions - shown when conversation just started */}
      {!hasStarted && (
        <div className="shrink-0 mb-3">
          <p className="text-xs font-medium text-brand-muted mb-2">{speakMessages.freeConversation.suggestedTopics}</p>
          <div className="flex flex-wrap gap-2">
            {topicSuggestions.map((topic) => (
              <button
                key={topic.label}
                type="button"
                onClick={() => setSelectedTopic(topic.hint)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-[background-color,border-color,color,box-shadow] duration-200 cursor-pointer ${
                  selectedTopic === topic.hint
                    ? 'bg-brand text-white shadow-md shadow-brand'
                    : 'bg-surface/80 text-brand-ink border border-brand-line hover:border-brand hover:bg-brand-soft'
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
      <div className="flex min-h-[18rem] flex-1 flex-col overflow-hidden rounded-[28px] border border-surface/72 bg-surface/84 shadow-[0_16px_36px_rgba(79,70,229,0.07)] backdrop-blur-xl">
        <ConversationArea
          messages={messages}
          scenarioTitle={speakMessages.freeConversation.pageTitle}
          onPlayVoice={handlePlayVoice}
          onToggleTranslation={handleToggleTranslation}
        />
      </div>

      {/* Input area */}
      <div className="shrink-0 space-y-3 rounded-[28px] border border-surface/72 bg-surface/84 px-4 py-4 shadow-[0_14px_32px_rgba(15,23,42,0.05)] backdrop-blur-xl">
        <VoiceInputButton
          isRecording={isRecording}
          isDisabled={isStreaming || isFallbackTranscribing}
          onToggle={handleToggleRecording}
        />
        {isFallbackTranscribing && (
          <p className="text-xs text-warning font-medium text-center">{speakMessages.conversation.processing}</p>
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
            className="h-12 flex-1 rounded-full border border-brand-line/80 bg-surface px-4 text-sm text-ink placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Button
            aria-label="Send speak free message"
            data-testid="speak-free-send"
            onClick={handleSendText}
            disabled={!textInput.trim() || isStreaming || isRecording}
            size="icon"
            className="h-12 w-12 rounded-full bg-brand shadow-[0_10px_24px_rgba(79,70,229,0.22)] hover:bg-brand-strong disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {recommendationsEnabled && selectedTopic && <RecommendationPanel text={selectedTopic} contentType="phrase" />}
    </div>
  );
}

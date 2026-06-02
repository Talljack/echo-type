'use client';

import { ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { RecommendationPanel } from '@/components/shared/recommendation-panel';
import { ConversationArea } from '@/components/speak/conversation-area';
import { ScenarioGoals } from '@/components/speak/scenario-goals';
import { VoiceInputButton } from '@/components/speak/voice-input-button';
import { TranslationBar } from '@/components/translation/translation-bar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConversation } from '@/hooks/use-conversation';
import { useI18n } from '@/lib/i18n/use-i18n';
import { getScenarioById } from '@/lib/scenarios';
import { detectIOSNativeHost, reportNativeQAState } from '@/lib/tauri';
import { useTTSStore } from '@/stores/tts-store';

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700 border-green-200',
  intermediate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  advanced: 'bg-red-100 text-red-700 border-red-200',
};

export default function ConversationPage() {
  const { messages: t } = useI18n('speak');
  const params = useParams();
  const scenarioId = params.scenarioId as string;
  const scenario = getScenarioById(scenarioId);
  const recommendationsEnabled = useTTSStore((s) => s.recommendationsEnabled);
  const isIOSNativeHost = detectIOSNativeHost();
  const pageShellClassName = isIOSNativeHost
    ? 'mx-auto flex min-h-full max-w-2xl flex-col gap-3'
    : 'mx-auto flex h-[calc(100vh-8rem)] max-w-2xl flex-col md:h-[calc(100vh-4rem)]';

  const {
    messages,
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
    scenario: scenario
      ? {
          title: scenario.title,
          systemPrompt: scenario.systemPrompt,
          goals: scenario.goals,
          difficulty: scenario.difficulty,
        }
      : undefined,
    openingMessage: scenario?.openingMessage,
    contentId: scenarioId,
  });

  useEffect(() => {
    reportNativeQAState({
      page: 'speak-scenario',
      scenarioId,
      hasScenario: Boolean(scenario),
      messageCount: messages.length,
      isRecording,
      isStreaming,
    });
  }, [isRecording, isStreaming, messages.length, scenario, scenarioId]);

  if (!scenario) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-indigo-400">{t.scenarios.notFound}</p>
        <Link href="/speak">
          <Button variant="outline" className="border-indigo-200 text-indigo-600 cursor-pointer">
            {t.scenarios.backToScenarios}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={pageShellClassName}>
      <span data-native-title aria-hidden="true" className="sr-only">
        {scenario.title}
      </span>

      {!isIOSNativeHost && (
        <div className="flex items-center gap-3 py-3 shrink-0">
          <Link href="/speak">
            <Button
              variant="ghost"
              size="icon"
              className="text-indigo-600 cursor-pointer"
              aria-label="Back to scenarios"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold font-[var(--font-poppins)] text-indigo-900 truncate">{scenario.title}</h1>
            <p className="text-xs text-indigo-400 truncate">{scenario.titleZh}</p>
          </div>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${difficultyColors[scenario.difficulty]}`}>
            {scenario.difficulty}
          </Badge>
          <TranslationBar module="speak" />
        </div>
      )}

      <div className="shrink-0 mb-2">
        <ScenarioGoals goals={scenario.goals} difficulty={scenario.difficulty} />
      </div>

      <div className="flex min-h-[18rem] flex-1 flex-col overflow-hidden rounded-[28px] border border-white/72 bg-white/84 shadow-[0_16px_36px_rgba(79,70,229,0.07)] backdrop-blur-xl">
        <ConversationArea
          messages={messages}
          scenarioTitle={scenario.title}
          onPlayVoice={handlePlayVoice}
          onToggleTranslation={handleToggleTranslation}
        />
      </div>

      <div className="shrink-0 space-y-3 rounded-[28px] border border-white/72 bg-white/84 px-4 py-4 shadow-[0_14px_32px_rgba(15,23,42,0.05)] backdrop-blur-xl">
        <VoiceInputButton
          isRecording={isRecording}
          isDisabled={isStreaming || isFallbackTranscribing}
          onToggle={handleToggleRecording}
        />
        {isFallbackTranscribing && (
          <p className="text-xs text-amber-600 font-medium text-center">{t.conversation.processing}</p>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.conversation.typeResponsePlaceholder}
            aria-label="Speak scenario input"
            disabled={isStreaming || isRecording}
            className="h-12 flex-1 rounded-full border border-indigo-200/80 bg-white px-4 text-sm text-indigo-900 placeholder:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Button
            onClick={handleSendText}
            disabled={!textInput.trim() || isStreaming || isRecording}
            size="icon"
            aria-label="Send speak scenario message"
            className="h-12 w-12 rounded-full bg-indigo-600 shadow-[0_10px_24px_rgba(79,70,229,0.22)] hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {recommendationsEnabled && (
        <RecommendationPanel text={`${scenario.title}: ${scenario.goals.join(', ')}`} contentType="phrase" />
      )}
    </div>
  );
}

'use client';

import { ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
import { useTTSStore } from '@/stores/tts-store';

const difficultyColors: Record<string, string> = {
  beginner: 'bg-success-soft text-success-ink border-success-line',
  intermediate: 'bg-warning-soft text-warning-ink border-warning-line',
  advanced: 'bg-danger-soft text-danger-ink border-danger-line',
};

export default function ConversationPage() {
  const { messages: t } = useI18n('speak');
  const params = useParams();
  const scenarioId = params.scenarioId as string;
  const scenario = getScenarioById(scenarioId);
  const recommendationsEnabled = useTTSStore((s) => s.recommendationsEnabled);
  const pageShellClassName = 'mx-auto flex h-[calc(100vh-8rem)] max-w-2xl flex-col md:h-[calc(100vh-4rem)]';

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

  if (!scenario) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-brand-muted">{t.scenarios.notFound}</p>
        <Link href="/speak">
          <Button variant="outline" className="border-brand-line text-brand-ink cursor-pointer">
            {t.scenarios.backToScenarios}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={pageShellClassName}>
      <div className="flex items-center gap-3 py-3 shrink-0">
        <Link href="/speak">
          <Button variant="ghost" size="icon" className="text-brand-ink cursor-pointer" aria-label="Back to scenarios">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold font-display text-ink truncate">{scenario.title}</h1>
          <p className="text-xs text-brand-muted truncate">{scenario.titleZh}</p>
        </div>
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${difficultyColors[scenario.difficulty]}`}>
          {scenario.difficulty}
        </Badge>
        <TranslationBar module="speak" />
      </div>

      <div className="shrink-0 mb-2">
        <ScenarioGoals goals={scenario.goals} difficulty={scenario.difficulty} />
      </div>

      <div className="flex min-h-[18rem] flex-1 flex-col overflow-hidden rounded-[28px] border border-surface/72 bg-surface/84 shadow-[0_16px_36px_rgba(79,70,229,0.07)] backdrop-blur-xl">
        <ConversationArea
          messages={messages}
          scenarioTitle={scenario.title}
          onPlayVoice={handlePlayVoice}
          onToggleTranslation={handleToggleTranslation}
        />
      </div>

      <div className="shrink-0 space-y-3 rounded-[28px] border border-surface/72 bg-surface/84 px-4 py-4 shadow-[0_14px_32px_rgba(15,23,42,0.05)] backdrop-blur-xl">
        <VoiceInputButton
          isRecording={isRecording}
          isDisabled={isStreaming || isFallbackTranscribing}
          onToggle={handleToggleRecording}
        />
        {isFallbackTranscribing && (
          <p className="text-xs text-warning font-medium text-center">{t.conversation.processing}</p>
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
            className="h-12 flex-1 rounded-full border border-brand-line/80 bg-surface px-4 text-sm text-ink placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Button
            onClick={handleSendText}
            disabled={!textInput.trim() || isStreaming || isRecording}
            size="icon"
            aria-label="Send speak scenario message"
            className="h-12 w-12 rounded-full bg-brand shadow-[0_10px_24px_rgba(79,70,229,0.22)] hover:bg-brand-strong disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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

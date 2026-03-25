'use client';

import { ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ConversationArea } from '@/components/speak/conversation-area';
import { ScenarioGoals } from '@/components/speak/scenario-goals';
import { VoiceInputButton } from '@/components/speak/voice-input-button';
import { TranslationBar } from '@/components/translation/translation-bar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConversation } from '@/hooks/use-conversation';
import { getScenarioById } from '@/lib/scenarios';

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700 border-green-200',
  intermediate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  advanced: 'bg-red-100 text-red-700 border-red-200',
};

export default function ConversationPage() {
  const params = useParams();
  const scenarioId = params.scenarioId as string;
  const scenario = getScenarioById(scenarioId);

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
  });

  if (!scenario) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-indigo-400">Scenario not found</p>
        <Link href="/speak">
          <Button variant="outline" className="border-indigo-200 text-indigo-600 cursor-pointer">
            Back to Scenarios
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-3 py-3 shrink-0">
        <Link href="/speak">
          <Button variant="ghost" size="icon" className="text-indigo-600 cursor-pointer">
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
        <TranslationBar />
      </div>

      <div className="shrink-0 mb-2">
        <ScenarioGoals goals={scenario.goals} difficulty={scenario.difficulty} />
      </div>

      <div className="flex-1 min-h-0 bg-white/60 backdrop-blur-xl rounded-2xl border border-indigo-100/50 flex flex-col overflow-hidden">
        <ConversationArea
          messages={messages}
          scenarioTitle={scenario.title}
          onPlayVoice={handlePlayVoice}
          onToggleTranslation={handleToggleTranslation}
        />
      </div>

      <div className="py-3 shrink-0 space-y-2">
        <VoiceInputButton
          isRecording={isRecording}
          isDisabled={isStreaming || isFallbackTranscribing}
          onToggle={handleToggleRecording}
        />
        {isFallbackTranscribing && (
          <p className="text-xs text-amber-600 font-medium text-center">Processing your speech...</p>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Or type your response..."
            disabled={isStreaming || isRecording}
            className="flex-1 h-10 px-4 text-sm rounded-full border border-indigo-200 bg-white/80 backdrop-blur-sm text-indigo-900 placeholder:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Button
            onClick={handleSendText}
            disabled={!textInput.trim() || isStreaming || isRecording}
            size="icon"
            className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

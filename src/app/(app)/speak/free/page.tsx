'use client';

import { ArrowLeft, MessageCircle, Send } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ConversationArea } from '@/components/speak/conversation-area';
import { VoiceInputButton } from '@/components/speak/voice-input-button';
import { TranslationBar } from '@/components/translation/translation-bar';
import { Button } from '@/components/ui/button';
import { useConversation } from '@/hooks/use-conversation';
import { useSpeakStore } from '@/stores/speak-store';

const TOPIC_SUGGESTIONS = [
  { label: 'Daily Life', emoji: '🏠', hint: "Let's talk about daily routines and everyday life." },
  { label: 'Travel', emoji: '✈️', hint: "Let's talk about travel experiences and dream destinations." },
  { label: 'Food', emoji: '🍕', hint: "Let's talk about food, cooking, and restaurants." },
  { label: 'Hobbies', emoji: '🎨', hint: "Let's talk about hobbies and things you enjoy doing." },
  { label: 'Movies & Music', emoji: '🎬', hint: "Let's talk about movies, TV shows, and music." },
  { label: 'Work & Career', emoji: '💼', hint: "Let's talk about work, career goals, and professional life." },
  { label: 'Technology', emoji: '💻', hint: "Let's talk about technology and the latest trends." },
  { label: 'Culture', emoji: '🌍', hint: "Let's talk about different cultures and traditions." },
];

const FREE_OPENING =
  "Hi there! 👋 I'm your English conversation partner. Feel free to talk about anything you'd like — or pick a topic above to get started. What's on your mind?";

export default function FreeConversationPage() {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const messages = useSpeakStore((s) => s.messages);

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
    openingMessage: FREE_OPENING,
    topicHint: selectedTopic || undefined,
  });

  const hasStarted = messages.length > 1;

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]">
      {/* Header */}
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
            <h1 className="text-lg font-bold font-[var(--font-poppins)] text-indigo-900">Free Conversation</h1>
            <p className="text-xs text-indigo-400">Chat about anything you like</p>
          </div>
        </div>
        <TranslationBar module="speak" />
      </div>

      {/* Topic suggestions - shown when conversation just started */}
      {!hasStarted && (
        <div className="shrink-0 mb-3">
          <p className="text-xs font-medium text-indigo-400 mb-2 uppercase tracking-wide">Suggested Topics</p>
          <div className="flex flex-wrap gap-2">
            {TOPIC_SUGGESTIONS.map((topic) => (
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
      <div className="flex-1 min-h-0 bg-white/60 backdrop-blur-xl rounded-2xl border border-indigo-100/50 flex flex-col overflow-hidden">
        <ConversationArea
          messages={messages}
          scenarioTitle="Free Conversation"
          onPlayVoice={handlePlayVoice}
          onToggleTranslation={handleToggleTranslation}
        />
      </div>

      {/* Input area */}
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
            placeholder="Type your message..."
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

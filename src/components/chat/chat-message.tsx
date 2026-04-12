'use client';

import { Bot, User, Volume2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useTTS } from '@/hooks/use-tts';
import { parseBlocks } from '@/lib/chat-block-parser';
import type { ChatMessage } from '@/types/chat';
import { AnalyticsBlockComponent } from './blocks/analytics-block';
import { AudioBlockComponent } from './blocks/audio-block';
import { FillBlankBlockComponent } from './blocks/fill-blank-block';
import { QuizBlockComponent } from './blocks/quiz-block';
import { ReadingBlockComponent } from './blocks/reading-block';
import { ResourceBlockComponent } from './blocks/resource-block';
import { TranslationBlockComponent } from './blocks/translation-block';
import { VocabBlockComponent } from './blocks/vocab-block';

interface ChatMessageProps {
  message: ChatMessage;
  onQuizAnswer?: (correct: boolean) => void;
}

export function ChatMessageComponent({ message, onQuizAnswer }: ChatMessageProps) {
  const { speak, isSpeaking, stop } = useTTS();

  const handleSpeak = () => {
    if (isSpeaking) {
      stop();
    } else {
      // Strip block markers for TTS
      const text = message.content.replace(/:::\w[\s\S]*?:::/g, '').trim();
      if (text) speak(text);
    }
  };

  if (message.role === 'system') {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 italic">
        {message.content}
      </div>
    );
  }

  if (message.role === 'user') {
    return (
      <div className="flex gap-2 justify-end">
        <div className="max-w-[80%] rounded-xl px-3 py-2 text-sm bg-indigo-600 text-white break-words">
          {message.content}
        </div>
        <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-1">
          <User className="w-4 h-4 text-green-600" />
        </div>
      </div>
    );
  }

  // Assistant message — parse rich blocks
  const segments = parseBlocks(message.content || '');
  const hasContent = message.content?.trim();

  return (
    <div className="flex gap-2 justify-start">
      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-1">
        <Bot className="w-4 h-4 text-indigo-600" />
      </div>
      <div className="max-w-[85%] space-y-2">
        {!hasContent && (
          <div className="rounded-xl px-3 py-2 text-sm bg-indigo-50 text-indigo-400 break-words">Thinking...</div>
        )}
        {segments.map((segment, i) => {
          if (segment.type === 'text') {
            return (
              <div key={i} className="rounded-xl px-3 py-2 text-sm bg-indigo-50 text-indigo-900 break-words">
                <div className="prose prose-sm prose-indigo max-w-none [&>p]:m-0">
                  <ReactMarkdown>{segment.content}</ReactMarkdown>
                </div>
              </div>
            );
          }

          switch (segment.type) {
            case 'quiz':
              return <QuizBlockComponent key={i} block={segment} onAnswer={(correct) => onQuizAnswer?.(correct)} />;
            case 'audio':
              return <AudioBlockComponent key={i} block={segment} />;
            case 'vocab':
              return <VocabBlockComponent key={i} block={segment} />;
            case 'fill-blank':
              return <FillBlankBlockComponent key={i} block={segment} />;
            case 'translation':
              return <TranslationBlockComponent key={i} block={segment} />;
            case 'reading':
              return <ReadingBlockComponent key={i} block={segment} />;
            case 'analytics':
              return <AnalyticsBlockComponent key={i} block={segment} />;
            case 'resource':
              return <ResourceBlockComponent key={i} block={segment} />;
            default:
              return null;
          }
        })}
        {/* TTS button for assistant messages */}
        {hasContent && (
          <button
            type="button"
            onClick={handleSpeak}
            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
              isSpeaking ? 'bg-indigo-600 text-white' : 'text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50'
            }`}
            aria-label={isSpeaking ? 'Stop speaking' : 'Read aloud'}
          >
            <Volume2 className="w-3 h-3" />
            {isSpeaking ? 'Stop' : 'Listen'}
          </button>
        )}
      </div>
    </div>
  );
}

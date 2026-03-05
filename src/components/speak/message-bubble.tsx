'use client';

import { motion } from 'framer-motion';
import { Bot, Languages, Loader2, Volume2, VolumeX } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { ConversationMessage } from '@/types/scenario';

interface MessageBubbleProps {
  message: ConversationMessage;
  onPlayVoice?: (text: string, messageId: string) => void;
  onToggleTranslation?: (messageId: string) => void;
}

export function MessageBubble({ message, onPlayVoice, onToggleTranslation }: MessageBubbleProps) {
  const isUser = message.role === 'user' || message.role === 'recording';

  // Color scheme based on role
  const btnBase = isUser
    ? 'text-green-400 hover:text-green-600 hover:bg-green-50'
    : 'text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50';
  const btnActive = isUser ? 'text-green-600 bg-green-50' : 'text-indigo-600 bg-indigo-50';
  const translationColor = isUser ? 'text-slate-500' : 'text-indigo-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-1">
          <Bot className="w-4.5 h-4.5 text-indigo-600" />
        </div>
      )}
      <div className={`max-w-[75%] flex flex-col`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            message.role === 'recording'
              ? 'bg-green-50 text-green-700 italic border border-green-200'
              : isUser
                ? 'bg-green-500 text-white'
                : 'bg-indigo-50 text-indigo-900'
          }`}
        >
          {message.role === 'assistant' ? (
            <div className="prose prose-sm prose-indigo max-w-none [&>p]:m-0 whitespace-pre-wrap">
              <ReactMarkdown>{message.content || 'Thinking...'}</ReactMarkdown>
            </div>
          ) : (
            <span className="whitespace-pre-wrap">
              {message.content || (message.role === 'recording' ? 'Listening...' : '')}
            </span>
          )}
        </div>

        {/* Action buttons - only for non-recording messages with content */}
        {message.role !== 'recording' && message.content && (
          <div className={`flex items-center gap-1 mt-1 ${isUser ? 'justify-end mr-1' : 'ml-1'}`}>
            <button
              type="button"
              onClick={() => onPlayVoice?.(message.content, message.id)}
              className={`h-6 w-6 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                message.isPlaying ? btnActive : btnBase
              }`}
              title={message.isPlaying ? 'Stop voice' : 'Play voice'}
            >
              {message.isPlaying ? (
                <VolumeX className="w-3.5 h-3.5 animate-pulse" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => onToggleTranslation?.(message.id)}
              className={`h-6 w-6 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                message.translationEnabled ? btnActive : btnBase
              }`}
              title="Toggle translation"
            >
              <Languages className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Translation display */}
        {message.translationEnabled && (
          <div className={`mt-1 text-sm px-2 ${isUser ? 'text-right' : ''}`}>
            {message.isTranslating ? (
              <span className={`${translationColor} inline-flex items-center gap-1`}>
                <Loader2 className="w-3 h-3 animate-spin" /> Translating...
              </span>
            ) : message.translationError ? (
              <span className="text-amber-600 text-xs">{message.translationError}</span>
            ) : message.translation ? (
              <p className={`${translationColor} leading-relaxed whitespace-pre-wrap`}>{message.translation}</p>
            ) : null}
          </div>
        )}
      </div>
    </motion.div>
  );
}

'use client';

import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'recording';
  content: string;
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === 'user' || role === 'recording';

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
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          role === 'recording'
            ? 'bg-green-50 text-green-700 italic border border-green-200'
            : isUser
              ? 'bg-green-500 text-white'
              : 'bg-indigo-50 text-indigo-900'
        }`}
      >
        {role === 'assistant' ? (
          <div className="prose prose-sm prose-indigo max-w-none [&>p]:m-0">
            <ReactMarkdown>{content || 'Thinking...'}</ReactMarkdown>
          </div>
        ) : (
          <span>{content || (role === 'recording' ? 'Listening...' : '')}</span>
        )}
      </div>
    </motion.div>
  );
}

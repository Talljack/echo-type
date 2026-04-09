'use client';

import { ChevronDown, ChevronUp, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { useTTS } from '@/hooks/use-tts';
import type { ReadingBlock as ReadingBlockType } from '@/types/chat';

interface ReadingBlockProps {
  block: ReadingBlockType;
  onWordClick?: (word: string) => void;
  onComprehensionCheck?: () => void;
}

export function ReadingBlockComponent({ block, onWordClick, onComprehensionCheck }: ReadingBlockProps) {
  const { speak, isSpeaking, stop } = useTTS();
  const [expandedSegments, setExpandedSegments] = useState<Set<string>>(new Set());

  const toggleTranslation = (segId: string) => {
    const next = new Set(expandedSegments);
    if (next.has(segId)) {
      next.delete(segId);
    } else {
      next.add(segId);
    }
    setExpandedSegments(next);
  };

  const handleSpeak = (text: string) => {
    if (isSpeaking) {
      stop();
    } else {
      speak(text);
    }
  };

  const handleWordClick = (word: string) => {
    const cleaned = word.replace(/[.,!?;:"'()]/g, '').trim();
    if (cleaned) {
      onWordClick?.(cleaned);
    }
  };

  return (
    <div className="rounded-xl border border-indigo-100 bg-white p-3 space-y-2">
      {block.title && <h4 className="text-sm font-semibold text-indigo-900">{block.title}</h4>}
      <div className="space-y-2">
        {block.segments.map((seg) => (
          <div key={seg.id} className="border border-slate-100 rounded-lg p-2.5 space-y-1.5">
            <div className="flex items-start gap-2">
              <div className="flex-1 text-sm text-slate-700 leading-relaxed">
                {seg.text.split(/\s+/).map((word, i) => (
                  <span key={i}>
                    <span
                      role="button"
                      tabIndex={0}
                      className="hover:bg-indigo-50 hover:text-indigo-700 rounded px-0.5 cursor-pointer transition-colors"
                      onClick={() => handleWordClick(word)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') handleWordClick(word);
                      }}
                    >
                      {word}
                    </span>{' '}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => handleSpeak(seg.text)}
                className="text-indigo-400 hover:text-indigo-600 transition-colors cursor-pointer shrink-0 mt-0.5"
                aria-label="Listen to segment"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
            {seg.translation && (
              <>
                <button
                  type="button"
                  onClick={() => toggleTranslation(seg.id)}
                  className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-600 cursor-pointer transition-colors"
                >
                  {expandedSegments.has(seg.id) ? (
                    <>
                      <ChevronUp className="w-3 h-3" /> Hide translation
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3" /> Show translation
                    </>
                  )}
                </button>
                {expandedSegments.has(seg.id) && (
                  <p className="text-xs text-slate-500 border-l-2 border-indigo-200 pl-2">{seg.translation}</p>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      {onComprehensionCheck && (
        <button
          type="button"
          onClick={onComprehensionCheck}
          className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer transition-colors"
        >
          Check comprehension
        </button>
      )}
    </div>
  );
}

'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import type { TranslationBlock as TranslationBlockType } from '@/types/chat';

interface TranslationBlockProps {
  block: TranslationBlockType;
}

export function TranslationBlockComponent({ block }: TranslationBlockProps) {
  const [showTarget, setShowTarget] = useState(false);

  return (
    <div className="rounded-xl border border-line bg-surface p-3 space-y-2">
      <div>
        <span className="text-[10px] text-brand-muted">{block.sourceLang}</span>
        <p className="text-sm text-ink-2">{block.source}</p>
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-brand-muted">{block.targetLang}</span>
          <button
            type="button"
            onClick={() => setShowTarget(!showTarget)}
            className="text-brand-muted hover:text-brand-ink transition-colors cursor-pointer"
            aria-label={showTarget ? 'Hide translation' : 'Show translation'}
          >
            {showTarget ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
        <p
          className={`text-sm transition-all ${showTarget ? 'text-ink-2' : 'text-transparent bg-surface-3 rounded select-none'}`}
        >
          {block.target}
        </p>
      </div>
    </div>
  );
}

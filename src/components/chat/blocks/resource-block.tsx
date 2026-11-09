'use client';

import { BookOpen, Download, ExternalLink, Play } from 'lucide-react';
import type { ResourceBlock as ResourceBlockType } from '@/types/chat';

interface ResourceBlockProps {
  block: ResourceBlockType;
  onImport?: (block: ResourceBlockType) => void;
  onPractice?: (block: ResourceBlockType) => void;
}

export function ResourceBlockComponent({ block, onImport, onPractice }: ResourceBlockProps) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3 space-y-2">
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded-lg bg-brand-tint flex items-center justify-center shrink-0">
          <BookOpen className="w-4 h-4 text-brand-ink" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-ink truncate">{block.title}</h4>
          {block.description && <p className="text-xs text-ink-3 line-clamp-2">{block.description}</p>}
          <div className="flex items-center gap-1.5 mt-1">
            {block.difficulty && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning-soft text-warning">{block.difficulty}</span>
            )}
            {block.resourceType && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-info-soft text-info">{block.resourceType}</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onImport && (
          <button
            type="button"
            onClick={() => onImport(block)}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-brand-line text-brand-ink hover:bg-brand-soft cursor-pointer transition-colors"
          >
            <Download className="w-3 h-3" /> Import
          </button>
        )}
        {onPractice && (
          <button
            type="button"
            onClick={() => onPractice(block)}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-brand text-white hover:bg-brand-strong cursor-pointer transition-colors"
          >
            <Play className="w-3 h-3" /> Practice
          </button>
        )}
        {block.url && (
          <a
            href={block.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-ink-4 hover:text-ink-2 transition-colors ml-auto"
          >
            <ExternalLink className="w-3 h-3" /> Open
          </a>
        )}
      </div>
    </div>
  );
}

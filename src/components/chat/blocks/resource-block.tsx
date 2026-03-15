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
    <div className="rounded-xl border border-indigo-100 bg-white p-3 space-y-2">
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
          <BookOpen className="w-4 h-4 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-indigo-900 truncate">{block.title}</h4>
          {block.description && <p className="text-xs text-slate-500 line-clamp-2">{block.description}</p>}
          <div className="flex items-center gap-1.5 mt-1">
            {block.difficulty && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">{block.difficulty}</span>
            )}
            {block.resourceType && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{block.resourceType}</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onImport && (
          <button
            type="button"
            onClick={() => onImport(block)}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors"
          >
            <Download className="w-3 h-3" /> Import
          </button>
        )}
        {onPractice && (
          <button
            type="button"
            onClick={() => onPractice(block)}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer transition-colors"
          >
            <Play className="w-3 h-3" /> Practice
          </button>
        )}
        {block.url && (
          <a
            href={block.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors ml-auto"
          >
            <ExternalLink className="w-3 h-3" /> Open
          </a>
        )}
      </div>
    </div>
  );
}

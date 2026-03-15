'use client';

import { Maximize2, Mic, Minimize2 } from 'lucide-react';
import { useChatStore } from '@/stores/chat-store';

interface ChatToolbarProps {
  onMicToggle: () => void;
  isListening: boolean;
}

export function ChatToolbar({ onMicToggle, isListening }: ChatToolbarProps) {
  const panelSize = useChatStore((s) => s.panelSize);
  const setPanelSize = useChatStore((s) => s.setPanelSize);

  const buttons = [
    {
      icon: Mic,
      label: 'Mic',
      active: isListening,
      onClick: onMicToggle,
    },
    {
      icon: panelSize === 'compact' ? Maximize2 : Minimize2,
      label: panelSize === 'compact' ? 'Expand' : 'Collapse',
      active: false,
      onClick: () => setPanelSize(panelSize === 'compact' ? 'expanded' : 'compact'),
    },
  ];

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 border-t border-indigo-50">
      {buttons.map((btn) => (
        <button
          key={btn.label}
          type="button"
          onClick={btn.onClick}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            btn.active ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
          }`}
          aria-label={btn.label}
          title={btn.label}
        >
          <btn.icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}

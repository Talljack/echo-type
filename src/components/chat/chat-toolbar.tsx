'use client';

import { BarChart3, BookOpen, Globe, Maximize2, Mic, Minimize2, Settings } from 'lucide-react';
import { useChatStore } from '@/stores/chat-store';

interface ChatToolbarProps {
  onLibraryToggle: () => void;
  onSearchToggle: () => void;
  onMicToggle: () => void;
  onAnalytics: () => void;
  onNavigate?: (path: string) => void;
  showLibrary: boolean;
  showSearch: boolean;
  isListening: boolean;
}

export function ChatToolbar({
  onLibraryToggle,
  onSearchToggle,
  onMicToggle,
  onAnalytics,
  onNavigate,
  showLibrary,
  showSearch,
  isListening,
}: ChatToolbarProps) {
  const panelSize = useChatStore((s) => s.panelSize);
  const setPanelSize = useChatStore((s) => s.setPanelSize);

  const buttons = [
    {
      icon: BookOpen,
      label: 'Library',
      active: showLibrary,
      onClick: onLibraryToggle,
    },
    {
      icon: Mic,
      label: 'Voice',
      active: isListening,
      onClick: onMicToggle,
    },
    {
      icon: Globe,
      label: 'Search',
      active: showSearch,
      onClick: onSearchToggle,
    },
    {
      icon: BarChart3,
      label: 'Analytics',
      active: false,
      onClick: onAnalytics,
    },
    {
      icon: Settings,
      label: 'Settings',
      active: false,
      onClick: () => onNavigate?.('/settings'),
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

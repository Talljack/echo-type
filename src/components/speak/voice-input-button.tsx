'use client';

import { motion } from 'framer-motion';
import { Loader2, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/use-i18n';

interface VoiceInputButtonProps {
  isRecording: boolean;
  isDisabled: boolean;
  onToggle: () => void;
}

export function VoiceInputButton({ isRecording, isDisabled, onToggle }: VoiceInputButtonProps) {
  const { messages: t } = useI18n('speak');
  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        animate={isRecording ? { scale: [1, 1.08, 1] } : {}}
        transition={isRecording ? { repeat: Infinity, duration: 1.5, ease: 'easeInOut' } : {}}
      >
        <Button
          onClick={onToggle}
          disabled={isDisabled}
          className={`w-16 h-16 rounded-full cursor-pointer transition-colors duration-200 shadow-lg ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 shadow-red-200'
              : isDisabled
                ? 'bg-slate-300 cursor-not-allowed shadow-none'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
          }`}
        >
          {isDisabled && !isRecording ? (
            <Loader2 className="w-7 h-7 animate-spin" />
          ) : isRecording ? (
            <MicOff className="w-7 h-7" />
          ) : (
            <Mic className="w-7 h-7" />
          )}
        </Button>
      </motion.div>
      <span className="text-xs text-slate-400">
        {isRecording ? t.voiceInput.tapToStop : isDisabled ? t.voiceInput.aiResponding : t.voiceInput.tapToSpeak}
      </span>
    </div>
  );
}

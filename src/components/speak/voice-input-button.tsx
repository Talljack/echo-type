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
          aria-label={isRecording ? 'Stop voice input' : 'Start voice input'}
          data-testid="speak-free-voice-toggle"
          onClick={onToggle}
          disabled={isDisabled}
          className={`h-[4.5rem] w-[4.5rem] rounded-full border border-white/60 cursor-pointer transition-colors duration-200 shadow-[0_18px_36px_rgba(79,70,229,0.22)] ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 shadow-[0_18px_36px_rgba(239,68,68,0.24)]'
              : isDisabled
                ? 'bg-slate-300 cursor-not-allowed shadow-none'
                : 'bg-[linear-gradient(180deg,#5b5cf0_0%,#4f46e5_100%)] hover:bg-[linear-gradient(180deg,#5557eb_0%,#4338ca_100%)]'
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
      <span className="text-xs font-medium text-slate-400">
        {isRecording ? t.voiceInput.tapToStop : isDisabled ? t.voiceInput.aiResponding : t.voiceInput.tapToSpeak}
      </span>
    </div>
  );
}

'use client';

import { motion } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceInputButtonProps {
  isRecording: boolean;
  isDisabled: boolean;
  onToggle: () => void;
}

export function VoiceInputButton({ isRecording, isDisabled, onToggle }: VoiceInputButtonProps) {
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
        {isRecording ? 'Tap to stop' : isDisabled ? 'AI is responding...' : 'Tap to speak'}
      </span>
    </div>
  );
}

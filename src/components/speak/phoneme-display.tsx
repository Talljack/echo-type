'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/use-i18n';
import type { PronunciationWord } from '@/lib/pronunciation';

function scoreColor(score: number): { bg: string; text: string; border: string } {
  if (score >= 80) return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
  if (score >= 50) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
  return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
}

function scoreDot(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

interface PhonemeWordCardProps {
  word: PronunciationWord;
  index: number;
  onPlayWord?: (word: string) => void;
}

function PhonemeWordCard({ word, index, onPlayWord }: PhonemeWordCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasPhonemes = word.phonemes && word.phonemes.length > 0;
  const colors = scoreColor(word.score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      className={`rounded-lg border ${colors.border} ${colors.bg} overflow-hidden`}
    >
      <button
        type="button"
        onClick={() => hasPhonemes && setExpanded(!expanded)}
        className={`w-full flex items-center gap-2 px-3 py-2 text-left ${hasPhonemes ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${scoreDot(word.score)}`} />
        <span className={`text-sm font-medium ${colors.text} flex-1`}>{word.word}</span>
        <span className={`text-xs font-mono ${colors.text} opacity-70`}>{word.score}</span>
        {onPlayWord && (
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6 shrink-0 text-indigo-400 hover:text-indigo-600 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onPlayWord(word.word);
            }}
          >
            <Volume2 className="w-3 h-3" />
          </Button>
        )}
        {hasPhonemes && (
          <span className={`${colors.text} opacity-50`}>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        )}
      </button>

      <AnimatePresence>
        {expanded && hasPhonemes && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2.5 pt-0.5 space-y-1.5 border-t border-dashed border-slate-200">
              {word.phonemes!.map((p, pi) => {
                const pColors = scoreColor(p.score);
                return (
                  <div key={`${p.phoneme}-${pi}`} className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${scoreDot(p.score)}`} />
                    <span className="text-sm font-mono text-slate-700 w-10">/{p.phoneme}/</span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${p.score >= 80 ? 'bg-green-400' : p.score >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                        style={{ width: `${p.score}%` }}
                      />
                    </div>
                    <span className={`text-xs font-mono ${pColors.text} w-7 text-right`}>{p.score}</span>
                  </div>
                );
              })}
              {word
                .phonemes!.filter((p) => p.suggestion)
                .map((p, i) => (
                  <p key={`tip-${i}`} className="text-xs text-slate-500 pl-4 leading-relaxed">
                    /{p.phoneme}/: {p.suggestion}
                  </p>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface PhonemeDisplayProps {
  words: PronunciationWord[];
  onPlayWord?: (word: string) => void;
}

export function PhonemeDisplay({ words, onPlayWord }: PhonemeDisplayProps) {
  const { messages: t } = useI18n('speak');

  if (words.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {t.pronunciation.phonemeAnalysis}
        </h4>
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" /> {t.pronunciation.phonemeLegend.good}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> {t.pronunciation.phonemeLegend.fair}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> {t.pronunciation.phonemeLegend.needsWork}
          </span>
        </div>
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {words.map((word, i) => (
          <PhonemeWordCard key={`${word.word}-${i}`} word={word} index={i} onPlayWord={onPlayWord} />
        ))}
      </div>
    </div>
  );
}

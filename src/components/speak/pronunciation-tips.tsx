'use client';

import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { useI18n } from '@/lib/i18n/use-i18n';

interface PronunciationTipsProps {
  tips: string[];
}

export function PronunciationTips({ tips }: PronunciationTipsProps) {
  const { messages: t } = useI18n('speak');

  if (tips.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="rounded-xl border border-line bg-brand-soft/60 p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-brand-ink" />
        <h4 className="text-sm font-semibold text-brand-ink">{t.pronunciation.tips}</h4>
      </div>
      <ul className="space-y-2">
        {tips.map((tip, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.08 }}
            className="flex items-start gap-2 text-sm text-brand-ink leading-relaxed"
          >
            <span className="w-5 h-5 rounded-full bg-brand-tint flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold text-brand-ink">
              {i + 1}
            </span>
            <span>{tip}</span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

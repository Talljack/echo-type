'use client';

import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import translationBarOptions from '@/lib/i18n/messages/translation-bar/options.json';
import { usePracticeTranslationStore } from '@/stores/practice-translation-store';
import { useTTSStore } from '@/stores/tts-store';
import type { PracticeModule } from '@/types/translation';

interface TranslationBarProps {
  module: PracticeModule;
}

export function TranslationBar({ module }: TranslationBarProps) {
  const showTranslation = usePracticeTranslationStore((s) => s.isVisible(module));
  const toggleTranslation = usePracticeTranslationStore((s) => s.toggle);
  const targetLang = useTTSStore((s) => s.targetLang);
  const setTargetLang = useTTSStore((s) => s.setTargetLang);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 cursor-pointer ${showTranslation ? 'text-indigo-600 bg-indigo-50' : 'text-indigo-400'}`}
        onClick={() => toggleTranslation(module)}
      >
        <Languages className="w-4 h-4" />
      </Button>
      {showTranslation && (
        <Select value={targetLang} onValueChange={setTargetLang}>
          <SelectTrigger size="sm" className="h-8 w-auto text-xs border-indigo-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {translationBarOptions.languages.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

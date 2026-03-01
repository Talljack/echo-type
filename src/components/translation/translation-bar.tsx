'use client';

import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTTSStore } from '@/stores/tts-store';

const LANG_OPTIONS = [
  { value: 'zh-CN', label: '中文' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'pt', label: 'Português' },
  { value: 'ru', label: 'Русский' },
];

export function TranslationBar() {
  const showTranslation = useTTSStore((s) => s.showTranslation);
  const toggleTranslation = useTTSStore((s) => s.toggleTranslation);
  const targetLang = useTTSStore((s) => s.targetLang);
  const setTargetLang = useTTSStore((s) => s.setTargetLang);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 cursor-pointer ${showTranslation ? 'text-indigo-600 bg-indigo-50' : 'text-indigo-400'}`}
        onClick={toggleTranslation}
      >
        <Languages className="w-4 h-4" />
      </Button>
      {showTranslation && (
        <Select value={targetLang} onValueChange={setTargetLang}>
          <SelectTrigger size="sm" className="h-8 w-auto text-xs border-indigo-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANG_OPTIONS.map((lang) => (
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

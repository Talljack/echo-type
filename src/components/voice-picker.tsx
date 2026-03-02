'use client';

import { motion } from 'framer-motion';
import { Check, Play, Search, Square, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { VoiceOption } from '@/hooks/use-tts';
import { useTTS } from '@/hooks/use-tts';
import { useTTSStore } from '@/stores/tts-store';

const GRADIENTS = [
  'from-rose-400 to-pink-500',
  'from-violet-400 to-purple-500',
  'from-blue-400 to-indigo-500',
  'from-cyan-400 to-teal-500',
  'from-emerald-400 to-green-500',
  'from-amber-400 to-orange-500',
  'from-red-400 to-rose-500',
  'from-fuchsia-400 to-pink-500',
  'from-sky-400 to-blue-500',
  'from-lime-400 to-emerald-500',
];

const LANG_FLAGS: Record<string, string> = {
  'en-US': '🇺🇸 US',
  'en-GB': '🇬🇧 UK',
  'en-AU': '🇦🇺 AU',
  'en-IN': '🇮🇳 IN',
  'en-CA': '🇨🇦 CA',
  'en-NZ': '🇳🇿 NZ',
  'en-ZA': '🇿🇦 ZA',
  'en-IE': '🇮🇪 IE',
  'en-SG': '🇸🇬 SG',
};

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function cleanName(name: string): string {
  return name
    .replace(/^(Google|Microsoft|Apple)\s+/i, '')
    .replace(/\s+Online\s*\(Natural\)/i, '')
    .trim();
}

function getInitials(name: string): string {
  const clean = cleanName(name);
  const parts = clean.split(/[\s-]+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

function getLangLabel(lang: string): string {
  return LANG_FLAGS[lang] || lang;
}

function VoiceCard({
  voice,
  isSelected,
  isPreviewing,
  onSelect,
  onPreview,
  onStop,
}: {
  voice: VoiceOption;
  isSelected: boolean;
  isPreviewing: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onStop: () => void;
}) {
  const gradient = GRADIENTS[hashCode(voice.name) % GRADIENTS.length];

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`relative flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors cursor-pointer ${
        isSelected ? 'border-indigo-500 bg-indigo-50/60' : 'border-transparent bg-white/60 hover:border-indigo-200'
      }`}
    >
      {/* Check mark */}
      {isSelected && (
        <div className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}

      {/* Avatar */}
      <div className="relative shrink-0">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-sm font-bold text-white`}
        >
          {getInitials(voice.name)}
        </div>
        {/* Play button overlay - changed from button to div to avoid nesting */}
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            if (isPreviewing) {
              onStop();
            } else {
              onPreview();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              if (isPreviewing) {
                onStop();
              } else {
                onPreview();
              }
            }
          }}
          className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white transition-colors cursor-pointer ${
            isPreviewing ? 'bg-amber-500 text-white' : 'bg-indigo-500 text-white hover:bg-indigo-600'
          }`}
        >
          {isPreviewing ? <Square className="h-2.5 w-2.5" /> : <Play className="h-2.5 w-2.5 ml-px" />}
        </div>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-indigo-900">{cleanName(voice.name)}</p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-indigo-100/80 text-indigo-600">
            {getLangLabel(voice.lang)}
          </Badge>
          {voice.isPremium && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-violet-100/80 text-violet-600">
              Premium
            </Badge>
          )}
        </div>
      </div>
    </motion.button>
  );
}

export function VoicePicker() {
  const { voices, isReady, isSpeaking, previewingURI, previewVoice, stop } = useTTS();
  const { voiceURI, setVoiceURI } = useTTSStore();
  const [tab, setTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const premiumVoices = useMemo(() => voices.filter((v) => v.isPremium), [voices]);
  const systemVoices = useMemo(() => voices.filter((v) => !v.isPremium), [voices]);

  const filtered = useMemo(() => {
    let result = voices;

    // Filter by tab
    if (tab === 'premium') result = premiumVoices;
    else if (tab === 'system') result = systemVoices;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (v) => cleanName(v.name).toLowerCase().includes(query) || v.lang.toLowerCase().includes(query),
      );
    }

    return result;
  }, [tab, voices, premiumVoices, systemVoices, searchQuery]);

  if (!isReady || voices.length === 0) {
    return <div className="flex items-center justify-center py-8 text-sm text-indigo-400">Loading voices...</div>;
  }

  return (
    <div className="space-y-3">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-indigo-50/80">
          <TabsTrigger value="all">All ({voices.length})</TabsTrigger>
          <TabsTrigger value="premium">Premium ({premiumVoices.length})</TabsTrigger>
          <TabsTrigger value="system">System ({systemVoices.length})</TabsTrigger>
        </TabsList>

        {/* Search Input */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
          <Input
            type="text"
            placeholder="Search voices by name or accent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 bg-white/60 border-indigo-200 focus:border-indigo-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-indigo-600 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <TabsContent value={tab}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-indigo-300 mb-3" />
              <p className="text-sm text-indigo-600 font-medium">No voices found</p>
              <p className="text-xs text-indigo-400 mt-1">Try a different search term</p>
            </div>
          ) : (
            <ScrollArea className="h-[340px] mt-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {filtered.map((v) => (
                  <VoiceCard
                    key={v.voiceURI}
                    voice={v}
                    isSelected={v.voiceURI === (voiceURI || voices[0]?.voiceURI)}
                    isPreviewing={isSpeaking && previewingURI === v.voiceURI}
                    onSelect={() => setVoiceURI(v.voiceURI)}
                    onPreview={() => previewVoice(v.voiceURI)}
                    onStop={stop}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

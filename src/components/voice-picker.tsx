'use client';

import { motion } from 'framer-motion';
import { Check, Play, Search, Square, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { VoiceOption } from '@/hooks/use-tts';
import { useTTS } from '@/hooks/use-tts';
import {
  type BrowserVoicePickerTab,
  filterBrowserVoicesByTab,
  getBrowserVoicePickerGroups,
} from '@/lib/voice-picker-filters';
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
  'ja-JP': '🇯🇵 JP',
  'zh-CN': '🇨🇳 CN',
  'es-ES': '🇪🇸 ES',
  'fr-FR': '🇫🇷 FR',
  'hi-IN': '🇮🇳 HI',
  'it-IT': '🇮🇹 IT',
  'pt-BR': '🇧🇷 BR',
};

const PROVIDER_BADGES: Record<string, string> = {
  apple: 'Apple',
  google: 'Google',
  microsoft: 'Microsoft',
  'browser-cloud': 'Cloud',
  kokoro: 'Kokoro',
  other: 'Other',
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
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ y: 0 }}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
      className={`relative flex min-h-[92px] items-start gap-3 rounded-2xl border-2 p-3.5 text-left transition-[border-color,background-color,box-shadow,transform] duration-150 cursor-pointer ${
        isSelected
          ? 'border-indigo-500 bg-indigo-50/80 shadow-[0_10px_30px_-20px_rgba(79,70,229,0.7)]'
          : 'border-transparent bg-white/70 hover:border-indigo-200 hover:bg-white hover:shadow-[0_12px_28px_-22px_rgba(15,23,42,0.4)]'
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
          className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-sm font-bold text-white shadow-sm`}
        >
          {getInitials(voice.name)}
        </div>
        <button
          type="button"
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
          className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white transition-colors cursor-pointer shadow-sm ${
            isPreviewing ? 'bg-amber-500 text-white' : 'bg-indigo-500 text-white hover:bg-indigo-600'
          }`}
        >
          {isPreviewing ? <Square className="h-2.5 w-2.5" /> : <Play className="h-2.5 w-2.5 ml-px" />}
        </button>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1 space-y-2 pr-6">
        <p className="line-clamp-2 text-sm font-semibold leading-tight text-indigo-950">{cleanName(voice.name)}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-indigo-100/80 text-indigo-600">
            {getLangLabel(voice.lang)}
          </Badge>
          {voice.provider && (
            <span className="text-[11px] font-medium text-slate-500">{PROVIDER_BADGES[voice.provider]}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {voice.isPremium && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-violet-100/80 text-violet-600">
              Premium
            </Badge>
          )}
          {voice.voiceType === 'natural' && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-100/80 text-emerald-600">
              Natural
            </Badge>
          )}
          {voice.voiceType === 'novelty' && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100/80 text-amber-700">
              Fun
            </Badge>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function VoicePicker() {
  const {
    voices,
    isReady,
    isSpeaking,
    isFishLoading,
    isKokoroLoading,
    fishError,
    kokoroError,
    previewingURI,
    previewVoice,
    stop,
    voiceSource,
  } = useTTS();
  const {
    voiceURI,
    fishVoiceId,
    kokoroVoiceId,
    setVoiceURI,
    setFishVoice,
    setKokoroVoice,
    fishApiKey,
    kokoroServerUrl,
  } = useTTSStore();
  const [tab, setTab] = useState<BrowserVoicePickerTab>('english');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setTab(voiceSource === 'browser' ? 'english' : 'all');
  }, [voiceSource]);

  const browserVoiceGroups = useMemo(() => getBrowserVoicePickerGroups(voices), [voices]);

  const visibleVoices = useMemo(() => {
    if (voiceSource === 'fish' || voiceSource === 'kokoro') return voices;
    return filterBrowserVoicesByTab(voices, tab);
  }, [voiceSource, voices, tab]);

  const filtered = useMemo(() => {
    let result = visibleVoices;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          cleanName(v.name).toLowerCase().includes(query) ||
          v.lang.toLowerCase().includes(query) ||
          v.provider?.toLowerCase().includes(query) ||
          v.voiceType?.toLowerCase().includes(query) ||
          v.authorName?.toLowerCase().includes(query) ||
          v.tags?.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    return result;
  }, [visibleVoices, searchQuery]);

  if (!isReady || isFishLoading || isKokoroLoading) {
    return <div className="flex items-center justify-center py-8 text-sm text-indigo-400">Loading voices...</div>;
  }

  if (voiceSource === 'fish' && !fishApiKey.trim()) {
    return (
      <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/70 px-4 py-6 text-sm text-indigo-700">
        Add your Fish Audio API key below to load the cloud voice library.
      </div>
    );
  }

  if (voiceSource === 'fish' && fishError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-700">{fishError}</div>
    );
  }

  if (voiceSource === 'kokoro' && !kokoroServerUrl.trim()) {
    return (
      <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/70 px-4 py-6 text-sm text-indigo-700">
        Add your Kokoro server URL below to load the remote voice library.
      </div>
    );
  }

  if (voiceSource === 'kokoro' && kokoroError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-700">{kokoroError}</div>
    );
  }

  if (visibleVoices.length === 0) {
    return <div className="flex items-center justify-center py-8 text-sm text-indigo-400">No voices available.</div>;
  }

  return (
    <div className="space-y-3">
      {voiceSource === 'browser' && (
        <Tabs value={tab} onValueChange={(value) => setTab(value as BrowserVoicePickerTab)}>
          <TabsList className="bg-indigo-50/80">
            <TabsTrigger value="english">English ({browserVoiceGroups.english.length})</TabsTrigger>
            <TabsTrigger value="all">All ({browserVoiceGroups.all.length})</TabsTrigger>
            <TabsTrigger value="premium">Premium ({browserVoiceGroups.premium.length})</TabsTrigger>
            <TabsTrigger value="system">System ({browserVoiceGroups.system.length})</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Search Input */}
      <div className="relative mt-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
        <Input
          type="text"
          placeholder={
            voiceSource === 'fish'
              ? 'Search voices by name, author, or tag...'
              : voiceSource === 'kokoro'
                ? 'Search voices by name, language, or gender...'
                : 'Search voices by name, accent, or provider...'
          }
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

      {voiceSource === 'browser' && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs text-indigo-700">
          Showing {filtered.length} of {visibleVoices.length} browser voices in this view.{' '}
          {browserVoiceGroups.english.length} English voices and {browserVoiceGroups.all.length} total voices are
          currently available in this WebView.
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="mb-3 h-12 w-12 text-indigo-300" />
          <p className="text-sm font-medium text-indigo-600">No voices found</p>
          <p className="mt-1 text-xs text-indigo-400">Try a different search term</p>
        </div>
      ) : (
        <ScrollArea className="mt-3 h-[340px]">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((v) => (
              <div key={v.voiceURI} className="space-y-1.5">
                <VoiceCard
                  voice={v}
                  isSelected={
                    v.voiceURI ===
                    (voiceSource === 'fish'
                      ? fishVoiceId
                      : voiceSource === 'kokoro'
                        ? kokoroVoiceId
                        : voiceURI || voices[0]?.voiceURI)
                  }
                  isPreviewing={isSpeaking && previewingURI === v.voiceURI}
                  onSelect={() => {
                    if (voiceSource === 'fish') {
                      setFishVoice(v.voiceURI, v.name);
                    } else if (voiceSource === 'kokoro') {
                      setKokoroVoice(v.voiceURI, v.name);
                    } else {
                      setVoiceURI(v.voiceURI);
                    }
                  }}
                  onPreview={() => previewVoice(v.voiceURI)}
                  onStop={stop}
                />
                {(voiceSource === 'fish' || voiceSource === 'kokoro') && (
                  <div className="space-y-1 px-1 text-[11px] text-slate-500">
                    {v.authorName && <p className="truncate">By {v.authorName}</p>}
                    {v.description && <p className="line-clamp-2 text-slate-400">{v.description}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

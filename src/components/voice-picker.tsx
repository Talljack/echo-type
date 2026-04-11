'use client';

import { motion } from 'framer-motion';
import { Check, Loader2, Play, Search, Square, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { VoiceOption } from '@/hooks/use-tts';
import { useTTS } from '@/hooks/use-tts';
import enVoicePicker from '@/lib/i18n/messages/voice-picker/en.json';
import zhVoicePicker from '@/lib/i18n/messages/voice-picker/zh.json';
import {
  type BrowserVoicePickerTab,
  filterBrowserVoicesByTab,
  getBrowserVoicePickerGroups,
} from '@/lib/voice-picker-filters';
import { type InterfaceLanguage, useLanguageStore } from '@/stores/language-store';
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
  'en-KE': '🇰🇪 KE',
  'en-PH': '🇵🇭 PH',
  'en-HK': '🇭🇰 HK',
  'en-NG': '🇳🇬 NG',
  'en-TZ': '🇹🇿 TZ',
  'ja-JP': '🇯🇵 JP',
  'zh-CN': '🇨🇳 CN',
  'es-ES': '🇪🇸 ES',
  'fr-FR': '🇫🇷 FR',
  'hi-IN': '🇮🇳 HI',
  'it-IT': '🇮🇹 IT',
  'pt-BR': '🇧🇷 BR',
};

type RawVoicePickerLocale = typeof enVoicePicker;
type VoicePickerLocale = Omit<RawVoicePickerLocale, 'browserSummary'> & {
  browserSummary: (filtered: number, visible: number, english: number, total: number) => string;
};

const VOICE_PICKER_LOCALES = {
  en: enVoicePicker,
  zh: zhVoicePicker,
} as const satisfies Record<InterfaceLanguage, RawVoicePickerLocale>;

function interpolate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
}

function getVoicePickerLocale(language: InterfaceLanguage): VoicePickerLocale {
  const raw = VOICE_PICKER_LOCALES[language];
  return {
    ...raw,
    browserSummary: (filtered, visible, english, total) =>
      interpolate(raw.browserSummary, { filtered, visible, english, total }),
  };
}

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

function getVoiceTypeBadge(voiceType: VoiceOption['voiceType'], locale: VoicePickerLocale): string | null {
  if (voiceType === 'natural') return locale.badges.natural;
  if (voiceType === 'novelty') return locale.badges.fun;
  return null;
}

function getProviderBadge(provider: string, locale: VoicePickerLocale): string {
  return locale.providerBadges[provider as keyof VoicePickerLocale['providerBadges']] ?? provider;
}

function getSearchPlaceholder(voiceSource: string, locale: VoicePickerLocale): string {
  if (voiceSource === 'fish') return locale.search.fish;
  if (voiceSource === 'kokoro') return locale.search.kokoro;
  if (voiceSource === 'edge') return locale.search.edge;
  return locale.search.browser;
}

function VoiceCard({
  voice,
  isSelected,
  isPreviewing,
  onSelect,
  onPreview,
  onStop,
  locale,
}: {
  voice: VoiceOption;
  isSelected: boolean;
  isPreviewing: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onStop: () => void;
  locale: VoicePickerLocale;
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
      role="option"
      aria-selected={isSelected}
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
          aria-label={isPreviewing ? locale.actions.stopPreview : locale.actions.preview}
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
            <span className="text-[11px] font-medium text-slate-500">{getProviderBadge(voice.provider, locale)}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {voice.isPremium && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-violet-100/80 text-violet-600">
              {locale.badges.premium}
            </Badge>
          )}
          {getVoiceTypeBadge(voice.voiceType, locale) && (
            <Badge
              variant="secondary"
              className={`text-[10px] px-1.5 py-0 ${
                voice.voiceType === 'natural' ? 'bg-emerald-100/80 text-emerald-600' : 'bg-amber-100/80 text-amber-700'
              }`}
            >
              {getVoiceTypeBadge(voice.voiceType, locale)}
            </Badge>
          )}
          {voice.source === 'edge' && voice.description && (
            <Badge
              variant="secondary"
              className={`text-[10px] px-1.5 py-0 ${
                voice.description.includes('Female') ? 'bg-pink-100/80 text-pink-600' : 'bg-sky-100/80 text-sky-600'
              }`}
            >
              {voice.description.includes('Female') ? '♀' : '♂'}
            </Badge>
          )}
          {voice.source === 'edge' &&
            voice.tags?.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 bg-indigo-50/80 text-indigo-500">
                {tag}
              </Badge>
            ))}
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
    isEdgeLoading,
    fishError,
    kokoroError,
    edgeError,
    previewingURI,
    previewVoice,
    stop,
    voiceSource,
  } = useTTS();
  const {
    voiceURI,
    fishVoiceId,
    kokoroVoiceId,
    edgeVoiceId,
    setVoiceURI,
    setFishVoice,
    setKokoroVoice,
    setEdgeVoice,
    fishApiKey,
    kokoroServerUrl,
  } = useTTSStore();
  const interfaceLanguage = useLanguageStore((state) => state.interfaceLanguage);
  const [tab, setTab] = useState<BrowserVoicePickerTab>('english');
  const [edgeLocaleTab, setEdgeLocaleTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const locale = getVoicePickerLocale(interfaceLanguage);

  // Initialize browser voice on mount
  useEffect(() => {
    if (voiceSource === 'browser' && !voiceURI && voices.length > 0) {
      setVoiceURI(voices[0].voiceURI);
    }
  }, [voiceSource, voiceURI, voices, setVoiceURI]);

  useEffect(() => {
    setTab(voiceSource === 'browser' ? 'english' : 'all');
    setEdgeLocaleTab('all');
  }, [voiceSource]);

  const browserVoiceGroups = useMemo(() => getBrowserVoicePickerGroups(voices), [voices]);

  const edgeLocaleGroups = useMemo(() => {
    if (voiceSource !== 'edge') return {};
    const groups: Record<string, VoiceOption[]> = {};
    for (const v of voices) {
      const locale = v.lang;
      if (!groups[locale]) groups[locale] = [];
      groups[locale].push(v);
    }
    return groups;
  }, [voiceSource, voices]);

  const visibleVoices = useMemo(() => {
    if (voiceSource === 'fish' || voiceSource === 'kokoro') return voices;
    if (voiceSource === 'edge') {
      if (edgeLocaleTab === 'all') return voices;
      return voices.filter((v) => v.lang === edgeLocaleTab);
    }
    return filterBrowserVoicesByTab(voices, tab);
  }, [voiceSource, voices, tab, edgeLocaleTab]);

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

  if (!isReady || isFishLoading || isKokoroLoading || isEdgeLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-indigo-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        {locale.loading}
      </div>
    );
  }

  if (voiceSource === 'fish' && !fishApiKey.trim()) {
    return (
      <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/70 px-4 py-6 text-sm text-indigo-700">
        {locale.fishSetup}
      </div>
    );
  }

  if (voiceSource === 'fish' && fishError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-700">
        {locale.errors.fish} {fishError}
      </div>
    );
  }

  if (voiceSource === 'kokoro' && !kokoroServerUrl.trim()) {
    return (
      <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/70 px-4 py-6 text-sm text-indigo-700">
        {locale.kokoroSetup}
      </div>
    );
  }

  if (voiceSource === 'kokoro' && kokoroError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-700">
        {locale.errors.kokoro} {kokoroError}
      </div>
    );
  }

  if (visibleVoices.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-indigo-400">{locale.noVoicesAvailable}</div>
    );
  }

  return (
    <div className="space-y-3">
      {voiceSource === 'edge' && edgeError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {locale.errors.edge}
        </div>
      )}
      {voiceSource === 'browser' && (
        <Tabs value={tab} onValueChange={(value) => setTab(value as BrowserVoicePickerTab)}>
          <TabsList className="bg-indigo-50/80">
            <TabsTrigger value="english">
              {locale.tabs.english} ({browserVoiceGroups.english.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              {locale.tabs.all} ({browserVoiceGroups.all.length})
            </TabsTrigger>
            <TabsTrigger value="premium">
              {locale.tabs.premium} ({browserVoiceGroups.premium.length})
            </TabsTrigger>
            <TabsTrigger value="system">
              {locale.tabs.system} ({browserVoiceGroups.system.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {voiceSource === 'edge' && Object.keys(edgeLocaleGroups).length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setEdgeLocaleTab('all')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
              edgeLocaleTab === 'all' ? 'bg-indigo-500 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
            }`}
          >
            {locale.tabs.all} ({voices.length})
          </button>
          {Object.entries(edgeLocaleGroups).map(([localeKey, group]) => (
            <button
              key={localeKey}
              type="button"
              onClick={() => setEdgeLocaleTab(localeKey)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                edgeLocaleTab === localeKey
                  ? 'bg-indigo-500 text-white'
                  : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
              }`}
            >
              {getLangLabel(localeKey)} ({group.length})
            </button>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative mt-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
        <Input
          type="text"
          placeholder={getSearchPlaceholder(voiceSource, locale)}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9 bg-white/60 border-indigo-200 focus:border-indigo-400"
        />
        {searchQuery && (
          <button
            type="button"
            aria-label={locale.actions.clearSearch}
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-indigo-600 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {voiceSource === 'browser' && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs text-indigo-700">
          {locale.browserSummary(
            filtered.length,
            visibleVoices.length,
            browserVoiceGroups.english.length,
            browserVoiceGroups.all.length,
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="mb-3 h-12 w-12 text-indigo-300" />
          <p className="text-sm font-medium text-indigo-600">{locale.noVoicesFoundTitle}</p>
          <p className="mt-1 text-xs text-indigo-400">{locale.noVoicesFoundHint}</p>
        </div>
      ) : (
        <ScrollArea className="mt-3 h-[340px]">
          <div
            role="listbox"
            aria-label="Available voices"
            className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
          >
            {filtered.map((v) => (
              <div key={v.voiceURI} className="space-y-1.5">
                <VoiceCard
                  voice={v}
                  locale={locale}
                  isSelected={
                    voiceSource === 'fish'
                      ? v.voiceURI === fishVoiceId
                      : voiceSource === 'kokoro'
                        ? v.voiceURI === kokoroVoiceId
                        : voiceSource === 'edge'
                          ? v.voiceURI === edgeVoiceId
                          : v.voiceURI === voiceURI
                  }
                  isPreviewing={isSpeaking && previewingURI === v.voiceURI}
                  onSelect={() => {
                    if (voiceSource === 'fish') {
                      setFishVoice(v.voiceURI, v.name);
                    } else if (voiceSource === 'kokoro') {
                      setKokoroVoice(v.voiceURI, v.name);
                    } else if (voiceSource === 'edge') {
                      setEdgeVoice(v.voiceURI, v.name);
                    } else {
                      setVoiceURI(v.voiceURI);
                    }
                  }}
                  onPreview={() => previewVoice(v.voiceURI)}
                  onStop={stop}
                />
                {(voiceSource === 'fish' || voiceSource === 'kokoro' || voiceSource === 'edge') && (
                  <div className="space-y-1 px-1 text-[11px] text-slate-500">
                    {v.authorName && (
                      <p className="truncate">
                        {locale.authorPrefix} {v.authorName}
                      </p>
                    )}
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

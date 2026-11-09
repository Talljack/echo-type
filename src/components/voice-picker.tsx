'use client';

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

const LANG_FLAGS: Record<string, string> = {
  'en-US': 'US',
  'en-GB': 'UK',
  'en-AU': 'AU',
  'en-IN': 'IN',
  'en-CA': 'CA',
  'en-NZ': 'NZ',
  'en-ZA': 'ZA',
  'en-IE': 'IE',
  'en-SG': 'SG',
  'en-KE': 'KE',
  'en-PH': 'PH',
  'en-HK': 'HK',
  'en-NG': 'NG',
  'en-TZ': 'TZ',
  'ja-JP': 'JP',
  'zh-CN': 'CN',
  'es-ES': 'ES',
  'fr-FR': 'FR',
  'hi-IN': 'HI',
  'it-IT': 'IT',
  'pt-BR': 'BR',
};

const GRADIENTS = [
  'from-danger to-pink-500',
  'from-violet-400 to-purple-500',
  'from-info to-brand',
  'from-info to-teal-500',
];

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
  if (voiceSource === 'google') return locale.search.google;
  if (voiceSource === 'openai') return locale.search.openai;
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
    <div
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
          ? 'border-brand bg-brand-soft/80 shadow-[0_10px_30px_-20px_rgba(79,70,229,0.7)]'
          : 'border-transparent bg-surface/70 hover:border-brand-line hover:bg-surface hover:shadow-[0_12px_28px_-22px_rgba(15,23,42,0.4)]'
      }`}
    >
      {/* Check mark */}
      {isSelected && (
        <div className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand">
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
          className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface transition-colors cursor-pointer shadow-sm ${
            isPreviewing ? 'bg-warning text-white' : 'bg-brand text-white hover:bg-brand'
          }`}
        >
          {isPreviewing ? <Square className="h-2.5 w-2.5" /> : <Play className="h-2.5 w-2.5 ml-px" />}
        </button>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1 space-y-2 pr-6">
        <p className="line-clamp-2 text-sm font-semibold leading-tight text-ink">{cleanName(voice.name)}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-brand-tint/80 text-brand-ink">
            {getLangLabel(voice.lang)}
          </Badge>
          {voice.provider && (
            <span className="text-[11px] font-medium text-ink-3">{getProviderBadge(voice.provider, locale)}</span>
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
                voice.voiceType === 'natural'
                  ? 'bg-success-soft/80 text-success'
                  : 'bg-warning-soft/80 text-warning-ink'
              }`}
            >
              {getVoiceTypeBadge(voice.voiceType, locale)}
            </Badge>
          )}
          {voice.source === 'edge' && voice.description && (
            <Badge
              variant="secondary"
              className={`text-[10px] px-1.5 py-0 ${
                voice.description.includes('Female') ? 'bg-pink-100/80 text-pink-600' : 'bg-info-soft/80 text-info'
              }`}
            >
              {voice.description.includes('Female') ? '♀' : '♂'}
            </Badge>
          )}
          {voice.source === 'edge' &&
            voice.tags?.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 bg-brand-soft/80 text-brand-ink">
                {tag}
              </Badge>
            ))}
        </div>
      </div>
    </div>
  );
}

export function VoicePicker() {
  const {
    voices,
    isReady,
    isSpeaking,
    isFishLoading,
    isEdgeLoading,
    isGoogleLoading,
    fishError,
    googleError,
    edgeError,
    previewingURI,
    previewVoice,
    stop,
    voiceSource,
  } = useTTS();
  const { voiceURI, fishVoiceId, edgeVoiceId, setVoiceURI, setFishVoice, setEdgeVoice, fishApiKey } = useTTSStore();
  const { googleVoiceName, setGoogleVoice } = useTTSStore();
  const { openaiTtsApiKey, openaiTtsVoice, setOpenAITtsVoice } = useTTSStore();
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
    if (voiceSource !== 'edge' && voiceSource !== 'google') return {};
    const groups: Record<string, VoiceOption[]> = {};
    for (const v of voices) {
      const locale = v.lang;
      if (!groups[locale]) groups[locale] = [];
      groups[locale].push(v);
    }
    return groups;
  }, [voiceSource, voices]);

  const visibleVoices = useMemo(() => {
    if (voiceSource === 'fish' || voiceSource === 'openai') return voices;
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

  if (!isReady || isFishLoading || isGoogleLoading || isEdgeLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-brand-muted">
        <Loader2 className="w-4 h-4 animate-spin" />
        {locale.loading}
      </div>
    );
  }

  if (voiceSource === 'fish' && !fishApiKey.trim()) {
    return (
      <div className="rounded-xl border border-dashed border-brand-line bg-brand-soft/70 px-4 py-6 text-sm text-brand-ink">
        {locale.fishSetup}
      </div>
    );
  }

  if (voiceSource === 'openai' && !openaiTtsApiKey.trim()) {
    return (
      <div className="rounded-xl border border-dashed border-brand-line bg-brand-soft/70 px-4 py-6 text-sm text-brand-ink">
        {locale.openaiSetup}
      </div>
    );
  }

  if (voiceSource === 'fish' && fishError) {
    return (
      <div className="rounded-xl border border-danger-line bg-danger-soft px-4 py-6 text-sm text-danger-ink">
        {locale.errors.fish} {fishError}
      </div>
    );
  }

  if (voiceSource === 'google' && googleError) {
    return (
      <div className="rounded-xl border border-danger-line bg-danger-soft px-4 py-6 text-sm text-danger-ink">
        {locale.errors.google} {googleError}
      </div>
    );
  }

  if (visibleVoices.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-brand-muted">{locale.noVoicesAvailable}</div>
    );
  }

  return (
    <div data-testid="settings-voice-picker" className="space-y-3">
      {voiceSource === 'edge' && edgeError && (
        <div className="rounded-xl border border-warning-line bg-warning-soft px-4 py-3 text-sm text-warning-ink">
          {locale.errors.edge}
        </div>
      )}
      {voiceSource === 'browser' && (
        <Tabs value={tab} onValueChange={(value) => setTab(value as BrowserVoicePickerTab)}>
          <TabsList className="bg-brand-soft/80">
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

      {(voiceSource === 'edge' || voiceSource === 'google') && Object.keys(edgeLocaleGroups).length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setEdgeLocaleTab('all')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
              edgeLocaleTab === 'all' ? 'bg-brand text-white' : 'bg-brand-soft text-brand-ink hover:bg-brand-tint'
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
                edgeLocaleTab === localeKey ? 'bg-brand text-white' : 'bg-brand-soft text-brand-ink hover:bg-brand-tint'
              }`}
            >
              {getLangLabel(localeKey)} ({group.length})
            </button>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative mt-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted" />
        <Input
          data-testid="settings-voice-search"
          type="text"
          placeholder={getSearchPlaceholder(voiceSource, locale)}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9 bg-surface/60 border-brand-line focus:border-brand"
        />
        {searchQuery && (
          <button
            type="button"
            aria-label={locale.actions.clearSearch}
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-ink transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {voiceSource === 'browser' && (
        <div className="rounded-xl border border-line bg-brand-soft/60 px-3 py-2 text-xs text-brand-ink">
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
          <Search className="mb-3 h-12 w-12 text-brand-muted" />
          <p className="text-sm font-medium text-brand-ink">{locale.noVoicesFoundTitle}</p>
          <p className="mt-1 text-xs text-brand-muted">{locale.noVoicesFoundHint}</p>
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
                      : voiceSource === 'google'
                        ? v.voiceURI === googleVoiceName
                        : voiceSource === 'openai'
                          ? v.voiceURI === openaiTtsVoice
                          : voiceSource === 'edge'
                            ? v.voiceURI === edgeVoiceId
                            : v.voiceURI === voiceURI
                  }
                  isPreviewing={isSpeaking && previewingURI === v.voiceURI}
                  onSelect={() => {
                    if (voiceSource === 'fish') {
                      setFishVoice(v.voiceURI, v.name);
                    } else if (voiceSource === 'google') {
                      setGoogleVoice(v.voiceURI, v.name, v.lang);
                    } else if (voiceSource === 'openai') {
                      setOpenAITtsVoice(v.voiceURI, v.name);
                    } else if (voiceSource === 'edge') {
                      setEdgeVoice(v.voiceURI, v.name);
                    } else {
                      setVoiceURI(v.voiceURI);
                    }
                  }}
                  onPreview={() => previewVoice(v.voiceURI)}
                  onStop={stop}
                />
                {(voiceSource === 'fish' ||
                  voiceSource === 'google' ||
                  voiceSource === 'openai' ||
                  voiceSource === 'edge') && (
                  <div className="space-y-1 px-1 text-[11px] text-ink-3">
                    {v.authorName && (
                      <p className="truncate">
                        {locale.authorPrefix} {v.authorName}
                      </p>
                    )}
                    {v.description && <p className="line-clamp-2 text-ink-4">{v.description}</p>}
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

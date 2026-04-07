'use client';

import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronDown,
  Cloud,
  CloudOff,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  Keyboard,
  KeyRound,
  Languages,
  Loader2,
  LogIn,
  LogOut,
  Mic,
  RefreshCw,
  Repeat,
  Sparkles,
  Star,
  Tag,
  User,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, type SyntheticEvent, useCallback, useEffect, useRef, useState } from 'react';
import { AssessmentSection } from '@/components/assessment/assessment-section';
import { OllamaWarningBanner } from '@/components/ollama/ollama-warning-banner';
import { AboutSection } from '@/components/settings/about-section';
import { AppearanceSection } from '@/components/settings/appearance-section';
import { DataBackup } from '@/components/settings/data-backup';
import { LanguageSection } from '@/components/settings/language-section';
import { Section } from '@/components/settings/section';
import { ShortcutSettings } from '@/components/settings/shortcut-settings';
import { TagManagement } from '@/components/settings/tag-management';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { VoicePicker } from '@/components/voice-picker';
import { getLocalizedFishAudioModels } from '@/lib/fish-audio-shared';
import { useI18n } from '@/lib/i18n/use-i18n';
import {
  createModelRecommendationKey,
  getModelRecommendationMeta,
  sortModelsByRecommendation,
} from '@/lib/model-recommendations';
import { clearOAuthStorage, getStoredOAuthState, getStoredVerifier, startOAuthFlow } from '@/lib/oauth';
import {
  getLocalizedProviderDefinition,
  getLocalizedProviderGroupLabel,
  PROVIDER_GROUPS,
  PROVIDER_REGISTRY,
  type ProviderId,
  type ProviderModel,
  type ProviderModelRecommendation,
} from '@/lib/providers';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useFavoriteStore } from '@/stores/favorite-store';
import { usePracticeTranslationStore } from '@/stores/practice-translation-store';
import { usePronunciationStore } from '@/stores/pronunciation-store';
import { useProviderStore } from '@/stores/provider-store';
import { useSyncStore } from '@/stores/sync-store';
import { useTTSStore } from '@/stores/tts-store';
import { PRACTICE_TRANSLATION_POLICY, type PracticeModule } from '@/types/translation';

// ─── Provider brand styles ────────────────────────────────────────────────────

const PROVIDER_STYLE: Partial<Record<ProviderId, { icon: string; btn: string }>> = {
  openai: { icon: 'bg-[#10a37f]/10 text-[#10a37f]', btn: 'bg-[#10a37f] hover:bg-[#0d9068] text-white' },
  anthropic: { icon: 'bg-[#d97706]/10 text-[#d97706]', btn: 'bg-[#d97706] hover:bg-[#b45309] text-white' },
  google: { icon: 'bg-[#4285f4]/10 text-[#4285f4]', btn: 'bg-[#4285f4] hover:bg-[#3367d6] text-white' },
  deepseek: { icon: 'bg-[#0ea5e9]/10 text-[#0ea5e9]', btn: 'bg-[#0ea5e9] hover:bg-[#0284c7] text-white' },
  xai: { icon: 'bg-slate-900/10 text-slate-800', btn: 'bg-slate-900 hover:bg-slate-800 text-white' },
  groq: { icon: 'bg-[#f55036]/10 text-[#f55036]', btn: 'bg-[#f55036] hover:bg-[#d93d26] text-white' },
  cerebras: { icon: 'bg-[#7c3aed]/10 text-[#7c3aed]', btn: 'bg-[#7c3aed] hover:bg-[#6d28d9] text-white' },
  mistral: { icon: 'bg-[#ff7000]/10 text-[#ff7000]', btn: 'bg-[#ff7000] hover:bg-[#e06300] text-white' },
  cohere: { icon: 'bg-[#39594d]/10 text-[#39594d]', btn: 'bg-[#39594d] hover:bg-[#2d4a3e] text-white' },
  perplexity: { icon: 'bg-[#20808d]/10 text-[#20808d]', btn: 'bg-[#20808d] hover:bg-[#1a6b78] text-white' },
  togetherai: { icon: 'bg-[#0f172a]/10 text-[#0f172a]', btn: 'bg-[#0f172a] hover:bg-[#1e293b] text-white' },
  deepinfra: { icon: 'bg-violet-500/10 text-violet-600', btn: 'bg-violet-600 hover:bg-violet-700 text-white' },
  fireworks: { icon: 'bg-purple-500/10 text-purple-600', btn: 'bg-purple-600 hover:bg-purple-700 text-white' },
  openrouter: { icon: 'bg-rose-500/10 text-rose-600', btn: 'bg-rose-600 hover:bg-rose-700 text-white' },
  zai: { icon: 'bg-blue-500/10 text-blue-600', btn: 'bg-blue-600 hover:bg-blue-700 text-white' },
  minimax: { icon: 'bg-indigo-500/10 text-indigo-600', btn: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
  moonshotai: { icon: 'bg-slate-700/10 text-slate-700', btn: 'bg-slate-700 hover:bg-slate-800 text-white' },
  siliconflow: { icon: 'bg-cyan-500/10 text-cyan-600', btn: 'bg-cyan-600 hover:bg-cyan-700 text-white' },
  ollama: { icon: 'bg-emerald-500/10 text-emerald-600', btn: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  lmstudio: { icon: 'bg-amber-500/10 text-amber-600', btn: 'bg-amber-600 hover:bg-amber-700 text-white' },
};

const PROVIDER_ICON: Partial<Record<ProviderId, React.ReactNode>> = {
  openai: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true" focusable="false">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
    </svg>
  ),
  anthropic: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true" focusable="false">
      <path d="M17.304 3.541 13.766 13.5h-3.53L6.696 3.541H3.541L8.43 16.773h7.14l4.889-13.232zM.386 20.459h23.228v-1.8H.386z" />
    </svg>
  ),
  google: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true" focusable="false">
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
    </svg>
  ),
  deepseek: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true" focusable="false">
      <path d="M23.748 11.784c-.137-.048-.276-.09-.418-.124a6.998 6.998 0 0 0-.143-.035c.006-.09.011-.18.011-.272.001-3.41-2.317-6.42-5.636-7.21-.17-.041-.34-.073-.514-.1-.41-.065-.824-.087-1.236-.065-.265.014-.528.044-.79.09C13.678 1.58 11.64.003 9.253 0 6.76 0 4.664 1.75 4.664 4.027c0 .56.117 1.095.33 1.583l-.008.003c-1.04.337-1.988.86-2.798 1.545-.024.02-.048.04-.07.06-.67.576-1.23 1.271-1.656 2.057-.422.78-.685 1.635-.773 2.516-.12 1.22.097 2.471.635 3.582.54 1.113 1.38 2.056 2.436 2.724 1.055.668 2.278 1.037 3.528 1.065h.093c1.247 0 2.403-.372 3.352-1.004l.01-.008c.237-.157.465-.33.68-.518.033.11.07.218.112.323.34.848.964 1.554 1.775 2.013.535.3 1.126.47 1.726.496.32.014.642-.017.958-.093.29-.07.569-.177.835-.32 1.04-.568 1.743-1.601 1.887-2.77.012-.094.02-.19.023-.285.196-.078.39-.163.58-.256 1.046-.515 1.94-1.265 2.623-2.2.555-.75.937-1.617 1.12-2.535a7.14 7.14 0 0 0 .134-1.53c.002-.104 0-.208-.005-.31.005.001.01.002.016.003.138.029.274.054.41.074a.578.578 0 0 0 .654-.49.566.566 0 0 0-.468-.64Z" />
    </svg>
  ),
  xai: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true" focusable="false">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
};

function ProviderIconBadge({ id, className }: { id: ProviderId; className?: string }) {
  const style = PROVIDER_STYLE[id] ?? { icon: 'bg-slate-100 text-slate-500' };
  const icon = PROVIDER_ICON[id];
  return (
    <span
      className={cn(
        'w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold',
        style.icon,
        className,
      )}
    >
      {icon ?? PROVIDER_REGISTRY[id].name[0]}
    </span>
  );
}

const PRACTICE_TRANSLATION_MODULES: PracticeModule[] = ['listen', 'read', 'speak', 'write'];

function interpolate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
}

// ─── Provider Combobox ──────────────────────────────────────────────────────

function ProviderCombobox({
  value,
  providers,
  onSelect,
  isActive,
  onSetDefault,
}: {
  value: ProviderId;
  providers: Record<ProviderId, { auth: { type: string } }>;
  onSelect: (id: ProviderId) => void;
  isActive: boolean;
  onSetDefault: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { messages: settingsMessages, interfaceLanguage } = useI18n('settings');
  const providerMessages = settingsMessages.provider;
  const selectedDef = getLocalizedProviderDefinition(value, interfaceLanguage);

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className="flex h-9 flex-1 items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <span className="flex items-center gap-2 min-w-0">
              <ProviderIconBadge id={value} className="h-5 w-5 rounded text-[8px]" />
              <span className="truncate font-medium text-slate-700">{selectedDef.name}</span>
              {providers[value]?.auth.type !== 'none' && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
              )}
            </span>
            <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 text-slate-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0">
          <Command>
            <CommandInput placeholder={providerMessages.searchProviders} />
            <CommandList>
              <CommandEmpty>{providerMessages.noProviderFound}</CommandEmpty>
              {PROVIDER_GROUPS.map((group) => (
                <CommandGroup
                  key={group.label}
                  heading={getLocalizedProviderGroupLabel(group.label, interfaceLanguage)}
                >
                  {group.ids.map((providerId) => {
                    const provider = getLocalizedProviderDefinition(providerId, interfaceLanguage);
                    const isConnected = providers[providerId]?.auth.type !== 'none';
                    return (
                      <CommandItem
                        key={providerId}
                        value={`${provider.name} ${providerId}`}
                        onSelect={() => {
                          onSelect(providerId);
                          setOpen(false);
                        }}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="flex items-center gap-2">
                          <ProviderIconBadge id={providerId} className="h-5 w-5 rounded text-[8px]" />
                          <span>{provider.name}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          {isConnected ? (
                            <span className="text-[10px] font-medium text-emerald-600">
                              {providerMessages.connected}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">{providerMessages.notSetup}</span>
                          )}
                          {providerId === value && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {isActive ? (
        <span className="inline-flex h-9 items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 text-xs font-semibold text-indigo-700 shrink-0">
          <Star className="h-3 w-3 fill-indigo-500 text-indigo-500" />
          {providerMessages.defaultBadge}
        </span>
      ) : (
        <button
          type="button"
          onClick={onSetDefault}
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer transition-colors shrink-0"
          title={providerMessages.setDefaultProviderTitle}
        >
          <Star className="h-3 w-3" />
          {providerMessages.setDefault}
        </button>
      )}
    </div>
  );
}

// ─── Model Combobox ─────────────────────────────────────────────────────────

function ModelCombobox({
  models,
  recommendations,
  selectedModelId,
  onSelect,
  disabled,
}: {
  models: ProviderModel[];
  recommendations?: ProviderModelRecommendation[];
  selectedModelId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { messages: settingsMessages } = useI18n('settings');
  const providerMessages = settingsMessages.provider;
  const selectedModel = models.find((m) => m.id === selectedModelId) ?? models[0];
  const selectedMeta = selectedModel ? getModelRecommendationMeta(recommendations, selectedModel.id) : null;
  const displayModels = sortModelsByRecommendation(models, recommendations);
  const isEmpty = models.length === 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isEmpty}
          className={cn(
            'flex h-9 flex-1 min-w-0 items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm cursor-pointer hover:bg-slate-100 transition-colors',
            (disabled || isEmpty) && 'opacity-50 cursor-not-allowed hover:bg-slate-50',
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-slate-700">
              {isEmpty
                ? providerMessages.noModelsAvailable
                : (selectedModel?.name ?? selectedModel?.id ?? providerMessages.selectModel)}
            </span>
            {selectedMeta && (
              <Badge
                variant="outline"
                className="hidden border-emerald-200 bg-emerald-50 px-1.5 py-0 text-[10px] text-emerald-700 sm:inline-flex"
                title={`${selectedMeta.reason} (${selectedMeta.score}/100)`}
              >
                {selectedMeta.label}
              </Badge>
            )}
            {selectedModel?.contextWindow && (
              <span className="text-slate-400 text-xs shrink-0">{Math.round(selectedModel.contextWindow / 1000)}K</span>
            )}
          </span>
          <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 text-slate-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Command>
          <CommandInput placeholder={providerMessages.searchModels} />
          <CommandList>
            <CommandEmpty>{providerMessages.noModelFound}</CommandEmpty>
            <CommandGroup>
              {displayModels.map((m) => {
                const meta = getModelRecommendationMeta(recommendations, m.id);

                return (
                  <CommandItem
                    key={m.id}
                    value={`${m.name ?? ''} ${m.id}`}
                    onSelect={() => {
                      onSelect(m.id);
                      setOpen(false);
                    }}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="truncate">{m.name ?? m.id}</span>
                      {meta && (
                        <Badge
                          variant="outline"
                          className="border-emerald-200 bg-emerald-50 px-1.5 py-0 text-[10px] text-emerald-700"
                          title={`${meta.reason} (${meta.score}/100)`}
                        >
                          {meta.label}
                        </Badge>
                      )}
                      {m.contextWindow && (
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {Math.round(m.contextWindow / 1000)}K
                        </span>
                      )}
                    </span>
                    {m.id === selectedModelId && <Check className="h-3.5 w-3.5 shrink-0 text-indigo-600" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── AI Provider Section ───────────────────────────────────────────────────────

function AIProviderSection({
  setAuthError,
  setAuthSuccess,
  highlightProviderId,
}: {
  setAuthError: (msg: string | null) => void;
  setAuthSuccess: (msg: string | null) => void;
  highlightProviderId?: ProviderId;
}) {
  const { messages: settingsMessages, interfaceLanguage } = useI18n('settings');
  const providerMessages = settingsMessages.provider;
  const {
    providers,
    setAuth,
    clearAuth,
    setSelectedModel,
    setDynamicModels,
    setModelRecommendations,
    setBaseUrl,
    setApiPath,
    setNoModelApi,
    activeProviderId,
    setActiveProvider,
  } = useProviderStore();

  const [editingId, setEditingId] = useState<ProviderId>(activeProviderId);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const autoFetchAttemptedRef = useRef<Set<string>>(new Set());
  const lastAutoFetchedProviderRef = useRef<ProviderId | null>(null);
  const resetTransientProviderState = useCallback(() => {
    setApiKeyInput('');
    setShowKey(false);
    setModelsLoading(false);
    setConnectLoading(false);
    setServiceUnavailable(false);
  }, []);
  const switchEditingProvider = useCallback(
    (id: ProviderId) => {
      if (id !== editingId) {
        // Disconnect the ACTIVE provider when switching to a different one
        if (activeProviderId !== id && providers[activeProviderId]?.auth.type !== 'none') {
          clearAuth(activeProviderId);
        }
      }
      resetTransientProviderState();
      setEditingId(id);
    },
    [editingId, activeProviderId, providers, clearAuth, resetTransientProviderState],
  );

  // Sync editingId when activeProviderId changes (e.g. after hydration)
  useEffect(() => {
    setEditingId(activeProviderId);
  }, [activeProviderId]);

  // Switch to OAuth-completed provider
  useEffect(() => {
    if (highlightProviderId) switchEditingProvider(highlightProviderId);
  }, [highlightProviderId, switchEditingProvider]);

  const def = getLocalizedProviderDefinition(editingId, interfaceLanguage);
  const rawDef = PROVIDER_REGISTRY[editingId];
  const config = providers[editingId];
  const isConnected = config?.auth.type !== 'none';
  const isActive = activeProviderId === editingId;
  const noModelApi = config?.noModelApi ?? false;
  const dynamicModels = config?.dynamicModels ?? [];
  const models: ProviderModel[] =
    serviceUnavailable && !noModelApi ? [] : !noModelApi && dynamicModels.length > 0 ? dynamicModels : def.models;
  const recommendationKey = createModelRecommendationKey(models);
  const cachedRecommendations =
    config?.modelRecommendationKey === recommendationKey ? (config.modelRecommendations ?? []) : [];
  const selectedModel = models.find((m) => m.id === config?.selectedModelId) ?? models[0];
  const effectiveBaseUrl = config?.baseUrl || def.baseUrl || '';
  const effectiveApiPath = config?.apiPath || def.apiPath || '';
  const style = PROVIDER_STYLE[editingId] ?? {
    icon: 'bg-slate-100 text-slate-600',
    btn: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  };
  const supportsOAuth = rawDef.authMethods.includes('oauth') && !!rawDef.oauth?.clientId;
  const maskedKey =
    config?.auth.apiKey && !['ollama', 'lm-studio'].includes(config.auth.apiKey)
      ? `${config.auth.apiKey.slice(0, 8)}••••••••${config.auth.apiKey.slice(-4)}`
      : null;

  const fetchModels = useCallback(
    async (id: ProviderId, key: string, url?: string, path?: string) => {
      setModelsLoading(true);
      try {
        const res = await fetch(`/api/models?providerId=${id}`, {
          headers: {
            ...(key && { 'x-api-key': key }),
            ...(url && { 'x-base-url': url }),
            ...(path && { 'x-api-path': path }),
          },
          signal: AbortSignal.timeout(12000),
        });
        const data: {
          models: ProviderModel[];
          dynamic: boolean;
          error?: string;
          unavailable?: boolean;
          fallback?: boolean;
        } = await res.json();
        if (data.unavailable) {
          setDynamicModels(id, []);
          setServiceUnavailable(true);
          if (data.error) setAuthError(data.error);
          return [];
        }
        // Fallback means dynamic fetch failed but static models were returned
        if (data.fallback) {
          setDynamicModels(id, []);
          setServiceUnavailable(false);
          if (data.error) setAuthError(data.error);
          return data.models ?? [];
        }
        setServiceUnavailable(false);
        if (data.dynamic && data.models?.length > 0) {
          setDynamicModels(id, data.models);
          const currentId = providers[id]?.selectedModelId;
          if (!currentId || !data.models.some((m) => m.id === currentId)) {
            setSelectedModel(id, data.models[0].id);
          }
        } else {
          setDynamicModels(id, []);
        }
        if (data.error) setAuthError(data.error);
        return data.dynamic ? (data.models ?? []) : [];
      } catch {
        setServiceUnavailable(false);
        return [];
      } finally {
        setModelsLoading(false);
      }
    },
    [providers, setDynamicModels, setSelectedModel, setAuthError],
  );

  const fetchModelRecommendations = useCallback(
    async (
      id: ProviderId,
      authToken: string,
      url: string | undefined,
      path: string | undefined,
      candidateModels: ProviderModel[],
      evaluatorModelId: string,
    ) => {
      const res = await fetch(`/api/model-recommendations?providerId=${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'x-api-key': authToken }),
          ...(url && { 'x-base-url': url }),
          ...(path && { 'x-api-path': path }),
        },
        body: JSON.stringify({
          models: candidateModels,
          evaluatorModelId,
          selectedModelId: evaluatorModelId,
        }),
      });

      const data: { recommendations?: ProviderModelRecommendation[]; error?: string } = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to evaluate model recommendations');
      }

      return data.recommendations ?? [];
    },
    [],
  );

  const refreshProviderModelsAndRecommendations = useCallback(
    async (
      id: ProviderId,
      options?: {
        forceReevaluate?: boolean;
        authTokenOverride?: string;
        baseUrlOverride?: string;
        apiPathOverride?: string;
        selectedModelIdOverride?: string;
      },
    ) => {
      const providerConfig = providers[id];
      const providerDef = PROVIDER_REGISTRY[id];
      const skipModelApi = providerConfig?.noModelApi ?? false;
      const authToken =
        options?.authTokenOverride ||
        providerConfig?.auth.apiKey ||
        providerConfig?.auth.accessToken ||
        (providerDef.noKeyRequired ? 'ollama' : '');
      if (!authToken && !providerDef.noKeyRequired) return;

      const currentBaseUrl = options?.baseUrlOverride || providerConfig?.baseUrl || providerDef.baseUrl || '';
      const currentApiPath = options?.apiPathOverride || providerConfig?.apiPath || providerDef.apiPath || '';
      const fetchedModels = skipModelApi
        ? providerDef.models
        : await fetchModels(id, authToken, currentBaseUrl, currentApiPath);
      const effectiveModels =
        fetchedModels.length > 0
          ? fetchedModels
          : providerConfig?.dynamicModels?.length
            ? providerConfig.dynamicModels
            : providerDef.models;

      const nextRecommendationKey = createModelRecommendationKey(effectiveModels);
      const hasCachedRecommendations =
        providerConfig?.modelRecommendationKey === nextRecommendationKey &&
        (providerConfig.modelRecommendations?.length ?? 0) > 0;

      if (!options?.forceReevaluate && hasCachedRecommendations) {
        return;
      }

      const evaluatorModelId =
        options?.selectedModelIdOverride &&
        effectiveModels.some((model) => model.id === options.selectedModelIdOverride)
          ? options.selectedModelIdOverride
          : providerConfig?.selectedModelId &&
              effectiveModels.some((model) => model.id === providerConfig.selectedModelId)
            ? providerConfig.selectedModelId
            : effectiveModels[0]?.id || providerDef.models[0]?.id || '';
      if (!evaluatorModelId) return;

      try {
        const recommendations = await fetchModelRecommendations(
          id,
          authToken,
          currentBaseUrl,
          currentApiPath,
          effectiveModels,
          evaluatorModelId,
        );
        setModelRecommendations(id, recommendations, nextRecommendationKey);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to evaluate model recommendations';
        setAuthError(message);
      }
    },
    [fetchModelRecommendations, fetchModels, providers, setAuthError, setModelRecommendations],
  );

  useEffect(() => {
    if (!isConnected || noModelApi) return;

    const authToken = config?.auth.apiKey || config?.auth.accessToken || (def.noKeyRequired ? 'ollama' : '');
    if (!authToken && !def.noKeyRequired) return;

    const providerChanged = lastAutoFetchedProviderRef.current !== editingId;
    lastAutoFetchedProviderRef.current = editingId;
    const attemptKey = [editingId, config?.auth.type ?? 'none', authToken, effectiveBaseUrl, effectiveApiPath].join(
      '|',
    );
    if (!providerChanged && autoFetchAttemptedRef.current.has(attemptKey) && dynamicModels.length > 0) return;

    autoFetchAttemptedRef.current.add(attemptKey);
    void refreshProviderModelsAndRecommendations(editingId, { forceReevaluate: false });
  }, [
    editingId,
    config?.auth.accessToken,
    config?.auth.apiKey,
    config?.auth.type,
    def.noKeyRequired,
    dynamicModels.length,
    effectiveApiPath,
    effectiveBaseUrl,
    isConnected,
    noModelApi,
    refreshProviderModelsAndRecommendations,
  ]);

  const handleConnect = useCallback(async () => {
    const key = apiKeyInput.trim() || (def.noKeyRequired ? 'ollama' : '');
    if (!key && !def.noKeyRequired) return;
    setConnectLoading(true);
    try {
      // URL configs are now saved automatically on input change, no need to save here
      setAuth(editingId, { type: 'api-key', apiKey: key });
      setApiKeyInput('');
      if (!noModelApi) {
        await refreshProviderModelsAndRecommendations(editingId, {
          forceReevaluate: true,
          authTokenOverride: key,
          baseUrlOverride: effectiveBaseUrl,
          apiPathOverride: effectiveApiPath,
        });
      }
      if (!isActive) setActiveProvider(editingId);
      setAuthSuccess(interpolate(providerMessages.connectedSuccess, { provider: def.name }));
    } finally {
      setConnectLoading(false);
    }
  }, [
    apiKeyInput,
    def,
    editingId,
    effectiveApiPath,
    effectiveBaseUrl,
    setAuth,
    noModelApi,
    refreshProviderModelsAndRecommendations,
    isActive,
    setActiveProvider,
    setAuthSuccess,
  ]);

  const handleUpdateKey = useCallback(async () => {
    const key = apiKeyInput.trim();
    if (!key) return;
    setConnectLoading(true);
    try {
      setAuth(editingId, { type: 'api-key', apiKey: key });
      setApiKeyInput('');
      if (!noModelApi) {
        await refreshProviderModelsAndRecommendations(editingId, {
          forceReevaluate: true,
          authTokenOverride: key,
          baseUrlOverride: effectiveBaseUrl,
          apiPathOverride: effectiveApiPath,
        });
      }
      setAuthSuccess(providerMessages.apiKeyUpdated);
    } finally {
      setConnectLoading(false);
    }
  }, [
    apiKeyInput,
    editingId,
    effectiveApiPath,
    effectiveBaseUrl,
    setAuth,
    noModelApi,
    refreshProviderModelsAndRecommendations,
    setAuthSuccess,
  ]);

  const handleRefreshModels = useCallback(async () => {
    await refreshProviderModelsAndRecommendations(editingId, {
      forceReevaluate: true,
      baseUrlOverride: effectiveBaseUrl,
      apiPathOverride: effectiveApiPath,
    });
  }, [editingId, effectiveBaseUrl, effectiveApiPath, refreshProviderModelsAndRecommendations]);

  const handleDisconnect = useCallback(() => {
    clearAuth(editingId);
  }, [editingId, clearAuth]);

  const handleSetDefaultProvider = useCallback(() => {
    if (isActive) return;
    setActiveProvider(editingId);
    setAuthSuccess(interpolate(providerMessages.defaultProviderSuccess, { provider: def.name }));
  }, [def.name, editingId, isActive, providerMessages.defaultProviderSuccess, setActiveProvider, setAuthSuccess]);

  const keyFormId = `provider-key-form-${editingId}`;

  const handleKeyFormSubmit = useCallback(
    (event: SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isConnected) {
        void handleUpdateKey();
        return;
      }

      void handleConnect();
    },
    [handleConnect, handleUpdateKey, isConnected],
  );

  const handleOAuth = useCallback(async () => {
    setOauthLoading(true);
    try {
      await startOAuthFlow(editingId);
    } catch (e) {
      setAuthError((e as Error).message);
      setOauthLoading(false);
    }
  }, [editingId, setAuthError]);

  const loading = connectLoading || modelsLoading;

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800">{providerMessages.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {isConnected && (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {providerMessages.connected}
            </span>
          )}
          {isConnected && isActive && (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
              <Star className="w-2.5 h-2.5 fill-indigo-500" />
              {providerMessages.defaultBadge}
            </span>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {providerMessages.providerLabel}
          </p>
          <ProviderCombobox
            value={editingId}
            providers={providers}
            onSelect={switchEditingProvider}
            isActive={isActive}
            onSetDefault={handleSetDefaultProvider}
          />
        </div>

        {/* ── Ollama Warning Banner ────────────────────────────────────────── */}
        {editingId === 'ollama' && <OllamaWarningBanner className="mb-4" />}

        <div className="space-y-1.5">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <ProviderIconBadge id={editingId} className="h-8 w-8 rounded-lg text-xs" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">{def.name}</p>
                {isActive && (
                  <span className="rounded-full border border-indigo-200 bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                    {providerMessages.defaultBadge}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">{def.description}</p>
            </div>
          </div>
        </div>

        {/* ── API Key (hidden for local providers) ─────────────────────────── */}
        {!def.noKeyRequired && (
          <form id={keyFormId} className="space-y-1.5" onSubmit={handleKeyFormSubmit}>
            <div className="flex items-center justify-between">
              <label
                htmlFor="provider-api-key"
                className="text-xs font-semibold text-slate-500 uppercase tracking-wide"
              >
                {providerMessages.apiKeyLabel}
              </label>
              {isConnected && maskedKey && (
                <span className="text-[11px] text-emerald-600 flex items-center gap-1">
                  <Check className="w-3 h-3" /> {providerMessages.connected}
                </span>
              )}
            </div>
            <div className="relative">
              <Input
                id="provider-api-key"
                type={showKey ? 'text' : 'password'}
                placeholder={isConnected && maskedKey ? maskedKey : def.apiKeyPlaceholder}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="h-11 pr-10 border-slate-200 bg-slate-50 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? providerMessages.hideApiKey : providerMessages.showApiKey}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                tabIndex={-1}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <a
              href={def.apiKeyHelpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-600 transition-colors w-fit"
            >
              <KeyRound className="w-3 h-3" />
              {providerMessages.getApiKey}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </form>
        )}

        {/* ── API URL ──────────────────────────────────────────────────────── */}
        {(def.baseUrlEditable || def.baseUrl) && (
          <div className="space-y-1.5">
            <label htmlFor="provider-base-url" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {providerMessages.apiUrlLabel}
            </label>
            <Input
              id="provider-base-url"
              value={effectiveBaseUrl}
              onChange={(e) => {
                const newValue = e.target.value;
                if (def.baseUrlEditable) {
                  setBaseUrl(editingId, newValue);
                }
              }}
              placeholder={def.baseUrl ?? 'https://...'}
              className="h-11 border-slate-200 bg-slate-50 font-mono text-sm"
              readOnly={!def.baseUrlEditable}
            />
            <p className="text-[11px] text-slate-400">
              {def.baseUrlEditable ? providerMessages.customApiEndpointHelp : providerMessages.defaultApiEndpointHelp}
            </p>
          </div>
        )}

        {/* ── API URL Path ─────────────────────────────────────────────────── */}
        {def.apiPath && (
          <div className="space-y-1.5">
            <label htmlFor="provider-api-path" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {providerMessages.apiUrlPathLabel}
            </label>
            <Input
              id="provider-api-path"
              value={effectiveApiPath}
              onChange={(e) => {
                setApiPath(editingId, e.target.value);
              }}
              placeholder={def.apiPath}
              className="h-11 border-slate-200 bg-slate-50 font-mono text-sm"
            />
            <p className="text-[11px] text-slate-400">
              {providerMessages.apiUrlPathDefaultLabel} <code className="font-mono text-slate-500">{def.apiPath}</code>.{' '}
              {providerMessages.apiUrlPathHelp}
            </p>
          </div>
        )}

        {/* ── No model API checkbox ─────────────────────────────────────────── */}
        {!def.noKeyRequired && (
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                checked={noModelApi}
                onChange={(e) => setNoModelApi(editingId, e.target.checked)}
                className="sr-only peer"
              />
              <div
                className={cn(
                  'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
                  noModelApi
                    ? 'bg-indigo-600 border-indigo-600'
                    : 'border-slate-300 bg-white group-hover:border-slate-400',
                )}
              >
                {noModelApi && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">{providerMessages.noModelApiSupportTitle}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                {providerMessages.noModelApiSupportDescription}
              </p>
            </div>
          </label>
        )}

        {/* ── Model selector ─────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{providerMessages.modelLabel}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <ModelCombobox
              models={models}
              recommendations={cachedRecommendations}
              selectedModelId={config.selectedModelId}
              onSelect={(id) => setSelectedModel(editingId, id)}
              disabled={serviceUnavailable && !noModelApi}
            />

            {isConnected && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => void handleRefreshModels()}
                disabled={modelsLoading || noModelApi}
                className="h-9 w-9 shrink-0 border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer"
                title={providerMessages.refreshModelList}
              >
                <RefreshCw className={cn('w-3.5 h-3.5 text-slate-500', modelsLoading && 'animate-spin')} />
              </Button>
            )}
          </div>
          {selectedModel?.description && <p className="text-[11px] text-slate-400">{selectedModel.description}</p>}

          {/* Service unavailable warning */}
          {serviceUnavailable && !noModelApi && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800"
            >
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-amber-900">{providerMessages.providerUnavailableTitle}</p>
                <p className="mt-0.5 leading-relaxed">{providerMessages.providerUnavailableDescription}</p>
              </div>
              <button
                type="button"
                onClick={() => void handleRefreshModels()}
                disabled={modelsLoading}
                className="shrink-0 mt-0.5 rounded-md border border-amber-300 bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-200 cursor-pointer transition-colors disabled:opacity-50"
              >
                {modelsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : providerMessages.retry}
              </button>
            </div>
          )}

          {/* Set as default provider + model */}
          {isConnected && !isActive && (
            <button
              type="button"
              onClick={handleSetDefaultProvider}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/50 px-3 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100 cursor-pointer transition-colors"
            >
              <Star className="h-3 w-3" />
              {interpolate(providerMessages.useAsDefault, {
                provider: def.name,
                model: selectedModel?.name ?? selectedModel?.id ?? '',
              })}
            </button>
          )}
          {isConnected && isActive && (
            <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-xs text-emerald-700">
              <Check className="h-3 w-3" />
              {interpolate(providerMessages.currentlyUsingDefault, {
                model: selectedModel?.name ?? selectedModel?.id ?? '',
              })}
            </div>
          )}
        </div>

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <div className="space-y-2 pt-1">
          {/* OAuth button */}
          {supportsOAuth && !isConnected && (
            <button
              type="button"
              onClick={() => void handleOAuth()}
              disabled={oauthLoading}
              className={cn(
                'w-full h-11 flex items-center justify-center gap-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors disabled:opacity-60',
                style.btn,
              )}
            >
              {oauthLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {interpolate(providerMessages.signInWith, { provider: def.name })}
            </button>
          )}

          {/* Connect / Update Key / Reconnect */}
          {def.noKeyRequired ? (
            <button
              type="button"
              onClick={() => void handleConnect()}
              disabled={loading}
              className={cn(
                'w-full h-11 flex items-center justify-center gap-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors disabled:opacity-60',
                style.btn,
              )}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {isConnected
                ? interpolate(providerMessages.reconnectTo, { provider: def.name })
                : interpolate(providerMessages.connectTo, { provider: def.name })}
            </button>
          ) : !isConnected ? (
            <button
              type="submit"
              form={keyFormId}
              disabled={!apiKeyInput.trim() || loading}
              className={cn(
                'w-full h-11 flex items-center justify-center gap-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
                style.btn,
              )}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {providerMessages.connect}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {apiKeyInput.trim() && (
                <button
                  type="submit"
                  form={keyFormId}
                  disabled={loading}
                  className={cn(
                    'flex-1 h-10 flex items-center justify-center gap-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors disabled:opacity-60',
                    style.btn,
                  )}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {providerMessages.updateKey}
                </button>
              )}
              <button
                type="button"
                onClick={handleDisconnect}
                className="h-10 px-3 flex items-center gap-1.5 rounded-lg text-sm text-slate-400 hover:text-rose-500 hover:bg-rose-50 cursor-pointer transition-colors border border-slate-200"
              >
                <LogOut className="w-3.5 h-3.5" />
                {providerMessages.disconnect}
              </button>
            </div>
          )}
        </div>

        {/* ── Auth type display ─────────────────────────────────────────────── */}
        {isConnected && config?.auth.type === 'oauth' && (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
            <Zap className="w-3 h-3" />
            {providerMessages.authenticatedViaOAuth}
            <button
              type="button"
              onClick={handleDisconnect}
              className="ml-auto text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Account Section ────────────────────────────────────────────────────────────

function AccountSection() {
  const { messages: settingsMessages } = useI18n('settings');
  const accountMessages = settingsMessages.account;
  const [user, setUser] = useState<{ id: string; email?: string; avatar_url?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const {
    status: syncStatus,
    lastSyncedAt,
    isSyncEnabled,
    triggerFullSync,
    triggerIncrementalSync,
    setSyncEnabled,
    hydrate: hydrateSync,
  } = useSyncStore();

  useEffect(() => {
    hydrateSync();
    const fetchUser = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (authUser) {
          setUser({
            id: authUser.id,
            email: authUser.email,
            avatar_url: authUser.user_metadata?.avatar_url as string | undefined,
          });
        }
      } catch {
        // not authenticated
      } finally {
        setLoading(false);
      }
    };
    void fetchUser();
  }, [hydrateSync]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setUser(null);
      setSyncEnabled(false);
    } finally {
      setSigningOut(false);
    }
  };

  const handleSyncNow = async () => {
    if (lastSyncedAt) {
      await triggerIncrementalSync();
    } else {
      await triggerFullSync();
    }
  };

  const formatLastSynced = (iso: string | null): string => {
    if (!iso) return accountMessages.never;
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);

    if (diffMin < 1) return accountMessages.justNow;
    if (diffMin < 60) return interpolate(accountMessages.minutesAgo, { count: diffMin });
    if (diffHour < 24) return interpolate(accountMessages.hoursAgo, { count: diffHour });
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
          <User className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800">{accountMessages.title}</h2>
        </div>
        <div className="p-5 flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
        <User className="w-4 h-4 text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-800">{accountMessages.title}</h2>
      </div>
      <div className="p-5 space-y-4">
        {user ? (
          <>
            {/* User info */}
            <div className="flex items-center gap-3">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={accountMessages.avatarAlt}
                  className="w-10 h-10 rounded-full border border-slate-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-indigo-600" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {user.email ?? accountMessages.fallbackUser}
                </p>
                <p className="text-xs text-slate-400">{accountMessages.signedIn}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleSignOut()}
                disabled={signingOut}
                className="shrink-0 text-xs cursor-pointer"
              >
                {signingOut ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <LogOut className="w-3 h-3 mr-1" />}
                {accountMessages.signOut}
              </Button>
            </div>

            {/* Sync settings */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isSyncEnabled ? (
                    <Cloud className="w-4 h-4 text-indigo-500" />
                  ) : (
                    <CloudOff className="w-4 h-4 text-slate-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-700">{accountMessages.cloudSyncTitle}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{accountMessages.cloudSyncDescription}</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isSyncEnabled}
                  onClick={() => setSyncEnabled(!isSyncEnabled)}
                  className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
                    isSyncEnabled ? 'bg-indigo-600' : 'bg-slate-200',
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200',
                      isSyncEnabled ? 'translate-x-6' : 'translate-x-1',
                    )}
                  />
                </button>
              </div>

              {isSyncEnabled && (
                <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
                  <div>
                    <p className="text-xs text-slate-500">
                      {accountMessages.lastSynced}{' '}
                      <span className="font-medium text-slate-700">{formatLastSynced(lastSyncedAt)}</span>
                    </p>
                    {syncStatus === 'error' && (
                      <p className="text-[11px] text-rose-500 mt-0.5">{accountMessages.syncError}</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleSyncNow()}
                    disabled={syncStatus === 'syncing'}
                    className="text-xs cursor-pointer"
                  >
                    {syncStatus === 'syncing' ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <RefreshCw className="w-3 h-3 mr-1" />
                    )}
                    {accountMessages.syncNow}
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4">
            <CloudOff className="w-8 h-8 text-slate-300" />
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700">{accountMessages.signInToSync}</p>
              <p className="text-xs text-slate-400 mt-0.5">{accountMessages.keepProgress}</p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              {accountMessages.signIn}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({
  value,
  onChange,
  ariaLabel,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={ariaLabel}
      onClick={() => onChange(!value)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
        value ? 'bg-indigo-600' : 'bg-slate-200',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200',
          value ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  );
}

// ─── Main settings content ────────────────────────────────────────────────────

function SettingsContent() {
  const { messages: settingsMessages, interfaceLanguage } = useI18n('settings');
  const providerMessages = settingsMessages.provider;
  const voiceMessages = settingsMessages.voice;
  const translationMessages = settingsMessages.translation;
  const smartCollectionMessages = settingsMessages.smartCollection;
  const recommendationMessages = settingsMessages.recommendations;
  const shadowReadingMessages = settingsMessages.shadowReading;
  const pronunciationMessages = settingsMessages.pronunciation;
  const searchParams = useSearchParams();
  const { setAuth, hydrate: hydrateProviders } = useProviderStore();
  const {
    voiceSource,
    setVoiceSource,
    speed,
    pitch,
    volume,
    setSpeed,
    setPitch,
    setVolume,
    fishApiKey,
    setFishApiKey,
    fishModel,
    setFishModel,
    kokoroServerUrl,
    setKokoroServerUrl,
    kokoroApiKey,
    setKokoroApiKey,
    targetLang,
    setTargetLang,
    recommendationsEnabled,
    recommendationsCount,
    setRecommendationsEnabled,
    setRecommendationsCount,
    shadowReadingEnabled,
    setShadowReadingEnabled,
  } = useTTSStore();
  const practiceTranslationVisibility = usePracticeTranslationStore((s) => s.visibility);
  const setPracticeTranslationVisible = usePracticeTranslationStore((s) => s.setVisible);

  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [oauthSuccessProvider, setOauthSuccessProvider] = useState<ProviderId | undefined>();
  const [showFishKey, setShowFishKey] = useState(false);
  const [showKokoroKey, setShowKokoroKey] = useState(false);

  const {
    speechSuperAppKey,
    speechSuperSecretKey,
    monthlyLimit,
    provider: pronunciationProvider,
    setSpeechSuperAppKey,
    setSpeechSuperSecretKey,
    setMonthlyLimit,
    setProvider: setPronunciationProvider,
    hydrate: hydratePronunciation,
  } = usePronunciationStore();
  const [showSpeechSuperKey, setShowSpeechSuperKey] = useState(false);
  const [showSpeechSuperSecret, setShowSpeechSuperSecret] = useState(false);
  const fishAudioModels = getLocalizedFishAudioModels(interfaceLanguage);
  const languageOptions = [
    { value: 'zh-CN', label: translationMessages.languageOptions.zhCN },
    { value: 'ja', label: translationMessages.languageOptions.ja },
    { value: 'ko', label: translationMessages.languageOptions.ko },
    { value: 'es', label: translationMessages.languageOptions.es },
    { value: 'fr', label: translationMessages.languageOptions.fr },
    { value: 'de', label: translationMessages.languageOptions.de },
    { value: 'pt', label: translationMessages.languageOptions.pt },
    { value: 'ru', label: translationMessages.languageOptions.ru },
  ] as const;

  const selectionTranslateEnabled = useFavoriteStore((s) => s.selectionTranslateEnabled);
  const setSelectionTranslateEnabled = useFavoriteStore((s) => s.setSelectionTranslateEnabled);
  const autoCollectSettings = useFavoriteStore((s) => s.autoCollectSettings);
  const setAutoCollectSettings = useFavoriteStore((s) => s.setAutoCollectSettings);

  useEffect(() => {
    void hydrateProviders();
    hydratePronunciation();
  }, [hydrateProviders, hydratePronunciation]);

  // Handle OAuth callback redirect
  useEffect(() => {
    const error = searchParams.get('auth_error');
    if (error) {
      queueMicrotask(() => setAuthError(decodeURIComponent(error)));
      window.history.replaceState({}, '', '/settings');
      return;
    }

    const authCode = searchParams.get('auth_code');
    const authProvider = searchParams.get('auth_provider') as ProviderId | null;
    if (!authCode || !authProvider) return;

    const storedState = getStoredOAuthState();
    if (!storedState || storedState.provider !== authProvider) {
      queueMicrotask(() => setAuthError(providerMessages.oauthStateMismatch));
      clearOAuthStorage();
      window.history.replaceState({}, '', '/settings');
      return;
    }

    const verifier = getStoredVerifier();
    clearOAuthStorage();
    window.history.replaceState({}, '', '/settings');

    fetch('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerId: authProvider,
        code: authCode,
        codeVerifier: verifier,
        redirectUri: `${window.location.origin}/api/auth/callback`,
      }),
    })
      .then((r) => r.json())
      .then((data: { accessToken?: string; refreshToken?: string; expiresIn?: number; error?: string }) => {
        if (data.error) {
          setAuthError(data.error);
        } else if (data.accessToken) {
          setAuth(authProvider, {
            type: 'oauth',
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            expiresAt: data.expiresIn ? Date.now() + data.expiresIn * 1000 : undefined,
          });
          setOauthSuccessProvider(authProvider);
          setAuthSuccess(
            interpolate(providerMessages.oauthConnectedSuccess, {
              provider: PROVIDER_REGISTRY[authProvider].name,
            }),
          );
        }
      })
      .catch(() => setAuthError(providerMessages.tokenExchangeFailed));
  }, [
    providerMessages.oauthConnectedSuccess,
    providerMessages.oauthStateMismatch,
    providerMessages.tokenExchangeFailed,
    searchParams,
    setAuth,
  ]);

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-[var(--font-poppins)]">{settingsMessages.page.title}</h1>
        <p className="mt-0.5 text-sm text-slate-400">{settingsMessages.page.subtitle}</p>
      </div>

      {/* OAuth feedback */}
      {authError && (
        <div className="flex items-start gap-3 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="flex-1">{authError}</span>
          <button
            type="button"
            onClick={() => setAuthError(null)}
            className="opacity-60 hover:opacity-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {authSuccess && (
        <div className="flex items-start gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          <Check className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="flex-1">{authSuccess}</span>
          <button
            type="button"
            onClick={() => setAuthSuccess(null)}
            className="opacity-60 hover:opacity-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Account & Cloud Sync */}
      <AccountSection />

      {/* English Level Assessment */}
      <AssessmentSection />

      {/* Appearance */}
      <AppearanceSection />

      {/* Language */}
      <LanguageSection />

      {/* AI Provider */}
      <AIProviderSection
        setAuthError={setAuthError}
        setAuthSuccess={setAuthSuccess}
        highlightProviderId={oauthSuccessProvider}
      />

      {/* Voice & Speech */}
      <Section title={settingsMessages.sections.voiceAndSpeech} icon={Volume2}>
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">{voiceMessages.sourceTitle}</p>
            <div className="grid gap-2 md:grid-cols-3">
              {[
                {
                  id: 'browser' as const,
                  title: voiceMessages.browserTitle,
                  description: voiceMessages.browserDescription,
                },
                {
                  id: 'fish' as const,
                  title: voiceMessages.fishTitle,
                  description: voiceMessages.fishDescription,
                },
                {
                  id: 'kokoro' as const,
                  title: voiceMessages.kokoroTitle,
                  description: voiceMessages.kokoroDescription,
                },
              ].map((option) => (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => setVoiceSource(option.id)}
                  className={cn(
                    'rounded-xl border p-3 text-left transition-colors cursor-pointer',
                    voiceSource === option.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-200 bg-white hover:border-indigo-200',
                  )}
                >
                  <p className="text-sm font-semibold text-slate-800">{option.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          {voiceSource === 'browser' && (
            <Accordion type="single" collapsible className="rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4">
              <AccordionItem value="system-voices" className="border-b-0">
                <AccordionTrigger className="py-4 hover:no-underline">
                  <div className="pr-4 text-left">
                    <p className="text-sm font-semibold text-indigo-950">{voiceMessages.downloadMoreVoicesTitle}</p>
                    <p className="mt-1 text-xs font-normal leading-relaxed text-indigo-700">
                      {voiceMessages.downloadMoreVoicesDescription}
                    </p>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pb-4">
                  <div className="flex justify-end">
                    <a
                      href="https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/getVoices"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                    >
                      {voiceMessages.apiDocs}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-white/80 bg-white/80 p-3">
                      <p className="text-sm font-medium text-slate-800">{voiceMessages.macOs}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">{voiceMessages.macGuideDescription}</p>
                      <a
                        href="https://support.apple.com/en-lamr/guide/mac-help/mchlp2290/mac"
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:text-indigo-800"
                      >
                        {voiceMessages.appleGuide}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="rounded-xl border border-white/80 bg-white/80 p-3">
                      <p className="text-sm font-medium text-slate-800">{voiceMessages.windows11}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        {voiceMessages.windowsGuideDescription}
                      </p>
                      <a
                        href="https://support.microsoft.com/en-us/windows/appendix-a-supported-languages-and-voices-4486e345-7730-53da-fcfe-55cc64300f01"
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:text-indigo-800"
                      >
                        {voiceMessages.microsoftGuide}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {voiceSource === 'fish' && (
            <div className="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-indigo-950">{voiceMessages.fishCloudVoicesTitle}</p>
                  <p className="mt-1 text-xs leading-relaxed text-indigo-700">
                    {voiceMessages.fishCloudVoicesDescription}
                  </p>
                </div>
                <a
                  href="https://fish.audio/app/usage/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                >
                  {voiceMessages.usage}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">{voiceMessages.fishApiKeyLabel}</p>
                <div className="relative">
                  <Input
                    type={showFishKey ? 'text' : 'password'}
                    value={fishApiKey}
                    onChange={(e) => setFishApiKey(e.target.value)}
                    placeholder={voiceMessages.fishApiKeyPlaceholder}
                    className="pr-10 bg-white border-indigo-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFishKey((value) => !value)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label={showFishKey ? voiceMessages.hideFishApiKey : voiceMessages.showFishApiKey}
                  >
                    {showFishKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">{voiceMessages.fishModelLabel}</p>
                <Select value={fishModel} onValueChange={setFishModel}>
                  <SelectTrigger className="w-full border-indigo-200 bg-white cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fishAudioModels.map((model) => (
                      <SelectItem key={model.id} value={model.id} className="cursor-pointer">
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-indigo-700">
                  {fishAudioModels.find((model) => model.id === fishModel)?.description}
                </p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800">
                {voiceMessages.browserFallbackWarning}
              </div>
            </div>
          )}

          {voiceSource === 'kokoro' && (
            <div className="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-indigo-950">{voiceMessages.kokoroRemoteVoicesTitle}</p>
                  <p className="mt-1 text-xs leading-relaxed text-indigo-700">
                    {voiceMessages.kokoroRemoteVoicesDescription}
                  </p>
                </div>
                <a
                  href={`${kokoroServerUrl.replace(/\/+$/, '')}/v1/audio/voices`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                >
                  {voiceMessages.voicesApi}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">{voiceMessages.kokoroServerUrlLabel}</p>
                <Input
                  value={kokoroServerUrl}
                  onChange={(e) => setKokoroServerUrl(e.target.value)}
                  placeholder="http://54.166.253.41:8880"
                  className="bg-white border-indigo-200"
                />
                <p className="text-[11px] text-indigo-700">{voiceMessages.kokoroServerUrlHelp}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">{voiceMessages.kokoroApiKeyLabel}</p>
                <div className="relative">
                  <Input
                    type={showKokoroKey ? 'text' : 'password'}
                    value={kokoroApiKey}
                    onChange={(e) => setKokoroApiKey(e.target.value)}
                    placeholder={voiceMessages.kokoroApiKeyPlaceholder}
                    className="pr-10 bg-white border-indigo-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKokoroKey((value) => !value)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label={showKokoroKey ? voiceMessages.hideKokoroApiKey : voiceMessages.showKokoroApiKey}
                  >
                    {showKokoroKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800">
                {voiceMessages.browserFallbackWarning}
              </div>
            </div>
          )}

          <VoicePicker />
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-700">{voiceMessages.speed}</p>
              <span className="text-xs font-mono text-slate-500">{speed.toFixed(1)}x</span>
            </div>
            <Slider value={[speed]} onValueChange={(v) => setSpeed(v[0])} min={0.5} max={2.0} step={0.1} />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>{voiceMessages.speedSlow}</span>
              <span>{voiceMessages.speedNormal}</span>
              <span>{voiceMessages.speedFast}</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-700">{voiceMessages.pitch}</p>
              <span className="text-xs font-mono text-slate-500">{pitch.toFixed(1)}</span>
            </div>
            <Slider value={[pitch]} onValueChange={(v) => setPitch(v[0])} min={0.5} max={2.0} step={0.1} />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>{voiceMessages.pitchLow}</span>
              <span>{voiceMessages.pitchNormal}</span>
              <span>{voiceMessages.pitchHigh}</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-700">{voiceMessages.volume}</p>
              <span className="text-xs font-mono text-slate-500">{Math.round(volume * 100)}%</span>
            </div>
            <Slider value={[volume]} onValueChange={(v) => setVolume(v[0])} min={0} max={1} step={0.1} />
          </div>
        </div>
      </Section>

      {/* Translation */}
      <Section title={settingsMessages.sections.translation} icon={Languages}>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">{translationMessages.targetLanguage}</p>
            <Select value={targetLang} onValueChange={setTargetLang}>
              <SelectTrigger className="w-full border-slate-200 cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map((l) => (
                  <SelectItem key={l.value} value={l.value} className="cursor-pointer">
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="space-y-3">
              {PRACTICE_TRANSLATION_MODULES.map((module) => {
                const isVisible = practiceTranslationVisibility[module];
                const defaultVisible = PRACTICE_TRANSLATION_POLICY[module].defaultVisible;
                const label = translationMessages[`${module}Label` as keyof typeof translationMessages] as string;
                const description = translationMessages[
                  `${module}Description` as keyof typeof translationMessages
                ] as string;

                return (
                  <div
                    key={module}
                    className={cn(
                      'flex items-center justify-between gap-4',
                      module !== 'write' && 'border-b border-slate-200/70 pb-3',
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-slate-700">{label}</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            'border-slate-200 bg-white text-[10px] uppercase tracking-wide',
                            defaultVisible ? 'text-emerald-700' : 'text-slate-500',
                          )}
                        >
                          {defaultVisible ? translationMessages.defaultOn : translationMessages.defaultOff}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{description}</p>
                    </div>
                    <Toggle
                      value={isVisible}
                      onChange={(visible) => setPracticeTranslationVisible(module, visible)}
                      ariaLabel={interpolate(translationMessages.visibilityLabel, { module: label })}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-xs text-slate-400">{translationMessages.footer}</p>
        </div>
      </Section>

      {/* Smart Collection */}
      <Section title={settingsMessages.sections.smartCollection} icon={Star}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">{smartCollectionMessages.selectionTitle}</p>
              <p className="text-xs text-slate-400 mt-0.5">{smartCollectionMessages.selectionDescription}</p>
            </div>
            <Toggle value={selectionTranslateEnabled} onChange={setSelectionTranslateEnabled} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">{smartCollectionMessages.autoSaveTitle}</p>
              <p className="text-xs text-slate-400 mt-0.5">{smartCollectionMessages.autoSaveDescription}</p>
            </div>
            <Toggle value={autoCollectSettings.enabled} onChange={(v) => setAutoCollectSettings({ enabled: v })} />
          </div>
          {autoCollectSettings.enabled && (
            <>
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">{smartCollectionMessages.sensitivity}</p>
                <div className="flex gap-2">
                  {(
                    [
                      { value: 'low', label: smartCollectionMessages.low },
                      { value: 'medium', label: smartCollectionMessages.medium },
                      { value: 'high', label: smartCollectionMessages.high },
                    ] as const
                  ).map((opt) => (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => setAutoCollectSettings({ sensitivity: opt.value })}
                      className={cn(
                        'px-4 py-1.5 rounded-lg text-sm font-medium border cursor-pointer transition-all duration-150',
                        autoCollectSettings.sensitivity === opt.value
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">{smartCollectionMessages.dailyCap}</p>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={autoCollectSettings.dailyCap}
                  onChange={(e) => setAutoCollectSettings({ dailyCap: Number(e.target.value) || 1 })}
                  className="w-24 border-slate-200"
                />
              </div>
            </>
          )}
        </div>
      </Section>

      {/* Recommendations */}
      <Section title={settingsMessages.sections.recommendations} icon={Sparkles}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">{recommendationMessages.enableTitle}</p>
              <p className="text-xs text-slate-400 mt-0.5">{recommendationMessages.enableDescription}</p>
            </div>
            <Toggle value={recommendationsEnabled} onChange={setRecommendationsEnabled} />
          </div>
          {recommendationsEnabled && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">{recommendationMessages.resultsCount}</p>
              <div className="flex gap-2">
                {[3, 5, 10].map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => setRecommendationsCount(n)}
                    className={cn(
                      'px-4 py-1.5 rounded-lg text-sm font-medium border cursor-pointer transition-all duration-150',
                      recommendationsCount === n
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300',
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>
      {/* Shadow Reading */}
      <Section title={settingsMessages.sections.shadowReading} icon={Repeat}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">{shadowReadingMessages.enableTitle}</p>
              <p className="text-xs text-slate-400 mt-0.5">{shadowReadingMessages.enableDescription}</p>
            </div>
            <Toggle value={shadowReadingEnabled} onChange={setShadowReadingEnabled} />
          </div>
          <div className="rounded-lg bg-indigo-50/70 border border-indigo-100 px-4 py-3 space-y-1.5">
            <p className="text-xs text-indigo-700 leading-relaxed">{shadowReadingMessages.overview}</p>
            <p className="text-[11px] text-indigo-400 leading-relaxed">{shadowReadingMessages.speakNote}</p>
          </div>
        </div>
      </Section>

      {/* Pronunciation Assessment */}
      <Section title={settingsMessages.sections.pronunciation} icon={Mic}>
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">{pronunciationMessages.assessmentProvider}</p>
            <div className="grid gap-2 md:grid-cols-3">
              {[
                {
                  id: 'auto' as const,
                  title: pronunciationMessages.autoTitle,
                  description: pronunciationMessages.autoDescription,
                },
                {
                  id: 'speechsuper' as const,
                  title: pronunciationMessages.speechsuperTitle,
                  description: pronunciationMessages.speechsuperDescription,
                },
                {
                  id: 'ai' as const,
                  title: pronunciationMessages.aiOnlyTitle,
                  description: pronunciationMessages.aiOnlyDescription,
                },
              ].map((option) => (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => setPronunciationProvider(option.id)}
                  className={cn(
                    'rounded-xl border p-3 text-left transition-colors cursor-pointer',
                    pronunciationProvider === option.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-200 bg-white hover:border-indigo-200',
                  )}
                >
                  <p className="text-sm font-semibold text-slate-800">{option.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          {pronunciationProvider !== 'ai' && (
            <div className="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
              <div>
                <p className="text-sm font-semibold text-indigo-950">{pronunciationMessages.speechSuperTitle}</p>
                <p className="mt-1 text-xs leading-relaxed text-indigo-700">
                  {pronunciationMessages.speechSuperDescription}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">{pronunciationMessages.appKey}</p>
                <div className="relative">
                  <Input
                    type={showSpeechSuperKey ? 'text' : 'password'}
                    value={speechSuperAppKey}
                    onChange={(e) => setSpeechSuperAppKey(e.target.value)}
                    placeholder={pronunciationMessages.appKeyPlaceholder}
                    className="pr-10 bg-white border-indigo-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSpeechSuperKey((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label={
                      showSpeechSuperKey ? pronunciationMessages.hideAppKey : pronunciationMessages.showAppKey
                    }
                  >
                    {showSpeechSuperKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">{pronunciationMessages.secretKey}</p>
                <div className="relative">
                  <Input
                    type={showSpeechSuperSecret ? 'text' : 'password'}
                    value={speechSuperSecretKey}
                    onChange={(e) => setSpeechSuperSecretKey(e.target.value)}
                    placeholder={pronunciationMessages.secretKeyPlaceholder}
                    className="pr-10 bg-white border-indigo-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSpeechSuperSecret((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label={
                      showSpeechSuperSecret ? pronunciationMessages.hideSecretKey : pronunciationMessages.showSecretKey
                    }
                  >
                    {showSpeechSuperSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">{pronunciationMessages.monthlyLimit}</p>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={monthlyLimit}
                    onChange={(e) => setMonthlyLimit(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-32 bg-white border-indigo-200"
                    min={0}
                  />
                  <span className="text-xs text-indigo-700">{pronunciationMessages.callsPerMonth}</span>
                </div>
              </div>

              <a
                href="https://www.speechsuper.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 transition-colors w-fit"
              >
                <KeyRound className="w-3 h-3" />
                {pronunciationMessages.getApiKeys}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          )}

          <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-500 leading-relaxed">{pronunciationMessages.summary}</p>
          </div>
        </div>
      </Section>

      {/* Keyboard Shortcuts */}
      <Section title={settingsMessages.sections.keyboardShortcuts} icon={Keyboard}>
        <ShortcutSettings />
      </Section>

      {/* Data Backup */}
      <Section title={settingsMessages.sections.dataBackup} icon={Database}>
        <DataBackup />
      </Section>

      {/* Tag Management */}
      <Section title={settingsMessages.sections.tagManagement} icon={Tag}>
        <TagManagement />
      </Section>

      {/* About */}
      <AboutSection />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}

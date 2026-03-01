'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Volume2, Sparkles, Languages, ExternalLink,
  Check, X, Loader2, KeyRound, LogIn, LogOut, AlertCircle, Zap,
  Eye, EyeOff, RefreshCw, Repeat, Database,
} from 'lucide-react';
import { useTTSStore } from '@/stores/tts-store';
import { useProviderStore } from '@/stores/provider-store';
import { VoicePicker } from '@/components/voice-picker';
import { OllamaWarningBanner } from '@/components/ollama/ollama-warning-banner';
import {
  PROVIDER_REGISTRY, PROVIDER_GROUPS,
  type ProviderId, type ProviderModel,
} from '@/lib/providers';
import { startOAuthFlow, getStoredOAuthState, getStoredVerifier, clearOAuthStorage } from '@/lib/oauth';
import { cn } from '@/lib/utils';
import { AssessmentSection } from '@/components/assessment/assessment-section';
import { DataBackup } from '@/components/settings/data-backup';

// ─── Provider brand styles ────────────────────────────────────────────────────

const PROVIDER_STYLE: Partial<Record<ProviderId, { icon: string; btn: string }>> = {
  openai:      { icon: 'bg-[#10a37f]/10 text-[#10a37f]',    btn: 'bg-[#10a37f] hover:bg-[#0d9068] text-white' },
  anthropic:   { icon: 'bg-[#d97706]/10 text-[#d97706]',    btn: 'bg-[#d97706] hover:bg-[#b45309] text-white' },
  google:      { icon: 'bg-[#4285f4]/10 text-[#4285f4]',    btn: 'bg-[#4285f4] hover:bg-[#3367d6] text-white' },
  deepseek:    { icon: 'bg-[#0ea5e9]/10 text-[#0ea5e9]',    btn: 'bg-[#0ea5e9] hover:bg-[#0284c7] text-white' },
  xai:         { icon: 'bg-slate-900/10 text-slate-800',     btn: 'bg-slate-900 hover:bg-slate-800 text-white' },
  groq:        { icon: 'bg-[#f55036]/10 text-[#f55036]',    btn: 'bg-[#f55036] hover:bg-[#d93d26] text-white' },
  cerebras:    { icon: 'bg-[#7c3aed]/10 text-[#7c3aed]',    btn: 'bg-[#7c3aed] hover:bg-[#6d28d9] text-white' },
  mistral:     { icon: 'bg-[#ff7000]/10 text-[#ff7000]',    btn: 'bg-[#ff7000] hover:bg-[#e06300] text-white' },
  cohere:      { icon: 'bg-[#39594d]/10 text-[#39594d]',    btn: 'bg-[#39594d] hover:bg-[#2d4a3e] text-white' },
  perplexity:  { icon: 'bg-[#20808d]/10 text-[#20808d]',    btn: 'bg-[#20808d] hover:bg-[#1a6b78] text-white' },
  togetherai:  { icon: 'bg-[#0f172a]/10 text-[#0f172a]',    btn: 'bg-[#0f172a] hover:bg-[#1e293b] text-white' },
  deepinfra:   { icon: 'bg-violet-500/10 text-violet-600',   btn: 'bg-violet-600 hover:bg-violet-700 text-white' },
  fireworks:   { icon: 'bg-purple-500/10 text-purple-600',   btn: 'bg-purple-600 hover:bg-purple-700 text-white' },
  openrouter:  { icon: 'bg-rose-500/10 text-rose-600',       btn: 'bg-rose-600 hover:bg-rose-700 text-white' },
  zai:         { icon: 'bg-blue-500/10 text-blue-600',       btn: 'bg-blue-600 hover:bg-blue-700 text-white' },
  minimax:     { icon: 'bg-indigo-500/10 text-indigo-600',   btn: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
  moonshotai:  { icon: 'bg-slate-700/10 text-slate-700',     btn: 'bg-slate-700 hover:bg-slate-800 text-white' },
  siliconflow: { icon: 'bg-cyan-500/10 text-cyan-600',       btn: 'bg-cyan-600 hover:bg-cyan-700 text-white' },
  ollama:      { icon: 'bg-emerald-500/10 text-emerald-600', btn: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  lmstudio:    { icon: 'bg-amber-500/10 text-amber-600',     btn: 'bg-amber-600 hover:bg-amber-700 text-white' },
};

const PROVIDER_ICON: Partial<Record<ProviderId, React.ReactNode>> = {
  openai: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
    </svg>
  ),
  anthropic: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M17.304 3.541 13.766 13.5h-3.53L6.696 3.541H3.541L8.43 16.773h7.14l4.889-13.232zM.386 20.459h23.228v-1.8H.386z"/>
    </svg>
  ),
  google: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
    </svg>
  ),
  deepseek: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M23.748 11.784c-.137-.048-.276-.09-.418-.124a6.998 6.998 0 0 0-.143-.035c.006-.09.011-.18.011-.272.001-3.41-2.317-6.42-5.636-7.21-.17-.041-.34-.073-.514-.1-.41-.065-.824-.087-1.236-.065-.265.014-.528.044-.79.09C13.678 1.58 11.64.003 9.253 0 6.76 0 4.664 1.75 4.664 4.027c0 .56.117 1.095.33 1.583l-.008.003c-1.04.337-1.988.86-2.798 1.545-.024.02-.048.04-.07.06-.67.576-1.23 1.271-1.656 2.057-.422.78-.685 1.635-.773 2.516-.12 1.22.097 2.471.635 3.582.54 1.113 1.38 2.056 2.436 2.724 1.055.668 2.278 1.037 3.528 1.065h.093c1.247 0 2.403-.372 3.352-1.004l.01-.008c.237-.157.465-.33.68-.518.033.11.07.218.112.323.34.848.964 1.554 1.775 2.013.535.3 1.126.47 1.726.496.32.014.642-.017.958-.093.29-.07.569-.177.835-.32 1.04-.568 1.743-1.601 1.887-2.77.012-.094.02-.19.023-.285.196-.078.39-.163.58-.256 1.046-.515 1.94-1.265 2.623-2.2.555-.75.937-1.617 1.12-2.535a7.14 7.14 0 0 0 .134-1.53c.002-.104 0-.208-.005-.31.005.001.01.002.016.003.138.029.274.054.41.074a.578.578 0 0 0 .654-.49.566.566 0 0 0-.468-.64Z"/>
    </svg>
  ),
  xai: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
};

function ProviderIconBadge({ id, className }: { id: ProviderId; className?: string }) {
  const style = PROVIDER_STYLE[id] ?? { icon: 'bg-slate-100 text-slate-500' };
  const icon = PROVIDER_ICON[id];
  return (
    <span className={cn('w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold', style.icon, className)}>
      {icon ?? PROVIDER_REGISTRY[id].name[0]}
    </span>
  );
}

const LANG_OPTIONS = [
  { value: 'zh-CN', label: '中文 (Chinese)' },
  { value: 'ja', label: '日本語 (Japanese)' },
  { value: 'ko', label: '한국어 (Korean)' },
  { value: 'es', label: 'Español (Spanish)' },
  { value: 'fr', label: 'Français (French)' },
  { value: 'de', label: 'Deutsch (German)' },
  { value: 'pt', label: 'Português (Portuguese)' },
  { value: 'ru', label: 'Русский (Russian)' },
];

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
  const {
    providers, setAuth, clearAuth, setSelectedModel,
    setDynamicModels, setBaseUrl, setApiPath, setNoModelApi,
    activeProviderId, setActiveProvider,
  } = useProviderStore();

  const [editingId, setEditingId] = useState<ProviderId>(activeProviderId);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [baseUrlInput, setBaseUrlInput] = useState('');
  const [apiPathInput, setApiPathInput] = useState('');
  const [modelsLoading, setModelsLoading] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  // Sync editingId when activeProviderId changes (e.g. after hydration)
  useEffect(() => {
    setEditingId(activeProviderId);
  }, [activeProviderId]);

  // Switch to OAuth-completed provider
  useEffect(() => {
    if (highlightProviderId) setEditingId(highlightProviderId);
  }, [highlightProviderId]);

  // Reset inputs when switching provider
  useEffect(() => {
    setApiKeyInput('');
    setShowKey(false);
    setBaseUrlInput('');
    setApiPathInput('');
    setModelsLoading(false);
    setConnectLoading(false);
  }, [editingId]);

  const def = PROVIDER_REGISTRY[editingId];
  const config = providers[editingId];
  const isConnected = config?.auth.type !== 'none';
  const isActive = activeProviderId === editingId;
  const noModelApi = config?.noModelApi ?? false;
  const dynamicModels = config?.dynamicModels ?? [];
  const models: ProviderModel[] = (!noModelApi && dynamicModels.length > 0) ? dynamicModels : def.models;
  const selectedModel = models.find(m => m.id === config?.selectedModelId) ?? models[0];
  const effectiveBaseUrl = baseUrlInput || config?.baseUrl || def.baseUrl || '';
  const effectiveApiPath = apiPathInput || config?.apiPath || def.apiPath || '';
  const style = PROVIDER_STYLE[editingId] ?? { icon: 'bg-slate-100 text-slate-600', btn: 'bg-indigo-600 hover:bg-indigo-700 text-white' };
  const supportsOAuth = def.authMethods.includes('oauth') && !!def.oauth?.clientId;
  const maskedKey = config?.auth.apiKey && !['ollama', 'lm-studio'].includes(config.auth.apiKey)
    ? `${config.auth.apiKey.slice(0, 8)}••••••••${config.auth.apiKey.slice(-4)}`
    : null;

  const fetchModels = useCallback(async (id: ProviderId, key: string, url?: string) => {
    setModelsLoading(true);
    try {
      const res = await fetch(`/api/models?providerId=${id}`, {
        headers: {
          ...(key && { 'x-api-key': key }),
          ...(url && { 'x-base-url': url }),
        },
      });
      const data: { models: ProviderModel[]; dynamic: boolean; error?: string } = await res.json();
      if (data.models?.length > 0) {
        setDynamicModels(id, data.models);
        const currentId = providers[id]?.selectedModelId;
        if (!currentId || !data.models.some(m => m.id === currentId)) {
          setSelectedModel(id, data.models[0].id);
        }
      }
      if (data.error) setAuthError(data.error);
    } catch {
      // silent: keep static models
    } finally {
      setModelsLoading(false);
    }
  }, [providers, setDynamicModels, setSelectedModel, setAuthError]);

  const handleConnect = useCallback(async () => {
    const key = apiKeyInput.trim() || (def.noKeyRequired ? 'ollama' : '');
    if (!key && !def.noKeyRequired) return;
    setConnectLoading(true);
    try {
      // URL configs are now saved automatically on input change, no need to save here
      setAuth(editingId, { type: 'api-key', apiKey: key });
      setApiKeyInput('');
      if (!noModelApi) await fetchModels(editingId, key, effectiveBaseUrl);
      if (!isActive) setActiveProvider(editingId);
      setAuthSuccess(`Connected to ${def.name}`);
    } finally {
      setConnectLoading(false);
    }
  }, [apiKeyInput, def, editingId, setAuth, noModelApi, fetchModels, effectiveBaseUrl, isActive, setActiveProvider, setAuthSuccess]);

  const handleUpdateKey = useCallback(async () => {
    const key = apiKeyInput.trim();
    if (!key) return;
    setConnectLoading(true);
    try {
      setAuth(editingId, { type: 'api-key', apiKey: key });
      setApiKeyInput('');
      if (!noModelApi) await fetchModels(editingId, key, effectiveBaseUrl);
      setAuthSuccess('API key updated');
    } finally {
      setConnectLoading(false);
    }
  }, [apiKeyInput, editingId, setAuth, noModelApi, fetchModels, effectiveBaseUrl, setAuthSuccess]);

  const handleRefreshModels = useCallback(async () => {
    const key = config?.auth.apiKey ?? '';
    await fetchModels(editingId, key, effectiveBaseUrl);
  }, [editingId, config, fetchModels, effectiveBaseUrl]);

  const handleDisconnect = useCallback(() => {
    clearAuth(editingId);
  }, [editingId, clearAuth]);

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
          <h2 className="text-sm font-semibold text-slate-800">AI Provider</h2>
        </div>
        {isConnected && isActive && (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Active
          </span>
        )}
      </div>

      <div className="p-5 space-y-4">

        {/* ── Ollama Warning Banner ────────────────────────────────────────── */}
        {editingId === 'ollama' && <OllamaWarningBanner className="mb-4" />}

        {/* ── Provider ─────────────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Provider</label>
          <Select value={editingId} onValueChange={(v) => setEditingId(v as ProviderId)}>
            <SelectTrigger className="w-full h-11 border-slate-200 bg-slate-50 cursor-pointer text-sm font-medium">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <ProviderIconBadge id={editingId} />
                <span className="text-sm font-medium truncate">{PROVIDER_REGISTRY[editingId].name}</span>
                {isConnected && isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 ml-0.5" />
                )}
              </div>
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-72 w-[var(--radix-select-trigger-width)]">
              {PROVIDER_GROUPS.map(group => (
                <SelectGroup key={group.label}>
                  <SelectLabel className="text-[10px] uppercase tracking-widest text-slate-400 py-1.5">
                    {group.label}
                  </SelectLabel>
                  {group.ids.map(id => {
                    const connected = providers[id]?.auth.type !== 'none';
                    const active = activeProviderId === id;
                    return (
                      <SelectItem key={id} value={id} className="cursor-pointer">
                        <div className="flex items-center gap-2.5 w-full">
                          <ProviderIconBadge id={id} />
                          <span className="flex-1">{PROVIDER_REGISTRY[id].name}</span>
                          {active && (
                            <span className="text-[10px] font-bold text-emerald-600 ml-2">Active</span>
                          )}
                          {!active && connected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-2 shrink-0" />
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-slate-400">{def.description}</p>
        </div>

        {/* ── API Key (hidden for local providers) ─────────────────────────── */}
        {!def.noKeyRequired && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">API Key</label>
              {isConnected && maskedKey && (
                <span className="text-[11px] text-emerald-600 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Connected
                </span>
              )}
            </div>
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder={isConnected && maskedKey ? maskedKey : def.apiKeyPlaceholder}
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void (isConnected ? handleUpdateKey() : handleConnect())}
                className="h-11 pr-10 border-slate-200 bg-slate-50 font-mono text-sm"
              />
              <button
                onClick={() => setShowKey(v => !v)}
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
              Get API key
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        )}

        {/* ── API URL ──────────────────────────────────────────────────────── */}
        {(def.baseUrlEditable || def.baseUrl) && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">API URL</label>
            <Input
              value={effectiveBaseUrl}
              onChange={e => {
                const newValue = e.target.value;
                setBaseUrlInput(newValue);
                if (def.baseUrlEditable) {
                  setBaseUrl(editingId, newValue);
                }
              }}
              placeholder={def.baseUrl ?? 'https://...'}
              className="h-11 border-slate-200 bg-slate-50 font-mono text-sm"
              readOnly={!def.baseUrlEditable}
            />
            <p className="text-[11px] text-slate-400">
              {def.baseUrlEditable
                ? 'Custom API endpoint. Use a proxy URL to route through a third-party service.'
                : 'Default API endpoint (read-only).'}
            </p>
          </div>
        )}

        {/* ── API URL Path ─────────────────────────────────────────────────── */}
        {def.apiPath && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">API URL Path</label>
            <Input
              value={effectiveApiPath}
              onChange={e => {
                const newValue = e.target.value;
                setApiPathInput(newValue);
                setApiPath(editingId, newValue);
              }}
              placeholder={def.apiPath}
              className="h-11 border-slate-200 bg-slate-50 font-mono text-sm"
            />
            <p className="text-[11px] text-slate-400">
              Default: <code className="font-mono text-slate-500">{def.apiPath}</code>. Change only if your proxy uses a different path.
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
                onChange={e => setNoModelApi(editingId, e.target.checked)}
                className="sr-only peer"
              />
              <div className={cn(
                'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
                noModelApi ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white group-hover:border-slate-400',
              )}>
                {noModelApi && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">No model API support</p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Skip dynamic model fetching — use preset list only. Enable this if the provider does not support the <code className="font-mono">/v1/models</code> endpoint.
              </p>
            </div>
          </label>
        )}

        {/* ── Model selector (shown when connected) ────────────────────────── */}
        {isConnected && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Model</label>
            <div className="flex items-center gap-2">
              <Select
                value={config.selectedModelId}
                onValueChange={v => setSelectedModel(editingId, v)}
              >
                <SelectTrigger className="flex-1 min-w-0 w-0 !h-11 border-slate-200 bg-slate-50 cursor-pointer text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-60 w-[var(--radix-select-trigger-width)]">
                  {models.map(m => (
                    <SelectItem key={m.id} value={m.id} className="cursor-pointer text-xs">
                      <div>
                        <span>{m.name ?? m.id}</span>
                        {m.contextWindow && (
                          <span className="ml-1.5 text-slate-400">{Math.round(m.contextWindow / 1000)}K</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => void handleRefreshModels()}
                disabled={modelsLoading || noModelApi}
                className="h-11 w-11 border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer shrink-0"
                title="Refresh model list"
              >
                <RefreshCw className={cn('w-4 h-4 text-slate-500', modelsLoading && 'animate-spin')} />
              </Button>
            </div>
            {selectedModel?.description && (
              <p className="text-[11px] text-slate-400">{selectedModel.description}</p>
            )}
          </div>
        )}

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <div className="space-y-2 pt-1">
          {/* OAuth button */}
          {supportsOAuth && !isConnected && (
            <button
              onClick={() => void handleOAuth()}
              disabled={oauthLoading}
              className={cn(
                'w-full h-11 flex items-center justify-center gap-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors disabled:opacity-60',
                style.btn,
              )}
            >
              {oauthLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              Sign in with {def.name}
            </button>
          )}

          {/* Connect / Update Key / Reconnect */}
          {def.noKeyRequired ? (
            <button
              onClick={() => void handleConnect()}
              disabled={loading}
              className={cn(
                'w-full h-11 flex items-center justify-center gap-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors disabled:opacity-60',
                style.btn,
              )}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {isConnected ? `Reconnect ${def.name}` : `Connect to ${def.name}`}
            </button>
          ) : !isConnected ? (
            <button
              onClick={() => void handleConnect()}
              disabled={!apiKeyInput.trim() || loading}
              className={cn(
                'w-full h-11 flex items-center justify-center gap-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
                style.btn,
              )}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Connect
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {apiKeyInput.trim() && (
                <button
                  onClick={() => void handleUpdateKey()}
                  disabled={loading}
                  className={cn(
                    'flex-1 h-10 flex items-center justify-center gap-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors disabled:opacity-60',
                    style.btn,
                  )}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Update Key
                </button>
              )}
              {!isActive && (
                <button
                  onClick={() => setActiveProvider(editingId)}
                  className="flex-1 h-10 flex items-center justify-center gap-2 rounded-lg text-sm font-semibold border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 cursor-pointer transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  Set Active
                </button>
              )}
              <button
                onClick={handleDisconnect}
                className="h-10 px-3 flex items-center gap-1.5 rounded-lg text-sm text-slate-400 hover:text-rose-500 hover:bg-rose-50 cursor-pointer transition-colors border border-slate-200"
              >
                <LogOut className="w-3.5 h-3.5" />
                Disconnect
              </button>
            </div>
          )}
        </div>

        {/* ── Auth type display ─────────────────────────────────────────────── */}
        {isConnected && config?.auth.type === 'oauth' && (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
            <Zap className="w-3 h-3" />
            Authenticated via OAuth
            <button
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

// ─── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
        value ? 'bg-indigo-600' : 'bg-slate-200',
      )}
    >
      <span className={cn(
        'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200',
        value ? 'translate-x-6' : 'translate-x-1',
      )} />
    </button>
  );
}

// ─── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
        <Icon className="w-4 h-4 text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Main settings content ────────────────────────────────────────────────────

function SettingsContent() {
  const searchParams = useSearchParams();
  const { setAuth, hydrate: hydrateProviders } = useProviderStore();
  const {
    speed, pitch, volume, setSpeed, setPitch, setVolume,
    targetLang, setTargetLang,
    showTranslation, setShowTranslation,
    recommendationsEnabled, recommendationsCount,
    setRecommendationsEnabled, setRecommendationsCount,
    shadowReadingEnabled, setShadowReadingEnabled,
  } = useTTSStore();

  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [oauthSuccessProvider, setOauthSuccessProvider] = useState<ProviderId | undefined>();

  useEffect(() => {
    hydrateProviders();
  }, [hydrateProviders]);

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
      queueMicrotask(() => setAuthError('OAuth state mismatch — please try again'));
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
          setAuthSuccess(`Connected to ${PROVIDER_REGISTRY[authProvider].name} via OAuth`);
        }
      })
      .catch(() => setAuthError('Token exchange failed — please try again'));
  }, [searchParams, setAuth, setAuthError, setAuthSuccess]);

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-[var(--font-poppins)]">Settings</h1>
        <p className="text-sm text-slate-400 mt-0.5">Configure AI providers, speech, and translation</p>
      </div>

      {/* OAuth feedback */}
      {authError && (
        <div className="flex items-start gap-3 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="flex-1">{authError}</span>
          <button onClick={() => setAuthError(null)} className="opacity-60 hover:opacity-100 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}
      {authSuccess && (
        <div className="flex items-start gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          <Check className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="flex-1">{authSuccess}</span>
          <button onClick={() => setAuthSuccess(null)} className="opacity-60 hover:opacity-100 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* English Level Assessment */}
      <AssessmentSection />

      {/* AI Provider */}
      <AIProviderSection
        setAuthError={setAuthError}
        setAuthSuccess={setAuthSuccess}
        highlightProviderId={oauthSuccessProvider}
      />

      {/* Voice & Speech */}
      <Section title="Voice & Speech" icon={Volume2}>
        <div className="space-y-5">
          <VoicePicker />
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Speed</label>
              <span className="text-xs font-mono text-slate-500">{speed.toFixed(1)}x</span>
            </div>
            <Slider value={[speed]} onValueChange={(v) => setSpeed(v[0])} min={0.5} max={2.0} step={0.1} />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>0.5x Slow</span><span>1.0x Normal</span><span>2.0x Fast</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Pitch</label>
              <span className="text-xs font-mono text-slate-500">{pitch.toFixed(1)}</span>
            </div>
            <Slider value={[pitch]} onValueChange={(v) => setPitch(v[0])} min={0.5} max={2.0} step={0.1} />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>0.5 Low</span><span>1.0 Normal</span><span>2.0 High</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Volume</label>
              <span className="text-xs font-mono text-slate-500">{Math.round(volume * 100)}%</span>
            </div>
            <Slider value={[volume]} onValueChange={(v) => setVolume(v[0])} min={0} max={1} step={0.1} />
          </div>
        </div>
      </Section>

      {/* Translation */}
      <Section title="Translation" icon={Languages}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Show by default</p>
              <p className="text-xs text-slate-400 mt-0.5">Display translations when entering practice pages</p>
            </div>
            <Toggle value={showTranslation} onChange={setShowTranslation} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Target language</p>
            <Select value={targetLang} onValueChange={setTargetLang}>
              <SelectTrigger className="w-full border-slate-200 cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANG_OPTIONS.map((l) => (
                  <SelectItem key={l.value} value={l.value} className="cursor-pointer">{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      {/* Recommendations */}
      <Section title="Recommendations" icon={Sparkles}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Enable recommendations</p>
              <p className="text-xs text-slate-400 mt-0.5">AI suggestions at the bottom of practice pages</p>
            </div>
            <Toggle value={recommendationsEnabled} onChange={setRecommendationsEnabled} />
          </div>
          {recommendationsEnabled && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Number of results</p>
              <div className="flex gap-2">
                {[3, 5, 10].map((n) => (
                  <button
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
      <Section title="Shadow Reading" icon={Repeat}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Enable Shadow Reading</p>
              <p className="text-xs text-slate-400 mt-0.5">Link content across Listen, Read, and Write modules</p>
            </div>
            <Toggle value={shadowReadingEnabled} onChange={setShadowReadingEnabled} />
          </div>
          <div className="rounded-lg bg-indigo-50/70 border border-indigo-100 px-4 py-3 space-y-1.5">
            <p className="text-xs text-indigo-700 leading-relaxed">
              Shadow reading is a technique where you practice the same material across skills: <span className="font-medium">Listen &rarr; Read aloud &rarr; Write</span>. When enabled, switching between modules will highlight your current content so you can continue seamlessly.
            </p>
            <p className="text-[11px] text-indigo-400 leading-relaxed">
              For the Speak module, related conversation scenarios will be recommended based on your content&apos;s topic.
            </p>
          </div>
        </div>
      </Section>

      {/* Data Backup */}
      <Section title="Data Backup" icon={Database}>
        <DataBackup />
      </Section>
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

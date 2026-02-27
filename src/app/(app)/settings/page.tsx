'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Volume2, Sparkles, Languages, Cpu, ExternalLink,
  Check, X, Loader2, Shield,
} from 'lucide-react';
import { useTTSStore } from '@/stores/tts-store';
import { useProviderStore } from '@/stores/provider-store';
import { VoicePicker } from '@/components/voice-picker';
import {
  PROVIDER_REGISTRY, PROVIDER_IDS,
  type ProviderId, type ProviderAuthState,
} from '@/lib/providers';
import { startOAuthFlow, getStoredOAuthState, getStoredVerifier, clearOAuthStorage } from '@/lib/oauth';

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

function ProviderCard({ providerId }: { providerId: ProviderId }) {
  const def = PROVIDER_REGISTRY[providerId];
  const { providers, setAuth, clearAuth, setSelectedModel, activeProviderId, setActiveProvider } = useProviderStore();
  const config = providers[providerId];
  const isConnected = config.auth.type !== 'none';
  const isActive = activeProviderId === providerId;

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const supportsOAuth = def.authMethods.includes('oauth') && def.oauth;

  const handleApiKeySubmit = useCallback(() => {
    if (!apiKeyInput.trim()) return;
    const auth: ProviderAuthState = { type: 'api-key', apiKey: apiKeyInput.trim() };
    setAuth(providerId, auth);
    setApiKeyInput('');
    setShowApiKeyForm(false);
  }, [apiKeyInput, providerId, setAuth]);

  const handleOAuthStart = useCallback(async () => {
    setOauthLoading(true);
    try {
      await startOAuthFlow(providerId);
    } catch {
      setOauthLoading(false);
    }
  }, [providerId]);

  const handleDisconnect = useCallback(() => {
    clearAuth(providerId);
    setShowApiKeyForm(false);
  }, [providerId, clearAuth]);

  const maskedKey = config.auth.apiKey
    ? `${config.auth.apiKey.slice(0, 6)}...${config.auth.apiKey.slice(-4)}`
    : config.auth.type === 'oauth' ? 'OAuth Connected' : '';

  return (
    <div className={`rounded-xl border p-4 transition-all duration-200 ${
      isActive ? 'border-indigo-400 bg-indigo-50/50 ring-1 ring-indigo-200' : 'border-indigo-100 bg-white/50'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isConnected ? 'bg-green-100' : 'bg-indigo-100'
          }`}>
            <Cpu className={`w-5 h-5 ${isConnected ? 'text-green-600' : 'text-indigo-500'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-indigo-900">{def.name}</h3>
              {isConnected && <Check className="w-4 h-4 text-green-600" />}
            </div>
            <p className="text-xs text-indigo-500">{def.description}</p>
          </div>
        </div>
        {isConnected && !isActive && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setActiveProvider(providerId)}
            className="text-xs border-indigo-200 text-indigo-600 cursor-pointer"
          >
            Set Active
          </Button>
        )}
        {isActive && (
          <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full">
            Active
          </span>
        )}
      </div>

      {isConnected && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2 text-xs text-indigo-500">
            <Shield className="w-3.5 h-3.5" />
            <span>{maskedKey}</span>
          </div>

          <div>
            <label className="text-xs font-medium text-indigo-700 mb-1 block">Model</label>
            <Select value={config.selectedModelId} onValueChange={(v) => setSelectedModel(providerId, v)}>
              <SelectTrigger className="bg-white/50 border-indigo-200 text-sm h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {def.models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <span>{m.name}</span>
                    {m.description && <span className="text-indigo-400 ml-1">— {m.description}</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleDisconnect}
            className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Disconnect
          </Button>
        </div>
      )}

      {!isConnected && !showApiKeyForm && (
        <div className="mt-3 flex gap-2">
          {supportsOAuth && (
            <Button
              size="sm"
              onClick={handleOAuthStart}
              disabled={oauthLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-xs cursor-pointer"
            >
              {oauthLoading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Shield className="w-3.5 h-3.5 mr-1" />}
              Sign in with {def.name}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowApiKeyForm(true)}
            className="text-xs border-indigo-200 text-indigo-600 cursor-pointer"
          >
            Use API Key
          </Button>
        </div>
      )}

      {!isConnected && showApiKeyForm && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder={def.apiKeyPlaceholder}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApiKeySubmit()}
              className="flex-1 bg-white/50 border-indigo-200 text-sm h-9"
            />
            <Button
              size="sm"
              onClick={handleApiKeySubmit}
              disabled={!apiKeyInput.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer h-9"
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setShowApiKeyForm(false); setApiKeyInput(''); }}
              className="cursor-pointer h-9"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <a
            href={def.apiKeyHelpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1"
          >
            Get an API key <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const { setAuth, hydrate: hydrateProviders } = useProviderStore();
  const {
    speed, pitch, volume, setSpeed, setPitch, setVolume,
    targetLang, setTargetLang,
    showTranslation, setShowTranslation,
    recommendationsEnabled, recommendationsCount,
    setRecommendationsEnabled, setRecommendationsCount,
  } = useTTSStore();

  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  useEffect(() => {
    hydrateProviders();
  }, [hydrateProviders]);

  useEffect(() => {
    const error = searchParams.get('auth_error');
    if (error) {
      setAuthError(error);
      window.history.replaceState({}, '', '/settings');
      return;
    }

    const authCode = searchParams.get('auth_code');
    const authProvider = searchParams.get('auth_provider') as ProviderId | null;
    if (authCode && authProvider) {
      const storedState = getStoredOAuthState();
      if (!storedState || storedState.provider !== authProvider) {
        setAuthError('OAuth state mismatch');
        clearOAuthStorage();
        window.history.replaceState({}, '', '/settings');
        return;
      }

      const verifier = getStoredVerifier();
      clearOAuthStorage();

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
        .then((res) => res.json())
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
            setAuthSuccess(`Connected to ${PROVIDER_REGISTRY[authProvider].name} via OAuth`);
          }
        })
        .catch(() => setAuthError('Token exchange failed'));

      window.history.replaceState({}, '', '/settings');
    }
  }, [searchParams, setAuth]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-[var(--font-poppins)] text-indigo-900">Settings</h1>
        <p className="text-indigo-600 mt-1">Configure AI models, speech, and translation preferences</p>
      </div>

      {authError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-center justify-between">
          <p className="text-sm text-red-700">{authError}</p>
          <button onClick={() => setAuthError(null)} className="text-red-400 hover:text-red-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {authSuccess && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 flex items-center justify-between">
          <p className="text-sm text-green-700">{authSuccess}</p>
          <button onClick={() => setAuthSuccess(null)} className="text-green-400 hover:text-green-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <Card className="bg-white/70 backdrop-blur-xl border-indigo-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-900">
            <Cpu className="w-5 h-5" />
            AI Model Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-indigo-500">
            Connect your AI providers. Sign in with OAuth or enter an API key. Keys are stored locally.
          </p>
          {PROVIDER_IDS.map((id) => (
            <ProviderCard key={id} providerId={id} />
          ))}
        </CardContent>
      </Card>

      <Card className="bg-white/70 backdrop-blur-xl border-indigo-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-900">
            <Volume2 className="w-5 h-5" />
            Voice Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <VoicePicker />
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-indigo-700">Speed</label>
              <span className="text-sm font-mono text-indigo-600">{speed.toFixed(1)}x</span>
            </div>
            <Slider value={[speed]} onValueChange={(val) => setSpeed(val[0])} min={0.5} max={2.0} step={0.1} className="w-full" />
            <div className="flex justify-between text-xs text-indigo-400 mt-1">
              <span>0.5x Slow</span><span>1.0x Normal</span><span>2.0x Fast</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-indigo-700">Pitch</label>
              <span className="text-sm font-mono text-indigo-600">{pitch.toFixed(1)}</span>
            </div>
            <Slider value={[pitch]} onValueChange={(val) => setPitch(val[0])} min={0.5} max={2.0} step={0.1} className="w-full" />
            <div className="flex justify-between text-xs text-indigo-400 mt-1">
              <span>0.5 Low</span><span>1.0 Normal</span><span>2.0 High</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-indigo-700">Volume</label>
              <span className="text-sm font-mono text-indigo-600">{Math.round(volume * 100)}%</span>
            </div>
            <Slider value={[volume]} onValueChange={(val) => setVolume(val[0])} min={0} max={1} step={0.1} className="w-full" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/70 backdrop-blur-xl border-indigo-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-900">
            <Languages className="w-5 h-5" />
            Translation Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-700">Show Translation by Default</p>
              <p className="text-xs text-indigo-400 mt-0.5">Display translations when entering practice pages</p>
            </div>
            <button
              onClick={() => setShowTranslation(!showTranslation)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 cursor-pointer focus:outline-none ${
                showTranslation ? 'bg-indigo-600' : 'bg-indigo-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                showTranslation ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          <div>
            <p className="text-sm font-medium text-indigo-700 mb-2">Target Language</p>
            <Select value={targetLang} onValueChange={setTargetLang}>
              <SelectTrigger className="w-full bg-white/50 border-indigo-200">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {LANG_OPTIONS.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/70 backdrop-blur-xl border-indigo-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-900">
            <Sparkles className="w-5 h-5" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-700">Enable Recommendations</p>
              <p className="text-xs text-indigo-400 mt-0.5">Show AI-powered suggestions after each session</p>
            </div>
            <button
              onClick={() => setRecommendationsEnabled(!recommendationsEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 cursor-pointer focus:outline-none ${
                recommendationsEnabled ? 'bg-indigo-600' : 'bg-indigo-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                recommendationsEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          {recommendationsEnabled && (
            <div>
              <p className="text-sm font-medium text-indigo-700 mb-2">Number of Recommendations</p>
              <div className="flex gap-2">
                {[3, 5, 10].map((n) => (
                  <Button
                    key={n}
                    variant={recommendationsCount === n ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRecommendationsCount(n)}
                    className={recommendationsCount === n ? 'bg-indigo-600 cursor-pointer' : 'border-indigo-200 text-indigo-600 cursor-pointer'}
                  >
                    {n}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

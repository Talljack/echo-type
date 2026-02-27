'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Volume2, Sparkles, Key, Languages } from 'lucide-react';
import { useTTSStore } from '@/stores/tts-store';
import { VoicePicker } from '@/components/voice-picker';

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

export default function SettingsPage() {
  const {
    speed, pitch, volume, setSpeed, setPitch, setVolume,
    targetLang, setTargetLang,
    showTranslation, setShowTranslation,
    recommendationsEnabled, recommendationsCount,
    setRecommendationsEnabled, setRecommendationsCount,
    openaiKey, setOpenaiKey,
    anthropicKey, setAnthropicKey,
    deepseekKey, setDeepseekKey,
  } = useTTSStore();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-[var(--font-poppins)] text-indigo-900">Settings</h1>
        <p className="text-indigo-600 mt-1">Configure AI models, speech, and translation preferences</p>
      </div>

      <Card className="bg-white/70 backdrop-blur-xl border-indigo-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-900">
            <Volume2 className="w-5 h-5" />
            Voice Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-indigo-500">
            Choose a voice and adjust speech settings. Changes are saved automatically and apply to all modules.
          </p>

          <VoicePicker />

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-indigo-700">Speed</label>
              <span className="text-sm font-mono text-indigo-600">{speed.toFixed(1)}x</span>
            </div>
            <Slider
              value={[speed]}
              onValueChange={(val) => setSpeed(val[0])}
              min={0.5}
              max={2.0}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-indigo-400 mt-1">
              <span>0.5x Slow</span>
              <span>1.0x Normal</span>
              <span>2.0x Fast</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-indigo-700">Pitch</label>
              <span className="text-sm font-mono text-indigo-600">{pitch.toFixed(1)}</span>
            </div>
            <Slider
              value={[pitch]}
              onValueChange={(val) => setPitch(val[0])}
              min={0.5}
              max={2.0}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-indigo-400 mt-1">
              <span>0.5 Low</span>
              <span>1.0 Normal</span>
              <span>2.0 High</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-indigo-700">Volume</label>
              <span className="text-sm font-mono text-indigo-600">{Math.round(volume * 100)}%</span>
            </div>
            <Slider
              value={[volume]}
              onValueChange={(val) => setVolume(val[0])}
              min={0}
              max={1}
              step={0.1}
              className="w-full"
            />
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
          <p className="text-sm text-indigo-500">
            Configure translation display across Listen, Speak, and Write modules. Source language is English.
          </p>

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
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  showTranslation ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
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
            <p className="text-xs text-indigo-400 mt-1">Translations are powered by AI and cached locally</p>
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
          <p className="text-sm text-indigo-500">
            Show related content suggestions at the bottom of Listen, Speak, and Write pages.
          </p>

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
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  recommendationsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
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

      <Card className="bg-white/70 backdrop-blur-xl border-indigo-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-900">
            <Key className="w-5 h-5" />
            AI Model Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-indigo-500">
            Configure your AI provider API keys. These are stored locally and sent to the server for API calls.
          </p>

          <div>
            <label className="text-sm font-medium text-indigo-700 mb-1 block">OpenAI API Key</label>
            <Input
              type="password"
              placeholder="sk-..."
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              className="bg-white/50 border-indigo-200"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-indigo-700 mb-1 block">Anthropic API Key</label>
            <Input
              type="password"
              placeholder="sk-ant-..."
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              className="bg-white/50 border-indigo-200"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-indigo-700 mb-1 block">DeepSeek API Key</label>
            <Input
              type="password"
              placeholder="sk-..."
              value={deepseekKey}
              onChange={(e) => setDeepseekKey(e.target.value)}
              className="bg-white/50 border-indigo-200"
            />
          </div>

          <p className="text-xs text-indigo-400">Keys are saved automatically to local storage and never sent to any server except the AI provider.</p>
        </CardContent>
      </Card>
    </div>
  );
}

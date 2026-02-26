'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Key, Volume2 } from 'lucide-react';
import { useTTSStore } from '@/stores/tts-store';
import { VoicePicker } from '@/components/voice-picker';

export default function SettingsPage() {
  const { speed, pitch, volume, setSpeed, setPitch, setVolume } =
    useTTSStore();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-[var(--font-poppins)] text-indigo-900">Settings</h1>
        <p className="text-indigo-600 mt-1">Configure AI models and speech preferences</p>
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
              className="bg-white/50 border-indigo-200"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-indigo-700 mb-1 block">Anthropic API Key</label>
            <Input
              type="password"
              placeholder="sk-ant-..."
              className="bg-white/50 border-indigo-200"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-indigo-700 mb-1 block">DeepSeek API Key</label>
            <Input
              type="password"
              placeholder="sk-..."
              className="bg-white/50 border-indigo-200"
            />
          </div>

          <Button className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

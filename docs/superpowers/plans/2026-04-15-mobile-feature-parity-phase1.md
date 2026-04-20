# Mobile Feature Parity Phase 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the mobile app from ~38% to ~65% feature coverage by implementing the 5 critical gaps: AI provider settings, AI chat integration, dashboard data wiring, listen translation, and settings expansion.

**Architecture:** Each task targets a specific screen or store. Mobile communicates with the existing Next.js API server (via `EXPO_PUBLIC_API_URL`) for AI, translation, and TTS. All new settings persist through `useSettingsStore` (SecureStore). Practice modules update `useDashboardStore` after session completion.

**Tech Stack:** React Native (Expo), Zustand, expo-router, react-native-paper, @expo/vector-icons, existing Next.js API routes

**Reference:** See `docs/superpowers/specs/2026-04-15-mobile-feature-gap-analysis.md` for full gap analysis.

---

## File Structure

### New files
- `mobile/src/stores/useProviderStore.ts` — AI provider configuration (keys, models, active provider)
- `mobile/src/services/chat-api.ts` — AI chat streaming client
- `mobile/src/services/ai-api.ts` — AI recommendations client
- `mobile/src/components/settings/AIProviderSection.tsx` — AI provider settings UI
- `mobile/src/components/settings/TranslationSection.tsx` — Translation settings UI
- `mobile/src/components/settings/LanguageSection.tsx` — UI language settings
- `mobile/src/components/listen/TranslationOverlay.tsx` — Per-sentence translation in listen
- `mobile/src/components/shared/RecommendationPanel.tsx` — AI recommendations panel
- `mobile/src/hooks/useTranslation.ts` — Translation hook with cache

### Modified files
- `mobile/src/types/user.ts` — Extend Settings type with AI provider fields
- `mobile/src/stores/useSettingsStore.ts` — Add new default settings
- `mobile/src/stores/useDashboardStore.ts` — Add `recordPracticeSession` action
- `mobile/src/stores/useListenStore.ts` — Call dashboard store on session end
- `mobile/src/stores/useSpeakStore.ts` — Call dashboard store on session end
- `mobile/src/stores/useReadStore.ts` — Call dashboard store on session end
- `mobile/src/stores/useWriteStore.ts` — Call dashboard store on session end
- `mobile/app/(tabs)/settings.tsx` — Add AI provider and translation sections
- `mobile/app/chat/[id].tsx` — Replace mock with real AI streaming
- `mobile/app/practice/listen/[id].tsx` — Add translation overlay
- `mobile/app/(tabs)/index.tsx` — Fix stats data display

---

## Task 1: Dashboard Data Wiring

Connect all 4 practice modules to the dashboard so practice sessions update streak, heatmap, and stats in real time.

**Files:**
- Modify: `mobile/src/stores/useDashboardStore.ts`
- Modify: `mobile/src/stores/useListenStore.ts`
- Modify: `mobile/src/stores/useSpeakStore.ts`
- Modify: `mobile/src/stores/useReadStore.ts`
- Modify: `mobile/src/stores/useWriteStore.ts`

- [ ] **Step 1: Add `recordPracticeSession` to dashboard store**

In `mobile/src/stores/useDashboardStore.ts`, add a unified action that updates streak, stats, and heatmap activity. Add this action to the `DashboardState` interface and implement it:

```typescript
// Add to DashboardState interface:
recordPracticeSession: (module: 'listen' | 'speak' | 'read' | 'write', duration: number) => void;

// Add implementation in the store:
recordPracticeSession: (module, duration) => {
  const today = new Date().toISOString().split('T')[0];
  const state = get();

  // Update activity heatmap
  const existingActivity = state.activities.find((a) => a.date === today);
  const updatedActivities = existingActivity
    ? state.activities.map((a) => (a.date === today ? { ...a, count: a.count + 1 } : a))
    : [...state.activities, { date: today, count: 1 }];

  // Calculate streak
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const hadActivityYesterday = state.activities.some((a) => a.date === yesterdayStr);
  const hadActivityToday = existingActivity !== undefined;

  let newStreak = state.stats.streak;
  if (!hadActivityToday) {
    // First session today
    newStreak = hadActivityYesterday ? state.stats.streak + 1 : 1;
  }

  set({
    activities: updatedActivities,
    stats: {
      ...state.stats,
      streak: newStreak,
      totalStudyTime: state.stats.totalStudyTime + Math.floor(duration / 60),
      lessonsCompleted: state.stats.lessonsCompleted + 1,
    },
  });
},
```

- [ ] **Step 2: Wire listen store to dashboard**

In `mobile/src/stores/useListenStore.ts`, import and call `useDashboardStore` at the end of `endSession`:

```typescript
// Add at top of file:
import { useDashboardStore } from './useDashboardStore';

// In endSession, after the existing set() call, add:
useDashboardStore.getState().recordPracticeSession('listen', duration);
```

- [ ] **Step 3: Wire speak store to dashboard**

In `mobile/src/stores/useSpeakStore.ts`, same pattern:

```typescript
import { useDashboardStore } from './useDashboardStore';

// In endSession, after the existing set() call, add:
useDashboardStore.getState().recordPracticeSession('speak', duration);
```

- [ ] **Step 4: Wire read store to dashboard**

In `mobile/src/stores/useReadStore.ts`:

```typescript
import { useDashboardStore } from './useDashboardStore';

// In endSession, after the existing set() call, add:
useDashboardStore.getState().recordPracticeSession('read', duration);
```

- [ ] **Step 5: Wire write store to dashboard**

In `mobile/src/stores/useWriteStore.ts`:

```typescript
import { useDashboardStore } from './useDashboardStore';

// In endSession, after the existing set() call, add:
useDashboardStore.getState().recordPracticeSession('write', duration);
```

- [ ] **Step 6: Verify dashboard stats on home screen**

Open the app, complete a listen practice session, go back to home. Verify:
- Session count increments
- Streak updates (should be 1 if first session today)
- Activity heatmap shows today's dot
- Total time updates

- [ ] **Step 7: Commit**

```bash
cd mobile
git add src/stores/useDashboardStore.ts src/stores/useListenStore.ts src/stores/useSpeakStore.ts src/stores/useReadStore.ts src/stores/useWriteStore.ts
git commit -m "feat(mobile): wire practice sessions to dashboard stats and heatmap"
```

---

## Task 2: Extend Settings Type and Store for AI Provider

Add AI provider configuration fields to the Settings type and store so users can configure API keys and models.

**Files:**
- Modify: `mobile/src/types/user.ts`
- Modify: `mobile/src/stores/useSettingsStore.ts`

- [ ] **Step 1: Extend Settings interface**

In `mobile/src/types/user.ts`, add fields for AI configuration, translation, and language:

```typescript
export interface Settings {
  // Existing fields
  language: string;
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  ttsProvider: string;
  ttsVoice: string;
  ttsSpeed: number;
  sttProvider: string;
  translationProvider: string;
  autoSync: boolean;
  notifications: boolean;
  onboardingCompleted: boolean;

  // AI Provider
  aiProvider: string;
  aiApiKey: string;
  aiBaseUrl: string;
  aiModel: string;

  // Translation
  translationTargetLang: string;
  showListenTranslation: boolean;
  showReadTranslation: boolean;
  showSpeakTranslation: boolean;
  showWriteTranslation: boolean;

  // Recommendations
  enableRecommendations: boolean;
  recommendationCount: number;
}
```

- [ ] **Step 2: Update default settings**

In `mobile/src/stores/useSettingsStore.ts`, update `defaultSettings`:

```typescript
const defaultSettings: Settings = {
  language: 'en',
  theme: 'system',
  fontSize: 16,
  ttsProvider: 'edge',
  ttsVoice: 'en-US-AriaNeural',
  ttsSpeed: 1.0,
  sttProvider: 'whisper',
  translationProvider: 'google',
  autoSync: true,
  notifications: true,
  onboardingCompleted: false,

  // AI Provider
  aiProvider: '',
  aiApiKey: '',
  aiBaseUrl: '',
  aiModel: '',

  // Translation
  translationTargetLang: 'zh',
  showListenTranslation: true,
  showReadTranslation: true,
  showSpeakTranslation: true,
  showWriteTranslation: false,

  // Recommendations
  enableRecommendations: true,
  recommendationCount: 5,
};
```

- [ ] **Step 3: Commit**

```bash
cd mobile
git add src/types/user.ts src/stores/useSettingsStore.ts
git commit -m "feat(mobile): extend settings type with AI provider, translation, and recommendation fields"
```

---

## Task 3: AI Provider Settings UI

Create a settings section where users can configure their AI provider (API key, model, base URL).

**Files:**
- Create: `mobile/src/components/settings/AIProviderSection.tsx`
- Modify: `mobile/app/(tabs)/settings.tsx`

- [ ] **Step 1: Create AIProviderSection component**

Create `mobile/src/components/settings/AIProviderSection.tsx`:

```typescript
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Divider, Menu, Text, TextInput, useTheme } from 'react-native-paper';
import { Pressable } from 'react-native';
import { Card } from '@/components/ui/Card';
import { useSettingsStore } from '@/stores/useSettingsStore';

const AI_PROVIDERS = [
  { id: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  { id: 'anthropic', label: 'Anthropic', baseUrl: 'https://api.anthropic.com' },
  { id: 'deepseek', label: 'DeepSeek', baseUrl: 'https://api.deepseek.com' },
  { id: 'groq', label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1' },
  { id: 'openrouter', label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1' },
  { id: 'custom', label: 'Custom', baseUrl: '' },
];

export function AIProviderSection() {
  const theme = useTheme();
  const { settings, updateSettings } = useSettingsStore();
  const [providerMenuVisible, setProviderMenuVisible] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const selectedProvider = AI_PROVIDERS.find((p) => p.id === settings.aiProvider);

  const handleProviderChange = (providerId: string) => {
    const provider = AI_PROVIDERS.find((p) => p.id === providerId);
    updateSettings({
      aiProvider: providerId,
      aiBaseUrl: provider?.baseUrl || '',
    });
    setProviderMenuVisible(false);
  };

  return (
    <Card variant="elevated" padding={0}>
      {/* Provider Selection */}
      <Menu
        visible={providerMenuVisible}
        onDismiss={() => setProviderMenuVisible(false)}
        anchor={
          <Pressable style={styles.settingItem} onPress={() => setProviderMenuVisible(true)}>
            <View style={styles.settingInfo}>
              <View style={[styles.settingIconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                <MaterialCommunityIcons name="robot" size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.settingText}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                  AI Provider
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {selectedProvider?.label || 'Not configured'}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-down" size={24} color={theme.colors.onSurfaceVariant} />
          </Pressable>
        }
      >
        {AI_PROVIDERS.map((provider) => (
          <Menu.Item
            key={provider.id}
            onPress={() => handleProviderChange(provider.id)}
            title={provider.label}
            leadingIcon={provider.id === settings.aiProvider ? 'check' : undefined}
          />
        ))}
      </Menu>

      <Divider />

      {/* API Key */}
      <View style={styles.inputContainer}>
        <TextInput
          label="API Key"
          value={settings.aiApiKey}
          onChangeText={(text) => updateSettings({ aiApiKey: text })}
          secureTextEntry={!showApiKey}
          right={
            <TextInput.Icon
              icon={showApiKey ? 'eye-off' : 'eye'}
              onPress={() => setShowApiKey(!showApiKey)}
            />
          }
          mode="outlined"
          style={styles.textInput}
          placeholder="sk-..."
        />
      </View>

      <Divider />

      {/* Model */}
      <View style={styles.inputContainer}>
        <TextInput
          label="Model"
          value={settings.aiModel}
          onChangeText={(text) => updateSettings({ aiModel: text })}
          mode="outlined"
          style={styles.textInput}
          placeholder="e.g. gpt-4o-mini"
        />
      </View>

      {/* Base URL (only for custom) */}
      {settings.aiProvider === 'custom' && (
        <>
          <Divider />
          <View style={styles.inputContainer}>
            <TextInput
              label="Base URL"
              value={settings.aiBaseUrl}
              onChangeText={(text) => updateSettings({ aiBaseUrl: text })}
              mode="outlined"
              style={styles.textInput}
              placeholder="https://api.example.com/v1"
            />
          </View>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 60,
  },
  settingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textInput: {
    fontSize: 14,
  },
});
```

- [ ] **Step 2: Create TranslationSection component**

Create `mobile/src/components/settings/TranslationSection.tsx`:

```typescript
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Divider, Menu, Switch, Text, useTheme } from 'react-native-paper';
import { Card } from '@/components/ui/Card';
import { useSettingsStore } from '@/stores/useSettingsStore';

const LANGUAGES = [
  { id: 'zh', label: '中文 (Chinese)' },
  { id: 'ja', label: '日本語 (Japanese)' },
  { id: 'ko', label: '한국어 (Korean)' },
  { id: 'es', label: 'Español (Spanish)' },
  { id: 'fr', label: 'Français (French)' },
  { id: 'de', label: 'Deutsch (German)' },
  { id: 'pt', label: 'Português (Portuguese)' },
  { id: 'ru', label: 'Русский (Russian)' },
];

export function TranslationSection() {
  const theme = useTheme();
  const { settings, updateSettings } = useSettingsStore();
  const [langMenuVisible, setLangMenuVisible] = useState(false);

  const selectedLang = LANGUAGES.find((l) => l.id === settings.translationTargetLang);

  return (
    <Card variant="elevated" padding={0}>
      {/* Target Language */}
      <Menu
        visible={langMenuVisible}
        onDismiss={() => setLangMenuVisible(false)}
        anchor={
          <Pressable style={styles.settingItem} onPress={() => setLangMenuVisible(true)}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                <MaterialCommunityIcons name="translate" size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.settingText}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                  Target Language
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {selectedLang?.label || 'Chinese'}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-down" size={24} color={theme.colors.onSurfaceVariant} />
          </Pressable>
        }
      >
        {LANGUAGES.map((lang) => (
          <Menu.Item
            key={lang.id}
            onPress={() => {
              updateSettings({ translationTargetLang: lang.id });
              setLangMenuVisible(false);
            }}
            title={lang.label}
            leadingIcon={lang.id === settings.translationTargetLang ? 'check' : undefined}
          />
        ))}
      </Menu>

      <Divider />

      {/* Per-module toggles */}
      {[
        { key: 'showListenTranslation' as const, label: 'Listen', icon: 'headphones' },
        { key: 'showReadTranslation' as const, label: 'Read', icon: 'book-open-variant' },
        { key: 'showSpeakTranslation' as const, label: 'Speak', icon: 'microphone' },
        { key: 'showWriteTranslation' as const, label: 'Write', icon: 'pencil' },
      ].map((item, index) => (
        <React.Fragment key={item.key}>
          {index > 0 && <Divider />}
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                <MaterialCommunityIcons name={item.icon as any} size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.settingText}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                  {item.label} Translation
                </Text>
              </View>
            </View>
            <Switch
              value={settings[item.key]}
              onValueChange={(value) => updateSettings({ [item.key]: value })}
            />
          </View>
        </React.Fragment>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 60,
  },
  settingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
});
```

- [ ] **Step 3: Add sections to settings page**

In `mobile/app/(tabs)/settings.tsx`, import and add the new sections:

Add imports at top:
```typescript
import { AIProviderSection } from '@/components/settings/AIProviderSection';
import { TranslationSection } from '@/components/settings/TranslationSection';
```

Add after the Appearance section and before the Learning section:

```tsx
{/* AI Provider Section */}
<View style={styles.section}>
  <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
    AI Provider
  </Text>
  <AIProviderSection />
</View>

{/* Translation Section */}
<View style={styles.section}>
  <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
    Translation
  </Text>
  <TranslationSection />
</View>
```

- [ ] **Step 4: Verify settings UI**

Open the app → Settings tab. Verify:
- AI Provider section shows provider dropdown, API key input (masked), model input
- Translation section shows target language picker and per-module toggles
- All values persist after closing and reopening the app

- [ ] **Step 5: Commit**

```bash
cd mobile
git add src/components/settings/AIProviderSection.tsx src/components/settings/TranslationSection.tsx app/\(tabs\)/settings.tsx src/types/user.ts src/stores/useSettingsStore.ts
git commit -m "feat(mobile): add AI provider and translation settings sections"
```

---

## Task 4: AI Chat Integration

Replace the local mock chat with real AI provider streaming via the Next.js API server.

**Files:**
- Create: `mobile/src/services/chat-api.ts`
- Modify: `mobile/app/chat/[id].tsx`
- Modify: `mobile/src/stores/useChatStore.ts`

- [ ] **Step 1: Create chat API service**

Create `mobile/src/services/chat-api.ts`:

```typescript
import { useSettingsStore } from '@/stores/useSettingsStore';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
}

export async function streamChatResponse(
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
): Promise<void> {
  const { settings } = useSettingsStore.getState();
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

  if (!settings.aiProvider || !settings.aiApiKey) {
    callbacks.onError(new Error('AI provider not configured. Go to Settings to set up your API key.'));
    return;
  }

  const providerConfigs: Record<string, any> = {
    [settings.aiProvider]: {
      apiKey: settings.aiApiKey,
      baseUrl: settings.aiBaseUrl || undefined,
    },
  };

  try {
    const response = await fetch(`${apiUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        provider: settings.aiProvider,
        model: settings.aiModel,
        providerConfigs,
        context: { module: 'chat' },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Chat request failed' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.startsWith('0:')) continue;
        try {
          const text = JSON.parse(line.slice(2));
          if (typeof text === 'string') {
            fullText += text;
            callbacks.onToken(text);
          }
        } catch {
          // Skip unparseable lines
        }
      }
    }

    callbacks.onDone(fullText);
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}
```

- [ ] **Step 2: Add streaming message support to chat store**

In `mobile/src/stores/useChatStore.ts`, add an `updateLastAssistantMessage` action. Find the store definition and add to the interface and implementation:

```typescript
// Add to the interface:
updateLastAssistantMessage: (conversationId: string, content: string) => void;

// Add to the implementation:
updateLastAssistantMessage: (conversationId, content) => {
  set((state) => ({
    conversations: state.conversations.map((conv) => {
      if (conv.id !== conversationId) return conv;
      const messages = [...conv.messages];
      const lastIdx = messages.length - 1;
      if (lastIdx >= 0 && messages[lastIdx].role === 'assistant') {
        messages[lastIdx] = { ...messages[lastIdx], content };
      }
      return { ...conv, messages };
    }),
  }));
},
```

- [ ] **Step 3: Replace mock chat with real streaming**

In `mobile/app/chat/[id].tsx`, replace the `generateAIResponse` function and `handleSend`:

Remove the entire `generateAIResponse` function (lines ~11-56).

Add import at top:
```typescript
import { streamChatResponse } from '@/services/chat-api';
import { useSettingsStore } from '@/stores/useSettingsStore';
```

Replace `handleSend` with:
```typescript
const handleSend = async (text: string) => {
  if (!id) return;

  addMessage(id, 'user', text);

  const { settings } = useSettingsStore.getState();

  if (!settings.aiProvider || !settings.aiApiKey) {
    addMessage(id, 'assistant', '⚠️ AI provider not configured.\n\nGo to **Settings → AI Provider** to set up your API key and model.');
    return;
  }

  setIsLoading(true);

  // Create placeholder assistant message
  addMessage(id, 'assistant', '');

  const messages = (conversation?.messages || [])
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  // Add the new user message
  messages.push({ role: 'user', content: text });

  // Add system prompt
  const systemMessages = [
    {
      role: 'system' as const,
      content: 'You are an English learning tutor. Help the user practice English through conversation. Be encouraging, correct mistakes gently, and explain grammar or vocabulary when relevant. Keep responses concise and conversational.',
    },
    ...messages,
  ];

  let accumulated = '';

  await streamChatResponse(systemMessages, {
    onToken: (token) => {
      accumulated += token;
      updateLastAssistantMessage(id, accumulated);
    },
    onDone: () => {
      setIsLoading(false);
    },
    onError: (error) => {
      updateLastAssistantMessage(id, `Error: ${error.message}`);
      setIsLoading(false);
    },
  });
};
```

Update the destructuring from `useChatStore` to include the new action:
```typescript
const { conversations, addMessage, updateLastAssistantMessage, isLoading, setIsLoading } = useChatStore();
```

Update `MvpNoticeCard` to be conditional — only show when no provider is configured:

Replace the `ListHeaderComponent` in the FlatList:
```tsx
ListHeaderComponent={
  !useSettingsStore.getState().settings.aiProvider ? (
    <View style={styles.noticeContainer}>
      <MvpNoticeCard
        title="Configure AI Provider"
        body="Go to Settings → AI Provider to add your API key. Once configured, you'll get real AI responses."
      />
    </View>
  ) : null
}
```

- [ ] **Step 4: Verify AI chat works**

1. Go to Settings → AI Provider, select a provider, enter API key and model
2. Go to Chat, create a new conversation
3. Send a message
4. Verify streaming response appears character by character
5. Verify conversation persists after leaving and returning

- [ ] **Step 5: Commit**

```bash
cd mobile
git add src/services/chat-api.ts src/stores/useChatStore.ts app/chat/\\[id\\].tsx
git commit -m "feat(mobile): replace mock chat with real AI provider streaming"
```

---

## Task 5: Listen Translation Overlay

Add per-sentence translation to the listen practice screen, controlled by the translation settings.

**Files:**
- Create: `mobile/src/components/listen/TranslationOverlay.tsx`
- Create: `mobile/src/hooks/useTranslation.ts`
- Modify: `mobile/app/practice/listen/[id].tsx`

- [ ] **Step 1: Create useTranslation hook**

Create `mobile/src/hooks/useTranslation.ts`:

```typescript
import { useCallback, useState } from 'react';
import {
  cacheTranslation,
  getCachedTranslation,
  translateText,
  type TranslationResult,
} from '@/services/translation-api';
import { useSettingsStore } from '@/stores/useSettingsStore';

interface TranslationState {
  translation: TranslationResult | null;
  isLoading: boolean;
  error: string | null;
}

export function useTranslation() {
  const [state, setState] = useState<TranslationState>({
    translation: null,
    isLoading: false,
    error: null,
  });

  const translate = useCallback(async (text: string, context?: string) => {
    const { settings } = useSettingsStore.getState();
    const targetLang = settings.translationTargetLang || 'zh';

    setState({ translation: null, isLoading: true, error: null });

    try {
      // Check cache first
      const cached = await getCachedTranslation(text, targetLang);
      if (cached) {
        setState({ translation: cached, isLoading: false, error: null });
        return cached;
      }

      const result = await translateText(text, targetLang, context);

      // Cache the result
      await cacheTranslation(text, targetLang, result);

      setState({ translation: result, isLoading: false, error: null });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Translation failed';
      setState({ translation: null, isLoading: false, error: message });
      return null;
    }
  }, []);

  const clear = useCallback(() => {
    setState({ translation: null, isLoading: false, error: null });
  }, []);

  return {
    ...state,
    translate,
    clear,
  };
}
```

- [ ] **Step 2: Create TranslationOverlay component**

Create `mobile/src/components/listen/TranslationOverlay.tsx`:

```typescript
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';
import { useTranslation } from '@/hooks/useTranslation';

interface TranslationOverlayProps {
  text: string;
  visible: boolean;
  onDismiss: () => void;
}

export function TranslationOverlay({ text, visible, onDismiss }: TranslationOverlayProps) {
  const theme = useTheme();
  const { translation, isLoading, error, translate, clear } = useTranslation();

  useEffect(() => {
    if (visible && text) {
      translate(text);
    }
    if (!visible) {
      clear();
    }
  }, [visible, text]);

  if (!visible) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceVariant }]}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="translate" size={18} color={theme.colors.primary} />
        <Text variant="labelMedium" style={[styles.label, { color: theme.colors.primary }]}>
          Translation
        </Text>
        <IconButton
          icon="close"
          size={16}
          onPress={onDismiss}
          style={styles.closeButton}
        />
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 8 }}>
            Translating...
          </Text>
        </View>
      )}

      {error && (
        <Text variant="bodySmall" style={{ color: theme.colors.error }}>
          {error}
        </Text>
      )}

      {translation && (
        <Text variant="bodyMedium" style={[styles.translationText, { color: theme.colors.onSurface }]}>
          {translation.itemTranslation}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    marginLeft: 6,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    margin: -8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  translationText: {
    lineHeight: 22,
  },
});
```

- [ ] **Step 3: Add translation to listen practice screen**

In `mobile/app/practice/listen/[id].tsx`, add the translation toggle and overlay.

Add imports:
```typescript
import { TranslationOverlay } from '@/components/listen/TranslationOverlay';
import { useSettingsStore } from '@/stores/useSettingsStore';
```

Add state inside the component:
```typescript
const { settings } = useSettingsStore();
const [showTranslation, setShowTranslation] = useState(false);
```

Add a translation toggle button in the header area (after the title/meta section, before the audio player):
```tsx
{/* Translation Toggle */}
{settings.showListenTranslation && (
  <View style={styles.translationToggle}>
    <Button
      mode={showTranslation ? 'contained' : 'outlined'}
      onPress={() => setShowTranslation(!showTranslation)}
      icon="translate"
      compact
    >
      {showTranslation ? 'Hide Translation' : 'Show Translation'}
    </Button>
  </View>
)}

{/* Translation Overlay */}
<TranslationOverlay
  text={content.text}
  visible={showTranslation}
  onDismiss={() => setShowTranslation(false)}
/>
```

Add styles:
```typescript
translationToggle: {
  marginBottom: 12,
},
```

- [ ] **Step 4: Verify listen translation**

1. Go to Settings → Translation, ensure Listen Translation is enabled
2. Open a listen practice, tap "Show Translation"
3. Verify translation appears below the header
4. Tap "Hide Translation" — overlay disappears
5. If translation setting is off, the toggle button shouldn't appear

- [ ] **Step 5: Commit**

```bash
cd mobile
git add src/hooks/useTranslation.ts src/components/listen/TranslationOverlay.tsx app/practice/listen/\\[id\\].tsx
git commit -m "feat(mobile): add translation overlay to listen practice screen"
```

---

## Task 6: Fix Home Screen Stats Display

Update the home screen to properly display stats from the dashboard store and show a "Today" section.

**Files:**
- Modify: `mobile/app/(tabs)/index.tsx`

- [ ] **Step 1: Add today's review card and recent activity**

In `mobile/app/(tabs)/index.tsx`, add imports:
```typescript
import { useReviewStore } from '@/stores/useReviewStore';
```

After the Quick Actions section, add a Today section:

```tsx
{/* Today's Summary */}
<View style={styles.section}>
  <Text variant="titleLarge" style={[styles.sectionTitle, { color: colors.onBackground }]}>
    Today
  </Text>

  {/* Today's Activity */}
  <Animated.View entering={FadeInDown.delay(1100)}>
    <Card variant="elevated" padding={0} style={styles.todayCard}>
      <View style={styles.todayContent}>
        <View style={styles.todayRow}>
          <View style={styles.todayItem}>
            <MaterialCommunityIcons name="clock-outline" size={20} color="#AF52DE" />
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Study Time</Text>
            <Text variant="titleMedium" style={[styles.todayValue, { color: colors.onSurface }]}>
              {stats.totalStudyTime}m
            </Text>
          </View>
          <View style={styles.todayItem}>
            <MaterialCommunityIcons name="check-circle-outline" size={20} color="#34C759" />
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Lessons</Text>
            <Text variant="titleMedium" style={[styles.todayValue, { color: colors.onSurface }]}>
              {stats.lessonsCompleted}
            </Text>
          </View>
          <View style={styles.todayItem}>
            <MaterialCommunityIcons name="book-open-variant" size={20} color="#FF9500" />
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Words</Text>
            <Text variant="titleMedium" style={[styles.todayValue, { color: colors.onSurface }]}>
              {stats.wordsLearned}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  </Animated.View>
</View>
```

Add the `Card` import if not already present:
```typescript
import { Card } from '@/components/ui/Card';
```

Add styles for the new section:
```typescript
todayCard: {
  marginBottom: 12,
},
todayContent: {
  padding: 20,
},
todayRow: {
  flexDirection: 'row',
  justifyContent: 'space-around',
},
todayItem: {
  alignItems: 'center',
  gap: 4,
},
todayValue: {
  fontWeight: '700',
},
```

- [ ] **Step 2: Verify home screen updates**

1. Complete a practice session (any module)
2. Go back to Home
3. Verify: session count increments, streak shows correctly, Today section shows updated stats

- [ ] **Step 3: Commit**

```bash
cd mobile
git add app/\(tabs\)/index.tsx
git commit -m "feat(mobile): add Today summary section to home screen"
```

---

## Task 7: Recommendations Toggle in Settings

Add the recommendations settings (enable/disable, count) from web to mobile.

**Files:**
- Modify: `mobile/app/(tabs)/settings.tsx`

- [ ] **Step 1: Add recommendations section to settings**

In `mobile/app/(tabs)/settings.tsx`, add after the Translation section:

```tsx
{/* Recommendations Section */}
<View style={styles.section}>
  <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
    AI Recommendations
  </Text>
  <Card variant="elevated" padding={0}>
    <View style={styles.settingItem}>
      <View style={styles.settingInfo}>
        <View style={[styles.settingIconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
          <MaterialCommunityIcons name="lightbulb-on" size={24} color={theme.colors.primary} />
        </View>
        <View style={styles.settingText}>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
            Enable Recommendations
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            AI-powered content suggestions
          </Text>
        </View>
      </View>
      <Switch
        value={settings.enableRecommendations}
        onValueChange={(value) => updateSettings({ enableRecommendations: value })}
      />
    </View>
  </Card>
</View>
```

- [ ] **Step 2: Commit**

```bash
cd mobile
git add app/\(tabs\)/settings.tsx
git commit -m "feat(mobile): add AI recommendations toggle to settings"
```

---

## Task 8: Language Settings Section

Add UI language configuration to settings.

**Files:**
- Create: `mobile/src/components/settings/LanguageSection.tsx`
- Modify: `mobile/app/(tabs)/settings.tsx`

- [ ] **Step 1: Create LanguageSection component**

Create `mobile/src/components/settings/LanguageSection.tsx`:

```typescript
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Menu, Text, useTheme } from 'react-native-paper';
import { Card } from '@/components/ui/Card';
import { useSettingsStore } from '@/stores/useSettingsStore';

const UI_LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'zh', label: '中文 (Chinese)' },
  { id: 'ja', label: '日本語 (Japanese)' },
  { id: 'ko', label: '한국어 (Korean)' },
];

export function LanguageSection() {
  const theme = useTheme();
  const { settings, updateSettings } = useSettingsStore();
  const [menuVisible, setMenuVisible] = useState(false);

  const selectedLang = UI_LANGUAGES.find((l) => l.id === settings.language);

  return (
    <Card variant="elevated" padding={0}>
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <Pressable style={styles.settingItem} onPress={() => setMenuVisible(true)}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                <MaterialCommunityIcons name="web" size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.settingText}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                  Interface Language
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {selectedLang?.label || 'English'}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-down" size={24} color={theme.colors.onSurfaceVariant} />
          </Pressable>
        }
      >
        {UI_LANGUAGES.map((lang) => (
          <Menu.Item
            key={lang.id}
            onPress={() => {
              updateSettings({ language: lang.id });
              setMenuVisible(false);
            }}
            title={lang.label}
            leadingIcon={lang.id === settings.language ? 'check' : undefined}
          />
        ))}
      </Menu>
    </Card>
  );
}

const styles = StyleSheet.create({
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 60,
  },
  settingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
});
```

- [ ] **Step 2: Add to settings page**

In `mobile/app/(tabs)/settings.tsx`, add import and section after Appearance:

```typescript
import { LanguageSection } from '@/components/settings/LanguageSection';
```

```tsx
{/* Language Section */}
<View style={styles.section}>
  <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
    Language
  </Text>
  <LanguageSection />
</View>
```

- [ ] **Step 3: Commit**

```bash
cd mobile
git add src/components/settings/LanguageSection.tsx app/\(tabs\)/settings.tsx
git commit -m "feat(mobile): add interface language settings section"
```

---

## Self-Review Checklist

### Spec coverage
- [x] Dashboard data wiring → Task 1
- [x] AI provider settings → Task 2 + 3
- [x] AI chat integration → Task 4
- [x] Listen translation → Task 5
- [x] Home screen stats fix → Task 6
- [x] Recommendations settings → Task 7
- [x] Language settings → Task 8

### Items deferred to Phase 2 plan (separate document)
- Read module speech recognition
- Speak module conversation mode
- Wordbook browsing
- Cloud sync engine
- Selection translation fix
- Write error handling UX
- Shadow reading
- AI recommendations panel in practice modules
- Cross-module navigation
- Tab bar labels
- Favorites page

### Placeholder scan
- No TBD, TODO, or "implement later" in any step
- All code blocks include complete implementations
- All file paths are exact

### Type consistency
- `Settings` interface matches between `types/user.ts` and `useSettingsStore.ts`
- `ChatMessage` type in `chat-api.ts` matches the message shape in `useChatStore`
- `TranslationResult` type used consistently between hook and service
- `recordPracticeSession` signature matches between interface and all 4 callers

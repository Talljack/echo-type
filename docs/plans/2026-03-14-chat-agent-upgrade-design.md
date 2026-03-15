# Chat Agent Upgrade: Tool Calling + Conversation History

**Date**: 2026-03-14
**Status**: Draft

## Problem

The chat panel is a text-only chatbot. It cannot take actions — no tool calling, no intent recognition, no side effects. Three critical gaps:

1. **No conversation history** — `newConversation()` wipes messages with no way to restore
2. **No content import from chat** — pasting a YouTube URL does nothing
3. **No intent-based actions** — toolbar buttons for navigation/search instead of AI understanding user intent

## Solution: AI SDK Tool Calling + IndexedDB History

### Architecture

```
User input → Chat API (streamText + tools) → AI decides:
  ├─ Text response → stream to client
  └─ Tool call → client executes action → result fed back to AI → AI confirms
```

**Key technology**: Vercel AI SDK `tool()` with `streamText()` for server-side tool definitions, client-side `useChat()` or manual stream parsing for tool execution.

---

## Part 1: Agent Tool System (17 Tools)

### API Route Changes (`src/app/api/chat/route.ts`)

Replace pure `streamText()` with tool-augmented streaming:

```ts
import { streamText, tool } from 'ai';
import { z } from 'zod';

const result = streamText({
  model,
  system: systemPrompt,
  messages,
  tools: {
    navigate: tool({
      description: 'Navigate to an app page. Available: /dashboard, /listen, /speak, /read, /write, /library, /settings, /review',
      parameters: z.object({
        path: z.string().describe('The route path'),
        reason: z.string().describe('Why navigating here'),
      }),
    }),
    importYouTube: tool({
      description: 'Import a YouTube video transcript into the learning library',
      parameters: z.object({
        url: z.string().url().describe('YouTube video URL'),
      }),
    }),
    // ... all 17 tools
  },
  maxSteps: 3, // allow multi-step tool usage
});
```

### Tool Definitions

#### Content Import & Generation

| Tool | Parameters | Server/Client |
|------|-----------|---------------|
| `importYouTube` | `{ url: string }` | Client — calls `/api/import/youtube`, saves to content store |
| `importUrl` | `{ url: string }` | Client — calls `/api/import/url`, saves to content store |
| `addTextContent` | `{ title: string, text: string, type: ContentType }` | Client — saves directly to content store |
| `generateContent` | `{ topic: string, words?: string[], type: 'scenario' \| 'article' \| 'dialogue' }` | Server — AI generates content, client saves to store |

#### Content Discovery & Loading

| Tool | Parameters | Execution |
|------|-----------|-----------|
| `searchLibrary` | `{ query: string, type?: ContentType }` | Client — queries content store, returns results to AI |
| `searchWordBooks` | `{ query: string }` | Client — searches ALL_WORDBOOKS catalog |
| `loadContent` | `{ contentId: string }` | Client — sets active content in chat store |

#### Practice & Exercises

| Tool | Parameters | Execution |
|------|-----------|-----------|
| `startExercise` | `{ type: ExerciseType }` | Client — sets exercise type, AI generates exercise in same response |
| `startPracticeSession` | `{ contentId: string, module: 'listen' \| 'speak' \| 'read' \| 'write' }` | Client — loads content + navigates to module |

#### Navigation & UI

| Tool | Parameters | Execution |
|------|-----------|-----------|
| `navigate` | `{ path: string, reason: string }` | Client — `router.push(path)` |
| `speakText` | `{ text: string }` | Client — triggers TTS via `useTTS` hook |

#### Analytics & Review

| Tool | Parameters | Execution |
|------|-----------|-----------|
| `showAnalytics` | `{}` | Client — calls `collectLearningSnapshot()`, returns data to AI |
| `showTodaySessions` | `{}` | Client — queries today's sessions from IndexedDB |
| `showTodayStats` | `{}` | Client — queries today's stats (sessions, words, accuracy) |
| `showDueReviews` | `{}` | Client — queries due review items |

#### Settings

| Tool | Parameters | Execution |
|------|-----------|-----------|
| `updateUserLevel` | `{ level: string }` | Client — updates assessment store |
| `updateProviderConfig` | `{ providerId: string, apiKey?: string, model?: string, baseUrl?: string }` | Client — updates provider store |

### System Prompt Addition

```
You are an AI English tutor with the ability to take actions. When the user wants to:
- Navigate somewhere → use the navigate tool
- Import content (YouTube, URL, text) → use the appropriate import tool
- Search for content → use searchLibrary or searchWordBooks
- Practice exercises → use startExercise or startPracticeSession
- Check progress → use showAnalytics, showTodaySessions, or showTodayStats
- Configure settings → use updateUserLevel or updateProviderConfig

ALWAYS use tools when the user's intent matches an action. Do NOT just describe how to do it — actually do it.
When a user shares a YouTube or article URL, proactively import it.
```

### Client-Side Tool Execution

The chat panel needs a tool executor that maps tool names to client-side actions:

```ts
// src/lib/chat-tool-executor.ts
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  context: { router, contentStore, chatStore, providerStore, assessmentStore }
): Promise<string> {
  switch (toolName) {
    case 'navigate':
      context.router.push(args.path as string);
      return `Navigated to ${args.path}`;

    case 'importYouTube': {
      const res = await fetch('/api/import/youtube', {
        method: 'POST',
        body: JSON.stringify({ url: args.url }),
      });
      const data = await res.json();
      // Save to content store
      await context.contentStore.addContent({
        id: crypto.randomUUID(),
        title: `YouTube: ${args.url}`,
        text: data.fullText,
        type: 'article',
        // ...
      });
      return `Imported YouTube video with ${data.segmentCount} segments`;
    }
    // ... other tools
  }
}
```

---

## Part 2: Conversation History

### Database Schema

Add to `src/lib/db.ts`:

```ts
// New table in Dexie schema
conversations: 'id, updatedAt'

interface Conversation {
  id: string;
  title: string;           // Auto from first user message (first 50 chars)
  messages: ChatMessage[];
  chatMode: ChatMode;
  activeContentId: string | null;
  createdAt: number;
  updatedAt: number;
}
```

### Store Changes (`chat-store.ts`)

- Add `conversationList: Conversation[]` state
- Add `loadConversationList()` — fetch from Dexie, sorted by updatedAt
- Add `switchConversation(id)` — load messages from Dexie record
- Modify `addMessage()` — auto-save to current Dexie conversation
- Modify `newConversation()` — save current to Dexie first, then create fresh
- Remove `localStorage` persistence entirely

### UI: Conversation List

Replace the `+` button in the header with a conversation history dropdown:

```
[Bot icon] AI English Tutor [Groq] [mode]     [history ▾] [×]
```

Clicking `[history ▾]` shows a dropdown:
- "New Conversation" button at top
- List of recent conversations (last 20)
- Each shows: title (truncated) + relative time
- Click to switch; current conversation auto-saves first

---

## Part 3: Toolbar Cleanup

### Remove (replaced by agent tools)
- Library button → AI does `searchLibrary` / `loadContent`
- Search button → AI does `searchLibrary` / `searchWordBooks`
- Analytics button → AI does `showAnalytics`
- Settings button → AI does `navigate({ path: '/settings' })`

### Keep
- Mic (voice input) — physical hardware toggle, not an AI intent
- Expand/Collapse — UI size preference

### New toolbar (2 buttons only)
```
[🎤 Mic] [↗ Expand]
```

---

## Part 4: Stream Protocol Change

### Current (text-only)
```
Client: fetch('/api/chat', body) → ReadableStream → text chunks → display
```

### New (text + tool calls)
Option A: Use AI SDK `useChat` hook (handles tool calling natively)
Option B: Keep manual fetch but parse AI SDK's data stream protocol

**Recommendation**: Use `useChat` from `ai/react` for cleaner tool handling:

```tsx
const { messages, input, handleSubmit, isLoading } = useChat({
  api: '/api/chat',
  body: { provider, context, userLevel, providerConfigs },
  onToolCall: async ({ toolCall }) => {
    const result = await executeTool(toolCall.toolName, toolCall.args, context);
    return result; // fed back to AI
  },
});
```

This replaces the entire manual fetch/stream/updateLastAssistantMessage logic.

---

## Implementation Order

1. **Add Dexie conversations table** — DB migration (v5 → v6), schema
2. **Conversation history store** — save/load/switch conversations
3. **Conversation history UI** — dropdown in header
4. **Define all 17 tools** — in chat API route
5. **Build tool executor** — client-side action handlers
6. **Switch to useChat hook** — replace manual streaming
7. **Update system prompt** — teach AI to use tools
8. **Remove redundant toolbar** — strip to Mic + Expand
9. **Write vitest unit tests** — tool executor, store logic, DB operations
10. **Run E2E tests with agent-browser** — full user flow verification

## Files to Modify/Create

| File | Change |
|------|--------|
| `src/lib/db.ts` | Add `conversations` table (version 6) |
| `src/types/chat.ts` | Add `Conversation` type, `ToolCallResult` type |
| `src/stores/chat-store.ts` | Conversation list, save/load/switch, remove localStorage |
| `src/app/api/chat/route.ts` | 17 tool definitions, updated system prompt |
| `src/lib/chat-tool-executor.ts` | **New** — client-side tool execution map |
| `src/components/chat/chat-panel.tsx` | `useChat` hook, `onToolCall` handler, conversation UI |
| `src/components/chat/chat-history.tsx` | **New** — conversation history dropdown |
| `src/components/chat/chat-toolbar.tsx` | Strip to Mic + Expand only |
| `src/lib/chat-tool-executor.test.ts` | **New** — vitest unit tests for tool executor |
| `src/stores/chat-store.test.ts` | **New** — vitest tests for conversation CRUD |
| `src/app/api/chat/route.test.ts` | **New** — vitest tests for tool schema validation |

---

## Implementation Checklist

### Step 1: Database & Types

- [ ] Add `Conversation` interface to `src/types/chat.ts`
- [ ] Add `ToolCallResult` type to `src/types/chat.ts`
- [ ] Add `conversations` table to `src/lib/db.ts` (version 6)
- [ ] Schema: `id, updatedAt` indexes
- [ ] Verify DB migration works (dev server starts without errors)

### Step 2: Conversation History Store

- [ ] Add `conversationList: Conversation[]` to chat store state
- [ ] Implement `loadConversationList()` — Dexie query, sort by updatedAt desc, limit 50
- [ ] Implement `saveConversation()` — upsert current messages to Dexie
- [ ] Implement `switchConversation(id)` — load messages from Dexie, set as current
- [ ] Implement `deleteConversation(id)` — remove from Dexie + list
- [ ] Modify `newConversation()` — save current first, then create fresh
- [ ] Modify `addMessage()` — auto-save to Dexie on each message (debounced)
- [ ] Remove all `localStorage` persistence (`STORAGE_KEY`, `loadMessages`, `saveMessages`)
- [ ] Auto-generate conversation title from first user message (first 50 chars)

### Step 3: Conversation History UI

- [ ] Create `src/components/chat/chat-history.tsx` dropdown component
- [ ] "New Conversation" button at top of dropdown
- [ ] List of recent conversations (title + relative time like "2h ago")
- [ ] Click to switch conversation (auto-saves current first)
- [ ] Swipe or button to delete a conversation
- [ ] Replace `+` header button with history dropdown trigger
- [ ] Empty state: "No previous conversations"

### Step 4: Define All 17 Tools (API Route)

- [ ] Import `tool` from `ai` and `z` from `zod`
- [ ] Define `navigate` tool with path + reason params
- [ ] Define `importYouTube` tool with url param
- [ ] Define `importUrl` tool with url param
- [ ] Define `addTextContent` tool with title, text, type params
- [ ] Define `generateContent` tool with topic, words, type params
- [ ] Define `searchLibrary` tool with query, type params
- [ ] Define `searchWordBooks` tool with query param
- [ ] Define `loadContent` tool with contentId param
- [ ] Define `startExercise` tool with type param
- [ ] Define `startPracticeSession` tool with contentId, module params
- [ ] Define `speakText` tool with text param
- [ ] Define `showAnalytics` tool (no params)
- [ ] Define `showTodaySessions` tool (no params)
- [ ] Define `showTodayStats` tool (no params)
- [ ] Define `showDueReviews` tool (no params)
- [ ] Define `updateUserLevel` tool with level param
- [ ] Define `updateProviderConfig` tool with providerId, apiKey, model, baseUrl params
- [ ] Set `maxSteps: 3` for multi-step tool use

### Step 5: Build Tool Executor

- [ ] Create `src/lib/chat-tool-executor.ts`
- [ ] Implement `executeTool(toolName, args, context)` dispatcher
- [ ] Handler: `navigate` — `router.push(path)`, return confirmation
- [ ] Handler: `importYouTube` — fetch `/api/import/youtube`, save to contentStore
- [ ] Handler: `importUrl` — fetch `/api/import/url`, save to contentStore
- [ ] Handler: `addTextContent` — create ContentItem, save to contentStore
- [ ] Handler: `generateContent` — return topic/words to AI for generation, then save result
- [ ] Handler: `searchLibrary` — query contentStore, return JSON results to AI
- [ ] Handler: `searchWordBooks` — search ALL_WORDBOOKS, return matches
- [ ] Handler: `loadContent` — set active content in chatStore
- [ ] Handler: `startExercise` — set exercise type, return confirmation
- [ ] Handler: `startPracticeSession` — load content + router.push to module
- [ ] Handler: `speakText` — trigger TTS, return confirmation
- [ ] Handler: `showAnalytics` — call `collectLearningSnapshot()`, return JSON
- [ ] Handler: `showTodaySessions` — query today's sessions from Dexie
- [ ] Handler: `showTodayStats` — aggregate today's stats
- [ ] Handler: `showDueReviews` — query due review items
- [ ] Handler: `updateUserLevel` — update assessment store
- [ ] Handler: `updateProviderConfig` — update provider store
- [ ] Error handling: return error string for failed tools (never throw)

### Step 6: Switch to useChat Hook

- [ ] Install/verify `ai` package has `useChat` support
- [ ] Replace manual `fetch` + `ReadableStream` logic in `chat-panel.tsx`
- [ ] Use `useChat({ api, body, onToolCall })` from `ai/react`
- [ ] Wire `onToolCall` to `executeTool()` with all store/router refs
- [ ] Map `useChat` `messages` to existing `ChatMessageComponent` rendering
- [ ] Handle `isLoading` state for streaming indicator / "Thinking..."
- [ ] Preserve existing rich block parsing (`parseBlocks`) on assistant messages
- [ ] Handle provider notice headers (`x-provider-id`, etc.)
- [ ] Verify streaming still works end-to-end

### Step 7: Update System Prompt

- [ ] Add tool usage instructions to `BASE_SYSTEM_PROMPT`
- [ ] List all available tools with when to use each
- [ ] Add "ALWAYS use tools when intent matches action" instruction
- [ ] Add "Proactively import when user shares YouTube/article URL" instruction
- [ ] Add "After tool execution, confirm the result to the user" instruction

### Step 8: Toolbar Cleanup

- [ ] Remove Library button from `chat-toolbar.tsx`
- [ ] Remove Search button from `chat-toolbar.tsx`
- [ ] Remove Analytics button from `chat-toolbar.tsx`
- [ ] Remove Settings button from `chat-toolbar.tsx`
- [ ] Keep Mic button
- [ ] Keep Expand/Collapse button
- [ ] Remove `ChatContentPicker` component import from `chat-panel.tsx`
- [ ] Remove `ChatSearchPanel` component import from `chat-panel.tsx`
- [ ] Remove `ChatModeSelector` component import from `chat-panel.tsx`
- [ ] Clean up unused state: `showLibrary`, `showSearch`, `activeExercise`
- [ ] Verify toolbar renders correctly with only 2 buttons

### Step 9: Build Pass — Zero Errors

- [ ] `pnpm build` completes with zero TypeScript errors
- [ ] `pnpm lint` passes with no new warnings
- [ ] Dev server starts and loads dashboard without console errors

---

## Test Plan: Vitest Unit Tests

Test files to create under `src/`:

### `src/lib/chat-tool-executor.test.ts`

```
describe('executeTool')
  ├─ it('navigate: calls router.push with correct path')
  ├─ it('navigate: returns confirmation message')
  ├─ it('importYouTube: calls /api/import/youtube with URL')
  ├─ it('importYouTube: saves content to store on success')
  ├─ it('importYouTube: returns error string on fetch failure')
  ├─ it('importUrl: calls /api/import/url with URL')
  ├─ it('addTextContent: creates ContentItem with correct fields')
  ├─ it('searchLibrary: returns matching items as JSON')
  ├─ it('searchLibrary: returns empty array for no matches')
  ├─ it('searchWordBooks: searches ALL_WORDBOOKS catalog')
  ├─ it('loadContent: sets active content in chat store')
  ├─ it('startExercise: sets exercise type')
  ├─ it('startPracticeSession: loads content + navigates')
  ├─ it('speakText: triggers TTS')
  ├─ it('showAnalytics: returns learning snapshot JSON')
  ├─ it('showTodaySessions: returns today sessions')
  ├─ it('showTodayStats: returns aggregated stats')
  ├─ it('showDueReviews: returns due items')
  ├─ it('updateUserLevel: updates assessment store')
  ├─ it('updateProviderConfig: updates provider store')
  └─ it('unknown tool: returns error message')
```

### `src/stores/chat-store.test.ts`

```
describe('conversation history')
  ├─ it('saveConversation: persists messages to Dexie')
  ├─ it('loadConversationList: returns sorted by updatedAt')
  ├─ it('switchConversation: loads correct messages')
  ├─ it('newConversation: saves current before clearing')
  ├─ it('newConversation: creates fresh conversationId')
  ├─ it('deleteConversation: removes from Dexie')
  ├─ it('auto-title: uses first user message text')
  └─ it('hydrate: loads latest conversation from Dexie')
```

### `src/app/api/chat/route.test.ts`

```
describe('chat API tool schemas')
  ├─ it('all 17 tools are defined in tools object')
  ├─ it('navigate: validates path is string')
  ├─ it('importYouTube: validates url format')
  ├─ it('updateProviderConfig: validates providerId enum')
  └─ it('tools with no params: accept empty object')
```

### Vitest Run Checklist

- [ ] `pnpm vitest run src/lib/chat-tool-executor.test.ts` — all pass
- [ ] `pnpm vitest run src/stores/chat-store.test.ts` — all pass
- [ ] `pnpm vitest run src/app/api/chat/route.test.ts` — all pass
- [ ] `pnpm vitest run` — full suite, zero failures

---

## Test Plan: E2E Tests (agent-browser)

All E2E tests run against `http://localhost:3000` with the dev server.

### E2E-1: Conversation History

- [ ] Open chat → send a message → wait for response
- [ ] Click "New Conversation" → verify chat clears to empty state
- [ ] Open history dropdown → verify previous conversation appears with title
- [ ] Click previous conversation → verify messages restore correctly
- [ ] Verify restored conversation shows correct mode badge if applicable
- [ ] Delete a conversation from history → verify it disappears
- [ ] Close chat → reopen → verify current conversation persists

### E2E-2: Tool — Navigate

- [ ] Type "打开设置页面" → verify AI calls navigate tool → page changes to /settings
- [ ] Type "go to library" → verify navigation to /library
- [ ] Type "带我去听力练习" → verify navigation to /listen

### E2E-3: Tool — Import YouTube

- [ ] Type "导入这个YouTube视频 https://www.youtube.com/watch?v=dQw4w9WgXcQ"
- [ ] Verify AI calls importYouTube tool
- [ ] Verify success confirmation message from AI
- [ ] Open Library → verify new content item exists with YouTube transcript

### E2E-4: Tool — Import URL

- [ ] Type "帮我导入这篇文章 https://example.com"
- [ ] Verify AI calls importUrl tool
- [ ] Verify content saved to library

### E2E-5: Tool — Add Text Content

- [ ] Type "把这段文字加入学习库：The weather today is sunny and warm"
- [ ] Verify AI calls addTextContent tool
- [ ] Verify content item created in library

### E2E-6: Tool — Generate Content

- [ ] Type "给我生成一段关于天气的场景对话"
- [ ] Verify AI calls generateContent tool
- [ ] Verify generated content saved to library

### E2E-7: Tool — Search Library

- [ ] Type "搜一下我有没有关于travel的内容"
- [ ] Verify AI calls searchLibrary tool
- [ ] Verify AI responds with search results

### E2E-8: Tool — Search WordBooks

- [ ] Type "有什么商务英语的wordbook吗"
- [ ] Verify AI calls searchWordBooks tool
- [ ] Verify AI lists matching wordbooks

### E2E-9: Tool — Load Content + Exercise

- [ ] Type "加载 sound 这个单词来练习"
- [ ] Verify AI calls loadContent → content bar appears
- [ ] Type "给我出个填空题"
- [ ] Verify AI calls startExercise → fill-blank block rendered

### E2E-10: Tool — Start Practice Session

- [ ] Type "我想用这篇文章练听力"
- [ ] Verify AI calls startPracticeSession → navigates to /listen with content loaded

### E2E-11: Tool — Analytics

- [ ] Type "看看我的学习进度"
- [ ] Verify AI calls showAnalytics → analytics block rendered

### E2E-12: Tool — Today Sessions / Stats

- [ ] Type "我今天练习了什么"
- [ ] Verify AI calls showTodaySessions → lists today's activities
- [ ] Type "统计一下今天的练习情况"
- [ ] Verify AI calls showTodayStats → shows stats summary

### E2E-13: Tool — Due Reviews

- [ ] Type "今天有什么需要复习的"
- [ ] Verify AI calls showDueReviews → lists due items or "nothing due"

### E2E-14: Tool — Update User Level

- [ ] Type "我的英语水平是B2"
- [ ] Verify AI calls updateUserLevel → confirms level updated

### E2E-15: Tool — Update Provider Config

- [ ] Type "帮我配置OpenAI，模型用gpt-4o"
- [ ] Verify AI calls updateProviderConfig → confirms provider configured

### E2E-16: Tool — Speak Text

- [ ] Type "帮我读一下 Hello, how are you today?"
- [ ] Verify AI calls speakText → TTS plays (or at least tool is invoked)

### E2E-17: Toolbar Cleanup

- [ ] Verify toolbar shows only Mic + Expand buttons
- [ ] Verify Library/Search/Analytics/Settings buttons are removed
- [ ] Verify Mic button still toggles voice input
- [ ] Verify Expand button still toggles panel size

### E2E-18: UI Polish

- [ ] Panel opens with correct height (70vh compact, 85vh expanded)
- [ ] FAB hidden when panel open, visible when closed
- [ ] Auto-scroll works during tool call responses
- [ ] Word-break works on long tool result messages
- [ ] Conversation history dropdown is scrollable with many entries
- [ ] Tool execution shows inline status (loading indicator)

### E2E Test Run Checklist

- [ ] E2E-1 Conversation History — PASS / FAIL
- [ ] E2E-2 Navigate — PASS / FAIL
- [ ] E2E-3 Import YouTube — PASS / FAIL
- [ ] E2E-4 Import URL — PASS / FAIL
- [ ] E2E-5 Add Text Content — PASS / FAIL
- [ ] E2E-6 Generate Content — PASS / FAIL
- [ ] E2E-7 Search Library — PASS / FAIL
- [ ] E2E-8 Search WordBooks — PASS / FAIL
- [ ] E2E-9 Load Content + Exercise — PASS / FAIL
- [ ] E2E-10 Practice Session — PASS / FAIL
- [ ] E2E-11 Analytics — PASS / FAIL
- [ ] E2E-12 Today Sessions/Stats — PASS / FAIL
- [ ] E2E-13 Due Reviews — PASS / FAIL
- [ ] E2E-14 Update User Level — PASS / FAIL
- [ ] E2E-15 Update Provider Config — PASS / FAIL
- [ ] E2E-16 Speak Text — PASS / FAIL
- [ ] E2E-17 Toolbar Cleanup — PASS / FAIL
- [ ] E2E-18 UI Polish — PASS / FAIL

---

## Completion Criteria

This feature is **DONE** only when ALL of the following are true:

1. All implementation checklist items (Steps 1-8) are checked off
2. `pnpm build` succeeds with zero errors
3. All vitest unit tests pass (`pnpm vitest run` — zero failures)
4. All 18 E2E test scenarios pass via agent-browser
5. If any test fails: fix the issue, update this doc, re-run until pass
6. This document is updated with final PASS/FAIL status for every test

**Status**: `Draft` → `In Progress` → `Testing` → `Complete`

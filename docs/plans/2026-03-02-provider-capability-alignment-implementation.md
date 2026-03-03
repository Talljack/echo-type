# Provider Capability Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a unified provider capability system so EchoType's Settings page controls a global default provider, AI features resolve providers by capability with fallback, and media transcription works as one-time upload without persistent storage.

**Architecture:** Add a shared provider metadata and resolver layer, then migrate each AI entry point to capability-based resolution. Implement Settings as a provider card list with recommended models per capability, and add a request-scoped media import flow that uses the same resolver as chat and generation.

**Tech Stack:** Next.js App Router, TypeScript, Zustand, Tailwind CSS, shadcn/ui, Route Handlers, browser File API, Vitest for resolver tests

---

### Task 1: Create provider metadata and capability primitives

**Files:**
- Create: `src/lib/providers.ts`
- Create: `src/lib/provider-capabilities.ts`
- Modify: `.env.example`
- Test: `src/lib/provider-capabilities.test.ts`

**Step 1: Write the failing test**

Create `src/lib/provider-capabilities.test.ts` with table-driven assertions for:

- Groq supports `chat`, `classify`, `transcribe`
- OpenAI supports `chat`, `classify`, `transcribe`
- Anthropic does not support `transcribe`
- recommended model exists for each supported capability under Groq and OpenAI

**Step 2: Run test to verify it fails**

Run: `pnpm vitest src/lib/provider-capabilities.test.ts`
Expected: FAIL because `provider-capabilities.ts` and test runner setup do not exist yet.

**Step 3: Write minimal implementation**

Add:

- provider registry metadata in `src/lib/providers.ts`
- capability matrix plus recommendation map in `src/lib/provider-capabilities.ts`
- missing env keys in `.env.example`

Keep scope tight:

- `openai`
- `groq`
- `anthropic`
- optional placeholders for future providers only if required by current UI

**Step 4: Run test to verify it passes**

Run: `pnpm vitest src/lib/provider-capabilities.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/providers.ts src/lib/provider-capabilities.ts src/lib/provider-capabilities.test.ts .env.example
git commit -m "feat: add provider capability metadata"
```

### Task 2: Add provider store and resolver

**Files:**
- Create: `src/stores/provider-store.ts`
- Create: `src/lib/provider-resolver.ts`
- Test: `src/lib/provider-resolver.test.ts`

**Step 1: Write the failing test**

Create `src/lib/provider-resolver.test.ts` covering:

- default provider resolves directly when capability is supported
- fallback to Groq when default provider lacks capability
- fallback to OpenAI when Groq is unavailable
- structured error when no provider is available

**Step 2: Run test to verify it fails**

Run: `pnpm vitest src/lib/provider-resolver.test.ts`
Expected: FAIL because resolver and store do not exist.

**Step 3: Write minimal implementation**

Implement:

- Zustand store for default provider, provider credentials, and optional model overrides
- resolver that accepts `capability`, available provider configs, and headers
- stable fallback chains per capability

The resolver return value must include:

- `providerId`
- `modelId`
- `fallbackApplied`
- `fallbackReason`
- `credentialSource`

**Step 4: Run test to verify it passes**

Run: `pnpm vitest src/lib/provider-resolver.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/stores/provider-store.ts src/lib/provider-resolver.ts src/lib/provider-resolver.test.ts
git commit -m "feat: add provider resolver with fallback"
```

### Task 3: Replace static Settings form with provider capability cards

**Files:**
- Modify: `src/app/(app)/settings/page.tsx`
- Create: `src/components/settings/provider-card-list.tsx`
- Create: `src/components/settings/provider-card.tsx`
- Create: `src/components/settings/model-recommendations.tsx`

**Step 1: Write the failing test**

If UI test infrastructure exists, add component tests for:

- default badge renders
- capability chips render
- recommended model groups render

If UI test infrastructure does not exist, skip automated UI test creation in this task and rely on manual verification.

**Step 2: Run test to verify it fails**

Run available component tests if present; otherwise note "No UI test harness in repo" and proceed.

**Step 3: Write minimal implementation**

Build the Settings UI as:

- provider list cards
- one global "Set as default" action
- connection state
- capability chips
- recommended models grouped by function
- compact rationale text such as "Best latency for chat" or "Recommended for transcription"

Keep styling flat and readable. Avoid heavy visual effects.

**Step 4: Run verification**

Run:

- `pnpm lint`
- `pnpm typecheck`

Then manually verify:

- `/settings` shows provider cards
- changing default provider updates global state

**Step 5: Commit**

```bash
git add src/app/(app)/settings/page.tsx src/components/settings/provider-card-list.tsx src/components/settings/provider-card.tsx src/components/settings/model-recommendations.tsx
git commit -m "feat: redesign settings provider selection"
```

### Task 4: Migrate chat and generate flows to capability-based resolution

**Files:**
- Modify: `src/components/chat/chat-panel.tsx`
- Modify: `src/app/api/chat/route.ts`
- Create: `src/app/api/ai/generate/route.ts`

**Step 1: Write the failing test**

Add resolver-level tests if route tests are not available:

- chat requests use `chat` capability
- generation requests use `generate` capability

**Step 2: Run test to verify it fails**

Run relevant vitest files.
Expected: FAIL because routes still hardcode or do not yet exist.

**Step 3: Write minimal implementation**

Changes:

- remove hardcoded `provider: 'openai'` from chat panel
- send current default provider or rely on server-side default resolution
- route resolves `chat` capability
- add generation route if missing and resolve `generate`

**Step 4: Run verification**

Run:

- `pnpm lint`
- `pnpm typecheck`

Manually verify:

- chat still streams
- changing default provider changes effective provider choice

**Step 5: Commit**

```bash
git add src/components/chat/chat-panel.tsx src/app/api/chat/route.ts src/app/api/ai/generate/route.ts
git commit -m "feat: route text features through provider resolver"
```

### Task 5: Add translation and classification services

**Files:**
- Create: `src/lib/classification.ts`
- Create: `src/app/api/translate/route.ts`
- Create: `src/app/api/tools/classify/route.ts`
- Test: `src/lib/classification.test.ts`

**Step 1: Write the failing test**

Test that classification normalizes output into:

- `type`
- `difficulty`
- `title`
- `tags`

Also test that local heuristic fallback returns at least `type` when no provider is available.

**Step 2: Run test to verify it fails**

Run: `pnpm vitest src/lib/classification.test.ts`
Expected: FAIL because helpers do not exist.

**Step 3: Write minimal implementation**

Implement:

- provider-based text classification helper
- route for translation using capability `translateText`
- route for classification using capability `classify`
- local heuristic fallback for minimal import success

**Step 4: Run test to verify it passes**

Run: `pnpm vitest src/lib/classification.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/classification.ts src/app/api/translate/route.ts src/app/api/tools/classify/route.ts src/lib/classification.test.ts
git commit -m "feat: add translation and classification capabilities"
```

### Task 6: Add one-time media transcription import

**Files:**
- Create: `src/components/import/media-import.tsx`
- Modify: `src/app/(app)/library/import/page.tsx`
- Modify: `src/app/api/import/transcribe/route.ts`
- Delete: `src/app/api/import/upload-media/route.ts`

**Step 1: Write the failing test**

At minimum, add resolver-level tests for:

- Groq transcription path uses Groq STT endpoint
- OpenAI transcription path uses OpenAI STT endpoint
- route rejects unsupported file types and oversize uploads

**Step 2: Run test to verify it fails**

Run transcription-related tests.
Expected: FAIL because route is OpenAI-only and media import UI does not exist.

**Step 3: Write minimal implementation**

Implement:

- `MediaImport` tab with drag-and-drop file selection
- request-scoped upload using `FormData`
- no persistent file storage
- route resolves `transcribe` capability
- optional post-transcription classification call to fill title, difficulty, and tags
- return segments plus classification metadata

Delete `upload-media` because it writes to `public/media` and is not needed for one-time import.

**Step 4: Run verification**

Run:

- `pnpm lint`
- `pnpm typecheck`

Manual checks:

- audio file transcribes using default provider when supported
- fallback provider engages when needed
- imported content lands in Dexie without storing the raw media

**Step 5: Commit**

```bash
git add src/components/import/media-import.tsx src/app/(app)/library/import/page.tsx src/app/api/import/transcribe/route.ts src/app/api/import/upload-media/route.ts
git commit -m "feat: add one-time media transcription import"
```

### Task 7: Add fallback visibility and polish

**Files:**
- Modify: `src/components/chat/chat-panel.tsx`
- Modify: `src/components/import/media-import.tsx`
- Modify: `src/app/(app)/settings/page.tsx`

**Step 1: Write the failing test**

If component tests exist, add assertions for fallback badges/notices. Otherwise prepare manual verification checklist.

**Step 2: Run test to verify it fails**

Run available UI checks or note the absence of a UI harness.

**Step 3: Write minimal implementation**

Add visible but low-noise notices such as:

- "Using Groq fallback for transcription"
- "Default provider does not support this feature"

Show these only when useful; do not clutter the main flows.

**Step 4: Run verification**

Run:

- `pnpm lint`
- `pnpm typecheck`

Manual verification:

- fallback notice appears when expected
- unsupported capability states are clear in Settings

**Step 5: Commit**

```bash
git add src/components/chat/chat-panel.tsx src/components/import/media-import.tsx src/app/(app)/settings/page.tsx
git commit -m "feat: surface provider fallback states"
```

### Task 8: Final verification

**Files:**
- Check: `src/lib/providers.ts`
- Check: `src/lib/provider-capabilities.ts`
- Check: `src/lib/provider-resolver.ts`
- Check: `src/app/(app)/settings/page.tsx`
- Check: `src/app/api/chat/route.ts`
- Check: `src/app/api/import/transcribe/route.ts`
- Check: `src/components/import/media-import.tsx`

**Step 1: Run automated verification**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm vitest
```

Expected:

- lint passes
- typecheck passes
- resolver and classification tests pass

**Step 2: Run manual product verification**

Verify:

- Settings provider cards render correctly on desktop and mobile
- selecting Groq as default updates chat behavior
- media transcription works without storing files
- unsupported capabilities fall back predictably
- imported transcript is saved into Dexie

**Step 3: Commit**

```bash
git add .
git commit -m "feat: align provider capabilities across AI features"
```

# EchoType Provider Capability Alignment Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align EchoType's AI provider selection so that Settings defines one global default provider, all AI features consume that configuration, and unsupported capabilities automatically fall back through a documented capability matrix.

**Architecture:** Introduce a provider capability layer between feature routes and provider-specific API calls. Store one global default provider plus per-provider credentials locally, resolve each AI request by capability (`chat`, `generate`, `classify`, `translateText`, `transcribe`, `translateAudio`), and apply deterministic fallback rules when the default provider lacks support.

**Tech Stack:** Next.js App Router, TypeScript, Zustand, Route Handlers, Tailwind CSS, shadcn/ui, browser File API, external AI provider APIs

---

## 1. Problem Summary

The current repository mixes two different AI configuration models. The Settings page is still a static form, the chat UI hardcodes `openai`, and media transcription is coupled directly to OpenAI Whisper. That creates three defects:

1. The provider selected in Settings is not actually global.
2. Feature coverage is inconsistent across chat, generation, translation, classification, and transcription.
3. Provider limitations are hidden in code instead of surfaced in the product.

The user goal is stricter than "make Groq transcription work." The product should treat provider configuration as a first-class system concern. If the user sets Groq as the default provider, chat, intelligent classification, translation, and transcription should all attempt to use Groq first. If Groq does not support a capability in the current implementation, the system should fall back predictably instead of silently diverging or failing for unclear reasons.

The design therefore introduces a capability matrix and a unified resolver. Features ask for a capability, not a provider-specific implementation. The resolver chooses the effective provider and recommended model based on current settings, available credentials, and fallback policy.

## 2. Capability Model

Provider support should be declared per capability, not with one coarse "supports AI" flag. The minimum capability set for EchoType is:

- `chat`
- `generate`
- `classify`
- `translateText`
- `transcribe`
- `translateAudio`
- reserved: `evaluate`

Each provider definition should include:

- supported capabilities
- default model per capability
- display metadata for Settings UI
- auth source and env fallback
- optional recommendation notes such as "best latency" or "best transcription accuracy"

This is intentionally more granular than the current route layout. Text translation and audio translation are separate because providers often support one and not the other. Classification is also separate from chat because the product should be able to recommend a cheaper or faster model for content typing, difficulty inference, and tag generation than for conversational tutoring.

With this structure, the product stops treating models as one generic list. Instead, it can present "recommended for this system function" in Settings and route requests to the right model family by default.

## 3. Fallback Strategy

The chosen solution is "global default provider plus automatic capability fallback."

Rules:

1. Settings defines one global default provider.
2. Every AI request declares its capability.
3. The resolver checks whether the default provider supports the capability and has usable credentials.
4. If yes, the request uses the default provider.
5. If not, the resolver applies a fixed fallback chain for that capability.
6. If no provider in the chain is available, the API returns a structured capability error.

Recommended fallback chains:

- `chat`, `generate`, `classify`, `translateText`
  - default provider -> `groq` -> `openai`
- `transcribe`, `translateAudio`
  - default provider -> `groq` -> `openai`
- `evaluate`
  - default provider -> `openai`

This keeps the product predictable. Groq can act as the low-friction fallback for fast text and speech features when `GROQ_FREE_KEY` is present. OpenAI remains the stable secondary fallback for capabilities that are already wired in the codebase. The fallback order must be visible in logs and inspectable in the response metadata during development.

## 4. Unified Resolver Architecture

Feature routes should stop choosing providers inline. Instead, the system should add three shared modules:

- `provider-capabilities.ts`
  - declares capability support and default model recommendations
- `provider-resolver.ts`
  - resolves `effectiveProvider`, `effectiveModel`, `apiKeySource`, and fallback reason
- `provider-store.ts`
  - persists the user's global default provider, provider configs, and optional model overrides

The resolver contract should look conceptually like:

```ts
resolveProviderForCapability({
  capability: 'transcribe',
  requestedProviderId: 'groq',
  headers,
  storedConfigs,
})
```

and return:

```ts
{
  providerId: 'groq',
  modelId: 'whisper-large-v3-turbo',
  fallbackApplied: false,
  credentialSource: 'env',
}
```

Routes then call provider-specific clients through a single normalized flow. Chat, generation, classification, translation, and transcription all share the same decision path, even if the underlying endpoint shapes differ. This is the core alignment mechanism. Without it, Settings remains cosmetic.

## 5. Feature-by-Feature Data Flow

### Chat

The chat panel should stop hardcoding `provider: 'openai'`. It should read the active default provider from the store and send only user intent plus contextual metadata. The server resolves the provider for `chat`, selects the recommended chat model, and streams the result.

### Generate

The generation route should request capability `generate`. This route can share the same text-model resolution path as chat but use its own prompt and model recommendation.

### Classify

Classification should be a distinct server utility, not handwritten heuristics except as an offline fallback. It should infer:

- content type
- difficulty
- suggested title
- tags

for media transcription and future import flows. When no classification-capable provider is available, the route can fall back to simple local heuristics for type only.

### Translate

Text translation should use `translateText`. If the selected provider supports text generation but not a dedicated translation endpoint, the feature can still run through prompt-based translation on a chat model.

### Transcribe / Audio Translate

One-time media upload should remain request-scoped. The browser uploads a file, the route sends the file to the resolved transcription provider, and the response returns extracted text plus segments. No persistent media storage is required for this product scope. If the user chooses audio translation rather than raw transcription, the route switches to capability `translateAudio`.

## 6. Settings UX

Settings should become a provider operations panel rather than a static credential form.

Each provider card shows:

- provider name and status
- `Default` badge when selected globally
- capability chips such as `Chat`, `Classify`, `Transcribe`
- connection source summary: env key, local key, or unavailable
- recommended models grouped by function

Example recommendation blocks:

- OpenAI
  - Chat: `gpt-4o-mini`
  - Classify: `gpt-4o-mini`
  - Transcribe: `whisper-1`
- Groq
  - Chat: `llama-3.3-70b-versatile`
  - Classify: `llama-3.1-8b-instant`
  - Transcribe: `whisper-large-v3-turbo`

The list UI should prefer flat, readable cards over heavy glassmorphism. This is a control surface, not a marketing page. Use clear capability chips, compact explainer text, and visible disabled states. Unsupported capabilities should look intentionally unavailable, not broken.

## 7. Recommended Model Semantics

Recommended models are not the same as provider defaults.

Provider defaults answer "what model should we use if the user does nothing?"
Recommended models answer "what model best fits this system function?"

The UI should therefore allow one provider to expose multiple recommendations:

- fast chat
- cost-efficient classification
- high-accuracy transcription

The system should also allow optional per-capability overrides later without blocking this phase. For phase one, provider-level defaults plus capability-based recommendations are enough. The resolver picks the recommendation unless the user has explicitly overridden the model for that capability.

## 8. Error Handling

All AI routes should return structured errors for provider resolution problems:

- `provider_not_configured`
- `capability_not_supported`
- `no_fallback_available`
- `provider_request_failed`

The client should render these as actionable UI messages:

- "Default provider does not support transcription. Falling back to Groq."
- "No provider is configured for transcription."
- "Selected provider is available for chat but not for audio features."

Silent fallback should be logged in development and optionally surfaced in the UI with a small notice so behavior remains understandable.

## 9. Testing Strategy

The capability resolver is the highest-value target for automated tests. It should have table-driven unit tests covering:

- default provider supports capability
- default provider lacks capability but fallback exists
- default provider supports capability but lacks credentials
- no provider available
- per-capability model recommendation selection

UI testing should verify:

- Settings renders capability chips and recommended model blocks
- selecting a default provider updates the global state
- chat no longer hardcodes OpenAI
- media import uses the resolved provider path

Manual verification is still required for real provider APIs, especially transcription, because external credentials and file uploads are involved.

## 10. Rollout Sequence

Recommended rollout order:

1. Add provider metadata, capability matrix, and resolver.
2. Add provider store and wire Settings UI to it.
3. Move chat and generation onto the resolver.
4. Add translation and classification helpers.
5. Add one-time media import with transcription through the resolver.
6. Surface fallback behavior in the UI.

This sequence reduces risk. The resolver becomes stable before feature coverage expands, and the media flow can reuse the same infrastructure instead of becoming another special case.

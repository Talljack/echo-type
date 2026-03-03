# EchoType Vercel Deployment Docs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a production-ready Vercel deployment guide and align repo configuration with the app's actual runtime requirements.

**Architecture:** Keep Vercel deployment zero-config at the platform level, document the required Project Settings and environment variables, and move timeout-sensitive API configuration into the relevant Next.js Route Handlers. Make unsupported Vercel behaviors explicit where the current code depends on local binaries or persistent filesystem writes.

**Tech Stack:** Next.js 16 App Router, Vercel Functions, pnpm, AI SDK, OpenAI Whisper, local Dexie storage

---

### Task 1: Document the real deployment boundary

**Files:**
- Create: `docs/vercel-deployment.md`

**Step 1:** Summarize which app capabilities work on Vercel without refactors.

**Step 2:** Call out current blockers:
- `src/app/api/import/upload-media/route.ts`
- `src/app/api/import/extract/route.ts`
- `src/app/api/tools/download/route.ts`
- local `ollama` / `lmstudio` providers

**Step 3:** Add step-by-step Vercel setup instructions, environment variable tables, verification checklist, and troubleshooting notes.

### Task 2: Align environment variable template with actual code

**Files:**
- Modify: `.env.example`

**Step 1:** Add all provider env vars referenced by `src/lib/providers.ts` and `src/lib/ai-model.ts`.

**Step 2:** Group them by purpose and mark local-only variables clearly.

### Task 3: Add Vercel-friendly timeout configuration

**Files:**
- Modify: `src/app/api/chat/route.ts`
- Modify: `src/app/api/ai/generate/route.ts`
- Modify: `src/app/api/import/transcribe/route.ts`

**Step 1:** Export `runtime = 'nodejs'` for explicit server runtime selection.

**Step 2:** Export `maxDuration = 60` for long-running AI/Whisper requests.

### Task 4: Verify repository state

**Files:**
- Check: `docs/vercel-deployment.md`
- Check: `.env.example`
- Check: `src/app/api/chat/route.ts`
- Check: `src/app/api/ai/generate/route.ts`
- Check: `src/app/api/import/transcribe/route.ts`

**Step 1:** Run formatting-safe validation with targeted file reads.

**Step 2:** Run `pnpm lint` or targeted verification if dependencies are already available.

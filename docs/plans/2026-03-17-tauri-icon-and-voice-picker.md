# Tauri Icon And Voice Picker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the macOS/Tauri app icon read clearly at dock sizes and expose all browser/system voices instead of hiding non-English voices behind an English-only "All" tab.

**Architecture:** Keep the existing browser-voice metadata pipeline, but move the picker to explicit browser filters so "All" means all voices and English remains a first-class subset. Refresh the icon at the SVG source, then regenerate the bundled Tauri icon assets from that source so every platform size stays consistent.

**Tech Stack:** Next.js App Router, TypeScript, React 19, Tailwind CSS, Tauri v2, Vitest

---

### Task 1: Fix browser voice filtering semantics

**Files:**
- Modify: `src/components/voice-picker.tsx`
- Create: `src/lib/voice-picker-filters.ts`
- Test: `src/lib/voice-picker-filters.test.ts`

**Step 1: Extract browser voice filter helpers**

Add pure helpers for:
- all browser voices
- English browser voices
- premium voices
- local/system voices

**Step 2: Make the picker default to English, not fake "All"**

Update the picker tabs so browser mode clearly distinguishes between:
- All voices
- English voices
- Premium voices
- System voices

**Step 3: Keep counts honest**

Update the browser summary line to show total browser voices plus the English subset so the Tauri/WebView count is no longer misleading.

**Step 4: Run focused tests**

Run:

```bash
pnpm test src/lib/voice-picker-filters.test.ts
```

Expected:
- filter helper tests pass

### Task 2: Refresh the Tauri app icon

**Files:**
- Modify: `app-icon.svg`
- Modify: `src-tauri/icons/*`

**Step 1: Simplify the glyph for small sizes**

Redesign the icon source around a bold "E" + echo motif with:
- stronger silhouette
- less fine detail
- better center balance
- macOS-friendly padding

**Step 2: Regenerate Tauri icon assets**

Use the updated source to regenerate the PNG/ICNS/ICO bundle so the dock/app switcher uses the new artwork consistently.

**Step 3: Sanity-check output sizes**

Confirm the generated icon set still includes the expected bundle assets and inspect the resulting macOS icon dimensions.

### Task 3: Verify and report the root cause

**Files:**
- None

**Step 1: Run targeted verification**

Run:

```bash
pnpm test src/lib/voice-picker-filters.test.ts
pnpm lint src/components/voice-picker.tsx src/lib/voice-picker-filters.ts src/lib/voice-picker-filters.test.ts
```

Expected:
- tests pass
- no lint issues in touched files

**Step 2: Summarize the cause clearly**

Report:
- why the UI said 25
- whether that number came from filtering or runtime voice enumeration
- what changed in the picker and icon pipeline

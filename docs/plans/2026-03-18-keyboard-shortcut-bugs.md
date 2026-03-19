# Keyboard Shortcut Feature — Bug Report

**Date:** 2026-03-18
**Branch:** feat/keyboard

## Bug #1: Orphaned `global:command-palette` shortcut (High)

**File:** `src/lib/shortcut-definitions.ts:24-30`

The shortcut `global:command-palette` (mod+k) is defined in `SHORTCUT_DEFINITIONS` but has **no handler** registered in `src/app/(app)/layout.tsx`. There is no command palette component in the codebase. Pressing Cmd+K / Ctrl+K does nothing.

**Fix:** Remove the definition from `SHORTCUT_DEFINITIONS` since the feature doesn't exist yet.

## Bug #2: Deprecated `navigator.platform` usage (Low)

**Files:**
- `src/hooks/use-shortcuts.ts:26`
- `src/components/settings/shortcut-settings.tsx:24`

Both files use `navigator.platform` to detect macOS, which is [deprecated](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/platform). Browsers may remove it in the future.

**Fix:** Replace with a helper that uses `navigator.userAgentData?.platform` (preferred) with fallback to `navigator.userAgent`.

## Summary

| # | Bug | Severity | Status |
|---|-----|----------|--------|
| 1 | Orphaned command-palette shortcut | High | Pending |
| 2 | Deprecated navigator.platform | Low | Pending |

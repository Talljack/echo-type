# Provider Selection Fix Design

**Date:** 2026-04-07  
**Status:** Approved  
**Author:** Claude Code

## Problem Statement

Users cannot successfully select a different AI provider from the dropdown in the settings page. When clicking on a new provider (e.g., switching from OpenAI to OpenRouter), the selection doesn't take effect properly.

### Root Cause

The bug is in the `switchEditingProvider` function in `src/app/(app)/settings/page.tsx` (lines 413-425). The function incorrectly clears authentication for the previously *editing* provider instead of the *active* provider:

```typescript
const switchEditingProvider = useCallback(
  (id: ProviderId) => {
    if (id !== editingId) {
      const currentConfig = providers[editingId];
      if (currentConfig?.auth.type !== 'none') {
        clearAuth(editingId);  // ❌ Bug: clears the wrong provider
      }
    }
    resetTransientProviderState();
    setEditingId(id);
  },
  [editingId, providers, clearAuth, resetTransientProviderState],
);
```

This causes unexpected behavior where:
- The wrong provider gets disconnected
- The new provider selection doesn't properly take effect
- Users can't switch between providers reliably

## User Requirements

When a user selects a different provider from the dropdown:
1. Disconnect the currently active provider (the one with the star badge)
2. Switch to viewing the new provider's settings
3. Auto-fill the API key if it was previously saved
4. Allow the user to click "Connect" to activate the new provider
5. The new provider should then apply to the entire app (Listen, Speak, Read, Write, Import)

## Solution Design

### Approach

Disconnect only the currently **active** provider when switching to a different provider in the dropdown. This ensures:
- Only one provider is active at a time
- Clean state transitions
- Predictable behavior for users

### State Model

The settings UI maintains two distinct provider IDs:

1. **`editingId`** (UI state): The provider whose settings are currently being viewed/edited in the settings panel. This changes when the user selects a different provider from the dropdown.

2. **`activeProviderId`** (global state): The provider that is currently connected and being used across the entire app (Listen, Speak, Read, Write, Import modules). This is marked with a star badge in the UI.

**Key insight:** These two IDs can differ. For example:
- User has OpenAI connected and active (`activeProviderId = 'openai'`)
- User opens dropdown and selects "Google" to view its settings (`editingId = 'google'`)
- At this point: `editingId !== activeProviderId`
- OpenAI is still active and being used by the app, but the UI is showing Google's settings

**The bug:** The original code disconnected `editingId` (the provider being viewed) instead of `activeProviderId` (the provider actually in use). This caused the wrong provider to be disconnected.

**The fix:** Disconnect `activeProviderId` when switching to a different provider, ensuring only the currently-in-use provider gets disconnected.

### Implementation

**File:** `src/app/(app)/settings/page.tsx`

**Change:** Modify the `switchEditingProvider` function to disconnect the active provider instead of the editing provider:

```typescript
const switchEditingProvider = useCallback(
  (id: ProviderId) => {
    if (id !== editingId) {
      // Disconnect the ACTIVE provider when switching to a different one
      if (activeProviderId !== id && providers[activeProviderId]?.auth.type !== 'none') {
        clearAuth(activeProviderId);
      }
    }
    resetTransientProviderState();
    setEditingId(id);
  },
  [editingId, activeProviderId, providers, clearAuth, resetTransientProviderState],
);
```

**Key changes:**
- Check `activeProviderId !== id` instead of just `id !== editingId`
- Call `clearAuth(activeProviderId)` instead of `clearAuth(editingId)`
- Add `activeProviderId` to the dependency array

### User Flow

1. **Initial state:** User has OpenAI connected and active (star badge)
2. **User action:** Clicks dropdown and selects "OpenRouter"
3. **System response:**
   - Disconnects OpenAI (the active provider)
   - Switches view to OpenRouter settings
   - Auto-fills OpenRouter API key if previously saved
4. **User action:** Enters/verifies API key and clicks "Connect"
5. **System response:**
   - Connects to OpenRouter
   - Sets OpenRouter as the active provider
   - OpenRouter now applies to all app features

### Edge Cases

1. **Switching to already-active provider:** No disconnection occurs (same provider)
2. **No provider currently active:** No disconnection needed, just switch view
3. **API key persistence:** Previously saved API keys remain in localStorage and auto-fill
4. **Multiple switches:** Each switch disconnects the current active provider cleanly
5. **Viewing non-active provider:** User can view settings for Provider B while Provider A is active. Switching to Provider C will disconnect Provider A (the active one), not Provider B (the one being viewed)

## Testing Strategy

### Manual Testing

Test on http://localhost:3000/settings:

1. **Basic switch test:**
   - Connect to OpenAI
   - Select OpenRouter from dropdown
   - Verify OpenAI is disconnected
   - Verify OpenRouter view loads with API key auto-filled (if saved)
   - Click Connect
   - Verify OpenRouter becomes active

2. **Multiple provider test:**
   - Connect to Provider A
   - Switch to Provider B → verify A disconnects
   - Connect to Provider B
   - Switch to Provider C → verify B disconnects
   - Verify only one provider active at a time

3. **Same provider test:**
   - Connect to OpenAI
   - Select OpenAI again from dropdown
   - Verify it stays connected (no unnecessary disconnect)

4. **App-wide verification:**
   - Connect to a provider
   - Navigate to Listen, Speak, Read, Write modules
   - Verify the active provider is used for AI features
   - Switch provider in settings
   - Return to modules and verify new provider is used

### Browser Testing

Test the fix in Chrome DevTools using the agent-browser skill to:
- Take snapshots of the provider selection UI
- Simulate clicking different providers
- Verify the connection states update correctly
- Check for any console errors

## Success Criteria

- ✅ Users can select any provider from the dropdown
- ✅ Only the active provider gets disconnected when switching
- ✅ API keys auto-fill from localStorage when available
- ✅ Clicking "Connect" activates the new provider
- ✅ The active provider applies to all app features (Listen, Speak, Read, Write, Import)
- ✅ No console errors or unexpected behavior
- ✅ Provider state persists correctly in localStorage

## Implementation Notes

- The fix is minimal (3 lines changed in one function)
- No changes needed to the provider store's state management - this is purely a UI logic fix
- No changes needed to other components
- Backward compatible with existing saved provider configurations
- The disconnect operation is synchronous (updates Zustand store immediately), so rapid switching is handled correctly

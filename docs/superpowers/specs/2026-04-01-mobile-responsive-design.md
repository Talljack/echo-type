# Mobile Responsive Design Specification

**Date:** 2026-04-01
**Status:** Approved
**Author:** Claude Code

## Problem Statement

The EchoType app is unusable on mobile devices:
- Left sidebar takes up most of the mobile screen width
- Content area is cut off and not visible
- No adaptive layout for mobile viewports
- Voice selection in settings shows duplicate selections when choosing browser voices
- Must be compatible with iOS devices

## Solution Overview

Implement mobile-first responsive design with collapsible sidebar navigation and fix voice selection state management.

## Architecture

### Responsive Behavior

**Desktop (≥768px):**
- Persistent sidebar (current behavior maintained)
- Sidebar width: 240px expanded, 60px collapsed
- Content area: flex-1

**Mobile (<768px):**
- Sidebar hidden by default
- Hamburger menu button in top-left corner
- Sidebar slides in as fixed overlay when opened
- Backdrop overlay dismisses sidebar on tap
- Content takes full viewport width

### State Management

Add sidebar visibility state to `(app)/layout.tsx`:
```typescript
const [sidebarOpen, setSidebarOpen] = useState(false)
```

**Why:** Centralized state in layout ensures sidebar state persists across route changes and can be controlled by both hamburger button and backdrop.

**How to apply:** Pass `open` and `onOpenChange` props to Sidebar component. On mobile, these control the overlay visibility. On desktop, these props are ignored.

### Touch Targets & Accessibility

- Hamburger button: 44×44px (meets iOS HIG minimum)
- All navigation items: already 44px+ height
- Touch spacing: 8px minimum between targets (maintained)
- Focus states: visible 2px outline on keyboard navigation
- Screen reader: aria-label on hamburger, proper heading hierarchy

## Component Changes

### 1. Layout Component (`src/app/(app)/layout.tsx`)

**Changes:**
- Already has `'use client'` directive (no change needed)
- Add `sidebarOpen` state
- Add backdrop overlay (mobile only, when sidebar open)
- Pass state to Sidebar component
- Add MobileMenuButton in main content area
- Close sidebar on route navigation (mobile UX best practice)

**Implementation:**
```typescript
'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MobileMenuButton } from '@/components/layout/mobile-menu-button';
// ... existing imports

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // ... existing code

  return (
    <I18nProvider>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        {/* Backdrop - only visible on mobile when sidebar open */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-200"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar with mobile state */}
        <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />

        <SelectionTranslationProvider>
          <main className="flex-1 overflow-y-auto" data-seeded={seeded}>
            {/* Hamburger button - fixed position, only on mobile */}
            <MobileMenuButton onClick={() => setSidebarOpen(true)} />

            {/* Main content with mobile padding */}
            <div className="min-h-full pt-16 md:pt-0 p-6 md:p-8">{children}</div>
          </main>
        </SelectionTranslationProvider>

        <ChatFab />
        <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      </div>
    </I18nProvider>
  );
}
```

**Why:** Layout is the natural place for cross-cutting UI state. Backdrop must be sibling to sidebar for proper z-index stacking. Auto-closing sidebar on navigation prevents poor mobile UX where sidebar stays open after clicking a link.

**How to apply:** Add state at top of component, add useEffect to close on pathname change, render backdrop before sidebar, add MobileMenuButton inside main content area, update main content padding.

### 2. Sidebar Component (`src/components/layout/sidebar.tsx`)

**Changes:**
- Already has `'use client'` directive (no change needed)
- Accept `open?: boolean` and `onOpenChange?: (open: boolean) => void` props
- Mobile: fixed positioning with transform-based slide animation
- Desktop: ignore props, maintain current behavior
- Add close button (X icon) visible only on mobile

**Implementation:**
```typescript
'use client';

import { X } from 'lucide-react';
// ... existing imports

interface SidebarProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Sidebar({ open = false, onOpenChange }: SidebarProps = {}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { messages } = useI18n('sidebar');

  // ... existing navGroups code

  return (
    <aside
      className={cn(
        'h-screen bg-white border-r border-slate-100 flex flex-col shrink-0',
        // Mobile: fixed overlay with slide animation
        'fixed inset-y-0 left-0 z-50 transition-transform duration-200',
        // Desktop: relative positioning (normal flow)
        'md:relative md:translate-x-0',
        // Width
        collapsed ? 'w-[60px]' : 'w-60',
        // Slide animation on mobile only
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}
    >
      {/* Close button - mobile only */}
      <button
        type="button"
        onClick={() => onOpenChange?.(false)}
        className="absolute top-4 right-4 z-10 md:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 transition-colors"
        aria-label="Close menu"
      >
        <X className="w-5 h-5 text-slate-600" />
      </button>

      {/* Logo */}
      <div className={cn('border-b border-slate-100', collapsed ? 'px-2 py-4' : 'px-4 py-4')}>
        {/* ... existing logo code */}
      </div>

      {/* Nav */}
      <nav className={cn('flex-1 py-3 space-y-4 overflow-y-auto', collapsed ? 'px-1.5' : 'px-2')}>
        {/* ... existing nav code */}
      </nav>

      {/* Update indicator, user menu, collapse toggle */}
      {/* ... existing footer code */}
    </aside>
  );
}
```

**Why:** Transform-based animations are GPU-accelerated and don't cause layout reflow. Fixed positioning on mobile removes sidebar from document flow, allowing content to take full width. On desktop (md: breakpoint), sidebar becomes relative and always visible (translate-x-0), ignoring the open prop.

**How to apply:**
1. Add SidebarProps interface with optional props
2. Update aside className with mobile-first fixed positioning and desktop relative positioning
3. Add close button at top of sidebar (absolute positioned, md:hidden)
4. Conditional transform based on `open` prop, with md:translate-x-0 override for desktop

### 3. Mobile Menu Button (new: `src/components/layout/mobile-menu-button.tsx`)

**New component:**
```typescript
import { Menu } from 'lucide-react';

interface MobileMenuButtonProps {
  onClick: () => void;
}

export function MobileMenuButton({ onClick }: MobileMenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed top-4 left-4 z-30 md:hidden flex items-center justify-center w-11 h-11 rounded-lg bg-white border border-slate-200 shadow-sm active:scale-95 transition-transform"
      aria-label="Open menu"
    >
      <Menu className="w-5 h-5 text-slate-600" />
    </button>
  );
}
```

**Why:** Fixed positioning ensures button stays visible during scroll. 44×44px touch target (w-11 h-11) meets iOS HIG minimum. Hidden on desktop (md:hidden) where sidebar is always visible. Despite being rendered inside main content JSX, fixed positioning removes it from document flow and positions it relative to viewport.

**How to apply:** Create new file at `src/components/layout/mobile-menu-button.tsx`. Import Menu icon from lucide-react. Render in layout's main content area (see Layout section above).

### 4. Main Content Area

**Changes:**
- Add top padding on mobile to prevent hamburger overlap
- Maintain existing responsive padding

**Implementation:**
```typescript
<main className="flex-1 overflow-y-auto">
  <div className="min-h-full pt-16 md:pt-0 p-6 md:p-8">
    {children}
  </div>
</main>
```

**Why:** Fixed hamburger button needs clearance. Desktop doesn't need extra padding since sidebar is in normal flow.

**How to apply:** Add `pt-16` for mobile, `md:pt-0` for desktop. Existing padding preserved.

## Voice Selection Bug Fix

### Root Cause

In `VoicePicker` component (line 408-414), the selection logic compares against a fallback value:

**Current problematic code (lines 402-414):**
```typescript
{filtered.map((v) => (
  <div key={v.voiceURI} className="space-y-1.5">
    <VoiceCard
      voice={v}
      locale={locale}
      isSelected={
        v.voiceURI ===
        (voiceSource === 'fish'
          ? fishVoiceId
          : voiceSource === 'kokoro'
            ? kokoroVoiceId
            : voiceURI || voices[0]?.voiceURI)  // ← Problem: fallback causes duplicate selection
      }
```

When `voiceURI` is empty and user selects a voice, the comparison uses `voices[0]?.voiceURI` as fallback, causing the first voice to appear selected even after selecting a different voice.

### Fix

**Changes to `src/components/voice-picker.tsx`:**

1. Add useEffect to initialize voice on mount (add to existing imports: `useEffect`)
2. Remove fallback from comparison (line 408-414)

**Implementation:**

**Step 1 - Add to imports (line 5):**
```typescript
import { useEffect, useMemo, useState } from 'react';
```

**Step 2 - Add useEffect after existing hooks (around line 265):**
```typescript
export function VoicePicker() {
  const {
    voices,
    isReady,
    // ... existing destructuring
  } = useTTS();

  const {
    voiceURI,
    fishVoiceId,
    kokoroVoiceId,
    setVoiceURI,
    // ... existing destructuring
  } = useTTSStore();

  const interfaceLanguage = useLanguageStore((state) => state.interfaceLanguage);
  const [tab, setTab] = useState<BrowserVoicePickerTab>('english');
  const [searchQuery, setSearchQuery] = useState('');
  const locale = getVoicePickerLocale(interfaceLanguage);

  // NEW: Initialize browser voice on mount
  useEffect(() => {
    if (voiceSource === 'browser' && !voiceURI && voices.length > 0) {
      setVoiceURI(voices[0].voiceURI);
    }
  }, [voiceSource, voiceURI, voices, setVoiceURI]);

  // ... rest of component
```

**Step 3 - Update isSelected logic (lines 407-414):**
```typescript
isSelected={
  voiceSource === 'fish'
    ? v.voiceURI === fishVoiceId
    : voiceSource === 'kokoro'
      ? v.voiceURI === kokoroVoiceId
      : v.voiceURI === voiceURI  // ← Removed fallback: || voices[0]?.voiceURI
}
```

**Why:** Explicit initialization ensures there's always a selected voice when voices load. Removing the fallback from comparison prevents the "phantom selection" bug where multiple voices appear selected simultaneously.

**How to apply:**
1. Verify `useEffect` is in imports
2. Add useEffect hook after state declarations
3. Update isSelected prop in VoiceCard render (remove `|| voices[0]?.voiceURI`)
4. No changes to voice selection handlers needed

## Responsive Breakpoints

Using Tailwind's default `md` breakpoint:
- Mobile: `< 768px` (sidebar hidden, hamburger visible)
- Desktop: `≥ 768px` (sidebar visible, hamburger hidden)

**Why:** Single breakpoint keeps implementation minimal. 768px is the standard tablet/desktop boundary and matches existing responsive patterns in the codebase.

**How to apply:** Use `md:` prefix for desktop-specific styles. Mobile styles are default (mobile-first approach).

## Animation Specifications

### Sidebar Slide-In
- Duration: 200ms (matches existing sidebar collapse animation)
- Easing: ease-out (default Tailwind transition)
- Property: `transform: translateX()`
- GPU-accelerated, no layout reflow

### Backdrop Fade
- Duration: 200ms
- Property: `opacity`
- Enter: 0 → 0.5
- Exit: handled by React unmount
- Transition class: `transition-opacity duration-200` (already specified in Layout section)

### Touch Feedback
- Hamburger button: `active:scale-95`
- Duration: instant (no transition needed)
- Nav items: existing hover/active states work on touch

**Why:** Transform-based animations are performant. 200ms is fast enough to feel responsive but slow enough to be perceived as smooth. Active scale provides immediate tactile feedback.

**How to apply:** Use Tailwind's `transition-transform duration-200` utility. Active states use `active:` prefix for touch feedback.

## iOS Compatibility

### Safe Areas
- Sidebar respects safe area insets (Tailwind default behavior)
- Hamburger button positioned with fixed margins (top-4, left-4)
- No elements in notch/Dynamic Island area

### Gestures
- Tap outside (backdrop) dismisses sidebar
- No conflict with system back gesture (sidebar slides from left, back gesture is edge-only)
- Swipe-to-dismiss not implemented (would require gesture library, adds complexity)

### Touch Targets
- All interactive elements ≥44×44px
- 8px minimum spacing between targets
- No precision-required interactions

**Why:** iOS HIG requires 44×44pt minimum touch targets. Fixed positioning with margins keeps UI out of system gesture areas. Tap-to-dismiss is simpler and more reliable than swipe gestures.

**How to apply:** Use `w-11 h-11` (44px) for hamburger. Existing nav items already meet requirements. Test on iOS Safari to verify safe area behavior.

## Implementation Order

1. Create `MobileMenuButton` component
2. Update `Sidebar` component with responsive positioning
3. Update `Layout` component with state and backdrop
4. Fix `VoicePicker` selection logic
5. Test on mobile viewport (Chrome DevTools)
6. Test on actual iOS device

## Testing Checklist

### Chrome DevTools Mobile Testing
- [ ] Sidebar hidden by default on mobile (<768px)
- [ ] Hamburger button visible and functional on mobile
- [ ] Sidebar slides in smoothly when hamburger clicked (200ms animation)
- [ ] Backdrop dismisses sidebar when tapped
- [ ] Sidebar auto-closes when navigating to different page
- [ ] Content takes full width on mobile when sidebar closed
- [ ] Desktop behavior unchanged (≥768px) - sidebar always visible, hamburger hidden
- [ ] Voice selection shows only one selected voice (no duplicates)
- [ ] Touch targets ≥44px on all interactive elements
- [ ] No horizontal scroll on mobile

### iOS Device Testing
- [ ] Test in iOS Safari (iPhone)
- [ ] Hamburger button not obscured by notch in landscape mode
- [ ] Sidebar respects safe area insets (no content behind notch/Dynamic Island)
- [ ] Touch targets comfortable to tap (44×44px minimum)
- [ ] No conflict with system back gesture (swipe from left edge)
- [ ] Backdrop tap dismisses sidebar reliably

### Accessibility Testing
- [ ] Keyboard navigation works (Tab key moves through nav items)
- [ ] Focus visible on all interactive elements (2px outline)
- [ ] Screen reader announces hamburger button as "Open menu"
- [ ] Screen reader announces close button as "Close menu"
- [ ] Backdrop has aria-hidden="true" (not announced to screen readers)

## Files Modified

- `src/app/(app)/layout.tsx` - Add sidebar state and backdrop
- `src/components/layout/sidebar.tsx` - Add responsive positioning
- `src/components/layout/mobile-menu-button.tsx` - New component
- `src/components/voice-picker.tsx` - Fix selection logic

## Dependencies

No new dependencies required. Uses existing:
- Tailwind CSS (responsive utilities, transitions)
- Lucide React (Menu, X icons)
- React hooks (useState, useEffect)

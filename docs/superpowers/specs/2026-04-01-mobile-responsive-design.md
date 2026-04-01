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
- Add `sidebarOpen` state
- Add backdrop overlay (mobile only, when sidebar open)
- Pass state to Sidebar component

**Implementation:**
```typescript
const [sidebarOpen, setSidebarOpen] = useState(false)

// Backdrop
{sidebarOpen && (
  <div
    className="fixed inset-0 bg-black/50 z-40 md:hidden"
    onClick={() => setSidebarOpen(false)}
  />
)}

// Sidebar
<Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />

// Hamburger button (in main content area)
<MobileMenuButton onClick={() => setSidebarOpen(true)} />
```

**Why:** Layout is the natural place for cross-cutting UI state. Backdrop must be sibling to sidebar for proper z-index stacking.

**How to apply:** Add state at top of component, render backdrop before sidebar, pass props to both new components.

### 2. Sidebar Component (`src/components/layout/sidebar.tsx`)

**Changes:**
- Accept `open?: boolean` and `onOpenChange?: (open: boolean) => void` props
- Mobile: fixed positioning with transform-based slide animation
- Desktop: ignore props, maintain current behavior
- Add close button (X icon) visible only on mobile

**Implementation:**
```typescript
interface SidebarProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function Sidebar({ open = false, onOpenChange }: SidebarProps) {
  // Mobile: fixed overlay with slide animation
  // Desktop: static sidebar (current behavior)

  className={cn(
    'h-screen bg-white border-r border-slate-100 flex flex-col shrink-0',
    // Mobile: fixed overlay
    'fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:relative md:translate-x-0',
    collapsed ? 'w-[60px]' : 'w-60',
    // Slide animation on mobile
    open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
  )}
}
```

**Why:** Transform-based animations are GPU-accelerated and don't cause layout reflow. Fixed positioning on mobile removes sidebar from document flow, allowing content to take full width.

**How to apply:** Wrap existing sidebar in conditional positioning classes. On mobile, sidebar is fixed and animated. On desktop (md: breakpoint), sidebar is relative and always visible.

### 3. Mobile Menu Button (new: `src/components/layout/mobile-menu-button.tsx`)

**New component:**
```typescript
export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed top-4 left-4 z-30 md:hidden flex items-center justify-center w-11 h-11 rounded-lg bg-white border border-slate-200 shadow-sm active:scale-95 transition-transform"
      aria-label="Open menu"
    >
      <Menu className="w-5 h-5 text-slate-600" />
    </button>
  )
}
```

**Why:** Fixed positioning ensures button stays visible during scroll. 44×44px touch target meets iOS HIG. Hidden on desktop where sidebar is always visible.

**How to apply:** Render in layout's main content area, before children. Fixed positioning removes it from document flow.

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
```typescript
isSelected={
  v.voiceURI === (voiceSource === 'fish' ? fishVoiceId : voiceSource === 'kokoro' ? kokoroVoiceId : voiceURI || voices[0]?.voiceURI)
}
```

When `voiceURI` is empty and user selects a voice, the comparison uses `voices[0]?.voiceURI` as fallback, causing the first voice to appear selected even after selecting a different voice.

### Fix

**Changes to `src/components/voice-picker.tsx`:**

1. Remove fallback from comparison (line 408-414)
2. Initialize `voiceURI` on mount if empty and `voiceSource === 'browser'`

**Implementation:**
```typescript
// Add useEffect to initialize voice
useEffect(() => {
  if (voiceSource === 'browser' && !voiceURI && voices.length > 0) {
    setVoiceURI(voices[0].voiceURI)
  }
}, [voiceSource, voiceURI, voices, setVoiceURI])

// Simplify selection check
isSelected={
  voiceSource === 'fish'
    ? v.voiceURI === fishVoiceId
    : voiceSource === 'kokoro'
      ? v.voiceURI === kokoroVoiceId
      : v.voiceURI === voiceURI
}
```

**Why:** Explicit initialization ensures there's always a selected voice. Removing the fallback from comparison prevents the "phantom selection" bug where multiple voices appear selected.

**How to apply:** Add useEffect at component top. Update isSelected prop in VoiceCard render. No changes to voice selection handlers needed.

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

- [ ] Sidebar hidden by default on mobile (<768px)
- [ ] Hamburger button visible and functional on mobile
- [ ] Sidebar slides in smoothly when hamburger clicked
- [ ] Backdrop dismisses sidebar when tapped
- [ ] Content takes full width on mobile when sidebar closed
- [ ] Desktop behavior unchanged (≥768px)
- [ ] Voice selection shows only one selected voice
- [ ] Touch targets ≥44px on all interactive elements
- [ ] No horizontal scroll on mobile
- [ ] Safe area respected on iOS devices
- [ ] Keyboard navigation works (focus visible)
- [ ] Screen reader announces hamburger button

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

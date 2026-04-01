# Mobile Responsive Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make EchoType app fully responsive on mobile devices with collapsible sidebar navigation and fix voice selection bug.

**Architecture:** Mobile-first responsive design with hidden sidebar by default on <768px, hamburger menu toggle, fixed overlay with backdrop, and auto-close on navigation. Desktop behavior unchanged (≥768px).

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, Lucide icons

---

## File Structure

**New files:**
- `src/components/layout/mobile-menu-button.tsx` - Hamburger menu button component

**Modified files:**
- `src/components/layout/sidebar.tsx` - Add responsive positioning and mobile close button
- `src/app/(app)/layout.tsx` - Add sidebar state, backdrop, and mobile menu button
- `src/components/voice-picker.tsx` - Fix duplicate selection bug

---

## Task 1: Create Mobile Menu Button Component

**Files:**
- Create: `src/components/layout/mobile-menu-button.tsx`

- [ ] **Step 1: Create mobile menu button component**

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

- [ ] **Step 2: Verify component compiles**

Run: `pnpm typecheck`
Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/mobile-menu-button.tsx
git commit -m "feat: add mobile menu button component"
```

---

## Task 2: Update Sidebar with Responsive Positioning

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Add X icon import**

Add `X` to the lucide-react imports (around line 4-18):

```typescript
import {
  ArrowDownCircle,
  BookMarked,
  BookOpen,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Headphones,
  Heart,
  LayoutDashboard,
  Library,
  MessageCircle,
  PenTool,
  Settings,
  X,
  Zap,
} from 'lucide-react';
```

- [ ] **Step 2: Add SidebarProps interface**

After the existing interfaces (before the Sidebar function), add:

```typescript
interface SidebarProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}
```

- [ ] **Step 3: Update Sidebar function signature**

Find the `export function Sidebar()` line and change it to:
```typescript
export function Sidebar({ open = false, onOpenChange }: SidebarProps = {}) {
```

- [ ] **Step 4: Update aside className with responsive positioning**

Find the `<aside>` element's className. Replace the entire className from:
```typescript
className={cn(
  'h-screen bg-white border-r border-slate-100 flex flex-col shrink-0 transition-[width] duration-200',
  collapsed ? 'w-[60px]' : 'w-60',
)}
```

To:
```typescript
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
```

- [ ] **Step 5: Add close button after opening aside tag**

Right after the opening `<aside>` tag, add:

```typescript
{/* Close button - mobile only */}
<button
  type="button"
  onClick={() => onOpenChange?.(false)}
  className="absolute top-4 right-4 z-10 md:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 transition-colors"
  aria-label="Close menu"
>
  <X className="w-5 h-5 text-slate-600" />
</button>
```

- [ ] **Step 6: Verify component compiles**

Run: `pnpm typecheck`
Expected: No TypeScript errors

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: add responsive sidebar with mobile overlay"
```

---

## Task 3: Update Layout with Sidebar State and Backdrop

**Files:**
- Modify: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Verify usePathname is imported**

Check line 3 - should already have:
```typescript
import { usePathname } from 'next/navigation';
```

(Already present, no change needed)

- [ ] **Step 2: Add MobileMenuButton import**

After the existing imports (around line 7), add:

```typescript
import { MobileMenuButton } from '@/components/layout/mobile-menu-button';
```

- [ ] **Step 3: Add sidebarOpen state and pathname**

After the `commandPaletteOpen` state declaration (around line 26), add:

```typescript
const [sidebarOpen, setSidebarOpen] = useState(false);
const pathname = usePathname();
```

- [ ] **Step 4: Add useEffect to close sidebar on navigation**

After the existing `useEffect` hooks (before the return statement), add:

```typescript
// Close sidebar on route change (mobile)
useEffect(() => {
  setSidebarOpen(false);
}, [pathname]);
```

- [ ] **Step 5: Add backdrop before Sidebar**

In the return statement, before `<Sidebar />`, add:

```typescript
{/* Backdrop - only visible on mobile when sidebar open */}
{sidebarOpen && (
  <div
    className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-200"
    onClick={() => setSidebarOpen(false)}
    aria-hidden="true"
  />
)}
```

- [ ] **Step 6: Update Sidebar with props**

Find the `<Sidebar />` component and update it to:
```typescript
<Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
```

- [ ] **Step 7: Add MobileMenuButton and update main content padding**

Find the `<main>` element and its child `<div>`. Update from:
```typescript
<main className="flex-1 overflow-y-auto" data-seeded={seeded}>
  <div className="min-h-full p-6 md:p-8">{children}</div>
```

To:
```typescript
<main className="flex-1 overflow-y-auto" data-seeded={seeded}>
  <MobileMenuButton onClick={() => setSidebarOpen(true)} />
  <div className="min-h-full pt-16 md:pt-0 p-6 md:p-8">{children}</div>
```

- [ ] **Step 8: Verify component compiles**

Run: `pnpm typecheck`
Expected: No TypeScript errors

- [ ] **Step 9: Commit**

```bash
git add src/app/(app)/layout.tsx
git commit -m "feat: add mobile sidebar state and backdrop overlay"
```

---

## Task 4: Test Mobile Responsive Behavior

**Files:**
- None (testing only)

- [ ] **Step 1: Start dev server**

Run: `pnpm dev`
Open: http://localhost:3000

- [ ] **Step 2: Test mobile viewport in Chrome DevTools**

1. Toggle device toolbar (Cmd+Shift+M or F12)
2. Select iPhone 12 Pro (390x844)
3. Verify sidebar is hidden
4. Verify hamburger button is visible in top-left

Expected: Sidebar hidden, hamburger visible

- [ ] **Step 3: Test sidebar open/close**

1. Click hamburger button
2. Verify sidebar slides in from left (200ms animation)
3. Click backdrop (dark area)
4. Verify sidebar closes

Expected: Smooth slide animation, backdrop dismisses sidebar

- [ ] **Step 4: Test navigation auto-close**

1. Open sidebar
2. Click any nav link (e.g., "Listen")
3. Verify sidebar closes automatically

Expected: Sidebar closes on navigation

- [ ] **Step 5: Test desktop behavior**

1. Resize browser to >768px width
2. Verify sidebar is always visible
3. Verify hamburger button is hidden
4. Verify no backdrop appears

Expected: Desktop behavior unchanged

---

## Task 5: Fix Voice Selection Duplicate Bug

**Files:**
- Modify: `src/components/voice-picker.tsx`

- [ ] **Step 1: Verify useEffect is imported**

Check line 5 - should already have:
```typescript
import { useEffect, useMemo, useState } from 'react';
```

(Already present, no change needed)

- [ ] **Step 2: Add useEffect to initialize browser voice**

After line 265 (after `const locale = getVoicePickerLocale(interfaceLanguage);`), add:

```typescript
// Initialize browser voice on mount
useEffect(() => {
  if (voiceSource === 'browser' && !voiceURI && voices.length > 0) {
    setVoiceURI(voices[0].voiceURI);
  }
}, [voiceSource, voiceURI, voices, setVoiceURI]);
```

- [ ] **Step 3: Remove fallback from isSelected logic**

Find line 407 (the `isSelected` prop in VoiceCard). Change from:
```typescript
isSelected={
  v.voiceURI ===
  (voiceSource === 'fish'
    ? fishVoiceId
    : voiceSource === 'kokoro'
      ? kokoroVoiceId
      : voiceURI || voices[0]?.voiceURI)
}
```

To:
```typescript
isSelected={
  voiceSource === 'fish'
    ? v.voiceURI === fishVoiceId
    : voiceSource === 'kokoro'
      ? v.voiceURI === kokoroVoiceId
      : v.voiceURI === voiceURI
}
```

- [ ] **Step 4: Verify component compiles**

Run: `pnpm typecheck`
Expected: No TypeScript errors

- [ ] **Step 5: Test voice selection**

Run: `pnpm dev`
Open: http://localhost:3000/settings
Scroll to Voice section:
1. Select "Browser" as voice source
2. Verify only ONE voice is highlighted
3. Click a different voice
4. Verify only the newly selected voice is highlighted (no duplicates)

Expected: Only one voice selected at a time, no duplicate selections

- [ ] **Step 6: Commit**

```bash
git add src/components/voice-picker.tsx
git commit -m "fix: remove duplicate voice selection in browser mode"
```

---

## Task 6: iOS Device Testing

**Files:**
- None (testing only)

- [ ] **Step 1: Test on iOS Safari**

1. Build and deploy to test environment or use local network
2. Open on iPhone in Safari
3. Verify hamburger button visible and tappable
4. Verify sidebar slides in smoothly
5. Verify backdrop dismisses sidebar
6. Verify no content behind notch/Dynamic Island
7. Verify touch targets are comfortable (44×44px)
8. Test in landscape mode - verify hamburger not obscured

Expected: All mobile interactions work smoothly on iOS

- [ ] **Step 2: Test accessibility**

1. Enable VoiceOver on iOS (Settings > Accessibility > VoiceOver)
2. Navigate to app
3. Verify hamburger button announced as "Open menu"
4. Open sidebar
5. Verify close button announced as "Close menu"
6. Test keyboard navigation on desktop (Tab key)
7. Verify focus visible on all interactive elements

Expected: All accessibility features work correctly

---

## Task 7: Final Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: All tests pass

- [ ] **Step 2: Run linter**

Run: `pnpm lint`
Expected: No linting errors

- [ ] **Step 3: Run type check**

Run: `pnpm typecheck`
Expected: No TypeScript errors

- [ ] **Step 4: Build production bundle**

Run: `pnpm build`
Expected: Build succeeds with no errors

- [ ] **Step 5: Test production build**

Run: `pnpm start` (after build)
Open: http://localhost:3000
Test mobile responsive behavior in production mode

Expected: All features work in production build

---

## Success Criteria

✅ Sidebar hidden by default on mobile (<768px)
✅ Hamburger button visible and functional on mobile
✅ Sidebar slides in smoothly with 200ms animation
✅ Backdrop dismisses sidebar on tap
✅ Sidebar auto-closes on navigation
✅ Content takes full width on mobile when sidebar closed
✅ Desktop behavior unchanged (≥768px)
✅ Voice selection shows only one selected voice
✅ Touch targets ≥44px on all interactive elements
✅ No horizontal scroll on mobile
✅ iOS safe areas respected
✅ Accessibility features working (keyboard nav, screen readers)

## Rollback Plan

If issues arise, revert commits in reverse order:

```bash
git revert HEAD~4..HEAD  # Reverts last 4 commits
```

Or revert specific commits:

```bash
git log --oneline  # Find commit hashes
git revert <commit-hash>
```

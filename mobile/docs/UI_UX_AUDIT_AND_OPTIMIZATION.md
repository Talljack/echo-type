# EchoType Mobile - UI/UX Audit & Optimization Plan

**Date:** 2026-04-13  
**Status:** In Progress  
**Design System:** Claymorphism (Educational/Playful)

---

## Executive Summary

### Current State
- ✅ All core features implemented (Listen, Speak, Read, Write, Library, Dashboard, Vocabulary, Review, AI Tutor)
- ✅ Basic functionality working on Web and iOS
- ⚠️ Inconsistent spacing, colors, and typography across screens
- ⚠️ Missing touch target optimizations for mobile
- ⚠️ No animations or transitions
- ⚠️ Accessibility issues (contrast, labels, focus states)
- ⚠️ Hardcoded colors instead of design tokens

### Recommended Design System
Based on the product type (language learning education tool), the UI/UX Pro Max skill recommends:

- **Style:** Claymorphism (playful, tactile, educational)
- **Colors:** Indigo primary (#4F46E5) + Green accent (#16A34A)
- **Typography:** Baloo 2 (headings) / Comic Neue (body) - friendly, educational
- **Effects:** Soft shadows, rounded corners (40-50px), spring animations
- **Target:** C-end users (students, language learners)

---

## Critical Issues (Must Fix)

### 1. Touch Target Sizes ⚠️ HIGH PRIORITY
**Issue:** Many interactive elements are smaller than the minimum 44×44pt requirement.

**Affected Components:**
- `ContentCard.tsx` - Favorite icon button
- `CustomTabBar.tsx` - Tab icons
- `RecordButton.tsx` - Microphone button (needs verification)
- `RatingButtons.tsx` - FSRS rating buttons
- `ImportModal.tsx` - Segmented buttons

**Fix:**
```typescript
// Minimum touch target
const styles = StyleSheet.create({
  touchTarget: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

**Files to Update:**
- [ ] `src/components/library/ContentCard.tsx` - Expand favorite button hit area
- [ ] `src/components/navigation/CustomTabBar.tsx` - Ensure tab items are 44pt+
- [ ] `src/components/practice/RatingButtons.tsx` - Increase button sizes
- [ ] `src/components/speak/RecordButton.tsx` - Verify microphone button size

---

### 2. Color Contrast Issues ⚠️ HIGH PRIORITY
**Issue:** Hardcoded colors don't meet WCAG AA standards (4.5:1 for text).

**Affected Areas:**
- Gray text on light backgrounds (#6B7280 on #F9FAFB) - borderline
- Subtitle text (#9CA3AF) - too light
- Meta text in practice screens

**Fix:** Create a design token system with accessible color pairs.

**Action Items:**
- [ ] Create `src/theme/colors.ts` with semantic tokens
- [ ] Replace all hardcoded hex colors with tokens
- [ ] Test contrast ratios in both light and dark mode
- [ ] Update all `color: '#6B7280'` to use tokens

---

### 3. Missing Touch Feedback ⚠️ HIGH PRIORITY
**Issue:** No visual feedback when tapping buttons/cards.

**Affected Components:**
- All cards (ContentCard, StatCard, ReviewCard)
- All buttons without Material Design ripple
- Tab bar items

**Fix:** Add press states with scale/opacity animations.

```typescript
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

// Add to all interactive components
<Pressable
  onPressIn={() => scale.value = withSpring(0.95)}
  onPressOut={() => scale.value = withSpring(1)}
>
  <Animated.View style={animatedStyle}>
    {/* content */}
  </Animated.View>
</Pressable>
```

**Files to Update:**
- [ ] `src/components/library/ContentCard.tsx`
- [ ] `src/components/dashboard/StatCard.tsx`
- [ ] `src/components/review/ReviewCard.tsx`
- [ ] `src/components/navigation/CustomTabBar.tsx`

---

### 4. Inconsistent Spacing ⚠️ MEDIUM PRIORITY
**Issue:** Random spacing values (12, 16, 20, 24) without a systematic scale.

**Current Problems:**
- Dashboard: padding: 16
- Library: padding: 16
- Practice screens: padding: 16
- Modals: padding: 24
- Cards: padding: 20

**Fix:** Implement 8dp spacing system.

```typescript
// src/theme/spacing.ts
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;
```

**Action Items:**
- [ ] Create `src/theme/spacing.ts`
- [ ] Update all StyleSheet.create() to use spacing tokens
- [ ] Ensure consistent gaps between sections (24dp)
- [ ] Ensure consistent card padding (16dp)

---

### 5. No Loading States ⚠️ MEDIUM PRIORITY
**Issue:** Async operations (import, AI generation, TTS) show no feedback.

**Affected Screens:**
- ImportModal - no skeleton while importing
- Listen practice - no loading indicator for TTS
- Speak practice - no feedback during analysis
- AI Tutor - no typing indicator

**Fix:** Add skeleton screens and loading indicators.

**Action Items:**
- [ ] Create `src/components/ui/Skeleton.tsx`
- [ ] Add loading states to ImportModal
- [ ] Add "Generating audio..." indicator to CloudAudioPlayer
- [ ] Add "Analyzing..." indicator to Speak practice
- [ ] Add typing indicator to ChatBubble

---

### 6. Missing Accessibility Labels ⚠️ HIGH PRIORITY
**Issue:** Icon-only buttons lack accessibility labels.

**Affected Components:**
- Favorite button (heart icon)
- Edit button (pencil icon)
- Delete button (trash icon)
- Tab bar icons
- Record button

**Fix:**
```typescript
<IconButton
  icon="heart"
  accessibilityLabel="Add to favorites"
  accessibilityRole="button"
  accessibilityState={{ checked: isFavorite }}
/>
```

**Action Items:**
- [ ] Add accessibilityLabel to all IconButton components
- [ ] Add accessibilityRole to all Pressable components
- [ ] Add accessibilityState for toggles (favorite, play/pause)
- [ ] Test with VoiceOver (iOS) and TalkBack (Android)

---

## Medium Priority Issues

### 7. No Animations/Transitions
**Issue:** All state changes are instant (no motion).

**Recommendations:**
- Page transitions: 250ms slide with spring easing
- Modal entrance: 200ms scale + fade from 0.9 to 1.0
- Button press: 150ms scale to 0.95
- List item entrance: 50ms stagger per item
- Card flip (Review): 300ms rotateY

**Action Items:**
- [ ] Install react-native-reanimated (if not already)
- [ ] Add page transition animations to Expo Router
- [ ] Add modal entrance animations
- [ ] Add button press feedback
- [ ] Add card flip animation to ReviewCard

---

### 8. Inconsistent Typography
**Issue:** Mixing React Native Paper variants with custom font sizes.

**Current State:**
- Some screens use `variant="headlineSmall"`
- Others use `fontSize: 18`
- No consistent hierarchy

**Fix:** Define typography scale and use consistently.

```typescript
// src/theme/typography.ts
export const typography = {
  displayLarge: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
  headlineLarge: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
  headlineMedium: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  bodyLarge: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodyMedium: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  labelLarge: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  labelMedium: { fontSize: 12, fontWeight: '500', lineHeight: 16 },
} as const;
```

**Action Items:**
- [ ] Create typography tokens
- [ ] Replace all custom fontSize with tokens
- [ ] Use Paper variants consistently
- [ ] Consider integrating Baloo 2 font (educational feel)

---

### 9. Empty States Need Improvement
**Issue:** Generic "No content" messages without helpful actions.

**Affected Screens:**
- Library (empty state)
- Vocabulary (empty state)
- Review (no cards due)

**Fix:** Add illustrations, helpful text, and clear CTAs.

**Action Items:**
- [ ] Design empty state illustrations (or use Lucide icons)
- [ ] Add helpful copy: "Start by importing your first article"
- [ ] Add prominent CTA button
- [ ] Show example/tutorial on first visit

---

### 10. Modal UX Issues
**Issue:** ImportModal is too tall on small screens, hard to dismiss.

**Problems:**
- No swipe-to-dismiss gesture
- Close button not obvious
- Content may overflow on small devices

**Fix:**
```typescript
// Use BottomSheet instead of Modal for better mobile UX
import BottomSheet from '@gorhom/bottom-sheet';

<BottomSheet
  snapPoints={['50%', '90%']}
  enablePanDownToClose
>
  {/* content */}
</BottomSheet>
```

**Action Items:**
- [ ] Consider replacing Modal with BottomSheet
- [ ] Add swipe-down-to-dismiss gesture
- [ ] Add visible close button (X icon)
- [ ] Test on iPhone SE (smallest screen)

---

## Low Priority Enhancements

### 11. Add Haptic Feedback
**Issue:** No tactile feedback on interactions.

**Recommendation:**
```typescript
import * as Haptics from 'expo-haptics';

// On button press
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// On success
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// On error
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
```

**Action Items:**
- [ ] Add light haptic to all button presses
- [ ] Add success haptic to import completion
- [ ] Add error haptic to validation failures
- [ ] Add selection haptic to segmented buttons

---

### 12. Dark Mode Support
**Issue:** Only light mode implemented.

**Action Items:**
- [ ] Define dark mode color palette
- [ ] Test all screens in dark mode
- [ ] Ensure contrast ratios meet WCAG AA
- [ ] Add theme toggle in Settings

---

### 13. Onboarding Flow
**Issue:** No tutorial or feature introduction.

**Recommendation:**
- Welcome screen with app benefits
- Quick tutorial on first import
- Tooltips for key features
- Progress indicator (e.g., "2/5 features explored")

**Action Items:**
- [ ] Design 3-screen onboarding flow
- [ ] Add "Skip" option
- [ ] Show only on first launch
- [ ] Highlight key features (Listen, Speak, Review)

---

## Implementation Plan

### Phase 1: Critical Fixes (Week 1)
**Goal:** Fix accessibility and usability blockers.

1. ✅ Create design token system
   - [ ] `src/theme/colors.ts`
   - [ ] `src/theme/spacing.ts`
   - [ ] `src/theme/typography.ts`

2. ✅ Fix touch targets
   - [ ] ContentCard favorite button
   - [ ] CustomTabBar items
   - [ ] RatingButtons
   - [ ] All IconButtons

3. ✅ Add accessibility labels
   - [ ] All icon-only buttons
   - [ ] All interactive elements
   - [ ] Tab bar items

4. ✅ Add touch feedback
   - [ ] Press states for all cards
   - [ ] Press states for all buttons
   - [ ] Ripple effect on Android

### Phase 2: Visual Polish (Week 2)
**Goal:** Consistent design language.

1. ✅ Apply design tokens
   - [ ] Replace all hardcoded colors
   - [ ] Replace all hardcoded spacing
   - [ ] Replace all custom font sizes

2. ✅ Add animations
   - [ ] Page transitions
   - [ ] Modal entrance
   - [ ] Button press feedback
   - [ ] Card flip (Review)

3. ✅ Improve empty states
   - [ ] Library empty state
   - [ ] Vocabulary empty state
   - [ ] Review empty state

### Phase 3: Enhancements (Week 3)
**Goal:** Delight users with polish.

1. ✅ Add loading states
   - [ ] Skeleton screens
   - [ ] Progress indicators
   - [ ] Typing indicators

2. ✅ Add haptic feedback
   - [ ] Button presses
   - [ ] Success/error notifications
   - [ ] Segmented button selection

3. ✅ Onboarding flow
   - [ ] Welcome screens
   - [ ] Feature highlights
   - [ ] First-time tooltips

---

## Testing Checklist

### Accessibility
- [ ] VoiceOver (iOS) - all screens navigable
- [ ] TalkBack (Android) - all screens navigable
- [ ] Dynamic Type - text scales correctly
- [ ] Reduced Motion - animations respect preference
- [ ] Color Contrast - all text meets WCAG AA

### Touch Targets
- [ ] All buttons ≥44×44pt
- [ ] 8pt spacing between adjacent targets
- [ ] No accidental taps on small screens

### Responsive
- [ ] iPhone SE (375×667) - smallest screen
- [ ] iPhone 16 Pro (393×852) - standard
- [ ] iPad (768×1024) - tablet
- [ ] Landscape orientation

### Performance
- [ ] List virtualization (50+ items)
- [ ] Image optimization (WebP)
- [ ] Animation at 60fps
- [ ] No layout shift (CLS < 0.1)

---

## Design Tokens Reference

### Colors (Recommended)
```typescript
export const colors = {
  // Primary (Indigo)
  primary: '#4F46E5',
  primaryLight: '#818CF8',
  primaryDark: '#3730A3',
  onPrimary: '#FFFFFF',
  
  // Secondary (Purple)
  secondary: '#818CF8',
  onSecondary: '#FFFFFF',
  
  // Accent (Green - for progress/success)
  accent: '#16A34A',
  accentLight: '#22C55E',
  onAccent: '#FFFFFF',
  
  // Background
  background: '#EEF2FF', // Indigo-50
  surface: '#FFFFFF',
  surfaceVariant: '#F9FAFB',
  
  // Text
  onBackground: '#312E81', // Indigo-900
  onSurface: '#1F2937', // Gray-800
  onSurfaceVariant: '#6B7280', // Gray-500
  
  // Borders
  border: '#C7D2FE', // Indigo-200
  borderLight: '#E5E7EB', // Gray-200
  
  // States
  error: '#DC2626',
  warning: '#F59E0B',
  success: '#16A34A',
  info: '#3B82F6',
  
  // Overlay
  scrim: 'rgba(0, 0, 0, 0.5)',
};
```

### Spacing
```typescript
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};
```

### Border Radius
```typescript
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};
```

### Shadows (Claymorphism)
```typescript
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};
```

---

## Next Steps

1. **Review this document** with the team
2. **Prioritize fixes** based on user impact
3. **Create subtasks** for each action item
4. **Implement Phase 1** (critical fixes)
5. **Test on real devices** (iPhone + Android)
6. **Iterate based on feedback**

---

## Resources

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design 3](https://m3.material.io/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- [Expo Haptics](https://docs.expo.dev/versions/latest/sdk/haptics/)

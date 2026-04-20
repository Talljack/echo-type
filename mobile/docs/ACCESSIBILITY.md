# Accessibility Implementation Guide

## Overview

This document describes the accessibility features implemented in the Echo Type mobile app to ensure WCAG 2.1 Level AA compliance.

## Core Utilities

### `src/lib/accessibility.ts`

Provides reusable accessibility helpers:

```typescript
import { MIN_TOUCH_TARGET_SIZE, createAccessibilityLabel, getButtonA11yProps } from '@/lib/accessibility';
```

**Constants:**
- `MIN_TOUCH_TARGET_SIZE = 44` - Minimum touch target size per WCAG guidelines

**Functions:**
- `createAccessibilityLabel(parts)` - Combines label parts into a single string
- `formatProgressForA11y(progress)` - Formats progress percentage for screen readers
- `getButtonA11yProps(label, hint?, disabled?)` - Returns button accessibility props
- `getTextInputA11yProps(label, value, error?, required?)` - Returns text input props
- `getSwitchA11yProps(label, value, hint?)` - Returns switch props
- `getCheckboxA11yProps(label, checked, hint?)` - Returns checkbox props
- `getImageA11yProps(alt, decorative?)` - Returns image props

## Implementation Examples

### 1. Buttons

```typescript
import { getButtonA11yProps } from '@/lib/accessibility';

<Button
  {...getButtonA11yProps('Save', 'Saves your changes', isDisabled)}
  onPress={handleSave}
>
  Save
</Button>
```

### 2. Text Inputs

```typescript
import { getTextInputA11yProps } from '@/lib/accessibility';

<TextInput
  {...getTextInputA11yProps('Email', email, emailError, true)}
  value={email}
  onChangeText={setEmail}
/>
```

### 3. Switches

```typescript
import { getSwitchA11yProps } from '@/lib/accessibility';

<Switch
  {...getSwitchA11yProps('Dark Mode', isDark, 'Toggles dark mode theme')}
  value={isDark}
  onValueChange={toggleTheme}
/>
```

### 4. Content Cards

```typescript
<Pressable
  accessibilityRole="button"
  accessibilityLabel={createAccessibilityLabel([
    item.title,
    `Difficulty: ${item.difficulty}`,
    `Language: ${item.language}`,
    item.isFavorite ? 'Favorited' : 'Not favorited',
    item.progress > 0 ? formatProgressForA11y(item.progress) : undefined,
  ])}
  accessibilityHint="Double tap to open content"
  onPress={() => router.push(`/content/${item.id}`)}
>
  {/* Card content */}
</Pressable>
```

### 5. Touch Targets

Ensure all interactive elements meet minimum size:

```typescript
import { MIN_TOUCH_TARGET_SIZE } from '@/lib/accessibility';

const styles = StyleSheet.create({
  button: {
    minWidth: MIN_TOUCH_TARGET_SIZE,
    minHeight: MIN_TOUCH_TARGET_SIZE,
  },
});
```

## Components Updated

### ContentCard
- Added descriptive accessibility labels combining title, difficulty, language, favorite status, and progress
- Added accessibility hints for actions
- Ensured touch targets meet minimum size
- Added proper roles and states

### ImportModal
- Added labels and hints for all form inputs
- Added proper roles for modal and buttons
- Ensured keyboard navigation support
- Note: SegmentedButtons and Modal components don't support accessibilityLabel prop (React Native Paper limitation)

## Testing Checklist

### Screen Reader Testing
- [ ] Enable VoiceOver (iOS) or TalkBack (Android)
- [ ] Navigate through all screens using swipe gestures
- [ ] Verify all interactive elements are announced correctly
- [ ] Verify state changes are announced (e.g., "favorited", "progress 50%")
- [ ] Test form inputs and error messages

### Touch Target Testing
- [ ] Verify all buttons and interactive elements are at least 44x44 points
- [ ] Test with large text settings enabled
- [ ] Verify no overlapping touch targets

### Keyboard Navigation (if applicable)
- [ ] Tab through all interactive elements
- [ ] Verify focus indicators are visible
- [ ] Test form submission with Enter key

### Color Contrast
- [ ] Verify all text meets WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text)
- [ ] Test in both light and dark modes
- [ ] Use color contrast analyzer tools

## Best Practices

1. **Always provide meaningful labels** - Don't just repeat the visible text, provide context
2. **Use hints for actions** - Tell users what will happen when they interact
3. **Announce state changes** - Use `accessibilityLiveRegion` for dynamic content
4. **Group related elements** - Use `accessibilityRole="group"` for logical groupings
5. **Test with real users** - Automated tools can't catch everything

## Known Limitations

1. **React Native Paper Components** - Some components (Modal, SegmentedButtons) don't support all accessibility props. We work around this by:
   - Ensuring child elements have proper labels
   - Using semantic HTML/native components where possible
   - Adding context through surrounding elements

2. **Platform Differences** - iOS and Android handle accessibility differently:
   - Test on both platforms
   - Use platform-specific adjustments when needed
   - Follow platform conventions

## Resources

- [React Native Accessibility Docs](https://reactnative.dev/docs/accessibility)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [iOS VoiceOver Guide](https://support.apple.com/guide/iphone/turn-on-and-practice-voiceover-iph3e2e415f/ios)
- [Android TalkBack Guide](https://support.google.com/accessibility/android/answer/6283677)

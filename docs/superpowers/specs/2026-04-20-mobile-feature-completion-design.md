# Mobile Feature Completion & Bug Fixes Design

**Date:** 2026-04-20  
**Status:** Approved  
**Implementation:** 3 Phases (1-2 weeks total)

---

## Executive Summary

This spec addresses missing features and bugs in the EchoType mobile app by implementing all identified gaps in a structured 3-phase approach. The goal is to achieve feature parity with critical web features while improving stability and user experience.

**Scope:**
- Phase 1: Core UX improvements (Dark Mode, TTS Settings, Favorites)
- Phase 2: Import expansion (Enable URL/YouTube/PDF/AI)
- Phase 3: Polish & stability (Error tracking, Offline support, Accessibility, Content editing)

**Timeline:** 1-2 weeks total (3-4 days per phase)

---

## Background

Based on comprehensive feature audit (see `mobile/docs/FEATURE_AUDIT.md` and `mobile/docs/MISSING_FEATURES_ANALYSIS.md`), the mobile app has:

**Completed:** ✅
- All 4 practice modes (Listen, Speak, Read, Write)
- FSRS spaced repetition
- Dashboard with stats and heatmap
- Basic library management
- Text import
- Settings framework

**Missing:** ⚠️
- Dark mode (toggle exists but doesn't work)
- TTS settings (speed/voice selection)
- Favorites feature (data model exists, no UI)
- Advanced import methods (infrastructure exists, disabled)
- Error tracking integration
- Offline support
- Accessibility labels
- Content editing UI

---

## Phase 1: Core UX Improvements (3-4 days)

### 1.1 Dark Mode Implementation

**Problem:** Theme toggle in settings doesn't actually switch themes. Components use hardcoded colors instead of theme tokens.

**Solution:**

1. **App-level theme integration**
   - Ensure `ThemeProvider` wraps entire app in `_layout.tsx`
   - Sync React Native Paper theme with custom theme
   - Update StatusBar style based on theme (light-content vs dark-content)

2. **Component updates**
   - Replace all hardcoded color values with theme tokens from `useAppTheme()`
   - Pattern: `#4F46E5` → `colors.primary`
   - Estimated ~50 component files need updates

3. **Theme persistence**
   - Already handled by `useSettingsStore` ✅
   - Theme preference saved to AsyncStorage

**Files to modify:**
- `mobile/app/_layout.tsx` - Add Paper theme provider with dynamic theme
- All component files using hardcoded colors:
  - `mobile/app/(tabs)/*.tsx` (6 files)
  - `mobile/app/practice/**/*.tsx` (4 files)
  - `mobile/src/components/**/*.tsx` (~40 files)

**Implementation notes:**
- `ThemeContext` already complete with `lightColors` and `darkColors` ✅
- Use `const { colors, isDark } = useAppTheme()` in every component
- Test all screens in both light and dark mode
- Verify WCAG AA contrast ratios maintained

**Acceptance criteria:**
- [ ] Dark mode toggle in settings switches entire app theme
- [ ] All screens render correctly in both light and dark mode
- [ ] Theme preference persists across app restarts
- [ ] StatusBar updates appropriately
- [ ] No hardcoded colors remain in components

---

### 1.2 TTS Settings (Speed & Voice Selection)

**Problem:** Settings page shows current TTS speed and voice but provides no way to change them.

**Solution:**

1. **Speed slider**
   - Component already exists: `mobile/src/components/settings/SpeedSlider.tsx` ✅
   - Range: 0.5x to 2.0x
   - Default: 1.0x
   - Show current value label

2. **Voice selector**
   - Component already exists: `mobile/src/components/settings/VoiceSelector.tsx` ✅
   - Fetch available voices from TTS API
   - Display voice list with metadata (name, locale, gender)
   - Add "Preview" button to test voice before saving
   - Use `previewTTS()` from `mobile/src/lib/tts-preview.ts` ✅

3. **Settings integration**
   - Replace static text displays with interactive components
   - Wire up to `useSettingsStore` for persistence
   - Add loading states while fetching voices

**Files to modify:**
- `mobile/app/(tabs)/settings.tsx` - Replace static displays with SpeedSlider and VoiceSelector
- `mobile/src/stores/useSettingsStore.ts` - Verify speed/voice persist correctly (likely already works)

**API integration:**
- Voice list: `GET /api/tts/edge/voices`
- Preview: `POST /api/tts/edge/synthesize` with sample text

**Acceptance criteria:**
- [ ] Speed slider adjusts playback speed (0.5x - 2.0x)
- [ ] Voice selector shows available voices
- [ ] Preview button plays sample audio with selected voice
- [ ] Settings persist and apply to all TTS playback
- [ ] Loading states shown while fetching voices

---

### 1.3 Favorites Feature

**Problem:** Content has `isFavorite` field but no UI to toggle or filter favorites.

**Solution:**

1. **ContentCard favorite toggle**
   - Add heart icon button (top-right corner)
   - Outline heart when not favorited
   - Filled heart when favorited
   - Haptic feedback on toggle
   - Optimistic UI update

2. **Library favorites filter**
   - Add "Favorites" chip in filter row (alongside tag filters)
   - When active, show only favorited content
   - Show count badge: "Favorites (5)"

3. **Store methods**
   - Add to `useLibraryStore`:
     - `toggleFavorite(contentId: string): void`
     - `getFavorites(): Content[]`
   - Update content's `isFavorite` field
   - Persist to AsyncStorage

**Files to modify:**
- `mobile/src/components/library/ContentCard.tsx` - Add heart icon button
- `mobile/app/(tabs)/library.tsx` - Add favorites filter chip
- `mobile/src/stores/useLibraryStore.ts` - Add favorite management methods

**UI Flow:**
1. User taps heart icon on content card
2. Icon animates (outline ↔ filled)
3. Haptic feedback
4. Content's `isFavorite` field toggles
5. If favorites filter active, card may disappear from view

**Acceptance criteria:**
- [ ] Heart icon appears on all content cards
- [ ] Tapping heart toggles favorite state with haptic feedback
- [ ] Favorites filter chip shows count
- [ ] Filtering by favorites works correctly
- [ ] Favorite state persists across app restarts

---

## Phase 2: Import Expansion (2-3 days)

### 2.1 Enable Advanced Import Methods

**Problem:** Import infrastructure exists for URL/YouTube/PDF/AI but disabled with "Coming soon" notices. Only text import works.

**Solution:**

1. **Remove MVP restrictions**
   - Delete `MvpNoticeCard` components from ImportModal
   - Enable all import tabs (Text, URL, YouTube, PDF, AI)
   - Remove conditional rendering based on MVP flags

2. **Wire up import handlers**
   - Already implemented in `mobile/src/lib/import/`:
     - `url.ts` - URL/YouTube parsing ✅
     - `file.ts` - PDF handling ✅
     - `ai.ts` - AI generation ✅
   - Connect to web API endpoints

3. **API integration**
   - URL import: `POST /api/import/url`
   - YouTube import: `POST /api/import/youtube`
   - PDF import: `POST /api/import/pdf`
   - AI generation: `POST /api/chat` with content generation prompt

4. **Error handling**
   - Show loading states during import
   - Display toast notifications for success/failure
   - Handle network errors gracefully
   - Validate input before submission

**Files to modify:**
- `mobile/src/components/library/ImportModal.tsx` - Remove MVP notices, enable all tabs
- Test all import paths with real content

**Import flows:**

**URL Import:**
1. User enters URL
2. Validate URL format
3. POST to `/api/import/url`
4. Parse response (title, content, metadata)
5. Save to library
6. Show success toast

**YouTube Import:**
1. User enters YouTube URL
2. Extract video ID
3. POST to `/api/import/youtube`
4. Fetch transcript and metadata
5. Save to library
6. Show success toast

**PDF Import:**
1. User selects PDF file
2. Upload file
3. POST to `/api/import/pdf`
4. Extract text content
5. Save to library
6. Show success toast

**AI Generation:**
1. User enters prompt and selects difficulty
2. POST to `/api/chat` with generation instructions
3. Stream response
4. Save generated content to library
5. Show success toast

**Acceptance criteria:**
- [ ] All import tabs visible and functional
- [ ] URL import works with various websites
- [ ] YouTube import extracts transcripts correctly
- [ ] PDF import handles various PDF formats
- [ ] AI generation creates appropriate content
- [ ] Loading states shown during import
- [ ] Error messages displayed for failures
- [ ] Success toasts shown after import

---

## Phase 3: Polish & Stability (2-3 days)

### 3.1 Error Tracking Integration

**Problem:** ErrorBoundary exists but doesn't send errors to tracking service. TODO comments in error handling files.

**Solution:**

1. **Add Sentry SDK**
   - Install: `@sentry/react-native`
   - Initialize in `_layout.tsx`
   - Configure DSN from environment variable

2. **Update ErrorBoundary**
   - Send errors to Sentry in `componentDidCatch`
   - Add error context (user ID, app version, device info)
   - Remove TODO comment

3. **Update error utilities**
   - Integrate `logError()` with Sentry
   - Add breadcrumbs for user actions
   - Remove TODO comment in `errors.ts`

4. **Environment configuration**
   - Add `EXPO_PUBLIC_SENTRY_DSN` to `.env`
   - Only enable in production builds

**Files to modify:**
- `mobile/app/_layout.tsx` - Initialize Sentry
- `mobile/src/components/error/ErrorBoundary.tsx` - Add Sentry.captureException
- `mobile/src/lib/errors.ts` - Integrate logError with Sentry
- `mobile/.env.example` - Add Sentry DSN placeholder

**Acceptance criteria:**
- [ ] Sentry SDK installed and configured
- [ ] Errors captured and sent to Sentry
- [ ] Error context includes user/device info
- [ ] TODO comments removed
- [ ] Only enabled in production

---

### 3.2 Offline Support

**Problem:** No network state monitoring, failed API requests not queued, no offline indicators.

**Solution:**

1. **Network state monitoring**
   - Install: `@react-native-community/netinfo`
   - Create `useNetworkState` hook
   - Show offline banner when disconnected
   - Hide banner when reconnected

2. **Offline queue**
   - Create `OfflineQueue` service
   - Queue failed API requests
   - Auto-retry when network restored
   - Persist queue to AsyncStorage

3. **Offline-first features**
   - All practice modes work offline (already true) ✅
   - Cache TTS audio responses
   - Cache translation results
   - Show cached data when offline

4. **Sync indicators**
   - Show sync status in settings
   - Display "Syncing..." indicator during sync
   - Show last sync timestamp

**Files to create:**
- `mobile/src/hooks/useNetworkState.ts` - Network monitoring hook
- `mobile/src/services/offline-queue.ts` - Request queue service
- `mobile/src/components/shared/OfflineBanner.tsx` - Offline indicator

**Files to modify:**
- `mobile/app/_layout.tsx` - Add OfflineBanner
- `mobile/src/services/tts-api.ts` - Add response caching
- `mobile/src/services/translation-api.ts` - Add response caching
- All API calls - Wrap with offline queue

**Acceptance criteria:**
- [ ] Offline banner appears when network lost
- [ ] Failed requests queued and retried
- [ ] Practice modes work offline
- [ ] TTS and translations cached
- [ ] Sync status visible in settings

---

### 3.3 Accessibility Labels

**Problem:** Many interactive elements missing accessibility labels, hints, and roles.

**Solution:**

1. **Add labels to all interactive elements**
   - Buttons: `accessibilityLabel` describing action
   - Icons: `accessibilityLabel` with text equivalent
   - Inputs: `accessibilityLabel` for field name
   - Cards: `accessibilityLabel` summarizing content

2. **Add hints for complex interactions**
   - `accessibilityHint` for non-obvious actions
   - Example: "Double tap to mark as favorite"

3. **Add consistent roles**
   - `accessibilityRole="button"` for pressable elements
   - `accessibilityRole="header"` for section headers
   - `accessibilityRole="link"` for navigation items

4. **Test with screen readers**
   - VoiceOver (iOS)
   - TalkBack (Android)
   - Verify all content readable
   - Verify navigation logical

**Files to modify:**
- ~30 component files across:
  - `mobile/src/components/library/`
  - `mobile/src/components/dashboard/`
  - `mobile/src/components/practice/`
  - `mobile/src/components/settings/`
  - `mobile/app/(tabs)/`

**Acceptance criteria:**
- [ ] All buttons have accessibility labels
- [ ] All icons have text equivalents
- [ ] Complex interactions have hints
- [ ] Roles assigned consistently
- [ ] VoiceOver navigation works smoothly
- [ ] TalkBack navigation works smoothly

---

### 3.4 Content Editing UI

**Problem:** No way to edit content after creation. Store methods exist but no UI.

**Solution:**

1. **Add edit button**
   - Add "Edit" button in content detail page header
   - Icon: pencil or edit icon
   - Positioned next to delete button

2. **Create edit modal**
   - Form fields:
     - Title (TextInput)
     - Content (TextInput, multiline)
     - Tags (Chip input)
     - Difficulty (Picker: Easy/Medium/Hard)
   - Save and Cancel buttons
   - Validation before save

3. **Wire to store**
   - Use existing `updateContent()` from useLibraryStore
   - Optimistic UI update
   - Show success toast after save

4. **Handle edge cases**
   - Prevent editing while practice session active
   - Confirm before discarding unsaved changes
   - Disable save button if no changes made

**Files to modify:**
- `mobile/app/content/[id].tsx` - Add edit button and modal
- Create `mobile/src/components/library/EditContentModal.tsx` - Edit form component

**UI Flow:**
1. User taps "Edit" button in content detail
2. Modal opens with pre-filled form
3. User modifies fields
4. User taps "Save"
5. Validation runs
6. Content updated in store
7. Modal closes
8. Success toast shown

**Acceptance criteria:**
- [ ] Edit button visible in content detail
- [ ] Edit modal opens with current values
- [ ] All fields editable
- [ ] Validation prevents invalid saves
- [ ] Changes persist after save
- [ ] Success feedback shown

---

## Implementation Order

### Phase 1 (Days 1-4)
1. Dark Mode (Day 1-2)
   - Update _layout.tsx with Paper theme
   - Update 10 high-priority components
   - Update remaining components
   - Test all screens

2. TTS Settings (Day 3)
   - Integrate SpeedSlider component
   - Integrate VoiceSelector component
   - Test voice preview

3. Favorites (Day 4)
   - Add heart icon to ContentCard
   - Add favorites filter to Library
   - Add store methods
   - Test favorite flow

### Phase 2 (Days 5-7)
1. Import Expansion (Day 5-7)
   - Remove MVP notices (Day 5)
   - Enable URL import (Day 5)
   - Enable YouTube import (Day 6)
   - Enable PDF import (Day 6)
   - Enable AI generation (Day 7)
   - Test all import paths (Day 7)

### Phase 3 (Days 8-10)
1. Error Tracking (Day 8)
   - Install Sentry
   - Integrate ErrorBoundary
   - Update error utilities
   - Test error capture

2. Offline Support (Day 9)
   - Add NetInfo
   - Create offline queue
   - Add offline banner
   - Test offline scenarios

3. Accessibility (Day 9-10)
   - Add labels to components
   - Add hints and roles
   - Test with screen readers

4. Content Editing (Day 10)
   - Add edit button
   - Create edit modal
   - Wire to store
   - Test edit flow

---

## Testing Strategy

### Manual Testing
- Test each feature on iOS simulator
- Test dark mode on all screens
- Test all import methods with real content
- Test offline scenarios
- Test with VoiceOver enabled

### Automated Testing
- Unit tests for store methods
- Integration tests for import flows
- Snapshot tests for themed components

### Regression Testing
- Verify existing features still work
- Check practice modes unaffected
- Verify dashboard data accuracy
- Test sync functionality

---

## Success Metrics

**Phase 1:**
- [ ] Dark mode works on all screens
- [ ] TTS speed/voice adjustable
- [ ] Favorites feature functional

**Phase 2:**
- [ ] All import methods enabled
- [ ] 90%+ import success rate

**Phase 3:**
- [ ] Errors tracked in Sentry
- [ ] Offline queue working
- [ ] 90%+ accessibility coverage
- [ ] Content editing functional

**Overall:**
- [ ] No critical bugs introduced
- [ ] App performance maintained
- [ ] User experience improved

---

## Risks & Mitigations

**Risk:** Dark mode breaks existing UI
**Mitigation:** Test incrementally, use theme tokens consistently

**Risk:** Import methods fail with edge cases
**Mitigation:** Add comprehensive error handling, validate inputs

**Risk:** Offline queue causes data conflicts
**Mitigation:** Implement conflict resolution, show sync status

**Risk:** Accessibility changes break existing interactions
**Mitigation:** Test with screen readers, maintain existing behavior

---

## Future Enhancements (Out of Scope)

- Onboarding flow (3-5 screen tutorial)
- Performance optimizations (list virtualization)
- Advanced analytics page
- Social features (sharing, leaderboards)
- Multi-language interface
- Batch operations in library
- Advanced filtering options

---

## Appendix

### Related Documents
- `mobile/docs/FEATURE_AUDIT.md` - Complete feature comparison
- `mobile/docs/MISSING_FEATURES_ANALYSIS.md` - Detailed gap analysis
- `mobile/CLAUDE.md` - Project overview and commands

### Dependencies to Add
- `@sentry/react-native` - Error tracking
- `@react-native-community/netinfo` - Network state monitoring

### Environment Variables
- `EXPO_PUBLIC_SENTRY_DSN` - Sentry project DSN
- `EXPO_PUBLIC_API_URL` - Backend API URL (already exists)

### API Endpoints Used
- `GET /api/tts/edge/voices` - Fetch TTS voices
- `POST /api/tts/edge/synthesize` - Generate TTS audio
- `POST /api/import/url` - Import from URL
- `POST /api/import/youtube` - Import from YouTube
- `POST /api/import/pdf` - Import from PDF
- `POST /api/chat` - AI content generation

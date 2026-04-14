# Phase 2 Testing Checklist

## Test Environment
- [x] Web (localhost:8081) - Basic UI verification
- [ ] iOS Simulator - Full feature testing
- [ ] iOS Device - Real-world testing

## 1. Dashboard (Home)

### UI Components
- [ ] Stats Cards display correctly (Day Streak, Total Time, Sessions)
- [ ] Activity Heatmap shows 7x12 grid
- [ ] Progress Chart shows all 4 modules (Listen, Speak, Read, Write)
- [ ] Continue Learning cards display all 4 modules
- [ ] AI Tutor card is clickable
- [ ] Review card is clickable

### Functionality
- [ ] Stats update based on actual usage
- [ ] Heatmap reflects daily activity
- [ ] Progress percentages are accurate
- [ ] Module cards navigate to correct practice pages
- [ ] AI Tutor navigates to chat
- [ ] Review navigates to review page

## 2. Library

### UI Components
- [ ] Search bar is functional
- [ ] "Favorites Only" filter toggle works
- [ ] Content cards display title, preview, language, progress
- [ ] FAB (+) button opens Import Modal
- [ ] Empty state shows when no content

### Content Management
- [ ] Add content via Text import
- [ ] Add content via URL import
- [ ] Add content via YouTube import
- [ ] Add content via PDF import
- [ ] Add content via AI generation
- [ ] Search filters content correctly
- [ ] Favorites filter shows only favorited items
- [ ] Content cards are clickable

### Content Detail Page
- [ ] Content displays with correct formatting
- [ ] Favorite button toggles state
- [ ] Edit button opens EditContentModal
- [ ] Delete button shows confirmation dialog
- [ ] Delete removes content from library
- [ ] Practice buttons navigate to correct modes

## 3. Listen Module

### List Page
- [ ] Shows all content items
- [ ] Displays total listening time
- [ ] Empty state when no content
- [ ] Content cards navigate to practice page

### Practice Page
- [ ] Audio player loads and plays
- [ ] Play/Pause button works
- [ ] Speed control (0.75x - 2.0x) works
- [ ] Progress bar shows current position
- [ ] Text highlights current word
- [ ] Completed words show in gray
- [ ] Session time is tracked
- [ ] Session saves on exit

## 4. Speak Module

### List Page
- [ ] Shows all content items
- [ ] Displays total speaking time
- [ ] Empty state when no content
- [ ] Content cards navigate to practice page

### Practice Page
- [ ] Microphone permission requested
- [ ] Record button starts/stops recording
- [ ] Transcript displays recognized speech
- [ ] Score card shows pronunciation accuracy
- [ ] Comparison with original text
- [ ] Session time is tracked
- [ ] Session saves on exit

## 5. Read Module

### List Page
- [ ] Shows all content items
- [ ] Displays total reading time
- [ ] Empty state when no content
- [ ] Content cards navigate to practice page

### Practice Page
- [ ] Text displays with proper formatting
- [ ] Tap word to see translation
- [ ] Translation panel shows word info
- [ ] Add to vocabulary button works
- [ ] Reading progress is tracked
- [ ] Session time is tracked
- [ ] Session saves on exit

## 6. Write Module

### List Page
- [ ] Shows all content items
- [ ] Displays total writing time
- [ ] Empty state when no content
- [ ] Content cards navigate to practice page

### Practice Page
- [ ] Original text is hidden initially
- [ ] Typing input is functional
- [ ] Character count updates in real-time
- [ ] Accuracy percentage calculates correctly
- [ ] WPM (words per minute) displays
- [ ] Show/Hide original text toggle works
- [ ] Session time is tracked
- [ ] Session saves on exit

## 7. Vocabulary

### List Page
- [ ] Stats cards show Total/Learning/Mastered counts
- [ ] Vocabulary list displays all words
- [ ] Each word shows translation and context
- [ ] FAB (+) button opens AddVocabularyModal
- [ ] Empty state when no vocabulary

### Word Management
- [ ] Add word manually via modal
- [ ] Add word from reading practice
- [ ] Word card shows review status
- [ ] Tap word to see details
- [ ] Delete word functionality

## 8. Review System (FSRS)

### Review Page
- [ ] Shows due cards count
- [ ] Displays review streak
- [ ] Empty state when no reviews due
- [ ] Review card shows word/content
- [ ] Show/Hide answer button works
- [ ] 4 rating buttons (Again, Hard, Good, Easy)
- [ ] Next review date preview for each rating
- [ ] Card advances after rating
- [ ] Review statistics update

### FSRS Algorithm
- [ ] Initial card scheduling is correct
- [ ] Rating affects next review interval
- [ ] Stability and difficulty update properly
- [ ] Review history is tracked
- [ ] Overdue cards are prioritized

## 9. AI Tutor

### Conversation List
- [ ] Shows all chat conversations
- [ ] Displays last message preview
- [ ] Shows timestamp
- [ ] FAB (+) creates new conversation
- [ ] Empty state when no conversations

### Chat Page
- [ ] Messages display in correct order
- [ ] User messages align right
- [ ] AI messages align left
- [ ] Input field is functional
- [ ] Send button works
- [ ] Loading indicator during AI response
- [ ] Conversation persists

## 10. Settings

### UI Components
- [ ] Language preference selector
- [ ] Theme toggle (Light/Dark/System)
- [ ] Notification settings
- [ ] Account section (if logged in)
- [ ] About section with version info

### Functionality
- [ ] Language change affects UI
- [ ] Theme change applies immediately
- [ ] Settings persist across sessions
- [ ] Logout clears user data (if applicable)

## 11. Navigation

### Tab Bar
- [ ] All 5 tabs are visible
- [ ] Active tab is highlighted
- [ ] Tab icons display correctly
- [ ] Tapping tab navigates correctly
- [ ] Tab bar persists across screens

### Deep Navigation
- [ ] Back button works on all screens
- [ ] Navigation stack is correct
- [ ] Can navigate from any tab to any screen
- [ ] No navigation loops or dead ends

## 12. Data Persistence

### Local Storage
- [ ] Content persists after app restart
- [ ] Vocabulary persists after app restart
- [ ] Settings persist after app restart
- [ ] Session history persists
- [ ] Review data persists

### Offline Mode
- [ ] App loads without internet
- [ ] Can practice with existing content
- [ ] Data syncs when online (if applicable)

## 13. Performance

### Load Times
- [ ] App launches in < 3 seconds
- [ ] Tab switches are instant
- [ ] Content loads quickly
- [ ] No lag during typing/recording

### Memory
- [ ] No memory leaks during extended use
- [ ] Audio playback doesn't cause crashes
- [ ] Large content doesn't slow down app

## 14. Error Handling

### User Errors
- [ ] Empty form validation works
- [ ] Invalid URL shows error message
- [ ] Network errors are handled gracefully
- [ ] Permission denials show helpful message

### Edge Cases
- [ ] Very long content displays correctly
- [ ] Special characters in content work
- [ ] Multiple rapid taps don't cause issues
- [ ] Background/foreground transitions work

## Test Results Summary

### Web Testing (localhost:8081)
- ✅ Dashboard renders correctly
- ✅ Library page displays properly
- ✅ Import Modal shows all 5 methods
- ✅ Vocabulary page displays correctly
- ✅ Fixed white screen issue (auth timeout)
- ⚠️ Input interaction limited via browser automation

### iOS Testing
- Status: Build in progress
- Full feature testing pending

### Issues Found
1. **White Screen in Offline Mode** - FIXED
   - Issue: Supabase auth.getSession() hangs without network
   - Fix: Added 3-second timeout to loadUser()
   - Commit: fix: add timeout to auth loading

### Next Steps
1. Complete iOS simulator testing
2. Test all import methods with real data
3. Test all practice modes end-to-end
4. Verify FSRS algorithm with multiple reviews
5. Test AI Tutor with real conversations
6. Performance testing with large datasets
7. UI/UX polish based on findings

---

## Phase 1 Core Supplement - Day 1-2: Settings + Dark Mode Foundation ✅

### Completed Features (2026-04-15)

1. **TTS Speed Slider**
   - Component: `src/components/settings/SpeedSlider.tsx`
   - Range: 0.5x - 2.0x (0.25 increments)
   - Visual marks at 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0
   - Real-time preview capability
   - Integrated in Settings page (expandable section)

2. **Voice Selector**
   - Component: `src/components/settings/VoiceSelector.tsx`
   - Modal-based selection UI
   - 6 predefined voices (US/UK English, Chinese)
   - Voice preview capability
   - Integrated in Settings page

3. **Dark Mode Foundation**
   - Extended color system: `src/theme/colors.ts`
   - 36 color tokens for light mode
   - 36 color tokens for dark mode
   - WCAG AA contrast compliance
   - Theme context: `src/contexts/ThemeContext.tsx`
   - System theme following support
   - Manual toggle in Settings

4. **Dependencies Added**
   - `@react-native-community/slider` - TTS speed control
   - `react-native-toast-message` - Error feedback (for future use)

### Manual Testing Steps

#### Test 1: TTS Speed Slider
1. Open app and navigate to Settings tab
2. Find "Playback Speed" section
3. Tap to expand the section
4. Verify slider shows current speed (default 1.0x)
5. Drag slider to different positions
6. Verify marks are visible at 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0
7. Verify value updates in real-time
8. Tap outside to collapse
9. Re-expand and verify value persists

#### Test 2: Voice Selector
1. In Settings, find "TTS Voice" section
2. Tap to open voice selector modal
3. Verify 6 voices are listed:
   - Jenny (US Female)
   - Guy (US Male)
   - Libby (UK Female)
   - Ryan (UK Male)
   - Xiaoxiao (Chinese Female)
   - Yunyang (Chinese Male)
4. Tap a voice to select
5. Verify modal closes
6. Verify selected voice shows in Settings
7. Re-open modal and verify selection is highlighted

#### Test 3: Dark Mode Toggle
1. In Settings, find "Dark Mode" switch
2. Toggle switch ON
3. Verify entire app switches to dark theme:
   - Background: Dark blue (#0F172A)
   - Surface: Slate (#1E293B)
   - Text: Light (#F1F5F9)
   - Primary: Light indigo (#818CF8)
4. Navigate to other tabs (Library, Dashboard, etc.)
5. Verify dark theme applies consistently
6. Return to Settings and toggle OFF
7. Verify app returns to light theme

#### Test 4: System Theme Following
1. Close app completely
2. Change device/system theme to Dark
3. Open app
4. Verify app follows system theme (dark)
5. Change system theme to Light
6. Verify app switches to light theme
7. In Settings, manually toggle Dark Mode
8. Verify manual setting overrides system theme

#### Test 5: Theme Persistence
1. Toggle Dark Mode ON
2. Close app completely
3. Reopen app
4. Verify Dark Mode is still enabled
5. Toggle OFF and repeat test

### TypeScript Compilation ✅
- All type errors fixed
- `pnpm type-check` passes with no errors

### Files Modified/Created

**New Files:**
- `src/contexts/ThemeContext.tsx` - Theme management
- `src/components/settings/SpeedSlider.tsx` - TTS speed control
- `src/components/settings/VoiceSelector.tsx` - Voice selection modal

**Modified Files:**
- `src/theme/colors.ts` - Extended with dark mode colors
- `app/_layout.tsx` - Added ThemeProvider wrapper
- `app/(tabs)/settings.tsx` - Integrated new components
- `src/components/library/ContentCard.tsx` - Added optional onEdit prop
- `scripts/seed-test-data.ts` - Fixed Content type compatibility
- `package.json` - Added new dependencies

### Known Issues
None at this stage.

### Remaining Phase 1 Tasks
- Day 3: Error Handling system
- Day 4: Accessibility improvements
- Day 5: TypeScript error fixes in src/
- Day 6-7: Simplified Onboarding
- Day 8: Complete Dark Mode migration (apply to all screens)
- Day 9: E2E testing with Detox
- Day 10: Manual testing and bug fixes

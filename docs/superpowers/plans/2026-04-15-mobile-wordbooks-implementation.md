# Mobile WordBooks Implementation Plan

**Date:** 2026-04-15  
**Spec:** docs/superpowers/specs/2026-04-15-mobile-wordbooks-design.md  
**Branch:** feat/mobile-native-app-plan  
**Execution:** Subagent-driven development

---

## Overview

Implement mobile WordBooks feature to replace FSRS flashcard system. This plan breaks down the work into independent tasks that can be executed by subagents with two-stage review (spec compliance, then code quality).

**Total Tasks:** 10  
**Estimated Duration:** 8-12 hours  
**Dependencies:** Web wordbook data structure, useLibraryStore, FSRS algorithm

---

## Task 1: Port wordbook data structure from web to mobile

**Goal:** Create mobile wordbook library infrastructure by porting web wordbook metadata and lazy loading utilities.

**Files to create:**
- `mobile/src/lib/wordbooks/index.ts` - Re-exports and main API
- `mobile/src/lib/wordbooks/vocabulary.ts` - Vocabulary collections metadata (port from web)
- `mobile/src/lib/wordbooks/scenarios.ts` - Scenario collections metadata (port from web)
- `mobile/src/lib/wordbooks/load-items.ts` - Lazy loader for large wordbooks

**Files to reference:**
- `src/lib/wordbooks/index.ts` - Web implementation
- `src/lib/wordbooks/vocabulary.ts` - Web vocabulary data
- `src/lib/wordbooks/scenarios.ts` - Web scenarios data
- `src/lib/wordbooks/load-items.ts` - Web lazy loader
- `src/types/wordbook.ts` - WordBook and WordItem types

**Requirements:**
1. Port ALL_WORDBOOKS array from web (vocabulary + scenarios)
2. Port getWordBook() function
3. Port loadWordBookItems() function with React Native compatible imports
4. Ensure lazy loading works with React Native's require() for JSON files
5. Export ALL_WORDBOOK_IDS for store initialization
6. Maintain exact same data structure as web for consistency

**Testing:**
- Unit test: Load inline items for small wordbooks
- Unit test: Lazy-load large wordbooks from JSON
- Unit test: Handle missing wordbook gracefully
- Unit test: getWordBook() returns correct book by ID

**Success criteria:**
- All wordbook metadata accessible in mobile
- Lazy loading works for large wordbooks
- Same API as web version
- Tests pass

---

## Task 2: Create useWordBookStore with AsyncStorage persistence

**Goal:** Implement Zustand store to track imported wordbook IDs with AsyncStorage persistence.

**Files to create:**
- `mobile/src/stores/useWordBookStore.ts` - WordBook import state store

**Files to reference:**
- `src/stores/wordbook-store.ts` - Web implementation (for API reference)
- `mobile/src/stores/useLibraryStore.ts` - Mobile library store (for integration)
- `mobile/src/lib/wordbooks/index.ts` - Wordbook utilities (from Task 1)

**Requirements:**
1. Create Zustand store with persist middleware (AsyncStorage)
2. State: `importedIds: Set<string>`, `loading: boolean`
3. Actions:
   - `loadImportedState()` - Check which wordbooks have items in library
   - `importWordBook(id)` - Load items, add to library, save ID
   - `removeWordBook(id)` - Remove items from library, delete ID
   - `isImported(id)` - Check if wordbook is imported
4. Integration with useLibraryStore:
   - Import: Transform WordItem[] to Content[], set category=wordbookId
   - Remove: Filter out all Content where category=wordbookId
5. Persist importedIds Set to AsyncStorage as array
6. Handle Set serialization/deserialization correctly

**Testing:**
- Unit test: Track imported wordbook IDs
- Unit test: Add items to library on import
- Unit test: Remove all items on wordbook removal
- Unit test: Persist imported IDs to AsyncStorage
- Unit test: Restore imported IDs from AsyncStorage on init

**Success criteria:**
- Store persists to AsyncStorage
- Import/remove operations work correctly
- Integration with useLibraryStore works
- Tests pass

---

## Task 3: Create reusable wordbook components (FilterPills, SegmentedControl)

**Goal:** Build iOS-native filter and segmented control components with haptics and animations.

**Files to create:**
- `mobile/src/components/wordbooks/FilterPills.tsx` - Horizontal scrollable filter chips
- `mobile/src/components/wordbooks/SegmentedControl.tsx` - iOS-style segmented control

**Files to reference:**
- Design spec sections 2.1 and 2.3 for interaction specs
- Appendix B for design tokens

**Requirements:**

**FilterPills:**
1. Horizontal ScrollView with pill-shaped chips
2. Props: `options: string[]`, `active: string`, `onChange: (value: string) => void`
3. Active state: filled indigo (#4F46E5) with white text
4. Inactive state: white background with indigo border
5. iOS-style shadows (shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.04, shadowRadius: 8)
6. Border radius: 20px
7. Haptic feedback (Light impact) on tap
8. Smooth spring animation on active state change
9. Accessibility: accessibilityRole="button", accessibilityLabel, accessibilityState={{selected}}

**SegmentedControl:**
1. Two-segment iOS-style control
2. Props: `segments: string[]`, `activeIndex: number`, `onChange: (index: number) => void`
3. Indigo tint color (#4F46E5)
4. Smooth spring animation on switch (damping: 15, stiffness: 300)
5. Haptic feedback (Light impact) on tap
6. Accessibility: accessibilityRole="tab", accessibilityLabel, accessibilityState={{selected}}

**Testing:**
- Component test: FilterPills highlights active filter
- Component test: FilterPills triggers haptic on tap
- Component test: SegmentedControl switches segments with animation
- Component test: SegmentedControl triggers haptic on tap
- Component test: Accessibility labels are correct

**Success criteria:**
- Components match iOS design patterns
- Haptics work correctly
- Animations are smooth (spring physics)
- Accessibility implemented
- Tests pass

---

## Task 4: Create WordBookCard component with glassmorphism and interactions

**Goal:** Build individual wordbook card with glassmorphic design, press animations, and import/remove actions.

**Files to create:**
- `mobile/src/components/wordbooks/WordBookCard.tsx` - Individual wordbook card

**Files to reference:**
- Design spec section 2.1 for card design
- Appendix B for design tokens
- `mobile/src/stores/useWordBookStore.ts` - For import/remove actions

**Requirements:**
1. Glassmorphic card design:
   - Background: `rgba(255, 255, 255, 0.7)` with backdrop blur (BlurView if available, fallback to opacity)
   - Border: `1px solid rgba(79, 70, 229, 0.1)`
   - iOS-style multi-layer shadow
   - Border radius: 16px
   - Padding: 16px

2. Card content:
   - Emoji icon (48×48pt) in indigo-tinted circle background
   - Title (Poppins SemiBold, 16pt, #1E293B)
   - Subtitle (Open Sans Regular, 13pt, #64748B) - category tag
   - Description (Open Sans Regular, 14pt, #64748B, 2 lines max with ellipsis)
   - Badges: Difficulty + Item count
   - Action button: Import (green #22C55E) or Remove (indigo outline)

3. Interaction states:
   - Press: Scale to 0.96 with spring animation (Reanimated)
   - Haptic: Light impact on press start
   - Visual feedback within 100ms

4. Props: `book: WordBook`, `isImported: boolean`, `onPress: () => void`, `onImport: () => void`, `onRemove: () => void`

5. Accessibility:
   - accessibilityRole="button"
   - accessibilityLabel="{book.nameEn}, {book.difficulty}, {itemCount} items"
   - accessibilityHint="Tap to view details or remove" / "Tap to import"

**Testing:**
- Component test: Show import button for non-imported books
- Component test: Show remove button for imported books
- Component test: Trigger haptic on press
- Component test: Scale animation on press
- Component test: Accessibility labels correct

**Success criteria:**
- Card matches glassmorphic design
- Press animations smooth (spring physics)
- Haptics work correctly
- Import/remove actions work
- Accessibility implemented
- Tests pass

---

## Task 5: Create WordBookGrid with FlashList and staggered animations

**Goal:** Build 2-column grid layout with FlashList for performance and staggered entrance animations.

**Files to create:**
- `mobile/src/components/wordbooks/WordBookGrid.tsx` - 2-column grid with FlashList

**Files to reference:**
- Design spec section 2.1 for grid layout
- `mobile/src/components/wordbooks/WordBookCard.tsx` - Card component (from Task 4)

**Requirements:**
1. Use FlashList for virtualization (50+ items)
2. 2-column grid with 12px gap
3. Props: `wordbooks: WordBook[]`, `importedIds: Set<string>`, `onCardPress: (id: string) => void`
4. Staggered entrance animation:
   - Fade + slide up
   - 50ms delay per card
   - Spring physics (damping: 15, stiffness: 300)
5. Memoize WordBookCard to prevent unnecessary re-renders
6. Handle empty state: "No wordbooks found"
7. Safe area insets: paddingBottom for floating elements

**Testing:**
- Component test: Renders 2-column grid
- Component test: Staggered animation on mount
- Component test: Empty state when no wordbooks
- Component test: Memoization prevents re-renders

**Success criteria:**
- FlashList performs well with 50+ items
- Staggered animations smooth
- 2-column layout correct
- Empty state handled
- Tests pass

---

## Task 6: Implement main Vocabulary screen with tabs and filters

**Goal:** Build main WordBooks browser screen with segmented control, filters, stats card, and grid.

**Files to create/replace:**
- `mobile/app/(tabs)/vocabulary.tsx` - Main WordBooks browser (replace existing)

**Files to reference:**
- Design spec section 2.1 for layout structure
- `mobile/src/components/wordbooks/SegmentedControl.tsx` - (from Task 3)
- `mobile/src/components/wordbooks/FilterPills.tsx` - (from Task 3)
- `mobile/src/components/wordbooks/WordBookGrid.tsx` - (from Task 5)
- `mobile/src/stores/useWordBookStore.ts` - (from Task 2)
- `mobile/src/lib/wordbooks/index.ts` - (from Task 1)

**Requirements:**
1. Large title header: "WordBooks" (collapses on scroll)
2. Segmented control: "Vocabulary" | "Scenarios"
3. Filter pills: Horizontal scroll with category filters
   - Vocabulary: All, School, Textbook, College, Graduate, Domestic Exam, Study Abroad, Cambridge, Core Vocabulary, Professional, Tech, General, Academic
   - Scenarios: All, Travel, Food & Drink, Daily Life, Business, Health, Social, Emergency
4. Stats card (if importedIds.size > 0):
   - Glassmorphic card
   - "X WordBooks Imported" with checkmark icon
5. WordBookGrid with filtered wordbooks
6. Navigation: Tap card → navigate to `/wordbooks/[id]`
7. Pull-to-refresh to reload imported state
8. Background: #EEF2FF

**Testing:**
- Integration test: Filter wordbooks by category
- Integration test: Switch between Vocabulary and Scenarios tabs
- Integration test: Navigate to detail on card tap
- Integration test: Stats card shows correct count
- Integration test: Pull-to-refresh works

**Success criteria:**
- All UI elements render correctly
- Filtering works
- Tab switching works
- Navigation works
- Stats card accurate
- Tests pass

---

## Task 7: Create WordCard component with expandable example

**Goal:** Build word card for detail view with pronunciation button and expandable example sentence.

**Files to create:**
- `mobile/src/components/wordbooks/WordCard.tsx` - Word item card

**Files to reference:**
- Design spec section 2.2 for word card design
- Appendix B for design tokens

**Requirements:**
1. White card with subtle shadow (iOS-style)
2. Content:
   - Word (Poppins SemiBold, 18pt, #1E293B)
   - Meaning (Open Sans Regular, 15pt, #64748B)
   - Pronunciation button (speaker icon, indigo)
   - Example (expandable, Open Sans Italic, 14pt, #64748B, light indigo background)
3. Tap card → Expand to show example with spring animation
4. Pronunciation button → Play TTS (use existing TTS hook)
5. Props: `word: string`, `meaning: string`, `example?: string`, `onPronounce: () => void`
6. Accessibility:
   - accessibilityRole="button"
   - accessibilityLabel="{word}, {meaning}"
   - Pronunciation button: accessibilityLabel="Pronounce {word}"

**Testing:**
- Component test: Renders word and meaning
- Component test: Expand animation on tap
- Component test: Pronunciation button triggers TTS
- Component test: Accessibility labels correct

**Success criteria:**
- Card design matches spec
- Expand animation smooth
- Pronunciation works
- Accessibility implemented
- Tests pass

---

## Task 8: Create PracticeActionSheet component

**Goal:** Build bottom action sheet with 4 practice mode options (Listen, Speak, Read, Write).

**Files to create:**
- `mobile/src/components/wordbooks/PracticeActionSheet.tsx` - Practice mode selector

**Files to reference:**
- Design spec section 2.2 for action sheet design
- React Native Paper BottomSheet or native ActionSheet

**Requirements:**
1. Bottom sheet with 4 options:
   - Listen (headphones icon)
   - Speak (microphone icon)
   - Read (book icon)
   - Write (pencil icon)
2. Props: `visible: boolean`, `onDismiss: () => void`, `onSelect: (mode: 'listen' | 'speak' | 'read' | 'write') => void`, `wordbookId: string`
3. Each option navigates to practice module with wordbook filter
4. Haptic feedback (Light impact) on option tap
5. Dismiss on backdrop tap or swipe down
6. Accessibility: accessibilityRole="menu", accessibilityLabel for each option

**Testing:**
- Component test: Renders 4 options
- Component test: Calls onSelect with correct mode
- Component test: Dismisses on backdrop tap
- Component test: Haptic feedback on tap

**Success criteria:**
- Action sheet displays correctly
- Options navigate correctly
- Haptics work
- Accessibility implemented
- Tests pass

---

## Task 9: Implement WordBook detail screen with search and practice FAB

**Goal:** Build detail screen showing wordbook header, searchable word list, and floating practice button.

**Files to create:**
- `mobile/app/wordbooks/[id].tsx` - WordBook detail page

**Files to reference:**
- Design spec section 2.2 for detail screen layout
- `mobile/src/components/wordbooks/WordCard.tsx` - (from Task 7)
- `mobile/src/components/wordbooks/PracticeActionSheet.tsx` - (from Task 8)
- `mobile/src/lib/wordbooks/index.ts` - (from Task 1)

**Requirements:**
1. Navigation bar with back button (< WordBooks)
2. Header:
   - Emoji icon (64×64pt)
   - Title (Poppins Bold, 24pt)
   - Category + Difficulty + Item count badges
   - Description (Open Sans Regular, 15pt)
3. Sticky search bar (appears on scroll)
4. Word list:
   - SectionList with A-Z headers (for vocabulary)
   - WordCard components
   - Lazy load items on mount
5. Floating Practice button:
   - Green CTA (#22C55E)
   - Bottom-right corner, 16pt from edges
   - Above safe area (respects bottom inset)
   - Shadow: `0 4px 12px rgba(34, 197, 94, 0.3)`
   - Tap → Show PracticeActionSheet
6. Search: 300ms debounce, filter by word or meaning
7. Back swipe gesture enabled
8. Maintain scroll position on back navigation

**Testing:**
- Integration test: Detail page loads wordbook data
- Integration test: Search filters words correctly
- Integration test: Practice FAB shows action sheet
- Integration test: Back navigation works
- Integration test: Scroll position preserved

**Success criteria:**
- All UI elements render correctly
- Search works with debounce
- Practice FAB works
- Navigation works
- Tests pass

---

## Task 10: Implement flashcard migration utility

**Goal:** Create one-time migration to convert existing FSRS flashcards to Library content items.

**Files to create:**
- `mobile/src/lib/migration/flashcard-migration.ts` - Migration utility

**Files to reference:**
- Design spec section 6.1 for migration logic
- `mobile/src/stores/useReviewStore.ts` - Old flashcard store
- `mobile/src/stores/useLibraryStore.ts` - Target library store

**Requirements:**
1. Function: `migrateFlashcardsToLibrary()`
2. Read flashcards from AsyncStorage ('review-storage')
3. Convert each flashcard to Content:
   - id: nanoid()
   - title: card.word
   - text: card.meaning
   - content: card.example || ''
   - category: 'user-flashcards'
   - type: 'vocabulary'
   - tags: ['flashcard', 'migrated']
   - difficulty: 'intermediate'
   - fsrsCard: card.fsrsData (preserve FSRS state)
4. Add all contents to useLibraryStore
5. Mark migration complete: AsyncStorage.setItem('flashcard-migration-complete', 'true')
6. Check migration status before running (don't migrate twice)
7. Call migration on app launch (in root layout or App.tsx)

**Testing:**
- Unit test: Migrate flashcards to library
- Unit test: Preserve FSRS state
- Unit test: Mark migration complete
- Unit test: Don't migrate twice
- Unit test: Handle empty flashcard store

**Success criteria:**
- Migration runs once on app launch
- All flashcards converted to Content
- FSRS state preserved
- Migration flag set
- Tests pass

---

## Cleanup Tasks (After all implementation tasks)

### Cleanup 1: Remove old FSRS flashcard code

**Files to delete:**
- `mobile/src/components/vocabulary/AddVocabularyModal.tsx`
- `mobile/src/stores/useReviewStore.ts`

**Files to update:**
- Remove any imports/references to useReviewStore
- Remove any imports/references to AddVocabularyModal

### Cleanup 2: Update navigation and tab bar

**Files to update:**
- `mobile/app/(tabs)/_layout.tsx` - Ensure vocabulary tab still works
- `mobile/src/components/navigation/CustomTabBar.tsx` - Update icon if needed

---

## Dependencies Between Tasks

```
Task 1 (wordbook data) → Task 2 (store)
Task 1 (wordbook data) → Task 6 (main screen)
Task 2 (store) → Task 4 (card)
Task 2 (store) → Task 6 (main screen)
Task 3 (components) → Task 6 (main screen)
Task 4 (card) → Task 5 (grid)
Task 5 (grid) → Task 6 (main screen)
Task 7 (word card) → Task 9 (detail screen)
Task 8 (action sheet) → Task 9 (detail screen)
Task 1 (wordbook data) → Task 9 (detail screen)

Task 10 (migration) - Independent, can run anytime
```

**Execution Order:**
1. Task 1 (wordbook data) - Foundation
2. Task 2 (store) - Core logic
3. Task 3 (FilterPills, SegmentedControl) - Reusable components
4. Task 4 (WordBookCard) - Card component
5. Task 5 (WordBookGrid) - Grid layout
6. Task 6 (Main screen) - Assemble main UI
7. Task 7 (WordCard) - Detail components
8. Task 8 (PracticeActionSheet) - Detail components
9. Task 9 (Detail screen) - Assemble detail UI
10. Task 10 (Migration) - Data migration
11. Cleanup 1 & 2 - Remove old code

---

## Testing Strategy

**Per Task:**
- Unit tests for logic (stores, utilities)
- Component tests for UI components
- Integration tests for screens

**After All Tasks:**
- E2E test: Import flow (browse → import → verify in library)
- E2E test: Detail view (tap card → search → pronounce → practice)
- E2E test: Remove flow (long press → remove → verify removed)
- E2E test: Migration (flashcards → library)

**Performance:**
- Measure initial load time (< 500ms)
- Measure filter switch time (< 100ms)
- Measure import time for 500 items (< 2s)
- Measure scroll FPS (60fps on iPhone 11+)

---

## Success Criteria

**Functionality:**
- ✅ All 50+ wordbooks browsable
- ✅ Import/remove works correctly
- ✅ Detail pages load and display words
- ✅ Search works with debounce
- ✅ Practice navigation works
- ✅ Migration preserves flashcards

**Performance:**
- ✅ Initial load < 500ms
- ✅ Filter switch < 100ms
- ✅ Import < 2s for 500 items
- ✅ Scroll 60fps on iPhone 11+

**Quality:**
- ✅ All tests pass
- ✅ No TypeScript errors
- ✅ Accessibility implemented
- ✅ Haptics work correctly
- ✅ Animations smooth (spring physics)

**Design:**
- ✅ Matches design spec
- ✅ iOS-native interactions
- ✅ Glassmorphism style
- ✅ Existing theme colors

---

**End of Implementation Plan**

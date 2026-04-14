# Mobile WordBooks Feature Design

**Date:** 2026-04-15  
**Status:** Approved  
**Platform:** React Native (Expo)  
**Scope:** Replace mobile FSRS flashcard system with web-parity WordBooks browser

---

## Executive Summary

Replace the current mobile Vocabulary tab (FSRS flashcard system) with a WordBooks browser that matches the web app's functionality. Users will browse and import 50+ curated vocabulary collections (NCE, TOEFL, Business English, etc.) with iOS-native interactions and the existing EchoType design system.

**Key Changes:**
- Remove: FSRS flashcard system (`useReviewStore`, manual word entry)
- Add: WordBooks browser with 50+ pre-made collections
- Add: WordBook detail pages with word lists and practice entry points
- Maintain: Existing theme colors (Indigo primary, Green CTA, Glassmorphism)
- Enhance: iOS-native interactions (spring animations, haptics, gestures)

---

## 1. Architecture & Data Flow

### 1.1 Core Components

**New Store: `useWordBookStore`**
```typescript
interface WordBookStore {
  importedIds: Set<string>;      // Tracks which wordbooks are imported
  loading: boolean;
  
  loadImportedState: () => Promise<void>;
  importWordBook: (wordbookId: string) => Promise<void>;
  removeWordBook: (wordbookId: string) => Promise<void>;
  isImported: (wordbookId: string) => boolean;
}
```

**Storage Strategy:**
- `useWordBookStore`: Persisted to AsyncStorage, stores only imported wordbook IDs (lightweight)
- `useLibraryStore`: Stores actual Content items (already exists, reused)
- WordBook metadata: Bundled TypeScript files (`vocabulary.ts`, `scenarios.ts`)
- Large wordbook items: Lazy-loaded JSON files (NCE, TOEFL, etc.)

### 1.2 Data Flow

**Import Flow:**
```
1. User taps "Import" on NCE Book 1
2. useWordBookStore.importWordBook("nce-1")
3. Load items via loadWordBookItems("nce-1")
4. Transform to Content[] with category="nce-1"
5. Add to useLibraryStore.contents
6. Save "nce-1" to importedIds Set
7. Persist to AsyncStorage
8. Show success toast + haptic feedback
```

**Remove Flow:**
```
1. User taps "Remove" on imported wordbook
2. useWordBookStore.removeWordBook("nce-1")
3. Filter out all Content items where category="nce-1"
4. Remove "nce-1" from importedIds Set
5. Persist to AsyncStorage
6. Show confirmation toast + haptic feedback
```

**Integration with Library:**
- Imported wordbook items become `Content` objects in `useLibraryStore`
- Each item gets `category` field set to wordbook ID
- Enables filtering: "Show all items from NCE Book 1"
- FSRS state preserved per item for spaced repetition

---

## 2. UI Structure & iOS-Native Interactions

### 2.1 Main Vocabulary Screen (`mobile/app/(tabs)/vocabulary.tsx`)

**Layout Structure:**

1. **Large Title Header** (iOS-native pattern)
   - Large title "WordBooks" that collapses on scroll
   - Sticky search bar appears when scrolling down
   - Background: `#EEF2FF` with subtle gradient

2. **Segmented Control** (iOS native component)
   - Two segments: "Vocabulary" | "Scenarios"
   - Indigo tint color (`#4F46E5`)
   - Smooth spring animation on switch

3. **Filter Pills** (Horizontal ScrollView)
   - Pill-shaped chips with iOS-style shadows
   - Active state: filled indigo with white text
   - Inactive: white background with indigo border
   - Haptic feedback on tap
   - Categories:
     - Vocabulary: All, School, Textbook, College, Graduate, Domestic Exam, Study Abroad, Cambridge, Core Vocabulary, Professional, Tech, General, Academic
     - Scenarios: All, Travel, Food & Drink, Daily Life, Business, Health, Social, Emergency

4. **Stats Card** (if user has imports)
   - Glassmorphic card at top
   - Shows "X WordBooks Imported" with checkmark icon
   - Subtle blur effect with white/80 background

5. **Grid Layout**
   - 2-column grid with 12px gap
   - Cards use iOS-style shadows (subtle, layered)
   - Spring animation on scroll (staggered entrance)
   - FlashList for performance (50+ items)

**WordBook Card Design:**

**Visual Style:**
- Glassmorphic card: `rgba(255, 255, 255, 0.7)` with backdrop blur
- Border: `1px solid rgba(79, 70, 229, 0.1)`
- Shadow: iOS-style multi-layer
  - `0 2px 8px rgba(0,0,0,0.04)`
  - `0 4px 16px rgba(0,0,0,0.06)`
- Border radius: 16px
- Padding: 16px

**Card Content:**
- Emoji icon (48×48pt) in indigo-tinted circle background
- Title (Poppins SemiBold, 16pt, indigo-900)
- Subtitle (Open Sans Regular, 13pt, indigo-400) - category tag
- Description (Open Sans Regular, 14pt, indigo-600, 2 lines max with ellipsis)
- Badges row:
  - Difficulty badge (Beginner/Intermediate/Advanced)
  - Item count badge
- Action button at bottom:
  - Import: Green CTA (`#22C55E`) with white text
  - Imported: Indigo outline with checkmark icon, disabled state

**Interaction States:**
- **Press:** Scale to 0.96 with spring animation (damping: 15, stiffness: 300)
- **Haptic:** Light impact on press start
- **Long press:** Context menu (Preview, Share, Import/Remove)
- **Swipe left:** Quick action: Import/Remove

### 2.2 WordBook Detail Screen (`mobile/app/wordbooks/[id].tsx`)

**Layout:**
- iOS navigation bar with back button (< WordBooks)
- Large header with:
  - Emoji icon (64×64pt)
  - Title (Poppins Bold, 24pt)
  - Category + Difficulty + Item count badges
  - Description (Open Sans Regular, 15pt)
- Sticky search bar (appears on scroll)
- Word list with section headers (A, B, C... for vocabulary)
- Floating action button: "Practice" (green CTA)

**Word Card:**
- White card with subtle shadow
- Word (Poppins SemiBold, 18pt, indigo-900)
- Meaning (Open Sans Regular, 15pt, indigo-600)
- Pronunciation button (speaker icon, indigo)
- Tap card → Expand to show example sentence with animation
- Example (Open Sans Italic, 14pt, indigo-500, in light indigo background)

**Practice Button (Floating):**
- Green CTA (`#22C55E`)
- Bottom-right corner, 16pt from edges
- Above safe area (respects bottom inset)
- Shadow: `0 4px 12px rgba(34, 197, 94, 0.3)`
- Tap → Action sheet with 4 options:
  - Listen (headphones icon)
  - Speak (microphone icon)
  - Read (book icon)
  - Write (pencil icon)

**Transitions:**
- Push from right (iOS standard)
- Shared element: emoji icon animates from card to header
- Back swipe gesture enabled
- Maintains scroll position on back navigation

### 2.3 iOS-Native Interactions

**Scroll Behavior:**
- Bounce scroll (native iOS)
- Large title collapses smoothly
- Pull-to-refresh with activity indicator
- Momentum scrolling preserved

**Gestures:**
- Tap card → Navigate to detail with push transition
- Long press card → Context menu (Preview, Share, Import/Remove)
- Swipe card left → Quick action: Import/Remove
- Back swipe → Navigate back (system gesture)

**Animations:**
- All transitions use spring physics (not cubic-bezier)
- Card entrance: staggered fade + slide up (50ms delay per card)
- Segmented control: smooth slide with spring
- Filter pills: horizontal scroll with momentum
- Word card expand: spring animation with layout transition

**Haptic Feedback:**
- Light impact: All taps (cards, buttons, pills)
- Medium impact: Import/remove success
- Error notification: Import/remove failure
- Success notification: Import complete
- Visual feedback within 100ms of tap

**Animation Specifications:**
```typescript
const springConfig = {
  damping: 15,
  stiffness: 300,
  mass: 1,
};

const cardPressAnimation = {
  scale: withSpring(0.96, springConfig),
  opacity: withSpring(0.9, springConfig),
};

const staggerDelay = 50; // ms per card
```

---

## 3. Component Structure & File Organization

### 3.1 New Files to Create

```
mobile/
├── app/
│   ├── (tabs)/
│   │   └── vocabulary.tsx                    # Main WordBooks browser (replace existing)
│   └── wordbooks/
│       └── [id].tsx                          # WordBook detail page
├── src/
│   ├── components/
│   │   └── wordbooks/
│   │       ├── WordBookCard.tsx              # Individual wordbook card
│   │       ├── WordBookGrid.tsx              # 2-column grid layout
│   │       ├── FilterPills.tsx               # Horizontal filter chips
│   │       ├── SegmentedControl.tsx          # Vocabulary/Scenarios toggle
│   │       ├── WordCard.tsx                  # Word item in detail view
│   │       └── PracticeActionSheet.tsx       # Bottom sheet for practice options
│   ├── stores/
│   │   └── useWordBookStore.ts               # WordBook import state
│   └── lib/
│       └── wordbooks/
│           ├── index.ts                      # Re-exports from web
│           ├── vocabulary.ts                 # Vocabulary collections metadata
│           ├── scenarios.ts                  # Scenario collections metadata
│           ├── load-items.ts                 # Lazy loader for large wordbooks
│           └── data/                         # JSON files for large wordbooks
│               ├── nce-1.json
│               ├── toefl.json
│               └── ...
```

### 3.2 Files to Delete

```
mobile/src/components/vocabulary/AddVocabularyModal.tsx  # No longer needed
mobile/src/stores/useReviewStore.ts                      # FSRS flashcard system removed
```

### 3.3 Component Hierarchy

```
vocabulary.tsx (Main Screen)
├── SegmentedControl (Vocabulary | Scenarios)
├── FilterPills (All, School, Textbook, ...)
├── Stats Card (if importedIds.size > 0)
└── WordBookGrid (FlashList)
    └── WordBookCard[] (map over filtered wordbooks)
        ├── Emoji Icon
        ├── Title + Category
        ├── Description
        ├── Badges (Difficulty, Count)
        └── Import/Remove Button

wordbooks/[id].tsx (Detail Screen)
├── Navigation Bar (Back button)
├── Header
│   ├── Emoji Icon
│   ├── Title + Badges
│   └── Description
├── Search Bar (sticky)
├── Word List (SectionList with A-Z headers)
│   └── WordCard[]
│       ├── Word + Pronunciation Button
│       ├── Meaning
│       └── Example (expandable)
└── Floating Practice Button
    └── PracticeActionSheet (Listen/Speak/Read/Write)
```

---

## 4. Technical Specifications

### 4.1 Theme Extension

```typescript
const wordbookTheme = {
  colors: {
    primary: '#4F46E5',        // Indigo (existing)
    accent: '#22C55E',         // Green CTA (existing)
    background: '#EEF2FF',     // Light indigo bg (existing)
    surface: 'rgba(255, 255, 255, 0.7)',  // Glassmorphic cards
    surfaceVariant: '#F8FAFF', // Subtle variant
    onSurface: '#1E293B',      // Text on cards
    onSurfaceVariant: '#64748B', // Secondary text
    outline: 'rgba(79, 70, 229, 0.1)', // Card borders
  },
  roundness: 16,
};
```

### 4.2 Performance Optimizations

1. **Virtualized Grid:** Use `FlashList` instead of `FlatList` for wordbook grid (50+ items)
2. **Lazy Loading:** Load wordbook items only when detail page opens
3. **Memoization:** Memo WordBookCard to prevent unnecessary re-renders
4. **Image Optimization:** Use emoji as text (no image assets needed)
5. **Debounced Search:** 300ms debounce on search input
6. **Stale-while-revalidate:** Cache wordbook metadata, refresh in background

### 4.3 Accessibility

```typescript
// WordBook Card
<Pressable
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel={`${book.nameEn}, ${book.difficulty}, ${itemCount} items`}
  accessibilityHint={isImported ? "Tap to view details or remove" : "Tap to import"}
>

// Import Button
<Button
  accessibilityLabel={isImported ? "Remove from library" : "Add to library"}
  accessibilityRole="button"
>

// Pronunciation Button
<IconButton
  accessibilityLabel={`Pronounce ${word}`}
  accessibilityRole="button"
/>
```

### 4.4 Safe Area Handling

```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Main screen
const insets = useSafeAreaInsets();
<ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}>

// Floating Practice Button
<FAB
  style={{
    position: 'absolute',
    right: 16,
    bottom: insets.bottom + 16,
  }}
/>
```

### 4.5 Error Handling

```typescript
// Import failure
try {
  await importWordBook(bookId);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  Toast.show({ type: 'success', text1: 'WordBook imported!' });
} catch (error) {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  Toast.show({ 
    type: 'error', 
    text1: 'Import failed', 
    text2: 'Please try again' 
  });
}
```

---

## 5. Testing Strategy

### 5.1 Unit Tests

**useWordBookStore.test.ts:**
- Track imported wordbook IDs
- Add items to library on import
- Remove all items on wordbook removal
- Persist imported IDs to AsyncStorage

**loadWordBookItems.test.ts:**
- Load inline items for small wordbooks
- Lazy-load large wordbooks from JSON
- Handle missing wordbook gracefully

### 5.2 Component Tests

**WordBookCard.test.tsx:**
- Show import button for non-imported books
- Show remove button for imported books
- Trigger haptic on press
- Navigate to detail on tap

**FilterPills.test.tsx:**
- Highlight active filter
- Trigger haptic on tap
- Filter wordbooks correctly

### 5.3 Integration Tests

**vocabulary.integration.test.tsx:**
- Filter wordbooks by category
- Switch between Vocabulary and Scenarios tabs
- Navigate to detail on card tap
- Import and remove wordbooks
- Search wordbooks

### 5.4 E2E Test Scenarios

1. **Import Flow:**
   - Open Vocabulary tab
   - Browse wordbooks
   - Tap "Add to Library" on NCE Book 1
   - Verify success toast
   - Verify card shows "Remove" button
   - Navigate to Library tab
   - Verify NCE items appear

2. **Detail View:**
   - Tap imported wordbook card
   - Verify detail page opens
   - Search for a word
   - Tap pronunciation button
   - Verify audio plays
   - Tap "Practice" FAB
   - Verify action sheet appears

3. **Remove Flow:**
   - Long press imported wordbook card
   - Tap "Remove" in context menu
   - Verify confirmation dialog
   - Confirm removal
   - Verify items removed from Library

### 5.5 Performance Benchmarks

- Initial load: < 500ms
- Filter switch: < 100ms
- Card press feedback: < 100ms
- Import operation: < 2s for 500 items
- Detail page load: < 300ms
- Search response: < 200ms (debounced)
- Scroll performance: 60fps on iPhone 11+

---

## 6. Migration & Rollout Plan

### 6.1 Phase 1: Data Migration (No User Impact)

**Preserve existing user data:**
- Current `useReviewStore` flashcards remain in AsyncStorage
- Don't delete until new system is verified working
- Export utility: allow users to save their flashcards as JSON

**Migration helper:**
```typescript
async function migrateFlashcardsToLibrary() {
  const reviewStore = await AsyncStorage.getItem('review-storage');
  if (!reviewStore) return;
  
  const { cards } = JSON.parse(reviewStore);
  const libraryStore = useLibraryStore.getState();
  
  // Convert flashcards to Content items
  const contents = cards.map(card => ({
    id: nanoid(),
    title: card.word,
    text: card.meaning,
    content: card.example || '',
    category: 'user-flashcards', // Special category
    type: 'vocabulary' as const,
    tags: ['flashcard', 'migrated'],
    difficulty: 'intermediate' as const,
    isFavorite: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fsrsCard: card.fsrsData, // Preserve FSRS state
  }));
  
  // Add to library
  contents.forEach(c => libraryStore.addContent(c));
  
  // Mark migration complete
  await AsyncStorage.setItem('flashcard-migration-complete', 'true');
}
```

**Rollback plan:**
- Keep old code in a feature flag
- If critical bugs found, revert to FSRS system
- User data preserved in both systems during transition

### 6.2 Phase 2: UI Rollout

**Soft launch (internal testing):**
- Deploy to TestFlight/internal build
- Test with 5-10 users for 1 week
- Collect feedback on iOS interactions
- Verify performance on older devices (iPhone 11, 12)

**Beta release:**
- Gradual rollout to 20% of users
- Monitor crash reports and performance metrics
- A/B test: old FSRS vs new WordBooks
- Measure engagement: imports, practice sessions

**Full release:**
- Roll out to 100% after 2 weeks of stable beta
- Remove old FSRS code
- Clean up AsyncStorage migration flags

### 6.3 Phase 3: User Communication

**In-app announcement:**
- Modal on first launch: "New WordBooks Feature!"
- Highlight: "50+ curated vocabulary collections"
- Show migration notice: "Your flashcards are now in Library"

**Tutorial overlay:**
- First-time user experience
- Highlight: Tap to import → Practice → Review in Library
- Dismissible, never show again

**Help documentation:**
- Update in-app help section
- FAQ: "Where are my flashcards?" → "Check Library tab"
- Video tutorial: How to import and practice wordbooks

### 6.4 Monitoring & Metrics

**Analytics events to track:**
```typescript
analytics.track('wordbook_viewed', { bookId, category });
analytics.track('wordbook_imported', { bookId, itemCount, duration });
analytics.track('wordbook_removed', { bookId });
analytics.track('wordbook_detail_opened', { bookId });
analytics.track('wordbook_search', { query, resultCount });
analytics.track('wordbook_practice_started', { bookId, mode });
analytics.track('migration_completed', { flashcardCount });
```

**Success Criteria:**
- 0 critical crashes in first week
- < 5% user complaints about missing flashcards
- > 30% of users import at least 1 wordbook in first month
- Average import time < 2s for 500-item wordbooks
- 60fps scroll performance on iPhone 11+

**Rollback Triggers:**
- Crash rate > 1%
- Import failure rate > 5%
- User retention drops > 10%
- Performance regression (scroll FPS < 50)

---

## 7. Future Enhancements (Out of Scope)

**Not included in this design, but potential future work:**

1. **Custom WordBooks:**
   - Allow users to create their own wordbooks
   - Import from CSV/Excel
   - Share with other users

2. **WordBook Recommendations:**
   - AI-powered recommendations based on user level
   - "Users who imported X also imported Y"

3. **Progress Tracking:**
   - Per-wordbook completion percentage
   - Mastery levels per word
   - Streak tracking

4. **Offline Mode:**
   - Download wordbooks for offline use
   - Sync progress when back online

5. **Social Features:**
   - Share wordbooks with friends
   - Leaderboards per wordbook
   - Study groups

6. **Dark Mode:**
   - Full dark theme support
   - Automatic switching based on system preference

---

## 8. Open Questions & Decisions

**Resolved:**
- ✅ Should we keep FSRS flashcards? → No, replace with WordBooks
- ✅ Should we support both systems? → No, full replacement
- ✅ What happens to existing flashcards? → Migrate to Library with special category
- ✅ iOS or Material Design? → iOS-native interactions
- ✅ Use existing theme colors? → Yes, Indigo + Green + Glassmorphism

**Pending:**
- ⏳ Should we support custom wordbook creation in v1? → Defer to future
- ⏳ Should we add social sharing features? → Defer to future
- ⏳ Dark mode support timeline? → Defer to future

---

## 9. Dependencies & Prerequisites

**Required before implementation:**
- ✅ Web wordbook data structure finalized
- ✅ `useLibraryStore` supports category filtering
- ✅ FSRS algorithm available in mobile
- ✅ Expo Haptics installed
- ✅ React Native Reanimated configured
- ✅ FlashList installed

**Nice to have:**
- Toast notification library (react-native-toast-message)
- Action sheet library (react-native-action-sheet or native)
- Shared element transitions (react-native-shared-element)

---

## 10. Success Metrics

**User Engagement:**
- 30%+ of users import at least 1 wordbook in first month
- Average 3+ wordbooks imported per active user
- 50%+ of imported wordbooks are practiced at least once

**Performance:**
- 60fps scroll on iPhone 11+
- < 2s import time for 500-item wordbooks
- < 500ms initial load time
- < 100ms interaction feedback

**Quality:**
- 0 critical crashes in first week
- < 1% crash rate overall
- < 5% user complaints about migration
- 4.5+ star rating maintained

**Retention:**
- No drop in 7-day retention
- No drop in 30-day retention
- Increase in daily active users (DAU)

---

## Appendix A: WordBook Data Structure

**WordBook Type:**
```typescript
interface WordBook {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  kind: 'vocabulary' | 'scenario';
  emoji: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  filterTag: string;
  tags: string[];
  itemCount?: number;
  items?: WordItem[];
}

interface WordItem {
  title: string;
  text: string;
  content?: string;
  category: string;
  type: 'vocabulary' | 'sentence' | 'article' | 'conversation';
  tags: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}
```

**Example WordBooks:**
- NCE Book 1-4 (New Concept English)
- TOEFL Vocabulary
- IELTS Vocabulary
- Business English
- Tech Vocabulary
- Travel Scenarios
- Restaurant Scenarios
- Medical Scenarios

---

## Appendix B: Design Tokens

**Colors:**
```typescript
const colors = {
  primary: '#4F46E5',           // Indigo
  primaryLight: '#818CF8',      // Light indigo
  primaryDark: '#3730A3',       // Dark indigo
  accent: '#22C55E',            // Green CTA
  accentLight: '#4ADE80',       // Light green
  accentDark: '#16A34A',        // Dark green
  background: '#EEF2FF',        // Light indigo bg
  surface: 'rgba(255, 255, 255, 0.7)',  // Glassmorphic
  surfaceVariant: '#F8FAFF',    // Subtle variant
  onSurface: '#1E293B',         // Text on cards
  onSurfaceVariant: '#64748B',  // Secondary text
  outline: 'rgba(79, 70, 229, 0.1)',    // Card borders
  error: '#EF4444',             // Error red
  success: '#22C55E',           // Success green
  warning: '#F59E0B',           // Warning amber
};
```

**Typography:**
```typescript
const typography = {
  heading: {
    fontFamily: 'Poppins',
    fontWeight: '600',
  },
  body: {
    fontFamily: 'Open Sans',
    fontWeight: '400',
  },
  sizes: {
    xs: 12,
    sm: 13,
    base: 14,
    md: 15,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 28,
  },
};
```

**Spacing:**
```typescript
const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
};
```

**Shadows (iOS-style):**
```typescript
const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
};
```

---

## Appendix C: Animation Curves

**Spring Physics:**
```typescript
const springs = {
  gentle: { damping: 20, stiffness: 200, mass: 1 },
  default: { damping: 15, stiffness: 300, mass: 1 },
  snappy: { damping: 10, stiffness: 400, mass: 1 },
};
```

**Timing Functions:**
```typescript
const timings = {
  fast: 150,
  default: 250,
  slow: 400,
};
```

---

## Appendix D: Accessibility Guidelines

**Minimum Requirements:**
- All interactive elements have `accessibilityRole`
- All images/icons have `accessibilityLabel`
- All buttons have descriptive labels
- Color is not the only indicator (use icons + text)
- Touch targets ≥ 44×44pt
- Text contrast ≥ 4.5:1 (WCAG AA)
- Support Dynamic Type (iOS text scaling)
- Support VoiceOver (screen reader)
- Support reduced motion preference

**Testing Checklist:**
- [ ] VoiceOver can navigate all screens
- [ ] All buttons announce their purpose
- [ ] All images have meaningful descriptions
- [ ] Color contrast passes WCAG AA
- [ ] Touch targets are large enough
- [ ] Text scales with system settings
- [ ] Animations respect reduced motion
- [ ] Focus order is logical

---

**End of Design Document**

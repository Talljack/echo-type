# EchoType Mobile - Phase 2 Development & Testing Plan

**Date:** 2026-04-13  
**Duration:** 4 weeks  
**Status:** Approved  
**Dependencies:** Phase 1 (Infrastructure) ✅ Completed

---

## Executive Summary

This document outlines the complete development and testing strategy for Phase 2 of the EchoType mobile application. Based on user requirements, we will implement all planned features using a parallel development approach with Web-first testing and unified UI/UX optimization at the end.

### Key Decisions

- **Development Strategy:** Parallel development of all modules in batches
- **Testing Approach:** Web-first rapid validation → iOS verification
- **UI/UX Timing:** Unified optimization after all features are complete
- **Scope:** Full implementation of all Phase 2 features

---

## Development Strategy

### Parallel Development in Batches

We will develop all modules simultaneously in 7 batches over 3 weeks, followed by 1 week of UI/UX optimization.

#### Week 1-2: Core Infrastructure + Learning Modules

**Batch 1: Data Layer + Library Module** (Days 1-3)
- Redesign data layer (remove WatermelonDB, use AsyncStorage + Zustand)
- Implement content import (URL/YouTube/PDF/Text/AI)
- Create content management interface
- Build Library screen with tabs (All/Books/Favorites)

**Batch 2: Listen Module** (Days 2-4)
- Integrate TTS (Edge TTS + Expo Speech fallback)
- Build audio player component (play/pause/speed/loop)
- Implement word-by-word highlighting synchronized with audio
- Create Listen practice screen

**Batch 3: Speak Module** (Days 3-5)
- Integrate speech recognition (@react-native-voice/voice)
- Implement recording and playback
- Build conversation scenario interface
- Add AI-assisted pronunciation scoring

**Batch 4: Read + Write Modules** (Days 4-6)
- **Read:** Selectable text + translation popup + vocabulary collection
- **Write:** Typing practice + real-time error highlighting + WPM calculation

#### Week 3: Dashboard + AI Features

**Batch 5: Dashboard** (Days 7-9)
- Calculate learning statistics
- Build activity heatmap (56 days)
- Create review forecast chart (7 days)
- Display recent activity timeline
- Show daily plan section

**Batch 6: AI Tutor** (Days 8-10)
- Build chat interface with streaming responses
- Add voice input support
- Implement conversation history management
- Integrate with 15+ AI providers

**Batch 7: Review System** (Days 9-11)
- Implement FSRS review algorithm
- Create swipeable card interface
- Build review queue management
- Add review statistics tracking

#### Week 4: UI/UX Unified Optimization

**Days 12-14: Design System & Visual Polish**
- Use `/ui-ux-pro-max` skill for comprehensive design
- Unify color scheme (maintain purple gradient theme)
- Optimize spacing, typography, and component styles
- Add micro-animations and transitions
- Improve gestures and interactions
- Polish cards, lists, and empty states

---

## Testing Strategy

### Web-First Rapid Validation

For each batch, we follow this testing workflow:

#### 1. Web Development & Testing

```bash
cd mobile
npx expo start --web
```

**Test in browser (http://localhost:8081):**
- ✅ Page renders without crashes
- ✅ Core interactions work (buttons, inputs, navigation)
- ✅ Data saves and loads correctly
- ✅ Error handling works (network failures, permission denials)

**Tools:**
- Manual testing in Chrome DevTools
- React DevTools for state inspection
- Network tab for API calls

#### 2. Quick Validation Checklist

For each module, verify:

**Functional:**
- [ ] All screens render correctly
- [ ] Navigation flows work
- [ ] Data persistence works
- [ ] API calls succeed
- [ ] Error states display properly

**Non-Functional:**
- [ ] No console errors
- [ ] Reasonable performance (no lag)
- [ ] Loading states show appropriately
- [ ] Empty states are user-friendly

#### 3. iOS Build & Verification

After Web testing passes:

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Build for iOS
npx expo run:ios
```

**Test in iPhone 16 Pro Simulator:**
- ✅ Native features work (microphone, file picker, background audio)
- ✅ Gestures and animations are smooth
- ✅ Performance is acceptable
- ✅ No iOS-specific crashes

#### 4. Issue Tracking & Resolution

**Issue Priority:**
- **P0 (Blocker):** Crashes, data loss, core feature broken → Fix immediately
- **P1 (Critical):** Major feature degraded, poor UX → Fix before next batch
- **P2 (Important):** Minor bugs, edge cases → Fix before Phase 2 completion
- **P3 (Nice-to-have):** Polish, optimizations → Defer to Phase 3 or UI optimization week

**Documentation:**
- Log all issues in `mobile/tests/PHASE2_TEST_REPORT.md`
- Include screenshots for visual bugs
- Note reproduction steps

---

## Technical Architecture

### Data Layer Redesign

**Problem:** WatermelonDB decorators conflict with Babel configuration

**Solution:** Use AsyncStorage + Zustand for lightweight persistence

```typescript
// Data structure stored in AsyncStorage
interface AppData {
  contents: Content[];
  learningRecords: LearningRecord[];
  typingSessions: TypingSession[];
  favorites: Favorite[];
  conversations: Conversation[];
  books: Book[];
}

// Zustand stores with persistence
const useContentStore = create(
  persist(
    (set, get) => ({
      contents: [],
      addContent: (content) => set({ contents: [...get().contents, content] }),
      // ...
    }),
    { name: 'content-storage', storage: createJSONStorage(() => AsyncStorage) }
  )
);
```

**Advantages:**
- ✅ No decorator conflicts
- ✅ Simpler API
- ✅ Better TypeScript support
- ✅ Sufficient for mobile data volumes
- ✅ Easy to debug

**Cloud Sync:**
- Use Supabase Realtime subscriptions
- Background sync every 5 minutes
- Conflict resolution: last-write-wins
- Offline queue for pending changes

### Module Architecture

Each learning module follows this structure:

```
app/
  (tabs)/
    listen.tsx          # List screen
    speak.tsx
    read.tsx
    write.tsx
  practice/
    listen/
      [id].tsx          # Practice screen
    speak/
      [id].tsx
    read/
      [id].tsx
    write/
      [id].tsx

src/
  stores/
    useListenStore.ts   # Module state
    useSpeakStore.ts
    useReadStore.ts
    useWriteStore.ts
  lib/
    tts/                # TTS adapters
    stt/                # Speech recognition
    fsrs/               # Review algorithm
    ai/                 # AI providers
  components/
    listen/             # Module-specific components
    speak/
    read/
    write/
```

---

## Dependencies Installation

### Required Packages

```bash
cd mobile

# Audio & Speech
npm install expo-av expo-speech @react-native-voice/voice

# File Handling
npm install expo-document-picker expo-file-system

# Charts & Visualization
npm install victory-native react-native-svg

# AI SDK
npm install ai @ai-sdk/react

# Utilities
npm install react-native-url-polyfill date-fns

# Dev Dependencies
npm install -D @types/react-native
```

### Native Permissions (iOS)

Add to `app.json`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSMicrophoneUsageDescription": "EchoType needs microphone access for speaking practice and pronunciation evaluation.",
        "NSPhotoLibraryUsageDescription": "EchoType needs photo library access to import images for learning content.",
        "NSSpeechRecognitionUsageDescription": "EchoType uses speech recognition to evaluate your pronunciation and provide feedback."
      }
    }
  }
}
```

---

## Feature Implementation Details

### Batch 1: Data Layer + Library

**Data Layer:**
- Create `src/lib/storage/` with AsyncStorage wrappers
- Implement CRUD operations for all entities
- Add data migration utilities
- Build sync engine with Supabase

**Library Module:**
- **URL Import:** Reuse Web extraction logic, fetch metadata and content
- **YouTube Import:** Extract video info, fetch subtitles, generate content
- **PDF Import:** Use document picker, send to backend API for text extraction
- **Text Import:** Simple form with paste support, auto-detect language
- **AI Generation:** Form with topic/difficulty/length, stream generated content

**UI Components:**
- Content card with thumbnail, title, difficulty, tags
- Import modal with 5 options
- Content list with search, filter, sort
- Empty states with illustrations

**Testing Focus:**
- Content saves correctly to AsyncStorage
- Import from each source works
- Search and filter return correct results
- Content deletion works

### Batch 2: Listen Module

**TTS Integration:**
- Edge TTS adapter (primary, free)
- Expo Speech adapter (fallback)
- Audio caching mechanism
- Error handling and retry logic

**Audio Player:**
- Play/pause/stop controls
- Progress bar with seek
- Playback speed (0.5x - 2.0x)
- Loop mode (off/one/all)
- Background audio support

**Word Highlighting:**
- Word alignment algorithm (time-based estimation)
- Highlighted text component with animations
- Synchronization with audio progress
- Multi-line text wrapping

**Testing Focus:**
- Audio plays without stuttering
- Highlighting syncs with audio
- Speed control works correctly
- Background playback continues when app is backgrounded

### Batch 3: Speak Module

**Speech Recognition:**
- @react-native-voice/voice integration
- Real-time transcription display
- Microphone permission handling
- Voice activity detection

**Recording:**
- Audio recording with expo-av
- Waveform visualization
- Playback controls
- Save recordings to file system

**Pronunciation Scoring:**
- AI-based evaluation (compare user speech to reference)
- Scoring algorithm (accuracy, fluency, completeness)
- Phoneme-level feedback
- IPA pronunciation guide

**Conversation Scenarios:**
- 50+ pre-built scenarios (greetings, shopping, travel, etc.)
- Turn-based conversation flow
- AI tutor responses
- Difficulty levels (beginner/intermediate/advanced)

**Testing Focus:**
- Microphone permission prompt works
- Speech recognition transcribes accurately
- Recording saves and plays back
- Pronunciation score is reasonable

### Batch 4: Read + Write Modules

**Read Module:**
- Selectable text component (long-press to select word)
- Translation popup with AI translation
- Word pronunciation audio
- "Add to Favorites" button
- Vocabulary list view with folders
- Reading progress tracking

**Write Module:**
- Typing input with real-time comparison
- Character-by-character validation
- Error highlighting (red for incorrect, green for correct)
- WPM calculation (reuse Web logic)
- Accuracy percentage
- Error analysis (typos, omissions, additions)
- Completion screen with detailed stats

**Testing Focus:**
- Word selection works on long-press
- Translation displays correctly
- Typing input highlights errors in real-time
- WPM and accuracy calculations are correct

### Batch 5: Dashboard

**Statistics Calculation:**
- Total contents, sessions, words learned
- Average WPM and accuracy
- Streak days
- Module distribution (pie chart)

**Activity Heatmap:**
- Query activity data for last 56 days
- Generate heatmap with Victory Native
- Color gradient based on activity level
- Tooltip on cell tap

**Review Forecast:**
- Query learning records with FSRS due dates
- Calculate review counts for next 7 days
- Bar chart with Victory Native
- Highlight today's reviews

**Recent Activity:**
- Timeline of recent sessions
- Module icons and content titles
- Time ago labels
- Tap to view details

**Daily Plan:**
- Display today's planned activities
- Show completion progress
- Quick action buttons
- Support plan editing

**Testing Focus:**
- Statistics calculate correctly
- Heatmap displays 56 days of data
- Forecast shows next 7 days
- Recent activity updates in real-time

### Batch 6: AI Tutor

**Chat Interface:**
- Message bubbles (user/assistant)
- Auto-scroll to latest message
- Typing indicator
- Message copying

**AI Integration:**
- Reuse Web AI logic (src/lib/ai/*)
- Streaming text with Vercel AI SDK
- Support 15+ providers (OpenAI, Anthropic, etc.)
- Provider switching in settings
- Error handling with retry

**Voice Input:**
- Microphone button in chat input
- Voice-to-text with @react-native-voice/voice
- Recording animation
- Auto-send after transcription

**Context Integration:**
- Attach current content to chat
- "Ask about this content" quick action
- Conversation history management

**Testing Focus:**
- Messages send and receive correctly
- Streaming responses display smoothly
- Voice input transcribes accurately
- Conversation history persists

### Batch 7: Review System

**FSRS Integration:**
- Reuse Web FSRS logic (src/lib/fsrs.ts)
- Query due cards from database
- Card scheduling (Again/Hard/Good/Easy)
- Update card state after review
- Calculate next review date

**Review Card:**
- Swipeable card component
- Front: content
- Back: answer/translation
- Flip animation
- Gesture controls (swipe for rating)

**Review Queue:**
- Query today's due cards
- Queue management
- Remaining cards count
- Progress bar
- Filter by module/difficulty

**Review Statistics:**
- Cards reviewed, time spent
- Retention rate
- Daily review streak
- Review history chart
- Upcoming reviews

**Testing Focus:**
- FSRS algorithm schedules correctly
- Card swipe gestures work smoothly
- Review queue updates after each card
- Statistics calculate accurately

---

## UI/UX Optimization (Week 4)

### Design System Refinement

**Color Palette:**
- Primary: Indigo (#6366F1) → Purple gradient
- Secondary: Pink (#EC4899)
- Success: Green (#10B981)
- Warning: Amber (#F59E0B)
- Error: Red (#EF4444)
- Neutral: Gray scale

**Typography:**
- Headings: SF Pro Display (iOS native)
- Body: SF Pro Text
- Monospace: SF Mono (for code/stats)

**Spacing:**
- Base unit: 4px
- Scale: 4, 8, 12, 16, 24, 32, 48, 64

**Shadows:**
- Small: 0 1px 2px rgba(0,0,0,0.05)
- Medium: 0 4px 6px rgba(0,0,0,0.1)
- Large: 0 10px 15px rgba(0,0,0,0.1)

**Border Radius:**
- Small: 8px
- Medium: 12px
- Large: 16px
- XLarge: 24px

### Component Optimization

**Cards:**
- Add subtle gradients
- Improve shadow depth
- Optimize padding and spacing
- Add hover/press states

**Buttons:**
- Refine gradient backgrounds
- Add haptic feedback
- Improve disabled states
- Optimize icon alignment

**Lists:**
- Add dividers or spacing
- Improve empty states
- Add pull-to-refresh
- Optimize scroll performance

**Forms:**
- Improve input focus states
- Add validation feedback
- Optimize keyboard handling
- Add auto-complete suggestions

### Animation & Transitions

**Page Transitions:**
- Slide animations for navigation
- Fade for modals
- Scale for cards

**Micro-interactions:**
- Button press feedback
- Card tap animations
- Loading spinners
- Success/error toasts

**Gestures:**
- Swipe to delete
- Pull to refresh
- Pinch to zoom (for images)
- Long-press for context menu

### Accessibility

**WCAG Compliance:**
- Color contrast ratio ≥ 4.5:1
- Touch targets ≥ 44x44 points
- Screen reader labels for all interactive elements
- Keyboard navigation support

**Localization:**
- Support for RTL languages
- Dynamic font sizing
- Locale-aware date/time formatting

---

## Risk Management

### Technical Risks

**Risk 1: Audio playback issues on different devices**
- **Impact:** High
- **Probability:** Medium
- **Mitigation:** 
  - Extensive device testing
  - Fallback to system TTS
  - Error handling with user-friendly messages

**Risk 2: Speech recognition accuracy**
- **Impact:** Medium
- **Probability:** High
- **Mitigation:**
  - Use native APIs (better accuracy)
  - Provide manual correction option
  - Show confidence scores

**Risk 3: Performance degradation with large content**
- **Impact:** Medium
- **Probability:** Medium
- **Mitigation:**
  - Implement pagination
  - Lazy loading
  - Virtualized lists (FlatList)
  - Optimize re-renders with React.memo

**Risk 4: AI API rate limits**
- **Impact:** Low
- **Probability:** Medium
- **Mitigation:**
  - Request queuing
  - Clear error messages
  - Fallback to alternative providers

**Risk 5: Parallel development integration issues**
- **Impact:** High
- **Probability:** Medium
- **Mitigation:**
  - Clear module interfaces
  - Integration testing after each batch
  - Daily sync meetings

### Schedule Risks

**Risk 1: Feature complexity underestimated**
- **Impact:** High
- **Probability:** Medium
- **Mitigation:**
  - Prioritize core features
  - Defer nice-to-haves to Phase 3
  - Time-box each batch

**Risk 2: Testing takes longer than expected**
- **Impact:** Medium
- **Probability:** Low
- **Mitigation:**
  - Web-first testing reduces iOS build time
  - Automated checks (TypeScript, Biome)
  - Focus on critical paths

---

## Success Criteria

### Functional Requirements

- ✅ All 4 learning modules fully functional
- ✅ Content import from 5+ sources working
- ✅ AI Tutor responds correctly with streaming
- ✅ Review system schedules cards accurately
- ✅ Dashboard displays real-time statistics
- ✅ Data persists correctly across app restarts
- ✅ Cloud sync works without data loss

### Non-Functional Requirements

- ✅ No crashes during normal usage
- ✅ Smooth animations (60fps)
- ✅ Screen load time < 500ms
- ✅ Audio playback latency < 200ms
- ✅ Speech recognition response < 1s
- ✅ Memory usage < 150MB during practice
- ✅ TypeScript 0 errors
- ✅ Biome lint passes

### User Experience

- ✅ Intuitive navigation
- ✅ Clear error messages
- ✅ Helpful empty states
- ✅ Responsive interactions
- ✅ Beautiful, modern UI
- ✅ Consistent design language

---

## Deliverables

### End of Week 1
- ✅ Data layer redesigned and tested
- ✅ Library module with all import methods
- ✅ Listen module with TTS and highlighting
- ✅ Speak module with speech recognition

### End of Week 2
- ✅ Read module with translation and vocabulary
- ✅ Write module with typing practice
- ✅ All 4 learning modules functional

### End of Week 3
- ✅ Dashboard with statistics and charts
- ✅ AI Tutor with streaming chat
- ✅ Review system with FSRS cards
- ✅ All Phase 2 features complete

### End of Week 4
- ✅ Unified UI/UX optimization complete
- ✅ All modules visually polished
- ✅ Animations and transitions smooth
- ✅ Comprehensive test report
- ✅ Phase 2 ready for production

---

## Testing Documentation

### Test Reports

**Location:** `mobile/tests/`

**Files:**
- `PHASE2_TEST_REPORT.md` - Overall test results
- `WEB_TEST_RESULTS.md` - Web testing results per batch
- `IOS_TEST_RESULTS.md` - iOS verification results
- `KNOWN_ISSUES.md` - Tracked bugs and workarounds
- `PERFORMANCE_METRICS.md` - Load times, memory usage, etc.

**Format:**
```markdown
## Batch X: Module Name

### Test Date: YYYY-MM-DD

### Web Testing
- [ ] Feature 1: ✅ Pass / ❌ Fail (details)
- [ ] Feature 2: ✅ Pass / ❌ Fail (details)

### iOS Testing
- [ ] Feature 1: ✅ Pass / ❌ Fail (details)
- [ ] Feature 2: ✅ Pass / ❌ Fail (details)

### Issues Found
- **P0:** [Issue description] - Status: Fixed/In Progress
- **P1:** [Issue description] - Status: Fixed/In Progress

### Screenshots
![Feature Screenshot](./screenshots/batch-x-feature.png)
```

---

## Next Steps

1. **Review and approve this plan** ✅ Approved
2. **Set up development environment** - Install all dependencies
3. **Start Batch 1** - Data layer + Library module
4. **Daily progress updates** - Track completion and blockers
5. **Weekly demos** - Show completed features

---

**Plan Version:** 1.0  
**Created:** 2026-04-13  
**Author:** Claude (Opus 4.6)  
**Status:** Approved - Ready for Implementation

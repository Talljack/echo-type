# Mobile Feature Gap Analysis — Web vs Mobile

**Date:** 2026-04-15
**Status:** Draft — pending review
**Scope:** Comprehensive page-by-page comparison of web (Next.js) and mobile (Expo/React Native) apps

---

## Executive Summary

The mobile app covers the core user flows (library management, 4 practice modules, basic review, auth) but is missing **~60% of the web's feature surface**. The biggest gaps fall into five categories:

1. **AI integration** — chat is a local mock; no real provider, no tool calling, no context-aware tutoring
2. **Settings depth** — only 3 of 15+ web setting sections are exposed
3. **Practice module fidelity** — Listen lacks translation; Read lacks speech recognition; Write lacks strict error loop; Speak lacks scenario/conversation mode
4. **Dashboard analytics** — stats are not driven by actual practice sessions; no review forecast
5. **Shared infrastructure** — no wordbook browsing, no shadow reading, no selection translation, no command palette, no cloud sync engine

---

## 1. Page-by-Page Comparison

### 1.1 Dashboard / Home

| Feature | Web | Mobile | Gap |
|---------|-----|--------|-----|
| Streak counter | ✅ | ✅ (but not fed by sessions) | Data wiring |
| Total content / sessions / words stats | ✅ | ✅ Partial (sessions + time) | Missing words/articles |
| Activity heatmap (56 days) | ✅ | ✅ (but `addActivity` never called from practice) | Data wiring |
| 7-day review forecast | ✅ | ❌ | Missing |
| Recent activity list (last 5 sessions) | ✅ | ❌ | Missing |
| Module quick-start grid | ✅ | ✅ | — |
| Today's plan / review card | ✅ | ❌ (only a "Review" shortcut button) | Missing |
| Assessment banner (CEFR) | ✅ | ❌ | Missing |
| AI provider setup banner | ✅ | ❌ | Missing |
| New user onboarding banners | ✅ | ❌ (welcome screen exists but no in-dashboard guidance) | Missing |
| Mini analytics (heatmap, forecast, module breakdown) | ✅ | ❌ | Missing |
| Quick actions (AI chat, review) | ✅ | ✅ | — |

**Priority: HIGH** — Dashboard data wiring is critical; users see stale/empty stats.

---

### 1.2 Library

| Feature | Web | Mobile | Gap |
|---------|-----|--------|-----|
| Content list with search | ✅ | ✅ | — |
| Type tabs (all/phrase/sentence/article) | ✅ | ✅ | — |
| Tag cloud / tag filter | ✅ | ✅ (tag chips) | — |
| Favorites filter | ✅ | ✅ | — |
| Bulk select / batch delete | ✅ | ✅ | — |
| Difficulty filter | ✅ | ✅ | — |
| Sort menu | ✅ | ✅ | — |
| Quick add dialog | ✅ | ✅ (ImportModal) | — |
| **Wordbook tab** (browse built-in wordbooks) | ✅ | ❌ | Missing |
| **Book tab** (imported books with chapters) | ✅ | ❌ | Missing |
| **Scenario tab** (speak scenarios) | ✅ | ❌ | Missing |
| Inline tag editing | ✅ | ❌ | Missing |
| Shadow reading integration | ✅ | ❌ | Missing |
| Import: Document | ✅ | ✅ (text + URL) | — |
| Import: Media (audio/video transcription) | ✅ | ✅ | — |
| Import: AI generate | ✅ | ✅ (partial — calls backend) | Depends on API URL |
| Import: YouTube | ✅ | ❌ | Missing |
| Import: PDF | ✅ | ❌ | Missing |
| Edit content modal | ✅ | ✅ | — |

**Priority: HIGH** — Wordbooks are a core content source for the app.

---

### 1.3 Listen Module

| Feature | Web | Mobile | Gap |
|---------|-----|--------|-----|
| TTS playback | ✅ (browser/Fish/Kokoro/Edge) | ✅ (Edge TTS only) | Fewer TTS providers |
| Word-level highlight during playback | ✅ | ✅ | — |
| Speed control | ✅ | ✅ (inside player, not from settings) | Settings integration |
| Voice selection | ✅ | ✅ (Edge voices only) | — |
| **Translation overlay** | ✅ | ❌ | Missing |
| **Interactive transcript** (tap word to seek) | ✅ | ❌ | Missing |
| **Read-aloud mode** (immersive reader) | ✅ | ❌ | Missing |
| **AI recommendations panel** | ✅ | ❌ | Missing |
| FSRS session recording | ✅ | ✅ | — |
| Practice completion banner | ✅ | ✅ (via rating) | — |
| Cross-module navigation | ✅ | ❌ | Missing |
| Shadow reading progress bar | ✅ | ❌ | Missing |
| Waveform visualization (wavesurfer.js) | ✅ | ❌ (N/A for mobile) | Platform difference |

**Priority: MEDIUM** — Core listen flow works; translation + recommendations are key missing UX.

---

### 1.4 Read Module

| Feature | Web | Mobile | Gap |
|---------|-----|--------|-----|
| Content display | ✅ | ✅ | — |
| **Speech recognition** (live shadow reading) | ✅ | ❌ | **Critical gap** |
| **Live word-level feedback** (green/yellow/red) | ✅ | ❌ | **Critical gap** |
| **Pronunciation assessment** (AI/SpeechSuper) | ✅ | ❌ | Missing |
| Translation panel | ✅ | ✅ (partial — selection not wired) | **Broken** |
| Selection-based translation | ✅ | ❌ (ReadableText doesn't propagate selection) | **Broken** |
| Read-aloud mode | ✅ | ❌ | Missing |
| TTS for content | ✅ | ❌ | Missing |
| AI recommendations panel | ✅ | ❌ | Missing |
| FSRS rating | ✅ | ✅ | — |
| Keyboard shortcuts | ✅ | N/A | Platform difference |

**Priority: CRITICAL** — Read module is the **most degraded** from web. The core speech recognition + live feedback loop is completely missing, making it essentially a "view content" screen.

---

### 1.5 Write Module

| Feature | Web | Mobile | Gap |
|---------|-----|--------|-----|
| Character-level typing comparison | ✅ | ✅ | — |
| WPM / accuracy / timer | ✅ | ✅ | — |
| **Error word shake + forced retry** | ✅ | ❌ | Missing |
| **Sound effects** (keystroke, error, complete) | ✅ | ❌ | Missing |
| **Confetti on complete** | ✅ | ❌ | Missing |
| Translation bar | ✅ | ❌ | Missing |
| AI recommendations panel | ✅ | ❌ | Missing |
| FSRS rating | ✅ | ✅ | — |
| Hidden input (web) vs TextInput (mobile) | Web pattern | Mobile pattern | Acceptable difference |

**Priority: MEDIUM** — Core typing works; error handling UX and polish features are missing.

---

### 1.6 Speak Module

| Feature | Web | Mobile | Gap |
|---------|-----|--------|-----|
| **Scenario-based conversation** (AI chat) | ✅ | ❌ | **Critical gap** |
| **Free conversation mode** | ✅ | ❌ | **Critical gap** |
| **Streaming AI responses** | ✅ | ❌ | Missing |
| **Topic suggestions** | ✅ | ❌ | Missing |
| Voice input (STT) | ✅ | ✅ | — |
| Recording + transcript | ✅ | ✅ | — |
| Pronunciation scoring | ✅ | ✅ | — |
| Per-message translation toggle | ✅ | ❌ | Missing |
| Scenario goals tracker | ✅ | ❌ | Missing |
| **Conversation area** (message bubbles) | ✅ | ❌ (shows transcript vs reference text) | Different paradigm |
| FSRS rating | N/A (web tracks differently) | ✅ | — |

**Priority: CRITICAL** — Mobile Speak is "pronounce a reference text" while web Speak is "have a conversation with AI". Completely different user experience.

---

### 1.7 AI Chat

| Feature | Web | Mobile | Gap |
|---------|-----|--------|-----|
| **Real AI provider** (multi-provider) | ✅ | ❌ (local keyword mock) | **Critical gap** |
| Streaming responses | ✅ | ❌ | Missing |
| Tool calling (navigate, import, search, etc.) | ✅ | ❌ | Missing |
| Context-aware (current module + content) | ✅ | ❌ | Missing |
| Chat modes (general, practice, reading, analytics) | ✅ | ❌ | Missing |
| Interactive blocks (quiz, fill-blank, vocab, etc.) | ✅ | ❌ | Missing |
| Chat history persistence | ✅ | ✅ | — |
| Content picker | ✅ | ❌ | Missing |
| Voice input | ✅ | ❌ | Missing |
| Search in chat | ✅ | ❌ | Missing |
| Floating FAB access | ✅ | ❌ (separate tab route) | Different UX |

**Priority: CRITICAL** — This is one of the app's key differentiators on web; completely non-functional on mobile.

---

### 1.8 Review / Spaced Repetition

| Feature | Web | Mobile | Gap |
|---------|-----|--------|-----|
| FSRS review queue | ✅ | ✅ (vocabulary only) | Scope difference |
| Content-level FSRS review | ✅ | ❌ (only vocabulary cards) | Missing |
| Daily plan progress | ✅ | ❌ | Missing |
| Review forecast | ✅ | ❌ | Missing |
| Rating buttons | ✅ | ✅ | — |
| Demo/sample cards | N/A | ✅ | — |

**Priority: MEDIUM** — Basic review exists but scoped only to vocabulary, not content items.

---

### 1.9 Favorites

| Feature | Web | Mobile | Gap |
|---------|-----|--------|-----|
| Favorites list page | ✅ | ❌ (only filter in library) | Missing dedicated page |
| Favorites folders | ✅ | ❌ | Missing |
| Favorites review (SRS) | ✅ | ❌ | Missing |
| Favorite detail view | ✅ | ❌ | Missing |
| Auto-collection settings | ✅ | ❌ | Missing |
| Toggle favorite on content | ✅ | ✅ | — |

**Priority: LOW** — Library filter covers basic needs; advanced favorites can come later.

---

### 1.10 Settings

| Web Setting Section | Mobile | Status |
|---------------------|--------|--------|
| Account + cloud sync | ✅ (partial — sync badge is cosmetic) | **Sync not functional** |
| Assessment (CEFR) | ❌ | Missing |
| Appearance (theme) | ✅ | — |
| Language (i18n) | ❌ | Missing |
| AI providers (API keys, models) | ❌ | **Critical gap** |
| AI output (max tokens) | ❌ | Missing |
| Voice & speech (TTS source, Fish/Kokoro/Edge, speed/pitch/volume) | ✅ (speed + voice only) | Partial |
| Translation (target language, per-module toggles) | ❌ | Missing |
| Smart collection (selection translate, auto-save) | ❌ | Missing |
| Recommendations (enable, count) | ❌ | Missing |
| Shadow reading toggle | ❌ | Missing |
| Pronunciation (provider, keys) | ❌ | Missing |
| Keyboard shortcuts | N/A | Platform difference |
| Data backup | ❌ | Missing |
| Tags management | ❌ | Missing |
| About | ✅ (static) | — |

**Priority: CRITICAL** — Without AI provider settings, the entire AI feature set is inaccessible.

---

### 1.11 Auth

| Feature | Web | Mobile | Gap |
|---------|-----|--------|-----|
| Google OAuth | ✅ | ✅ | — |
| GitHub OAuth | ✅ | ✅ | — |
| Email/password | ✅ (OTP) | ✅ | — |
| Skip / guest mode | N/A | ✅ | — |
| Password reset | ❌ | ✅ | Mobile has extra |

**Priority: DONE** — Auth is well covered.

---

## 2. Missing Cross-Cutting Features

| Feature | Description | Priority |
|---------|-------------|----------|
| **Cloud sync engine** | Web has full Supabase sync; mobile has store flags only | HIGH |
| **Shadow reading** | Multi-module guided session (listen → read → write) | MEDIUM |
| **Wordbook browsing** | Browse/import built-in wordbooks (CET4, TOEFL, etc.) | HIGH |
| **Book management** | Import books, browse chapters, per-chapter practice | MEDIUM |
| **Scenario management** | Browse/select speak scenarios | HIGH (for Speak) |
| **Command palette** | Quick navigation / search (Cmd+K on web) | LOW (mobile has tabs) |
| **Selection translation** | Select text → translate popup | MEDIUM |
| **Read-aloud / immersive reader** | Sentence-by-sentence reading mode with highlight | MEDIUM |
| **Notifications** | Store has flag but no implementation | LOW |
| **Deep linking** | Routes exist but scheme handling untested | MEDIUM |

---

## 3. UI/UX Gaps

### 3.1 Navigation

| Issue | Detail |
|-------|--------|
| Tab bar has no labels | `CustomTabBar` renders icons only; violates `nav-label-icon` guideline |
| No persistent module access | Web sidebar shows all modules; mobile requires going through Library for Read/Write |
| Listen/Speak tabs are "MVP notice" shells | They redirect to Library; not true module hubs |

### 3.2 Visual Polish

| Issue | Detail |
|-------|--------|
| No loading skeletons | Content lists show empty state or spinner, not shimmer/skeleton |
| No haptic feedback | Practice interactions (correct/error) lack tactile response |
| No sound effects | Write module should have keystroke/error/complete sounds |
| No confetti/celebration | Write completion lacks celebration animation |
| No pull-to-refresh | Library and content lists don't support pull-to-refresh |
| Dark mode incomplete | Some screens use hardcoded colors that may not adapt |

### 3.3 Practice UX

| Issue | Detail |
|-------|--------|
| No cross-module navigation | After completing one module, can't jump to another for same content |
| No practice completion summary | Web shows detailed stats; mobile shows only FSRS buttons |
| Dashboard stats not connected | Practice sessions don't update streak/heatmap/stats |
| Settings not applied to practice | TTS speed from settings not used in listen player |

---

## 4. Data & Infrastructure Gaps

| Area | Web | Mobile | Gap |
|------|-----|--------|-----|
| Local DB | Dexie.js (IndexedDB), 9 tables | AsyncStorage + Zustand persist | No relational queries |
| Content schema | Full ContentItem with tags, difficulty, source | Simplified | Missing fields |
| Session tracking | `sessions` table, per-module, completion | Store-level only | No persistent sessions table |
| Translation cache | Two-tier (memory + IndexedDB, 7-day TTL) | AsyncStorage cache | Simpler but functional |
| FSRS | On content records + favorites | On vocabulary cards only | Missing content-level FSRS |
| Import pipeline | URL, YouTube, PDF, text, media, AI | URL, text, media, AI (partial) | Missing YouTube, PDF |

---

## 5. Prioritized Implementation Roadmap

### Phase 1: Critical (Core UX parity)
1. **AI Provider Settings** — Without this, AI chat/recommendations/translation are blocked
2. **AI Chat Integration** — Replace mock with real provider via API
3. **Read Module: Speech Recognition** — Core feature completely missing
4. **Speak Module: Conversation Mode** — Transform from read-aloud to AI conversation
5. **Dashboard Data Wiring** — Connect practice sessions to stats/heatmap

### Phase 2: High (Key feature gaps)
6. **Wordbook Browsing** — Browse and import built-in wordbooks
7. **Listen: Translation Overlay** — Add per-sentence translation
8. **Settings Expansion** — AI output, translation target, pronunciation
9. **Cloud Sync Engine** — Real Supabase sync, not cosmetic
10. **Selection Translation Fix** — Wire ReadableText selection to TranslationPanel

### Phase 3: Medium (Polish & completeness)
11. **Write: Error Handling UX** — Shake + forced retry + sounds
12. **Shadow Reading Mode** — Multi-module guided sessions
13. **AI Recommendations Panel** — Add to all practice modules
14. **Tab Bar Labels** — Add text labels for accessibility
15. **Practice Completion Summary** — Detailed stats after practice
16. **Cross-Module Navigation** — Navigate between modules for same content
17. **Import: YouTube + PDF** — Complete import pipeline
18. **Book Management** — Import and browse books with chapters

### Phase 4: Low (Nice-to-have)
19. **Favorites Page** — Dedicated favorites management
20. **Review Forecast** — Visual forecast on dashboard
21. **Haptic Feedback** — Add to practice interactions
22. **Loading Skeletons** — Replace spinners with shimmer
23. **Assessment (CEFR)** — Language level testing
24. **Data Backup** — Export/import user data
25. **Scenario Management** — Browse/select speak scenarios
26. **Dark Mode Audit** — Ensure all screens adapt correctly

---

## 6. Feature Count Summary

| Category | Web Features | Mobile Features | Coverage |
|----------|-------------|-----------------|----------|
| Dashboard | 11 | 4 | 36% |
| Library | 16 | 10 | 63% |
| Listen | 11 | 5 | 45% |
| Read | 11 | 3 | 27% |
| Write | 8 | 4 | 50% |
| Speak | 10 | 3 | 30% |
| AI Chat | 11 | 1 | 9% |
| Review | 5 | 3 | 60% |
| Favorites | 6 | 1 | 17% |
| Settings | 15 | 3 | 20% |
| Auth | 3 | 4 | 100% |
| **Total** | **107** | **41** | **38%** |

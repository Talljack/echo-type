# Mobile App Feature Audit Report

**Date:** 2026-04-13  
**Version:** MVP 1.0  
**Comparison:** Mobile vs Web App

## Executive Summary

The mobile app is an **intentional MVP** with all core learning modes functional. The web app is feature-complete with advanced content management, multiple import methods, and comprehensive settings.

**Mobile MVP Status:** ✅ Core features complete, advanced features planned for future releases

---

## 1. Practice Modes

### Status: ✅ COMPLETE (All 4 modes)

| Mode | Mobile | Web | Notes |
|------|--------|-----|-------|
| Listen | ✅ | ✅ | Cloud audio player, word highlighting, FSRS rating |
| Speak | ✅ | ✅ | Audio recording, pronunciation scoring, detailed feedback |
| Read | ✅ | ✅ | Selectable text, translation panel, word count tracking |
| Write | ✅ | ✅ | Real-time typing, error tracking, WPM/accuracy metrics |

**Mobile Implementation:**
- `mobile/app/practice/listen/[id].tsx`
- `mobile/app/practice/speak/[id].tsx`
- `mobile/app/practice/read/[id].tsx`
- `mobile/app/practice/write/[id].tsx`

**Features per mode:**
- All modes include FSRS spaced repetition integration
- Session tracking with time, accuracy, and performance metrics
- Real-time feedback and scoring
- Progress saved to local stores

**Web-only features:**
- Free conversation mode (`/speak/free`)
- Shadow reading mode
- Scenario-based speaking practice

---

## 2. Import Functionality

### Status: ⚠️ PARTIALLY IMPLEMENTED (MVP: Text only)

| Import Method | Mobile | Web | Notes |
|---------------|--------|-----|-------|
| Text (paste) | ✅ | ✅ | Fully functional |
| URL | 🚧 | ✅ | Mobile: "Coming soon" |
| YouTube | 🚧 | ✅ | Mobile: "Coming soon" |
| PDF | 🚧 | ✅ | Mobile: "Coming soon" |
| AI Generation | 🚧 | ✅ | Mobile: "Coming soon" |
| File Upload | ❌ | ✅ | Mobile: Not planned for MVP |

**Mobile Implementation:**
- `mobile/src/components/library/ImportModal.tsx` - UI with MVP notices
- `mobile/src/lib/import/url.ts` - URL/YouTube parsing (infrastructure ready)
- `mobile/src/lib/import/pdf.ts` - PDF handling (infrastructure ready)
- `mobile/src/lib/import/ai.ts` - AI generation (infrastructure ready)

**Status:** Infrastructure exists but disabled in MVP. Only text import is active.

**Web Features:**
- Document import: Paste text, Upload files (PDF, DOCX, etc.), Import from URL
- Media import: YouTube URLs, Local media upload, Direct audio/video download
- AI generation: Generate content with prompts, difficulty levels, content types
- Advanced: Transcript editing, content classification, difficulty auto-detection

---

## 3. Favorites/Bookmarks

### Status: ❌ NOT IMPLEMENTED (Data model exists)

| Feature | Mobile | Web | Notes |
|---------|--------|-----|-------|
| Mark as favorite | ❌ | ✅ | Mobile: No UI control |
| Favorites list | ❌ | ✅ | Mobile: No dedicated view |
| Favorites review | ✅ | ✅ | Both have FSRS review |
| Folder management | ❌ | ✅ | Mobile: Not planned |

**Mobile Status:**
- Data model exists: `isFavorite: boolean` in Content type
- `Favorite` and `FavoriteFolder` interfaces defined but unused
- No UI controls to toggle favorites
- No store methods to manage favorites
- No favorites filter in library view

**Required Implementation:**
1. Add favorite toggle button in ContentCard
2. Add store methods: `addFavorite()`, `removeFavorite()`, `getFavorites()`
3. Add favorites filter in library view
4. Add favorites tab or section

**Web Features:**
- Dedicated `/favorites` page with full list
- Favorites review mode (`/favorites/review`)
- Folder/collection management for favorites
- Search and filter within favorites
- FSRS-based spaced repetition for review

---

## 4. Library Management

### Status: ✅ MOSTLY COMPLETE (Core features working)

| Feature | Mobile | Web | Notes |
|---------|--------|-----|-------|
| Content list | ✅ | ✅ | Both functional |
| Search | ✅ | ✅ | Full-text search |
| Tag filtering | ✅ | ✅ | Multi-select chips |
| Sort options | ✅ | ✅ | Recent, Title, Difficulty |
| Content cards | ✅ | ✅ | Metadata display |
| Batch operations | ❌ | ✅ | Mobile: Not planned |
| Content editing | ❌ | ✅ | Mobile: Missing UI |
| Content deletion | ⚠️ | ✅ | Mobile: No confirmation UI |
| Wordbooks | ❌ | ✅ | Mobile: Not planned |
| Content types | ❌ | ✅ | Mobile: Basic only |

**Mobile Implementation:**
- `mobile/app/(tabs)/library.tsx` - Main library view
- `mobile/src/components/library/ContentCard.tsx` - Content display
- `mobile/src/stores/useLibraryStore.ts` - State management

**Features:**
- Full-text search (title, content, tags)
- Tag-based filtering with multi-select chips
- Sort options: Recent, Title, Difficulty
- Content cards with thumbnail, metadata, difficulty badge
- Word count and FSRS next review date
- Source indicator (URL, YouTube, PDF, TEXT, AI)
- Import modal with FAB button
- Empty state messaging

**Missing:**
- Favorites filter/view
- Bulk operations (select multiple, batch tag, batch delete)
- Content editing UI
- Deletion confirmation dialog
- Advanced filtering (by difficulty, media status, content type)
- Tag management and editing
- View modes (All content vs. Media only)

**Web Features:**
- Content organization by type: Words, Phrases, Sentences, Articles
- Wordbook management (imported vocabulary books)
- Scenario books (speaking scenarios)
- Imported books with chapters
- Advanced filtering: By difficulty, tags, content type, media status
- Batch operations: Select multiple, batch tag, batch delete
- Tag management and editing
- Accordion-based organization

---

## 5. Dashboard/Analytics

### Status: ✅ COMPLETE (Core stats working)

| Feature | Mobile | Web | Notes |
|---------|--------|-----|-------|
| Stats cards | ✅ | ✅ | Both show key metrics |
| Streak tracking | ✅ | ✅ | Visual badge |
| Activity heatmap | ✅ | ✅ | 56-day view |
| Progress chart | ✅ | ✅ | Module breakdown |
| Recent activity | ✅ | ✅ | Session history |
| Review forecast | ❌ | ✅ | Mobile: Not planned |
| Goal setting | ❌ | ✅ | Mobile: Not planned |
| Full analytics | ❌ | ✅ | Mobile: Not planned |

**Mobile Implementation:**
- `mobile/app/(tabs)/index.tsx` - Home dashboard
- `mobile/src/components/dashboard/StatCard.tsx`
- `mobile/src/components/dashboard/ActivityHeatmap.tsx`
- `mobile/src/components/dashboard/ProgressChart.tsx`
- `mobile/src/stores/useDashboardStore.ts`

**Stats Displayed:**
- Day Streak (from `useDashboardStore`)
- Total Time (aggregated from all practice modes)
- Total Sessions count
- Activity Heatmap (visual calendar)
- Progress Chart (per-module breakdown)

**Data Sources:** Real-time aggregation from listen/speak/read/write stores with session counts and time tracking.

**Web Features:**
- Stats cards: Content count, sessions, words, articles, accuracy, WPM
- Review forecast chart
- Mini analytics on dashboard
- Full analytics page with detailed charts
- Goal setting dialog
- Today's plan/review cards

---

## 6. Settings

### Status: ✅ COMPLETE (MVP settings working)

| Category | Mobile | Web | Notes |
|----------|--------|-----|-------|
| Account | ✅ | ✅ | Sign in/out, sync status |
| Appearance | ✅ | ✅ | Dark mode toggle |
| Learning | ✅ | ✅ | Playback speed, TTS voice |
| About | ✅ | ✅ | Version info |
| AI Providers | ❌ | ✅ | Mobile: Not planned |
| TTS Providers | ❌ | ✅ | Mobile: Not planned |
| Language | ❌ | ✅ | Mobile: Not planned |
| Keyboard Shortcuts | ❌ | ✅ | Mobile: Not applicable |
| Tag Management | ❌ | ✅ | Mobile: Not planned |
| Data Backup | ❌ | ✅ | Mobile: Not planned |
| Assessment | ❌ | ✅ | Mobile: Not planned |

**Mobile Implementation:**
- `mobile/app/(tabs)/settings.tsx`
- `mobile/src/stores/useSettingsStore.ts`

**Sections:**
- **Account**: User profile, sign in/out, sync status badge
- **Appearance**: Dark mode toggle
- **Learning**: 
  - Playback speed setting
  - TTS voice selection
  - Auto sync toggle (disabled when not logged in)
- **About**: Version info

**Features:** Theme persistence, TTS configuration, sync preferences.

**Web Features:**
- AI Provider configuration (20+ providers: OpenAI, Anthropic, Google, etc.)
- Model selection and recommendations
- TTS provider setup (Edge, Kokoro, Fish Audio)
- Voice selection and configuration
- Language settings (interface language, learning language)
- Keyboard shortcuts configuration
- Tag management
- Data backup/export
- Assessment/level testing
- Pronunciation settings
- Shadow reading settings
- Practice translation settings

---

## 7. Additional Features

### AI Tutor (Chat)

**Status:** ⚠️ PARTIAL (Local demo only)

**Mobile:**
- `mobile/app/chat/index.tsx` - Conversation list
- `mobile/app/chat/[id].tsx` - Chat detail with local demo responses
- Status: Local placeholder responses only (no live API integration in MVP)

**Web:**
- Full chat interface with AI provider integration
- Conversational AI practice
- Context-aware responses

### Review/Spaced Repetition

**Status:** ✅ COMPLETE (FSRS integrated)

**Mobile:**
- `mobile/app/review/index.tsx`
- FSRS card management with due/new/learning/today stats
- Demo cards available for testing
- Status: Works locally but vocabulary collection not connected

**Web:**
- Full FSRS implementation
- Vocabulary extraction and review
- Review forecast and scheduling

### Content Detail Page

**Status:** ⚠️ PARTIAL (View only)

**Mobile:**
- `mobile/app/content/[id].tsx`
- Shows full content with metadata
- Quick access to all 4 practice modes
- No edit/delete/favorite controls

**Web:**
- Full content editing
- Metadata management
- Favorite toggle
- Delete with confirmation

---

## 8. Unique Web Features (Not in Mobile)

1. **Free Conversation Mode** - `/speak/free` for unstructured speaking practice
2. **Scenario-based Speaking** - Predefined conversation scenarios
3. **Shadow Reading** - Read along with audio playback
4. **Selection Translation** - Translate selected text inline
5. **Pronunciation Analysis** - Detailed pronunciation feedback
6. **Advanced Content Classification** - AI-powered content categorization
7. **Wordbooks** - Pre-built vocabulary books (Core Vocab, College, Professional, etc.)
8. **Content Metadata** - Audio URLs, video duration, platform tracking
9. **Batch Operations** - Multi-select and batch tagging
10. **Advanced Filtering** - By difficulty, tags, media status, content type
11. **Data Backup** - Export/backup functionality
12. **Assessment/Level Testing** - Formal proficiency assessment
13. **Keyboard Shortcuts** - Customizable shortcuts
14. **Multiple Provider Support** - 20+ AI/TTS providers

---

## 9. Unique Mobile Features (Not in Web)

1. **Native Mobile UI** - React Native Paper components
2. **Offline-first Architecture** - Local storage with sync capability
3. **Mobile-optimized Layouts** - Touch-friendly interfaces
4. **Native Audio Recording** - For speak practice
5. **Device Integration** - Camera, microphone, file system access

---

## Summary of Gaps

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Practice modes (4x) | ✅ Complete | - | All modes with scoring & FSRS |
| Import (text) | ✅ Complete | - | Only text; others disabled |
| Import (URL/YouTube/PDF/AI) | 🚧 Coming Soon | Medium | Infrastructure exists, disabled in MVP |
| Favorites/Bookmarks | ❌ Missing | High | Data model exists, no UI/logic |
| Home dashboard | ✅ Complete | - | Stats, heatmap, progress chart |
| Settings | ✅ Complete | - | Theme, TTS, sync, account |
| Library search/filter/sort | ✅ Complete | - | Full-text, tags, difficulty |
| Content editing | ❌ Missing | Medium | No edit UI |
| Content deletion | ⚠️ Partial | Low | Store method exists, no UI confirmation |
| AI tutor | ⚠️ Partial | Low | Local demo only, no real API |
| Spaced repetition review | ✅ Complete | - | FSRS integrated, local cards work |
| Vocabulary collection | ❌ Missing | Medium | Review works but no vocab extraction |
| Sync to cloud | ⚠️ Partial | Medium | Auth/settings exist, not fully wired |

---

## Recommendations

### High Priority (MVP+)
1. **Implement Favorites Feature**
   - Add UI controls to toggle favorites
   - Add store methods for favorites management
   - Add favorites filter in library view
   - Estimated effort: 4-6 hours

2. **Enable Advanced Import Methods**
   - Activate URL import
   - Activate YouTube import
   - Activate PDF import
   - Activate AI generation
   - Estimated effort: 8-12 hours

### Medium Priority (v1.1)
3. **Content Editing UI**
   - Add edit button in content detail page
   - Create edit modal/screen
   - Wire up to existing store methods
   - Estimated effort: 6-8 hours

4. **Vocabulary Collection**
   - Extract words from content
   - Connect to review system
   - Add vocabulary management UI
   - Estimated effort: 12-16 hours

5. **Cloud Sync**
   - Complete Supabase integration
   - Add sync status indicators
   - Handle conflict resolution
   - Estimated effort: 16-20 hours

### Low Priority (v1.2+)
6. **Content Deletion Confirmation**
   - Add confirmation dialog
   - Add undo functionality
   - Estimated effort: 2-4 hours

7. **AI Tutor Integration**
   - Connect to real AI API
   - Add conversation management
   - Estimated effort: 8-12 hours

8. **Advanced Library Features**
   - Batch operations
   - Advanced filtering
   - Tag management
   - Estimated effort: 12-16 hours

---

## Key Files Reference

### Core Stores
- `mobile/src/stores/useLibraryStore.ts` - Content management
- `mobile/src/stores/useDashboardStore.ts` - Stats/activities
- `mobile/src/stores/useSettingsStore.ts` - Preferences
- `mobile/src/stores/useListenStore.ts` - Listen session tracking
- `mobile/src/stores/useSpeakStore.ts` - Speak session tracking
- `mobile/src/stores/useReadStore.ts` - Read session tracking
- `mobile/src/stores/useWriteStore.ts` - Write session tracking
- `mobile/src/stores/useChatStore.ts` - Conversations
- `mobile/src/stores/useReviewStore.ts` - FSRS cards

### Main Routes
- `mobile/app/(tabs)/index.tsx` - Home dashboard
- `mobile/app/(tabs)/library.tsx` - Library view
- `mobile/app/(tabs)/settings.tsx` - Settings
- `mobile/app/practice/listen/[id].tsx` - Listen mode
- `mobile/app/practice/speak/[id].tsx` - Speak mode
- `mobile/app/practice/read/[id].tsx` - Read mode
- `mobile/app/practice/write/[id].tsx` - Write mode
- `mobile/app/content/[id].tsx` - Content detail
- `mobile/app/review/index.tsx` - Review/FSRS
- `mobile/app/chat/[id].tsx` - AI tutor chat

### Components
- `mobile/src/components/` - 15 subdirectories, 65 total source files

### Services
- `mobile/src/services/pronunciation-api.ts` - SpeechSuper integration
- `mobile/src/services/translation-api.ts` - Word translation
- `mobile/src/services/tts-api.ts` - Text-to-speech
- `mobile/src/services/supabase.ts` - Backend sync

---

## Conclusion

The mobile app successfully implements all core learning modes (Listen, Speak, Read, Write) with FSRS spaced repetition integration. The MVP intentionally limits import methods to text-only and defers advanced features like favorites, content editing, and cloud sync to future releases.

**MVP Status:** ✅ Ready for testing and user feedback

**Next Steps:** Prioritize favorites feature and advanced import methods for MVP+ release.

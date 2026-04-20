# EchoType Mobile - Phase 2: Core Modules Implementation Plan

**Date:** 2026-04-12  
**Duration:** 4 weeks  
**Status:** Ready to Start  
**Dependencies:** Phase 1 (Infrastructure) ✅ Completed

---

## Overview

Phase 2 focuses on implementing the four core learning modules (Listen, Speak, Read, Write) along with the Dashboard and Library features. This phase will transform the skeleton app into a fully functional learning platform.

---

## Week 3: Listen + Read Modules

### 3.1 Listen Module Implementation

#### Goals
- Implement audio playback with TTS integration
- Add word-by-word highlighting synchronized with audio
- Create playback controls (play/pause, speed, loop)
- Support background audio playback

#### Tasks

**Task 3.1.1: TTS Integration**
- [ ] Implement Edge TTS adapter (`src/lib/tts/edge-tts.ts`)
- [ ] Implement Fish Audio adapter (`src/lib/tts/fish-audio.ts`)
- [ ] Implement Expo Speech fallback (`src/lib/tts/expo-speech.ts`)
- [ ] Create TTS provider selector with priority fallback
- [ ] Add audio caching mechanism

**Task 3.1.2: Audio Player Component**
- [ ] Create `AudioPlayer` component with Expo AV
- [ ] Implement playback controls (play/pause/stop)
- [ ] Add progress bar with seek functionality
- [ ] Implement playback speed control (0.5x - 2.0x)
- [ ] Add loop mode toggle
- [ ] Configure background audio mode

**Task 3.1.3: Word Highlighting**
- [ ] Implement word alignment algorithm
- [ ] Create `HighlightedText` component
- [ ] Synchronize highlighting with audio progress
- [ ] Add smooth transition animations
- [ ] Handle multi-line text wrapping

**Task 3.1.4: Listen Screen UI**
- [ ] Update `app/(tabs)/listen.tsx` with content list
- [ ] Create `ListenPractice` screen (`app/practice/listen/[id].tsx`)
- [ ] Add content card components
- [ ] Implement pull-to-refresh
- [ ] Add empty state and loading states

**Task 3.1.5: Database Integration**
- [ ] Query contents from WatermelonDB
- [ ] Track listening progress
- [ ] Save listening sessions to `typing_sessions` table
- [ ] Update learning records with FSRS

**Deliverables:**
- Fully functional Listen module with TTS playback
- Word-by-word highlighting
- Progress tracking
- Background audio support

---

### 3.2 Read Module Implementation

#### Goals
- Display reading content with proper formatting
- Implement word selection and translation
- Add vocabulary collection feature
- Track reading progress

#### Tasks

**Task 3.2.1: Reading View Component**
- [ ] Create `ReadingView` component with selectable text
- [ ] Implement text formatting (paragraphs, line breaks)
- [ ] Add font size adjustment
- [ ] Support dark mode styling
- [ ] Add reading progress indicator

**Task 3.2.2: Word Selection & Translation**
- [ ] Implement long-press word selection
- [ ] Create translation popup component
- [ ] Integrate AI translation (reuse Web logic)
- [ ] Add pronunciation audio for selected words
- [ ] Show word definition and examples

**Task 3.2.3: Vocabulary Collection**
- [ ] Create "Add to Favorites" button in translation popup
- [ ] Implement favorite word saving to database
- [ ] Create vocabulary list view
- [ ] Add folder organization for favorites
- [ ] Support batch operations (delete, move)

**Task 3.2.4: Read Screen UI**
- [ ] Update `app/(tabs)/read.tsx` with content list
- [ ] Create `ReadPractice` screen (`app/practice/read/[id].tsx`)
- [ ] Add content filtering (difficulty, category)
- [ ] Implement search functionality
- [ ] Add reading statistics cards

**Task 3.2.5: Database Integration**
- [ ] Query reading contents from WatermelonDB
- [ ] Track reading progress (current position)
- [ ] Save favorite words to `favorites` table
- [ ] Update learning records

**Deliverables:**
- Reading interface with selectable text
- Word translation and pronunciation
- Vocabulary collection system
- Reading progress tracking

---

## Week 4: Speak + Write Modules

### 4.1 Speak Module Implementation

#### Goals
- Implement speech recognition (STT)
- Create conversation scenarios
- Add pronunciation scoring
- Support free conversation mode

#### Tasks

**Task 4.1.1: Speech Recognition Integration**
- [ ] Implement native voice recognition (`@react-native-voice/voice`)
- [ ] Create STT adapter with error handling
- [ ] Add microphone permission handling
- [ ] Implement real-time transcription display
- [ ] Add voice activity detection

**Task 4.1.2: Pronunciation Scoring**
- [ ] Integrate SpeechSuper API (if available)
- [ ] Implement AI-based pronunciation evaluation fallback
- [ ] Create scoring algorithm (accuracy, fluency, completeness)
- [ ] Display phoneme-level feedback
- [ ] Show IPA pronunciation guide

**Task 4.1.3: Conversation Scenarios**
- [ ] Create scenario data structure
- [ ] Implement turn-based conversation flow
- [ ] Add AI tutor responses
- [ ] Create scenario selection UI
- [ ] Add difficulty levels (beginner, intermediate, advanced)

**Task 4.1.4: Recording & Playback**
- [ ] Implement audio recording with Expo Audio
- [ ] Add recording visualization (waveform)
- [ ] Create playback controls for user recordings
- [ ] Save recordings to file system
- [ ] Add recording history

**Task 4.1.5: Speak Screen UI**
- [ ] Update `app/(tabs)/speak.tsx` with scenario list
- [ ] Create `SpeakPractice` screen (`app/practice/speak/[id].tsx`)
- [ ] Design conversation interface
- [ ] Add microphone button with animation
- [ ] Create pronunciation feedback UI

**Task 4.1.6: Database Integration**
- [ ] Save speaking sessions to database
- [ ] Track pronunciation scores
- [ ] Store conversation history
- [ ] Update learning records with FSRS

**Deliverables:**
- Speech recognition with real-time transcription
- Pronunciation scoring and feedback
- 50+ conversation scenarios
- Recording and playback functionality

---

### 4.2 Write Module Implementation

#### Goals
- Create typing practice interface
- Implement real-time error detection
- Calculate WPM and accuracy
- Provide detailed error analysis

#### Tasks

**Task 4.2.1: Typing Input Component**
- [ ] Create `TypingInput` component with TextInput
- [ ] Implement real-time text comparison
- [ ] Add character-by-character validation
- [ ] Handle multi-line input
- [ ] Support keyboard shortcuts (if applicable)

**Task 4.2.2: Error Highlighting**
- [ ] Create `HighlightedInput` component
- [ ] Highlight incorrect characters in red
- [ ] Show correct characters in green
- [ ] Add visual feedback for mistakes
- [ ] Optimize rendering performance with React.memo

**Task 4.2.3: Statistics Calculation**
- [ ] Implement WPM calculation (reuse Web logic)
- [ ] Calculate accuracy percentage
- [ ] Track error types (typos, omissions, additions)
- [ ] Generate error distribution chart
- [ ] Calculate typing speed over time

**Task 4.2.4: Write Screen UI**
- [ ] Update `app/(tabs)/write.tsx` with content list
- [ ] Create `WritePractice` screen (`app/practice/write/[id].tsx`)
- [ ] Design typing interface with split view (original/input)
- [ ] Add real-time statistics display (WPM, accuracy)
- [ ] Create completion screen with detailed stats

**Task 4.2.5: Database Integration**
- [ ] Save typing sessions to `typing_sessions` table
- [ ] Track mistakes for error analysis
- [ ] Update learning records with FSRS
- [ ] Store typing history

**Deliverables:**
- Typing practice interface with error highlighting
- Real-time WPM and accuracy calculation
- Detailed error analysis
- Typing history and statistics

---

## Week 5: Library + Dashboard

### 5.1 Library Module Implementation

#### Goals
- Implement content import from multiple sources
- Create content management interface
- Add tagging and categorization
- Support content search and filtering

#### Tasks

**Task 5.1.1: URL Import**
- [ ] Reuse Web URL extraction logic (`src/lib/import/url.ts`)
- [ ] Create URL input form
- [ ] Add loading state during extraction
- [ ] Handle extraction errors gracefully
- [ ] Preview extracted content before saving

**Task 5.1.2: YouTube Import**
- [ ] Reuse Web YouTube import logic (`src/lib/import/youtube.ts`)
- [ ] Extract video metadata (title, description)
- [ ] Fetch subtitles/captions
- [ ] Generate content from transcript
- [ ] Add thumbnail display

**Task 5.1.3: PDF Import**
- [ ] Implement document picker with `expo-document-picker`
- [ ] Read PDF file with `expo-file-system`
- [ ] Send to backend API for text extraction
- [ ] Parse extracted text into content
- [ ] Handle multi-page PDFs

**Task 5.1.4: Text Import**
- [ ] Create text input form
- [ ] Support paste from clipboard
- [ ] Add text formatting options
- [ ] Auto-detect language
- [ ] Generate title from content

**Task 5.1.5: AI Content Generation**
- [ ] Create AI generation form (topic, difficulty, length)
- [ ] Integrate AI providers (reuse Web logic)
- [ ] Stream generated content
- [ ] Allow editing before saving
- [ ] Add generation history

**Task 5.1.6: Content Management**
- [ ] Create content list with cards
- [ ] Implement search functionality
- [ ] Add filtering (type, difficulty, tags)
- [ ] Support sorting (date, title, difficulty)
- [ ] Add batch operations (delete, tag)

**Task 5.1.7: Library Screen UI**
- [ ] Update `app/(tabs)/library.tsx` with tabs (All, Books, Favorites)
- [ ] Create import modal with multiple options
- [ ] Design content card component
- [ ] Add empty state illustrations
- [ ] Implement pull-to-refresh

**Task 5.1.8: Database Integration**
- [ ] Save imported content to `contents` table
- [ ] Create books and chapters in `books` table
- [ ] Manage favorites in `favorites` and `favorite_folders` tables
- [ ] Support content updates and deletion

**Deliverables:**
- Multi-source content import (URL, YouTube, PDF, Text, AI)
- Content management interface
- Search and filtering
- Tagging and categorization

---

### 5.2 Dashboard Module Implementation

#### Goals
- Display learning statistics and progress
- Show activity heatmap
- Provide review forecast
- Display recent activity and daily plan

#### Tasks

**Task 5.2.1: Statistics Calculation**
- [ ] Reuse Web analytics logic (`src/lib/analytics.ts`)
- [ ] Calculate total contents, sessions, words learned
- [ ] Compute average WPM and accuracy
- [ ] Calculate streak days
- [ ] Generate module distribution data

**Task 5.2.2: Activity Heatmap**
- [ ] Query activity data for last 56 days
- [ ] Generate heatmap data structure
- [ ] Create heatmap visualization with Victory Native
- [ ] Add color gradient based on activity level
- [ ] Show tooltip on cell tap

**Task 5.2.3: Review Forecast**
- [ ] Query learning records with FSRS due dates
- [ ] Calculate review counts for next 7 days
- [ ] Create forecast chart with Victory Native
- [ ] Add daily review count labels
- [ ] Highlight today's reviews

**Task 5.2.4: Recent Activity**
- [ ] Query recent typing sessions and learning records
- [ ] Display activity timeline
- [ ] Show module icons and content titles
- [ ] Add time ago labels
- [ ] Support tap to view details

**Task 5.2.5: Daily Plan**
- [ ] Integrate with `daily-plan-store`
- [ ] Display today's planned activities
- [ ] Show completion progress
- [ ] Add quick action buttons
- [ ] Support plan editing

**Task 5.2.6: Dashboard Screen UI**
- [ ] Update `app/(tabs)/index.tsx` with real data
- [ ] Create statistics cards with animations
- [ ] Design heatmap and forecast charts
- [ ] Add recent activity list
- [ ] Create daily plan section

**Task 5.2.7: Database Integration**
- [ ] Query all necessary data from WatermelonDB
- [ ] Optimize queries with indexes
- [ ] Cache computed statistics
- [ ] Update in real-time when data changes

**Deliverables:**
- Comprehensive learning statistics
- Activity heatmap (56 days)
- Review forecast (7 days)
- Recent activity timeline
- Daily plan management

---

## Week 6: AI Tutor + Review

### 6.1 AI Tutor Module Implementation

#### Goals
- Create conversational AI assistant
- Support multi-turn dialogue
- Implement streaming responses
- Add voice input support

#### Tasks

**Task 6.1.1: Chat Interface**
- [ ] Create chat screen (`app/(modals)/chat.tsx`)
- [ ] Design message bubbles (user/assistant)
- [ ] Implement auto-scroll to latest message
- [ ] Add typing indicator
- [ ] Support message copying

**Task 6.1.2: AI Integration**
- [ ] Reuse Web AI logic (`src/lib/ai/*`)
- [ ] Implement streaming text with Vercel AI SDK
- [ ] Support 15+ AI providers
- [ ] Add provider switching in settings
- [ ] Handle API errors gracefully

**Task 6.1.3: Voice Input**
- [ ] Add microphone button in chat input
- [ ] Implement voice-to-text with `@react-native-voice/voice`
- [ ] Show recording animation
- [ ] Auto-send after transcription
- [ ] Support continuous listening mode

**Task 6.1.4: Context Integration**
- [ ] Allow attaching current content to chat
- [ ] Send content context with messages
- [ ] Add "Ask about this content" quick action
- [ ] Support image attachments (future)

**Task 6.1.5: Chat History**
- [ ] Save conversations to `conversations` table
- [ ] Load conversation history
- [ ] Support multiple conversations
- [ ] Add conversation search
- [ ] Implement conversation deletion

**Task 6.1.6: Database Integration**
- [ ] Store messages in `conversations` table
- [ ] Track conversation metadata
- [ ] Support conversation export

**Deliverables:**
- Full-featured AI chat interface
- Streaming responses
- Voice input support
- Conversation history management

---

### 6.2 Review Module Implementation

#### Goals
- Implement FSRS-based review system
- Create review card interface
- Track review statistics
- Support daily review queue

#### Tasks

**Task 6.2.1: FSRS Integration**
- [ ] Reuse Web FSRS logic (`src/lib/fsrs.ts`)
- [ ] Query due cards from database
- [ ] Implement card scheduling (Again/Hard/Good/Easy)
- [ ] Update card state after review
- [ ] Calculate next review date

**Task 6.2.2: Review Card Component**
- [ ] Create swipeable review card
- [ ] Show content on front
- [ ] Show answer/translation on back
- [ ] Add flip animation
- [ ] Support gesture controls (swipe for rating)

**Task 6.2.3: Review Queue**
- [ ] Query today's due cards
- [ ] Implement queue management
- [ ] Show remaining cards count
- [ ] Add progress bar
- [ ] Support queue filtering (by module, difficulty)

**Task 6.2.4: Review Statistics**
- [ ] Track review session stats (cards reviewed, time spent)
- [ ] Calculate retention rate
- [ ] Show daily review streak
- [ ] Generate review history chart
- [ ] Display upcoming reviews

**Task 6.2.5: Review Screen UI**
- [ ] Create review modal (`app/(modals)/review.tsx`)
- [ ] Design card interface with rating buttons
- [ ] Add completion screen with stats
- [ ] Show empty state when no reviews
- [ ] Add "Study Ahead" option

**Task 6.2.6: Database Integration**
- [ ] Query learning records with due dates
- [ ] Update FSRS card state after review
- [ ] Track review sessions
- [ ] Calculate review statistics

**Deliverables:**
- FSRS-based review system
- Swipeable review cards
- Daily review queue
- Review statistics and history

---

## Technical Requirements

### Performance Targets
- [ ] Screen load time < 500ms
- [ ] Audio playback latency < 200ms
- [ ] Speech recognition response < 1s
- [ ] Smooth 60fps animations
- [ ] Memory usage < 150MB during practice

### Code Quality
- [ ] All components use TypeScript
- [ ] Proper error handling for all async operations
- [ ] Loading states for all data fetching
- [ ] Empty states for all lists
- [ ] Accessibility labels for all interactive elements

### Testing
- [ ] Unit tests for business logic (FSRS, analytics, import)
- [ ] Component tests for UI components
- [ ] Integration tests for each module
- [ ] Manual testing on iPhone 16 Pro simulator

---

## Dependencies

### External APIs
- Edge TTS API (free)
- Fish Audio API (optional, requires API key)
- SpeechSuper API (optional, for pronunciation scoring)
- AI Provider APIs (OpenAI, Anthropic, etc.)

### Native Permissions
- Microphone (for Speak module)
- Storage (for file import)
- Network (for API calls and sync)

---

## Risk Mitigation

### Technical Risks
1. **Audio playback issues on different devices**
   - Mitigation: Extensive device testing, fallback to system TTS
   
2. **Speech recognition accuracy**
   - Mitigation: Use native APIs, provide manual correction option
   
3. **Performance degradation with large content**
   - Mitigation: Implement pagination, lazy loading, virtualized lists

4. **AI API rate limits**
   - Mitigation: Implement request queuing, show clear error messages

### Schedule Risks
1. **Feature complexity underestimated**
   - Mitigation: Prioritize core features, defer nice-to-haves
   
2. **Integration issues between modules**
   - Mitigation: Regular integration testing, clear interfaces

---

## Success Criteria

### Functional
- [ ] All 4 learning modules fully functional
- [ ] Content import from 5+ sources working
- [ ] AI Tutor responds correctly with streaming
- [ ] Review system schedules cards accurately
- [ ] Dashboard displays real-time statistics

### Non-Functional
- [ ] No crashes during normal usage
- [ ] Smooth animations (60fps)
- [ ] Fast response times (< 1s for most operations)
- [ ] Intuitive UI/UX (user testing feedback)

---

## Deliverables

### End of Week 3
- ✅ Listen module with TTS and word highlighting
- ✅ Read module with translation and vocabulary collection

### End of Week 4
- ✅ Speak module with speech recognition and pronunciation scoring
- ✅ Write module with typing practice and error analysis

### End of Week 5
- ✅ Library module with multi-source import
- ✅ Dashboard with statistics and charts

### End of Week 6
- ✅ AI Tutor with streaming chat
- ✅ Review system with FSRS cards
- ✅ All Phase 2 features complete and tested

---

## Next Steps

1. **Review this plan** - Confirm scope and timeline
2. **Set up development environment** - Ensure all dependencies installed
3. **Start Week 3 tasks** - Begin with Listen module TTS integration
4. **Daily standups** - Track progress and blockers
5. **Weekly demos** - Show completed features to stakeholders

---

**Plan Version:** 1.0  
**Created:** 2026-04-12  
**Author:** Claude (Opus 4.6)  
**Status:** Ready for Implementation

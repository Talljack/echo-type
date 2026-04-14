# iOS Testing Guide

## Manual Testing Steps

Since automated UI interaction on iOS simulator is limited, follow these manual steps:

### 1. Welcome Screen
- [ ] Tap "Get Started" button
- [ ] Verify navigation to Dashboard

### 2. Dashboard Testing
- [ ] Verify all stats cards display (Day Streak, Total Time, Sessions)
- [ ] Check Activity Heatmap renders
- [ ] Check Progress Chart shows 4 modules
- [ ] Verify Continue Learning cards (Listen, Speak, Read, Write)
- [ ] Tap each module card to verify navigation

### 3. Library Testing
- [ ] Tap Library tab
- [ ] Verify empty state shows
- [ ] Tap + FAB button
- [ ] Test Text Import:
  - Title: "The Little Prince"
  - Content: "Once when I was six years old I saw a magnificent picture..."
  - Language: English
  - Tap Import
- [ ] Verify content appears in library
- [ ] Tap content card to open detail page
- [ ] Test favorite button (star icon)
- [ ] Test edit button
- [ ] Test delete button with confirmation

### 4. Listen Practice
- [ ] From library, tap a content card
- [ ] Tap "Listen" practice button
- [ ] Verify audio player loads
- [ ] Test play/pause
- [ ] Test speed control (0.75x, 1x, 1.5x, 2x)
- [ ] Verify text highlights current word
- [ ] Check session time tracking

### 5. Speak Practice
- [ ] From content detail, tap "Speak" button
- [ ] Grant microphone permission if prompted
- [ ] Tap record button
- [ ] Speak some text
- [ ] Verify transcript appears
- [ ] Check pronunciation score

### 6. Read Practice
- [ ] From content detail, tap "Read" button
- [ ] Tap on a word
- [ ] Verify translation panel appears
- [ ] Tap "Add to Vocabulary"
- [ ] Verify word is added

### 7. Write Practice
- [ ] From content detail, tap "Write" button
- [ ] Start typing the content
- [ ] Verify character count updates
- [ ] Verify accuracy percentage
- [ ] Check WPM calculation

### 8. Vocabulary
- [ ] Tap Vocabulary tab
- [ ] Verify stats show correct counts
- [ ] Verify word from reading appears
- [ ] Tap + button to add manual word
- [ ] Fill in word details and save

### 9. Review System
- [ ] Go to Dashboard
- [ ] Tap Review card
- [ ] If no reviews, add vocabulary first
- [ ] Tap "Show Answer"
- [ ] Test all 4 rating buttons
- [ ] Verify next review date updates

### 10. AI Tutor
- [ ] Go to Dashboard
- [ ] Tap AI Tutor card
- [ ] Tap + to create conversation
- [ ] Type a message
- [ ] Send and wait for response
- [ ] Verify conversation persists

### 11. Settings
- [ ] Tap Settings tab (if visible)
- [ ] Test language selector
- [ ] Test theme toggle
- [ ] Verify settings persist

## Quick Test Data

### Sample Text for Import:
```
Title: The Little Prince - Chapter 1

Content:
Once when I was six years old I saw a magnificent picture in a book, called True Stories from Nature, about the primeval forest. It was a picture of a boa constrictor in the act of swallowing an animal.

In the book it said: "Boa constrictors swallow their prey whole, without chewing it. After that they are not able to move, and they sleep through the six months that they need for digestion."

I pondered deeply, then, over the adventures of the jungle. And after some work with a colored pencil I succeeded in making my first drawing.
```

### Sample Vocabulary:
- Word: magnificent
- Translation: 壮丽的，宏伟的
- Context: I saw a magnificent picture

## Screenshots to Capture

1. Welcome screen ✅
2. Dashboard with stats
3. Library empty state
4. Import modal
5. Library with content
6. Content detail page
7. Listen practice
8. Speak practice
9. Read practice with translation
10. Write practice
11. Vocabulary list
12. Review card
13. AI Tutor chat

## Issues to Watch For

- [ ] Navigation bugs
- [ ] UI rendering issues
- [ ] Performance problems
- [ ] Crash on specific actions
- [ ] Data persistence issues
- [ ] Permission handling
- [ ] Offline functionality

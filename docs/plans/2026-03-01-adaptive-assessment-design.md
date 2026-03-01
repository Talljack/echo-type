# Adaptive English Level Assessment Design

**Date:** 2026-03-01
**Status:** Implemented
**Type:** Feature Enhancement

## Overview

Implemented adaptive difficulty testing for English proficiency assessment, increasing from 15 to 30 questions with intelligent difficulty distribution based on user's current level.

## Problem Statement

The original 15-question test was too short to accurately assess English proficiency. Industry standards suggest 20-40 questions for reliable assessment. Additionally, the test didn't adapt to user's known level, making retests inefficient.

## Solution

### 1. Question Count Increase
- **Before:** 15 questions (5 vocab, 5 grammar, 5 reading)
- **After:** 30 questions (10 vocab, 10 grammar, 10 reading)
- **Duration:** 10-15 minutes (standard assessment)

### 2. Adaptive Difficulty Distribution

#### First-Time Test (No History)
Balanced distribution across all CEFR levels:
```
A1: 5 questions (17%) - vocab:2, grammar:2, reading:1
A2: 5 questions (17%) - vocab:2, grammar:2, reading:1
B1: 6 questions (20%) - vocab:2, grammar:2, reading:2
B2: 6 questions (20%) - vocab:2, grammar:2, reading:2
C1: 5 questions (17%) - vocab:1, grammar:1, reading:3
C2: 3 questions (10%) - vocab:1, grammar:1, reading:1
```

#### Subsequent Tests (With Known Level)
Focused on current level ±1 for progressive assessment:

**Example: B1 Level**
```
A2: 6 questions (20%) - Verify foundation
B1: 16 questions (53%) - Current level mastery
B2: 8 questions (27%) - Test progress
```

**Edge Cases:**
- A1: 20 A1 + 10 A2 questions
- C2: 10 C1 + 20 C2 questions

### 3. Implementation Details

#### API Changes (`/api/assessment/route.ts`)
```typescript
// New request parameter
interface AssessmentRequest {
  provider: string;
  modelId?: string;
  baseUrl?: string;
  apiPath?: string;
  currentLevel?: CEFRLevel; // NEW: for adaptive testing
}

// Dynamic prompt generation
function buildSystemPrompt(currentLevel?: CEFRLevel): string {
  if (!currentLevel) {
    // First-time: balanced distribution
  } else {
    // Adaptive: focused distribution
  }
}
```

#### Frontend Changes (`assessment-section.tsx`)
```typescript
// Pass current level to API
body: JSON.stringify({
  ...config,
  currentLevel: currentLevel, // From store
})
```

#### Scoring (Unchanged)
```
Score = (correct / 30) × 100

Level Thresholds:
≤20%: A1
≤40%: A2
≤55%: B1
≤70%: B2
≤85%: C1
>85%: C2
```

## Benefits

1. **More Accurate:** 30 questions provide better statistical reliability
2. **Efficient Retesting:** Adaptive distribution focuses on relevant difficulty
3. **Better UX:** Users see progress through targeted questions
4. **Industry Standard:** Aligns with 20-40 question best practices

## Testing

### Verified Scenarios
1. ✅ First-time test generates balanced 30 questions
2. ✅ Subsequent test receives currentLevel parameter
3. ✅ Questions display correctly (Question 1/30, 2/30, etc.)
4. ✅ All three categories (vocab, grammar, reading) included
5. ✅ Scoring calculation works with 30 questions

### Browser Testing
- Tested with OpenAI GPT-4o
- Confirmed 30-question generation
- Verified question progression UI
- Screenshots captured at `/tmp/assessment-*.png`

## Future Enhancements

1. **Question Bank:** Pre-generate questions to reduce API latency
2. **Difficulty Validation:** Verify AI follows distribution exactly
3. **Analytics:** Track which difficulty levels users struggle with
4. **Time Tracking:** Record time per question for engagement metrics

## Files Modified

- `src/app/api/assessment/route.ts` - Adaptive prompt generation
- `src/components/assessment/assessment-section.tsx` - Pass currentLevel
- `src/stores/assessment-store.ts` - No changes (already stores level)

## Rollout

- ✅ Implemented and tested
- ✅ Backward compatible (works without currentLevel)
- ✅ No database migrations needed (uses localStorage)
- Ready for production

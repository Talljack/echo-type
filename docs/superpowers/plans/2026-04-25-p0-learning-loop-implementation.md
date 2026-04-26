# P0 Learning Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved P0 learning-loop features across the shared Next.js web app and the Tauri macOS desktop app surface.

**Architecture:** Extend the existing local-first Next.js app by adding a learner-goal store, import-to-practice action generation, a Dexie-backed weak-spots system, and structured listening modes on the existing listen detail page. Because the macOS app is the same Next.js app inside Tauri, implementation should live in shared app code and only add platform guards if Tauri behavior differs.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zustand, Dexie, Tailwind CSS v4, Tauri v2, Playwright, Vitest/Biome

---

## File Map

### New files

- `src/stores/learning-goal-store.ts` — learner goal persistence and helpers
- `src/lib/learning-goals.ts` — goal labels, module weights, dashboard explanation helpers
- `src/lib/import-practice-actions.ts` — import completion action generation
- `src/components/import/import-practice-actions.tsx` — shared import completion action panel
- `src/types/weak-spot.ts` — weak spot types
- `src/lib/weak-spots.ts` — weak spot upsert/query helpers
- `src/stores/weak-spots-store.ts` — weak spot UI state
- `src/app/(app)/weak-spots/page.tsx` — weak spots page
- `src/components/weak-spots/weak-spot-list.tsx` — list/filter UI
- `src/components/weak-spots/weak-spot-summary.tsx` — summary cards
- `src/lib/listen-dictation.ts` — dictation comparison and scoring helpers
- `src/lib/learning-goals.test.ts`
- `src/lib/import-practice-actions.test.ts`
- `src/lib/weak-spots.test.ts`
- `src/lib/listen-dictation.test.ts`
- `e2e/p0-learning-loop.spec.ts`

### Modified files

- `src/lib/db.ts` — add `weakSpots` table/schema typing
- `src/app/(app)/dashboard/page.tsx` — goal setup card, goal summary, weak spots CTA, plan explanation
- `src/stores/daily-plan-store.ts` — persist goal-aware plan explanation metadata if needed
- `src/lib/daily-plan.ts` — learner-goal scoring integration
- `src/components/import/document-import.tsx` — route successful import into completion panel
- `src/components/import/media-import.tsx` — route successful import into completion panel
- `src/components/import/text-import.tsx`
- `src/components/import/file-upload-import.tsx`
- `src/components/import/url-import.tsx`
- `src/components/layout/sidebar.tsx` or equivalent sidebar component — add Weak Spots nav item
- `src/app/(app)/listen/[id]/page.tsx` — add listening modes, dictation, weak spot persistence, next-step CTA
- `src/lib/daily-plan-progress.ts` — persist weak-spot events from completed practice where needed
- `src/lib/i18n/messages/*` — add strings for goals, weak spots, import actions, listen modes
- `src/lib/i18n/messages/sidebar.ts`

### Context files to inspect while implementing

- `src/stores/assessment-store.ts`
- `src/stores/content-store.ts`
- `src/lib/daily-plan.ts`
- `src/app/(app)/dashboard/page.tsx`
- `src/app/(app)/listen/[id]/page.tsx`
- `src/lib/tauri.ts`

## Task 1: Add learner goal state and helper layer

**Files:**
- Create: `src/stores/learning-goal-store.ts`
- Create: `src/lib/learning-goals.ts`
- Test: `src/lib/learning-goals.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  LEARNING_GOAL_CONFIG,
  buildDailyPlanGoalExplanation,
  getGoalModuleBonus,
} from '@/lib/learning-goals';

describe('learning-goals', () => {
  it('returns stronger speaking bonus for travel than read', () => {
    expect(getGoalModuleBonus('travel', 'speak')).toBeGreaterThan(getGoalModuleBonus('travel', 'read'));
  });

  it('builds dashboard explanation from goal and level', () => {
    expect(buildDailyPlanGoalExplanation('travel', 'B1')).toContain('Travel');
    expect(buildDailyPlanGoalExplanation('travel', 'B1')).toContain('B1');
  });

  it('exposes five supported goals', () => {
    expect(Object.keys(LEARNING_GOAL_CONFIG)).toEqual(['speaking', 'exam', 'travel', 'work', 'balanced']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/learning-goals.test.ts`
Expected: FAIL with module not found for `@/lib/learning-goals`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/learning-goals.ts
import type { CEFRLevel } from '@/stores/assessment-store';
import type { PlanTask } from '@/stores/daily-plan-store';

export type LearningGoal = 'speaking' | 'exam' | 'travel' | 'work' | 'balanced';

type ModuleKey = PlanTask['module'];

export const LEARNING_GOAL_CONFIG: Record<
  LearningGoal,
  { label: string; description: string; moduleBonus: Record<ModuleKey, number> }
> = {
  speaking: {
    label: 'Speaking First',
    description: 'Prioritize daily spoken English and conversation practice.',
    moduleBonus: { listen: 5, speak: 12, read: 3, write: 1 },
  },
  exam: {
    label: 'Exam Prep',
    description: 'Focus on reading, writing, and accuracy-heavy practice.',
    moduleBonus: { listen: 4, speak: 2, read: 10, write: 10 },
  },
  travel: {
    label: 'Travel English',
    description: 'Focus on survival listening and practical speaking.',
    moduleBonus: { listen: 10, speak: 12, read: 2, write: 1 },
  },
  work: {
    label: 'Work English',
    description: 'Improve meetings, presentations, and professional writing.',
    moduleBonus: { listen: 4, speak: 9, read: 5, write: 10 },
  },
  balanced: {
    label: 'Balanced Growth',
    description: 'Keep listening, speaking, reading, and writing in rotation.',
    moduleBonus: { listen: 4, speak: 4, read: 4, write: 4 },
  },
};

export function getGoalModuleBonus(goal: LearningGoal | null | undefined, module: ModuleKey): number {
  if (!goal) return 0;
  return LEARNING_GOAL_CONFIG[goal].moduleBonus[module];
}

export function buildDailyPlanGoalExplanation(goal: LearningGoal | null, level?: CEFRLevel | null): string {
  if (!goal && !level) return 'Your plan balances current weak spots and recent practice.';
  if (goal && level) {
    return `${LEARNING_GOAL_CONFIG[goal].label} is active, so today leans into that goal while keeping content near ${level}.`;
  }
  if (goal) return `${LEARNING_GOAL_CONFIG[goal].label} is active, so today leans into that goal.`;
  return `Your current level is ${level}, so today stays near that difficulty.`;
}
```

```ts
// src/stores/learning-goal-store.ts
import { create } from 'zustand';
import type { LearningGoal } from '@/lib/learning-goals';

const STORAGE_KEY = 'echotype_learning_goal';

interface LearningGoalStore {
  currentGoal: LearningGoal | null;
  setGoal: (goal: LearningGoal) => void;
  clearGoal: () => void;
  hydrate: () => void;
}

export const useLearningGoalStore = create<LearningGoalStore>((set, get) => ({
  currentGoal: null,
  setGoal: (goal) => {
    set({ currentGoal: goal });
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, goal);
    }
  },
  clearGoal: () => {
    set({ currentGoal: null });
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  },
  hydrate: () => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(STORAGE_KEY) as LearningGoal | null;
    if (saved) set({ currentGoal: saved });
  },
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/learning-goals.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/learning-goals.ts src/stores/learning-goal-store.ts src/lib/learning-goals.test.ts
git commit -m "feat: add learner goal helpers"
```

## Task 2: Make daily plan goal-aware

**Files:**
- Modify: `src/lib/daily-plan.ts`
- Test: `src/lib/learning-goals.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('gives travel goal a higher speak candidate score than balanced', async () => {
  const travel = await generateDailyPlan({ wordsPerDay: 20, sessionsPerDay: 4 }, { currentLevel: 'B1', learningGoal: 'travel' });
  const balanced = await generateDailyPlan({ wordsPerDay: 20, sessionsPerDay: 4 }, { currentLevel: 'B1', learningGoal: 'balanced' });
  expect(travel.find((task) => task.module === 'speak')).toBeTruthy();
  expect(balanced.find((task) => task.module === 'speak')).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/learning-goals.test.ts`
Expected: FAIL because `DailyPlanOptions` does not accept `learningGoal`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/daily-plan.ts
import { getGoalModuleBonus, type LearningGoal } from '@/lib/learning-goals';

interface DailyPlanOptions {
  currentLevel?: CEFRLevel | null;
  dateKey?: string;
  learningGoal?: LearningGoal | null;
}

// when constructing candidate score
score:
  modulePriority +
  difficultyFitScore(targetDifficulty, book.difficulty) +
  getGoalModuleBonus(options.learningGoal, 'write') +
  3 +
  Math.min(wordCount, 20) / 20
```

Apply the same `getGoalModuleBonus(options.learningGoal, module)` addition to read/speak/listen candidate scoring.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/learning-goals.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/daily-plan.ts src/lib/learning-goals.test.ts
git commit -m "feat: bias daily plan by learner goal"
```

## Task 3: Add dashboard goal UI and weak spots entry point

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`
- Modify: `src/lib/i18n/messages/*`
- Test: `e2e/p0-learning-loop.spec.ts`

- [ ] **Step 1: Write the failing E2E**

```ts
import { expect, test } from '@playwright/test';

test('dashboard shows goal setup before a goal is selected', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByText(/choose your learning goal/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /travel english/i })).toBeVisible();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm playwright test e2e/p0-learning-loop.spec.ts --grep "goal setup"`
Expected: FAIL because dashboard has no goal setup card

- [ ] **Step 3: Write minimal implementation**

```tsx
// dashboard page additions
const currentGoal = useLearningGoalStore((s) => s.currentGoal);
const setGoal = useLearningGoalStore((s) => s.setGoal);

useEffect(() => {
  useLearningGoalStore.getState().hydrate();
}, []);

const planExplanation = buildDailyPlanGoalExplanation(currentGoal, currentLevel);
```

```tsx
{!currentGoal ? (
  <Card>
    <CardHeader>
      <CardTitle>Choose your learning goal</CardTitle>
    </CardHeader>
    <CardContent className="flex flex-wrap gap-2">
      {Object.entries(LEARNING_GOAL_CONFIG).map(([key, config]) => (
        <Button key={key} variant="outline" onClick={() => setGoal(key as LearningGoal)}>
          {config.label}
        </Button>
      ))}
    </CardContent>
  </Card>
) : (
  <Card>
    <CardHeader>
      <CardTitle>{LEARNING_GOAL_CONFIG[currentGoal].label}</CardTitle>
    </CardHeader>
    <CardContent>{planExplanation}</CardContent>
  </Card>
)}
```

Also add a compact weak spots CTA card or link to `/weak-spots`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm playwright test e2e/p0-learning-loop.spec.ts --grep "goal setup"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/'(app)'/dashboard/page.tsx src/lib/i18n/messages e2e/p0-learning-loop.spec.ts
git commit -m "feat: add learner goal setup to dashboard"
```

## Task 4: Add import practice action generation

**Files:**
- Create: `src/lib/import-practice-actions.ts`
- Create: `src/lib/import-practice-actions.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { buildImportPracticeActions } from '@/lib/import-practice-actions';

describe('import practice actions', () => {
  it('prefers read first for text import', () => {
    const actions = buildImportPracticeActions({
      id: 'a1',
      type: 'article',
      title: 'Water Cycle',
      text: 'Long article body',
      sourceKind: 'document',
      hasTranscript: true,
    });
    expect(actions[0]?.module).toBe('read');
  });

  it('prefers listen first for media import', () => {
    const actions = buildImportPracticeActions({
      id: 'a2',
      type: 'article',
      title: 'Podcast',
      text: 'Transcript',
      sourceKind: 'media',
      hasTranscript: true,
    });
    expect(actions[0]?.module).toBe('listen');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/import-practice-actions.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```ts
export function buildImportPracticeActions(input: {
  id: string;
  type: 'article' | 'phrase' | 'sentence' | 'word';
  title: string;
  text: string;
  sourceKind: 'document' | 'media';
  hasTranscript: boolean;
}) {
  if (input.sourceKind === 'media') {
    return [
      { id: `${input.id}-listen`, module: 'listen', title: 'Start with listening', description: input.title, href: `/listen/${input.id}`, priority: 'primary', reason: 'Imported media is best practiced through listening first.' },
      { id: `${input.id}-read`, module: 'read', title: 'Read the transcript', description: input.title, href: `/read/${input.id}`, priority: 'secondary', reason: 'Use the transcript to confirm what you heard.' },
      { id: `${input.id}-speak`, module: 'speak', title: 'Retell it aloud', description: input.title, href: `/speak/free?sourceId=${input.id}`, priority: 'secondary', reason: 'Retelling turns passive listening into output.' },
    ];
  }

  return [
    { id: `${input.id}-read`, module: 'read', title: 'Read it first', description: input.title, href: `/read/${input.id}`, priority: 'primary', reason: 'Imported text is best understood through guided reading first.' },
    { id: `${input.id}-write`, module: 'write', title: 'Type key phrases', description: input.title, href: `/write/${input.id}`, priority: 'secondary', reason: 'Typing helps lock in new phrases.' },
    { id: `${input.id}-listen`, module: 'listen', title: 'Listen to the text', description: input.title, href: `/listen/${input.id}`, priority: 'secondary', reason: 'Replay the text to reinforce comprehension.' },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/import-practice-actions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/import-practice-actions.ts src/lib/import-practice-actions.test.ts
git commit -m "feat: generate import practice actions"
```

## Task 5: Route import success into completion panel

**Files:**
- Create: `src/components/import/import-practice-actions.tsx`
- Modify: `src/components/import/text-import.tsx`
- Modify: `src/components/import/file-upload-import.tsx`
- Modify: `src/components/import/url-import.tsx`
- Modify: `src/components/import/media-import.tsx`
- Test: `e2e/p0-learning-loop.spec.ts`

- [ ] **Step 1: Write the failing E2E**

```ts
test('document import shows next practice actions after save', async ({ page }) => {
  await page.goto('/library/import');
  await page.getByRole('button', { name: /paste text/i }).click();
  await page.getByPlaceholder(/paste/i).fill('This is a short imported article for testing.');
  await page.getByRole('button', { name: /save/i }).click();
  await expect(page.getByText(/practice this now/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /read it first/i })).toBeVisible();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm playwright test e2e/p0-learning-loop.spec.ts --grep "next practice actions"`
Expected: FAIL because import returns to library without completion panel

- [ ] **Step 3: Write minimal implementation**

Add a shared component:

```tsx
export function ImportPracticeActions({ title, actions }: { title: string; actions: GeneratedPracticeAction[] }) {
  return (
    <Card className="bg-white border-slate-100 shadow-sm">
      <CardContent className="space-y-4 pt-6">
        <div>
          <h3 className="text-lg font-semibold text-indigo-900">Practice this now</h3>
          <p className="text-sm text-indigo-500">{title}</p>
        </div>
        {actions.map((action) => (
          <Link key={action.id} href={action.href} className="block rounded-xl border border-indigo-100 p-4">
            <div className="font-medium text-indigo-900">{action.title}</div>
            <div className="text-sm text-indigo-500">{action.reason}</div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
```

In each import component, replace the immediate redirect with local success state:

```tsx
const [savedItem, setSavedItem] = useState<ContentItem | null>(null);

if (savedItem) {
  return (
    <ImportPracticeActions
      title={savedItem.title}
      actions={buildImportPracticeActions({
        id: savedItem.id,
        type: savedItem.type,
        title: savedItem.title,
        text: savedItem.text,
        sourceKind: 'document',
        hasTranscript: true,
      })}
    />
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm playwright test e2e/p0-learning-loop.spec.ts --grep "next practice actions"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/import src/lib/import-practice-actions.ts e2e/p0-learning-loop.spec.ts
git commit -m "feat: show practice actions after import"
```

## Task 6: Add weak spots data model

**Files:**
- Create: `src/types/weak-spot.ts`
- Modify: `src/lib/db.ts`
- Create: `src/lib/weak-spots.ts`
- Create: `src/lib/weak-spots.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { normalizeWeakSpotText } from '@/lib/weak-spots';

describe('weak spots', () => {
  it('normalizes whitespace and casing for merge keys', () => {
    expect(normalizeWeakSpotText('  Hello   World  ')).toBe('hello world');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/weak-spots.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```ts
// src/types/weak-spot.ts
export type WeakSpotType =
  | 'listening-segment'
  | 'dictation-sentence'
  | 'pronunciation-phrase'
  | 'reading-phrase'
  | 'typing-word'
  | 'favorite-item';

export interface WeakSpot {
  id: string;
  module: 'listen' | 'speak' | 'read' | 'write';
  weakSpotType: WeakSpotType;
  text: string;
  normalizedText: string;
  reason: string;
  count: number;
  lastSeenAt: number;
  targetHref: string;
  resolved: boolean;
  accuracy?: number;
}
```

```ts
// src/lib/weak-spots.ts
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import type { WeakSpot } from '@/types/weak-spot';

export function normalizeWeakSpotText(text: string) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

export async function upsertWeakSpot(input: Omit<WeakSpot, 'id' | 'normalizedText' | 'count' | 'lastSeenAt' | 'resolved'> & Partial<Pick<WeakSpot, 'accuracy'>>) {
  const normalizedText = normalizeWeakSpotText(input.text);
  const existing = await db.weakSpots
    .where(['module', 'weakSpotType', 'normalizedText'])
    .equals([input.module, input.weakSpotType, normalizedText])
    .first();

  if (existing) {
    await db.weakSpots.update(existing.id, {
      count: existing.count + 1,
      lastSeenAt: Date.now(),
      accuracy: input.accuracy ?? existing.accuracy,
      reason: input.reason,
      targetHref: input.targetHref,
      resolved: false,
    });
    return existing.id;
  }

  const id = nanoid();
  await db.weakSpots.add({
    id,
    ...input,
    normalizedText,
    count: 1,
    lastSeenAt: Date.now(),
    resolved: false,
  });
  return id;
}
```

Update `src/lib/db.ts` with a `weakSpots` table and matching TypeScript property.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/weak-spots.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/weak-spot.ts src/lib/weak-spots.ts src/lib/db.ts src/lib/weak-spots.test.ts
git commit -m "feat: add weak spots data model"
```

## Task 7: Add weak spots page and sidebar

**Files:**
- Create: `src/stores/weak-spots-store.ts`
- Create: `src/components/weak-spots/weak-spot-summary.tsx`
- Create: `src/components/weak-spots/weak-spot-list.tsx`
- Create: `src/app/(app)/weak-spots/page.tsx`
- Modify: sidebar component
- Test: `e2e/p0-learning-loop.spec.ts`

- [ ] **Step 1: Write the failing E2E**

```ts
test('weak spots page is reachable from sidebar', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('link', { name: /weak spots/i }).click();
  await expect(page).toHaveURL(/\/weak-spots$/);
  await expect(page.getByText(/most urgent weak spots/i)).toBeVisible();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm playwright test e2e/p0-learning-loop.spec.ts --grep "weak spots page"`
Expected: FAIL because sidebar lacks Weak Spots link and route

- [ ] **Step 3: Write minimal implementation**

Add the store:

```ts
export const useWeakSpotsStore = create<{
  items: WeakSpot[];
  moduleFilter: 'all' | 'listen' | 'speak' | 'read' | 'write';
  load: () => Promise<void>;
  setModuleFilter: (value: 'all' | 'listen' | 'speak' | 'read' | 'write') => void;
  markResolved: (id: string) => Promise<void>;
}>((set, get) => ({
  items: [],
  moduleFilter: 'all',
  load: async () => set({ items: await db.weakSpots.orderBy('lastSeenAt').reverse().toArray() }),
  setModuleFilter: (moduleFilter) => set({ moduleFilter }),
  markResolved: async (id) => {
    await db.weakSpots.update(id, { resolved: true });
    await get().load();
  },
}));
```

Add a basic page that loads weak spots and renders summary + list. Add sidebar link to `/weak-spots`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm playwright test e2e/p0-learning-loop.spec.ts --grep "weak spots page"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/weak-spots-store.ts src/components/weak-spots src/app/'(app)'/weak-spots/page.tsx src/components/layout
git commit -m "feat: add weak spots page"
```

## Task 8: Add dictation scoring helper for listen mode

**Files:**
- Create: `src/lib/listen-dictation.ts`
- Create: `src/lib/listen-dictation.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { scoreDictationAttempt } from '@/lib/listen-dictation';

describe('listen dictation', () => {
  it('returns 100 for exact match', () => {
    expect(scoreDictationAttempt('hello world', 'hello world').accuracy).toBe(100);
  });

  it('returns lower score for missing words', () => {
    expect(scoreDictationAttempt('hello world again', 'hello world').accuracy).toBeLessThan(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/listen-dictation.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```ts
import { normalizeText } from '@/lib/text-normalize';
import { levenshtein } from '@/lib/levenshtein';

export function scoreDictationAttempt(expected: string, actual: string) {
  const normalizedExpected = normalizeText(expected);
  const normalizedActual = normalizeText(actual);
  const distance = levenshtein(normalizedExpected, normalizedActual);
  const maxLen = Math.max(normalizedExpected.length, 1);
  const accuracy = Math.max(0, Math.round((1 - distance / maxLen) * 100));
  return { normalizedExpected, normalizedActual, distance, accuracy, passed: accuracy >= 80 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/listen-dictation.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/listen-dictation.ts src/lib/listen-dictation.test.ts
git commit -m "feat: add listen dictation scoring"
```

## Task 9: Add structured listening modes to listen detail

**Files:**
- Modify: `src/app/(app)/listen/[id]/page.tsx`
- Modify: `src/lib/i18n/messages/*`
- Test: `e2e/p0-learning-loop.spec.ts`

- [ ] **Step 1: Write the failing E2E**

```ts
test('listen detail supports hide text and dictation', async ({ page }) => {
  await page.goto('/listen/idgxTQVbj-Dtspvh5WHNF');
  await page.getByRole('button', { name: /dictation/i }).click();
  await expect(page.getByPlaceholder(/type what you heard/i)).toBeVisible();
  await page.getByRole('button', { name: /hide text/i }).click();
  await expect(page.getByText(/transcript hidden/i)).toBeVisible();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm playwright test e2e/p0-learning-loop.spec.ts --grep "listen detail supports hide text and dictation"`
Expected: FAIL because controls do not exist

- [ ] **Step 3: Write minimal implementation**

Add local state:

```tsx
const [listenMode, setListenMode] = useState<'normal' | 'repeat' | 'hide-text' | 'dictation'>('normal');
const [dictationInput, setDictationInput] = useState('');
const [dictationResult, setDictationResult] = useState<ReturnType<typeof scoreDictationAttempt> | null>(null);
const [repeatCount, setRepeatCount] = useState<1 | 3 | 5>(1);
```

Render controls:

```tsx
<div className="flex flex-wrap gap-2">
  {['normal', 'repeat', 'hide-text', 'dictation'].map((mode) => (
    <Button key={mode} variant={listenMode === mode ? 'default' : 'outline'} onClick={() => setListenMode(mode as typeof listenMode)}>
      {mode}
    </Button>
  ))}
</div>
```

Render transcript conditionally:

```tsx
const transcriptHidden = listenMode === 'hide-text';
{transcriptHidden ? (
  <Card><CardContent>Transcript hidden. Listen first, then reveal to self-check.</CardContent></Card>
) : (
  <ReadAloudContent ... />
)}
```

Render dictation panel:

```tsx
{listenMode === 'dictation' && (
  <Card>
    <CardContent className="space-y-3 pt-6">
      <Textarea value={dictationInput} onChange={(e) => setDictationInput(e.target.value)} placeholder="Type what you heard..." />
      <Button onClick={() => setDictationResult(scoreDictationAttempt(content?.text ?? '', dictationInput))}>Check dictation</Button>
      {dictationResult && <p>Accuracy: {dictationResult.accuracy}%</p>}
    </CardContent>
  </Card>
)}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm playwright test e2e/p0-learning-loop.spec.ts --grep "listen detail supports hide text and dictation"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/'(app)'/listen/'[id]'/page.tsx src/lib/i18n/messages e2e/p0-learning-loop.spec.ts
git commit -m "feat: add structured listening modes"
```

## Task 10: Persist weak spots from dictation and complete the retry loop

**Files:**
- Modify: `src/app/(app)/listen/[id]/page.tsx`
- Modify: `src/lib/weak-spots.ts`
- Test: `e2e/p0-learning-loop.spec.ts`

- [ ] **Step 1: Write the failing E2E**

```ts
test('failed dictation creates a weak spot and retry link', async ({ page }) => {
  await page.goto('/listen/idgxTQVbj-Dtspvh5WHNF');
  await page.getByRole('button', { name: /dictation/i }).click();
  await page.getByPlaceholder(/type what you heard/i).fill('wrong answer');
  await page.getByRole('button', { name: /check dictation/i }).click();
  await page.goto('/weak-spots');
  await expect(page.getByText(/dictation sentence/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /retry/i })).toBeVisible();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm playwright test e2e/p0-learning-loop.spec.ts --grep "failed dictation creates a weak spot"`
Expected: FAIL because listen page does not persist weak spots

- [ ] **Step 3: Write minimal implementation**

Inside dictation check handler:

```tsx
const result = scoreDictationAttempt(content?.text ?? '', dictationInput);
setDictationResult(result);
if (!result.passed && content) {
  void upsertWeakSpot({
    module: 'listen',
    weakSpotType: 'dictation-sentence',
    text: content.text,
    reason: `Dictation accuracy ${result.accuracy}%`,
    targetHref: `/listen/${content.id}?mode=dictation`,
    sourceId: content.id,
    sourceType: 'content',
    accuracy: result.accuracy,
  });
}
```

In weak spot list cards, add:

```tsx
<Link href={item.targetHref}>Retry</Link>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm playwright test e2e/p0-learning-loop.spec.ts --grep "failed dictation creates a weak spot"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/'(app)'/listen/'[id]'/page.tsx src/lib/weak-spots.ts src/components/weak-spots e2e/p0-learning-loop.spec.ts
git commit -m "feat: feed dictation failures into weak spots"
```

## Task 11: Verify shared web/macOS behavior

**Files:**
- Verify: `src/lib/tauri.ts`
- Verify: `src/hooks/use-voice-recognition.ts`
- Verify: `src/app/(app)/dashboard/page.tsx`
- Verify: `src/app/(app)/weak-spots/page.tsx`
- Verify: `src/app/(app)/listen/[id]/page.tsx`

- [x] **Step 1: Run targeted shared tests**

Run: `pnpm vitest run src/lib/learning-goals.test.ts src/lib/import-practice-actions.test.ts src/lib/weak-spots.test.ts src/lib/listen-dictation.test.ts`
Expected: PASS

- [x] **Step 2: Run end-to-end plan coverage**

Run: `pnpm playwright test e2e/p0-learning-loop.spec.ts`
Expected: PASS

- [x] **Step 3: Run desktop compatibility smoke checks**

Run: `pnpm tauri build --debug`
Expected: PASS or at minimum successful Rust/desktop asset compile without new TypeScript/runtime errors

- [x] **Step 4: Manual smoke test web**

Run:

```bash
pnpm exec next dev -p 3010
```

Expected:

- dashboard shows goal card
- import success shows practice actions
- weak spots page loads
- listen page supports dictation

- [x] **Step 5: Manual smoke test macOS app**

Run:

```bash
pnpm tauri:dev
```

Expected:

- dashboard goal flow works in Tauri window
- import completion panel renders
- weak spots page is navigable from sidebar
- listen dictation works with Tauri-safe input controls

Verification notes (2026-04-25):

- `pnpm vitest run src/lib/learning-goals.test.ts src/lib/import-practice-actions.test.ts src/lib/weak-spots.test.ts src/lib/listen-dictation.test.ts` -> 4 files passed, 11 tests passed.
- `pnpm playwright test e2e/p0-learning-loop.spec.ts` -> 2 tests passed after starting `next dev` on port `3010`.
- macOS app manual smoke: selected the `Travel` learning goal on the dashboard and confirmed the Today Plan explanation updated inside the Tauri window.
- macOS app manual smoke: opened `Listen to an article`, switched to `Dictation`, entered an incorrect sentence, and verified the app showed `Accuracy 9%` plus the weak-spot retry copy.
- macOS app manual smoke: opened `Weak Spots`, confirmed the new `dictation-sentence` item appeared, and used `Retry` to jump back into `listen/...?...mode=dictation&sentence=0`.
- macOS app manual smoke: imported `Codex App Validation` from the Library import flow and confirmed the import completion panel rendered `Read it first`, `Type key phrases`, `Listen to the text`, and `Review the new material later` actions, with the primary action navigating into the new Read page.
- `pnpm tauri build --debug` now compiles and bundles the desktop app after switching the Tauri build script to `next build --webpack`; the remaining non-code blocker is missing `TAURI_SIGNING_PRIVATE_KEY`, which prevents the updater signing step from exiting cleanly.
- In the real EchoType macOS app window, validated dashboard goal selection and the `Open Weak Spots` CTA, weak spot retry navigation, listen dictation failure feedback, import completion actions, import-to-listen routing, import-to-write routing, and write-page typing input updates (`1/16 words`, timer/WPM started) through Computer Use.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "test: verify p0 learning loop on web and desktop"
```

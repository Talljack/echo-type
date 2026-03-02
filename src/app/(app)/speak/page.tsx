'use client';

import { MessageCircle, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ScenarioGrid } from '@/components/speak/scenario-grid';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { db } from '@/lib/db';
import { useContentStore } from '@/stores/content-store';
import { useSpeakStore } from '@/stores/speak-store';
import { useTTSStore } from '@/stores/tts-store';
import type { ContentItem } from '@/types/content';
import type { Scenario } from '@/types/scenario';

const contentCategoryToScenarioCategory: Record<string, string[]> = {
  food: ['daily'],
  dining: ['daily'],
  shopping: ['daily'],
  health: ['daily'],
  'daily life': ['daily'],
  travel: ['travel'],
  transportation: ['travel'],
  hotel: ['travel'],
  airport: ['travel'],
  business: ['work'],
  office: ['work'],
  meeting: ['work'],
  interview: ['work'],
  social: ['social'],
  party: ['social'],
  friendship: ['social'],
  conversation: ['social', 'daily'],
};

function getRecommendedScenarioIds(activeContent: ContentItem, scenarios: Scenario[]): string[] {
  const matchingCategories = new Set<string>();

  const contentText =
    `${activeContent.title} ${activeContent.text} ${activeContent.category || ''} ${(activeContent.tags || []).join(' ')}`.toLowerCase();

  for (const [keyword, categories] of Object.entries(contentCategoryToScenarioCategory)) {
    if (contentText.includes(keyword)) {
      categories.forEach((c) => matchingCategories.add(c));
    }
  }

  if (matchingCategories.size === 0) {
    matchingCategories.add('daily');
  }

  return scenarios.filter((s) => matchingCategories.has(s.category)).map((s) => s.id);
}

export default function SpeakPage() {
  const scenarios = useSpeakStore((s) => s.scenarios);
  const activeContentId = useContentStore((s) => s.activeContentId);
  const shadowReadingEnabled = useTTSStore((s) => s.shadowReadingEnabled);
  const [activeContent, setActiveContent] = useState<ContentItem | null>(null);

  useEffect(() => {
    useTTSStore.getState().hydrate();
  }, []);

  useEffect(() => {
    if (shadowReadingEnabled && activeContentId) {
      db.contents.get(activeContentId).then((item) => {
        setActiveContent(item || null);
      });
    } else {
      setActiveContent(null);
    }
  }, [shadowReadingEnabled, activeContentId]);

  const recommendedIds = useMemo(() => {
    if (!shadowReadingEnabled || !activeContent) return [];
    return getRecommendedScenarioIds(activeContent, scenarios);
  }, [shadowReadingEnabled, activeContent, scenarios]);

  const getScenarioHref = (scenario: Scenario) => `/speak/${scenario.id}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-[var(--font-poppins)] text-indigo-900">Speak</h1>
          <p className="text-sm text-indigo-500">Practice English through AI voice conversations</p>
        </div>
      </div>

      {shadowReadingEnabled && activeContent && recommendedIds.length > 0 && (
        <Card className="bg-indigo-50/50 border-indigo-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-medium text-indigo-700">Related to your practice</span>
              <Badge className="bg-indigo-100 text-indigo-600 text-xs">{activeContent.title}</Badge>
            </div>
            <p className="text-xs text-indigo-500">
              These scenarios match the topic of the content you&apos;re currently practicing.
            </p>
          </CardContent>
        </Card>
      )}

      <ScenarioGrid scenarios={scenarios} getHref={getScenarioHref} highlightedIds={recommendedIds} />
    </div>
  );
}

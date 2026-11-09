'use client';

import { ChevronDown, ChevronUp, Info, Loader2, RefreshCw, Settings, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { type Recommendation, useRecommendations } from '@/hooks/use-recommendations';
import { useI18n } from '@/lib/i18n/use-i18n';
import { cn } from '@/lib/utils';
import type { ContentItem } from '@/types/content';

interface RecommendationPanelProps {
  content?: ContentItem;
  text?: string;
  contentType?: string;
  onNavigate?: (item: Recommendation) => void;
}

const relationColors: Record<string, string> = {
  synonym: 'bg-success-soft text-success-ink border-success-line',
  antonym: 'bg-danger-soft text-danger-ink border-danger-line',
  'word-root': 'bg-violet-50 text-violet-700 border-violet-200',
  collocation: 'bg-warning-soft text-warning-ink border-warning-line',
  'related topic': 'bg-info-soft text-info-ink border-info-line',
  similar: 'bg-brand-soft text-brand-ink border-brand-line',
};

function getRelationStyle(relation: string): string {
  const key = relation.toLowerCase();
  for (const [k, v] of Object.entries(relationColors)) {
    if (key.includes(k)) return v;
  }
  return 'bg-brand-soft text-brand-ink border-brand-line';
}

const CARD_CLASS =
  'flex flex-col gap-1.5 rounded-xl border border-line bg-surface-2 p-3.5 text-left animate-in fade-in-0 slide-in-from-bottom-2 duration-200 motion-reduce:animate-none';

function RecommendationCard({
  item,
  onNavigate,
}: {
  item: Recommendation;
  onNavigate?: (item: Recommendation) => void;
}) {
  const body = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold text-ink">{item.title}</span>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${getRelationStyle(item.relation)}`}
        >
          {item.relation}
        </span>
      </span>
      <span className="line-clamp-2 text-xs leading-relaxed text-ink-3">{item.text}</span>
    </>
  );

  if (!onNavigate) return <div className={CARD_CLASS}>{body}</div>;

  return (
    <button
      type="button"
      onClick={() => onNavigate(item)}
      className={cn(
        CARD_CLASS,
        'w-full cursor-pointer outline-none transition-[background-color,border-color,box-shadow] hover:border-brand-line hover:bg-surface hover:shadow-sm focus-visible:ring-[3px] focus-visible:ring-ring/35',
      )}
    >
      {body}
    </button>
  );
}

export function RecommendationPanel({ content, text, contentType, onNavigate }: RecommendationPanelProps) {
  // Lives above the per-lesson body so moving to another lesson keeps the panel open or closed as the reader left it.
  const [collapsed, setCollapsed] = useState(true);
  const resolvedText = text ?? content?.text ?? '';
  const resolvedType = contentType ?? content?.type ?? 'sentence';
  // Lessons are identified by id; text-only sources (speaking topics) are short, so their text is their identity.
  const sourceKey = content?.id ? `content:${content.id}` : `text:${resolvedText}`;

  return (
    <RecommendationPanelBody
      // A new source remounts the body: its in-flight request is aborted and stale suggestions disappear.
      key={`${sourceKey}::${resolvedType}`}
      sourceKey={sourceKey}
      text={resolvedText}
      contentType={resolvedType}
      collapsed={collapsed}
      onToggle={() => setCollapsed((value) => !value)}
      onNavigate={onNavigate}
    />
  );
}

function RecommendationPanelBody({
  sourceKey,
  text,
  contentType,
  collapsed,
  onToggle,
  onNavigate,
}: {
  sourceKey: string;
  text: string;
  contentType: string;
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: (item: Recommendation) => void;
}) {
  const { status, recommendations, error, localFallback, fetchRecommendations } = useRecommendations();
  const { messages } = useI18n('practiceFeatures');
  const t = messages.recommendations;
  const bodyId = useId();
  // Opening the panel starts the request in an effect; show the spinner for that first frame too, not "empty".
  const isLoading = status === 'loading' || (status === 'idle' && Boolean(text));

  // Each request costs an AI call, so nothing is fetched until the reader opens the panel (collapsed by default).
  useEffect(() => {
    if (collapsed || !text) return;
    void fetchRecommendations(text, contentType, { cacheKey: sourceKey });
  }, [collapsed, text, contentType, sourceKey, fetchRecommendations]);

  const reload = () => void fetchRecommendations(text, contentType, { cacheKey: sourceKey, force: true });

  return (
    <div className="bg-surface rounded-2xl border border-line shadow-sm p-5 mt-4">
      <div className="flex items-center justify-between mb-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-soft flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-brand-ink" aria-hidden />
          </div>
          <span className="text-sm font-semibold text-ink-2">{t.title}</span>
          {recommendations.length > 0 && (
            <span className="text-xs text-ink-4 bg-surface-3 px-2 py-0.5 rounded-full">{recommendations.length}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isLoading && recommendations.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={reload}
              aria-label={t.refresh}
              className="h-7 w-7 text-ink-4 hover:text-ink-2 hover:bg-surface-3 cursor-pointer rounded-lg"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            aria-label={collapsed ? t.expand : t.collapse}
            aria-expanded={!collapsed}
            aria-controls={collapsed ? undefined : bodyId}
            className="h-7 w-7 text-ink-4 hover:text-ink-2 hover:bg-surface-3 cursor-pointer rounded-lg"
          >
            {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {!collapsed && (
        // Opacity/translate only: no height animation, so opening never forces layout on every frame.
        <div
          id={bodyId}
          className="mt-4 animate-in fade-in-0 slide-in-from-top-1 duration-200 motion-reduce:animate-none"
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-ink-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">{t.generating}</span>
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <p className="text-warning text-sm">{error}</p>
              <div className="flex items-center justify-center gap-3 mt-2">
                {error.toLowerCase().includes('api key') ||
                error.toLowerCase().includes('settings') ||
                error.toLowerCase().includes('401') ? (
                  <Link
                    href="/settings"
                    prefetch={false}
                    className="inline-flex items-center gap-1 text-xs text-brand-ink underline-offset-4 hover:underline font-medium"
                  >
                    <Settings className="w-3 h-3" />
                    {t.goToSettings}
                  </Link>
                ) : (
                  <Button variant="link" size="sm" className="h-auto p-0" onClick={reload}>
                    {t.retry}
                  </Button>
                )}
              </div>
            </div>
          ) : recommendations.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {recommendations.map((item, i) => (
                  <RecommendationCard key={i} item={item} onNavigate={onNavigate} />
                ))}
              </div>
              {localFallback && (
                <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-ink-3">
                  <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  <span>
                    {t.offlineNote}{' '}
                    <Link
                      href="/settings"
                      prefetch={false}
                      className="font-medium text-brand-ink underline-offset-4 hover:underline"
                    >
                      {t.setUpProvider}
                    </Link>
                  </span>
                </p>
              )}
            </>
          ) : (
            <div className="text-center py-6 text-ink-4 text-sm">
              {t.empty}{' '}
              <Button variant="link" size="sm" className="h-auto p-0" onClick={reload}>
                {t.tryAgain}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

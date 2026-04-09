'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Loader2, RefreshCw, Settings, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { type Recommendation, useRecommendations } from '@/hooks/use-recommendations';
import { useI18n } from '@/lib/i18n/use-i18n';
import type { ContentItem } from '@/types/content';

interface RecommendationPanelProps {
  content?: ContentItem;
  text?: string;
  contentType?: string;
  onNavigate?: (item: Recommendation) => void;
}

const relationColors: Record<string, string> = {
  synonym: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  antonym: 'bg-rose-50 text-rose-700 border-rose-200',
  'word-root': 'bg-violet-50 text-violet-700 border-violet-200',
  collocation: 'bg-amber-50 text-amber-700 border-amber-200',
  'related topic': 'bg-sky-50 text-sky-700 border-sky-200',
  similar: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

function getRelationStyle(relation: string): string {
  const key = relation.toLowerCase();
  for (const [k, v] of Object.entries(relationColors)) {
    if (key.includes(k)) return v;
  }
  return 'bg-indigo-50 text-indigo-700 border-indigo-200';
}

function RecommendationCard({
  item,
  onNavigate,
}: {
  item: Recommendation;
  onNavigate?: (item: Recommendation) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-white hover:shadow-sm transition-all duration-200 cursor-pointer"
      onClick={() => onNavigate?.(item)}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-slate-800 text-sm truncate">{item.title}</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${getRelationStyle(item.relation)}`}
        >
          {item.relation}
        </span>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{item.text}</p>
    </motion.div>
  );
}

export function RecommendationPanel({ content, text, contentType, onNavigate }: RecommendationPanelProps) {
  const { recommendations, isLoading, error, fetchRecommendations } = useRecommendations();
  const [collapsed, setCollapsed] = useState(true);
  const { messages } = useI18n('practiceFeatures');
  const t = messages.recommendations;

  const resolvedText = text ?? content?.text ?? '';
  const resolvedType = contentType ?? content?.type ?? 'sentence';

  useEffect(() => {
    if (!resolvedText) return;
    const timer = setTimeout(() => {
      fetchRecommendations(resolvedText, resolvedType);
    }, 1500);
    return () => clearTimeout(timer);
  }, [resolvedText, resolvedType, fetchRecommendations]);

  const handleRefresh = () => {
    fetchRecommendations(`${resolvedText} ${Date.now()}`, resolvedType);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mt-4">
      <div className="flex items-center justify-between mb-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <span className="text-sm font-semibold text-slate-700">{t.title}</span>
          {recommendations.length > 0 && (
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {recommendations.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isLoading && recommendations.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              className="h-7 w-7 text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer rounded-lg"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed((c) => !c)}
            className="h-7 w-7 text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer rounded-lg"
          >
            {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">{t.generating}</span>
                </div>
              ) : error ? (
                <div className="text-center py-6">
                  <p className="text-amber-600 text-sm">{error}</p>
                  <div className="flex items-center justify-center gap-3 mt-2">
                    {error.toLowerCase().includes('api key') ||
                    error.toLowerCase().includes('settings') ||
                    error.toLowerCase().includes('401') ? (
                      <Link
                        href="/settings"
                        className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600 font-medium"
                      >
                        <Settings className="w-3 h-3" />
                        {t.goToSettings}
                      </Link>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-indigo-500 hover:text-indigo-600 h-auto p-0 cursor-pointer"
                        onClick={() => fetchRecommendations(resolvedText, resolvedType)}
                      >
                        {t.retry}
                      </Button>
                    )}
                  </div>
                </div>
              ) : recommendations.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {recommendations.map((item, i) => (
                    <RecommendationCard key={i} item={item} onNavigate={onNavigate} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-sm">
                  {t.empty}{' '}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-indigo-500 hover:text-indigo-600 h-auto p-0 cursor-pointer"
                    onClick={() => fetchRecommendations(resolvedText, resolvedType)}
                  >
                    {t.tryAgain}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

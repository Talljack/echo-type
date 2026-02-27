'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRecommendations, type Recommendation } from '@/hooks/use-recommendations';
import type { ContentItem } from '@/types/content';

interface RecommendationPanelProps {
  content: ContentItem;
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

function RecommendationCard({ item, onNavigate }: { item: Recommendation; onNavigate?: (item: Recommendation) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-white hover:shadow-sm transition-all duration-200 cursor-pointer"
      onClick={() => onNavigate?.(item)}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-slate-800 text-sm truncate">{item.title}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${getRelationStyle(item.relation)}`}>
          {item.relation}
        </span>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{item.text}</p>
    </motion.div>
  );
}

export function RecommendationPanel({ content, onNavigate }: RecommendationPanelProps) {
  const { recommendations, isLoading, error, fetchRecommendations } = useRecommendations();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    fetchRecommendations(content.text, content.type);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.text, content.type]);

  const handleRefresh = () => {
    fetchRecommendations(content.text + ' ' + Date.now(), content.type);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mt-4">
      <div className="flex items-center justify-between mb-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <span className="text-sm font-semibold text-slate-700">Recommendations</span>
          {recommendations.length > 0 && (
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{recommendations.length}</span>
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
                  <span className="text-sm">Generating recommendations...</span>
                </div>
              ) : error ? (
                <div className="text-center py-6 text-amber-600 text-sm">
                  {error}{' '}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-indigo-500 hover:text-indigo-600 h-auto p-0 cursor-pointer"
                    onClick={() => fetchRecommendations(content.text, content.type)}
                  >
                    Retry
                  </Button>
                </div>
              ) : recommendations.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {recommendations.map((item, i) => (
                    <RecommendationCard key={i} item={item} onNavigate={onNavigate} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-sm">
                  No recommendations available.{' '}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-indigo-500 hover:text-indigo-600 h-auto p-0 cursor-pointer"
                    onClick={() => fetchRecommendations(content.text, content.type)}
                  >
                    Try again
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

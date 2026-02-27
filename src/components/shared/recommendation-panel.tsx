'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Sparkles, Loader2, RefreshCw } from 'lucide-react';
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
      className="group flex flex-col gap-1.5 p-3 rounded-xl bg-white/60 border border-indigo-100 hover:border-indigo-200 hover:bg-white/80 transition-all duration-200 cursor-pointer"
      onClick={() => onNavigate?.(item)}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-indigo-900 text-sm truncate">{item.title}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${getRelationStyle(item.relation)}`}>
          {item.relation}
        </span>
      </div>
      <p className="text-xs text-indigo-600 leading-relaxed line-clamp-2">{item.text}</p>
    </motion.div>
  );
}

export function RecommendationPanel({ content, onNavigate }: RecommendationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const { recommendations, isLoading, fetchRecommendations } = useRecommendations();

  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next && !hasFetched) {
      setHasFetched(true);
      fetchRecommendations(content.text, content.type);
    }
  };

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    fetchRecommendations(content.text + ' ' + Date.now(), content.type);
  };

  return (
    <div className="mt-4">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/50 border border-indigo-100 hover:bg-white/70 hover:border-indigo-200 transition-all duration-200 cursor-pointer group"
      >
        <div className="flex items-center gap-2 text-indigo-700">
          <Sparkles className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600 transition-colors" />
          <span className="text-sm font-medium">Recommendations</span>
          {recommendations.length > 0 && (
            <span className="text-xs text-indigo-400">({recommendations.length})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isOpen && !isLoading && recommendations.length > 0 && (
            <span
              onClick={handleRefresh}
              className="p-1 rounded-lg hover:bg-indigo-100 text-indigo-400 hover:text-indigo-600 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </span>
          )}
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-indigo-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-indigo-400" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pt-3 pb-1">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-indigo-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Generating recommendations...</span>
                </div>
              ) : recommendations.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {recommendations.map((item, i) => (
                    <RecommendationCard key={i} item={item} onNavigate={onNavigate} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-indigo-400 text-sm">
                  No recommendations available.{' '}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-indigo-500 h-auto p-0 cursor-pointer"
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

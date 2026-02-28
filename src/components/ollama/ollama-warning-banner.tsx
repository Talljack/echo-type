'use client';
import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const STORAGE_KEY = 'echotype_ollama_warning_dismissed';

interface OllamaWarningBannerProps {
  className?: string;
}

export function OllamaWarningBanner({ className = '' }: OllamaWarningBannerProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Check if user has dismissed the warning before
    const isDismissed = localStorage.getItem(STORAGE_KEY) === 'true';
    setDismissed(isDismissed);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  if (dismissed) return null;

  return (
    <div className={`bg-amber-50 border border-amber-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-amber-900 mb-1">
            Local Model Performance
          </h4>
          <p className="text-sm text-amber-800 leading-relaxed">
            Ollama models respond slower than cloud APIs (5-60s vs 2-5s).
            Best for offline use or privacy-sensitive scenarios.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-amber-600 hover:text-amber-800 transition-colors duration-200 cursor-pointer"
          aria-label="Dismiss warning"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

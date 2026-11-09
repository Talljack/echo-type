'use client';
import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n/use-i18n';

const STORAGE_KEY = 'echotype_ollama_warning_dismissed';

interface OllamaWarningBannerProps {
  className?: string;
}

export function OllamaWarningBanner({ className = '' }: OllamaWarningBannerProps) {
  const [dismissed, setDismissed] = useState(true);
  const { messages: copy } = useI18n('ollamaWarning');

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === 'true');
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  if (dismissed) return null;

  return (
    <div className={`bg-warning-soft border border-warning-line rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-warning-ink mb-1">{copy.title}</h4>
          <p className="text-sm text-warning-ink leading-relaxed">{copy.description}</p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-warning hover:text-warning-ink transition-colors duration-200 cursor-pointer"
          aria-label={copy.dismiss}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

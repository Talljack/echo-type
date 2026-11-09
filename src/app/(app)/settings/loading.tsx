import { Loader2 } from 'lucide-react';

export default function SettingsLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-32 bg-brand-tint rounded-lg" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-surface rounded-xl border border-line shadow-sm" />
        ))}
      </div>
      <div className="flex items-center justify-center pt-4">
        <div className="w-10 h-10 rounded-full bg-brand-soft flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-brand-ink" />
        </div>
      </div>
    </div>
  );
}

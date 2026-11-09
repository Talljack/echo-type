import { Loader2 } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="h-8 w-56 bg-brand-tint rounded-lg" />
          <div className="h-4 w-72 bg-brand-soft rounded mt-2" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 bg-surface rounded-xl border border-line shadow-sm" />
        ))}
      </div>
      <div className="flex items-center justify-center pt-8">
        <div className="w-10 h-10 rounded-full bg-brand-soft flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-brand-ink" />
        </div>
      </div>
    </div>
  );
}

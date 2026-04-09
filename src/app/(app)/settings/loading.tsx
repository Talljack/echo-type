import { Loader2 } from 'lucide-react';

export default function SettingsLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-32 bg-indigo-100 rounded-lg" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-white rounded-xl border border-slate-100 shadow-sm" />
        ))}
      </div>
      <div className="flex items-center justify-center pt-4">
        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
        </div>
      </div>
    </div>
  );
}

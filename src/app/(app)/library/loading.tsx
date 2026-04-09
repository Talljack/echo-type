import { Loader2 } from 'lucide-react';

export default function LibraryLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 bg-indigo-100 rounded-lg" />
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-indigo-50 rounded-lg" />
          <div className="h-9 w-24 bg-indigo-50 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-white rounded-xl border border-slate-100 shadow-sm" />
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

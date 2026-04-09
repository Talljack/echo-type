import { FileQuestion, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AppNotFound() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-4 max-w-md text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center">
          <FileQuestion className="w-7 h-7 text-indigo-500" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-indigo-900">Page Not Found</h2>
          <p className="text-sm text-indigo-500">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline" className="cursor-pointer border-indigo-200 text-indigo-600">
            <Home className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}

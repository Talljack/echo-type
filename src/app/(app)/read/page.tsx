'use client';
import { BookOpen } from 'lucide-react';
import { ContentList } from '@/components/shared/content-list';

export default function ReadPage() {
  return (
    <ContentList
      title="Read"
      description="Read English content aloud and get pronunciation feedback"
      module="read"
      icon={BookOpen}
      iconBg="bg-blue-100 group-hover:bg-blue-200 text-blue-600"
      iconColor="bg-blue-500"
    />
  );
}

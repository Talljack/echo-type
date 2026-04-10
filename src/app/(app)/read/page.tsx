'use client';
import { BookOpen } from 'lucide-react';
import { ContentList } from '@/components/shared/content-list';
import { useI18n } from '@/lib/i18n/use-i18n';

export default function ReadPage() {
  const { messages } = useI18n('modules');
  return (
    <ContentList
      title={messages.read.title}
      description={messages.read.description}
      module="read"
      icon={BookOpen}
      iconBg="bg-blue-100 group-hover:bg-blue-200 text-blue-600"
      iconColor="bg-blue-500"
    />
  );
}

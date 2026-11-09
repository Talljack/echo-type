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
      iconBg="bg-info-soft group-hover:bg-info-line text-info"
      iconColor="bg-info"
    />
  );
}

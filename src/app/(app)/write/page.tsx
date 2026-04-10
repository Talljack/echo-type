'use client';
import { PenTool } from 'lucide-react';
import { ContentList } from '@/components/shared/content-list';
import { useI18n } from '@/lib/i18n/use-i18n';

export default function WritePage() {
  const { messages } = useI18n('modules');
  return (
    <ContentList
      title={messages.write.title}
      description={messages.write.description}
      module="write"
      icon={PenTool}
      iconBg="bg-purple-100 group-hover:bg-purple-200 text-purple-600"
      iconColor="bg-purple-500"
    />
  );
}

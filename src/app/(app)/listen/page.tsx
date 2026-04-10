'use client';
import { Headphones } from 'lucide-react';
import { ContentList } from '@/components/shared/content-list';
import { useI18n } from '@/lib/i18n/use-i18n';

export default function ListenPage() {
  const { messages } = useI18n('modules');
  return (
    <ContentList
      title={messages.listen.title}
      description={messages.listen.description}
      module="listen"
      icon={Headphones}
      iconBg="bg-indigo-100 group-hover:bg-indigo-200 text-indigo-600"
      iconColor="bg-indigo-500"
    />
  );
}

'use client';
import { MessageCircle } from 'lucide-react';
import { ContentList } from '@/components/shared/content-list';

export default function SpeakPage() {
  return (
    <ContentList
      title="Speak"
      description="Practice speaking English with voice recognition"
      module="speak"
      icon={MessageCircle}
      iconBg="bg-teal-100 group-hover:bg-teal-200 text-teal-600"
      iconColor="bg-teal-500"
    />
  );
}

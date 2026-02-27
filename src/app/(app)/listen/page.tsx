import { ContentList } from '@/components/shared/content-list';
import { Headphones } from 'lucide-react';

export default function ListenPage() {
  return (
    <ContentList
      title="Listen"
      description="Listen to English content with text-to-speech"
      module="listen"
      icon={Headphones}
      iconBg="bg-indigo-100 group-hover:bg-indigo-200 text-indigo-600"
      iconColor="bg-indigo-500"
    />
  );
}

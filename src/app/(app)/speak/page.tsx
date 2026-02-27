import { ContentList } from '@/components/shared/content-list';
import { Mic } from 'lucide-react';

export default function SpeakPage() {
  return (
    <ContentList
      title="Speak / Read"
      description="Read English content aloud and get pronunciation feedback"
      module="speak"
      icon={Mic}
      iconBg="bg-green-100 group-hover:bg-green-200 text-green-600"
      iconColor="bg-green-500"
    />
  );
}

import { ContentList } from '@/components/shared/content-list';
import { PenTool } from 'lucide-react';

export default function WritePage() {
  return (
    <ContentList
      title="Write"
      description="Practice typing English with real-time feedback"
      module="write"
      icon={PenTool}
      iconBg="bg-purple-100 group-hover:bg-purple-200 text-purple-600"
      iconColor="bg-purple-500"
    />
  );
}

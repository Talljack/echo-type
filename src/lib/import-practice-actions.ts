import type { ContentItem } from '@/types/content';

export interface GeneratedPracticeAction {
  id: string;
  module: 'listen' | 'speak' | 'read' | 'write' | 'review';
  title: string;
  description: string;
  href: string;
  priority: 'primary' | 'secondary';
  reason: string;
}

export function buildImportPracticeActions(
  item: ContentItem,
  sourceKind: 'document' | 'media',
): GeneratedPracticeAction[] {
  if (sourceKind === 'media') {
    return [
      {
        id: `${item.id}-listen`,
        module: 'listen',
        title: 'Start with listening',
        description: item.title,
        href: `/listen/${item.id}`,
        priority: 'primary',
        reason: 'Imported media is best practiced through listening first.',
      },
      {
        id: `${item.id}-read`,
        module: 'read',
        title: 'Read the transcript',
        description: item.title,
        href: `/read/${item.id}`,
        priority: 'secondary',
        reason: 'Use the transcript to confirm what you heard.',
      },
      {
        id: `${item.id}-speak`,
        module: 'speak',
        title: 'Retell it aloud',
        description: item.title,
        href: `/speak/free`,
        priority: 'secondary',
        reason: 'Retelling turns passive listening into speaking practice.',
      },
      {
        id: `${item.id}-write`,
        module: 'write',
        title: 'Type key lines',
        description: item.title,
        href: `/write/${item.id}`,
        priority: 'secondary',
        reason: 'Typing reinforces the phrases you just heard.',
      },
    ];
  }

  return [
    {
      id: `${item.id}-read`,
      module: 'read',
      title: 'Read it first',
      description: item.title,
      href: `/read/${item.id}`,
      priority: 'primary',
      reason: 'Imported text is easiest to understand through guided reading first.',
    },
    {
      id: `${item.id}-write`,
      module: 'write',
      title: 'Type key phrases',
      description: item.title,
      href: `/write/${item.id}`,
      priority: 'secondary',
      reason: 'Typing helps lock in new phrases from the text.',
    },
    {
      id: `${item.id}-listen`,
      module: 'listen',
      title: 'Listen to the text',
      description: item.title,
      href: `/listen/${item.id}`,
      priority: 'secondary',
      reason: 'Replaying the text builds listening familiarity.',
    },
    {
      id: `${item.id}-review`,
      module: 'review',
      title: 'Review the new material later',
      description: item.title,
      href: '/review/today',
      priority: 'secondary',
      reason: 'Use review to revisit the hardest words and sentences later.',
    },
  ];
}

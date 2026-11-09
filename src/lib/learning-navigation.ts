export type LearningSection =
  | 'today'
  | 'courses'
  | 'materials'
  | 'resources'
  | 'review'
  | 'notes'
  | 'conversation'
  | 'pronunciation'
  | 'settings';

export type LearningNavGroup = 'study' | 'materials' | 'practice';

/** Single source of truth for primary navigation (sidebar, mobile bar, command palette). */
export const PRIMARY_LEARNING_LINKS = [
  { section: 'today', group: 'study', href: '/dashboard', en: 'Today', zh: '今日' },
  { section: 'courses', group: 'study', href: '/learn', en: 'Courses', zh: '课程' },
  { section: 'materials', group: 'materials', href: '/library', en: 'Library', zh: '资料库' },
  { section: 'resources', group: 'materials', href: '/resources', en: 'Discover', zh: '发现资源' },
  { section: 'review', group: 'study', href: '/review', en: 'Review', zh: '复习' },
  { section: 'notes', group: 'study', href: '/favorites', en: 'Notes', zh: '笔记' },
  { section: 'conversation', group: 'practice', href: '/speak', en: 'Conversation', zh: 'AI 对话' },
  { section: 'pronunciation', group: 'practice', href: '/pronunciation', en: 'Pronunciation', zh: '发音' },
] as const satisfies readonly {
  section: LearningSection;
  group: LearningNavGroup;
  href: string;
  en: string;
  zh: string;
}[];

export const LEARNING_NAV_GROUPS: { id: LearningNavGroup; en: string; zh: string }[] = [
  { id: 'study', en: 'Study', zh: '学习' },
  { id: 'materials', en: 'Materials', zh: '素材' },
  { id: 'practice', en: 'Practice', zh: '专项练习' },
];

export function withinRoute(path: string, root: string): boolean {
  return path === root || path.startsWith(`${root}/`);
}

export function learningSection(path: string): LearningSection | null {
  if (['/review', '/favorites/review', '/weak-spots'].some((root) => withinRoute(path, root))) return 'review';
  if (['/favorites', '/journal'].some((root) => withinRoute(path, root))) return 'notes';
  if (['/learn', '/listen', '/read', '/write'].some((root) => withinRoute(path, root))) return 'courses';
  if (withinRoute(path, '/settings')) return 'settings';
  return PRIMARY_LEARNING_LINKS.find((link) => withinRoute(path, link.href))?.section ?? null;
}

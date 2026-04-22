export function getPracticeActions(contentId: string) {
  return [
    { key: 'listen', label: 'Listen', route: `/practice/listen/${contentId}` },
    { key: 'speak', label: 'Speak', route: `/practice/speak/conversation?contentId=${contentId}` },
    { key: 'read', label: 'Read', route: `/practice/read/${contentId}` },
    { key: 'write', label: 'Write', route: `/practice/write/${contentId}` },
  ] as const;
}

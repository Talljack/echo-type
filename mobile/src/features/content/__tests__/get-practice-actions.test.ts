import { getPracticeActions } from '../get-practice-actions';

describe('getPracticeActions', () => {
  it('returns all four practice routes for a valid content id', () => {
    expect(getPracticeActions('demo-1')).toEqual([
      { key: 'listen', label: 'Listen', route: '/practice/listen/demo-1' },
      { key: 'speak', label: 'Speak', route: '/practice/speak/conversation?contentId=demo-1' },
      { key: 'read', label: 'Read', route: '/practice/read/demo-1' },
      { key: 'write', label: 'Write', route: '/practice/write/demo-1' },
    ]);
  });
});

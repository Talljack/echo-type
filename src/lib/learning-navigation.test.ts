import { describe, expect, it } from 'vitest';
import { learningSection, PRIMARY_LEARNING_LINKS } from './learning-navigation';

describe('learning navigation', () => {
  it('exposes five core destinations and two specialist destinations', () => {
    expect(PRIMARY_LEARNING_LINKS.map((link) => link.href)).toEqual([
      '/dashboard', '/learn', '/library', '/review', '/favorites', '/speak', '/pronunciation',
    ]);
  });
  it.each([
    ['/journal', 'notes'], ['/favorites', 'notes'], ['/favorites/review', 'review'],
    ['/review/today', 'review'], ['/weak-spots', 'review'], ['/library/wordbooks/a', 'materials'],
    ['/listen/book/a', 'courses'], ['/read/a', 'courses'], ['/write', 'courses'],
    ['/learn/unit:a', 'courses'], ['/speak/free', 'conversation'], ['/pronunciation', 'pronunciation'],
    ['/dashboard/analytics', 'today'], ['/settings', 'settings'], ['/libraryish', null], ['/reviewer', null],
  ])('classifies %s as %s', (path, expected) => expect(learningSection(path)).toBe(expected));
});

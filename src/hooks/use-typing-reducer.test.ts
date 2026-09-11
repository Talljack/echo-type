import { describe, expect, it } from 'vitest';
import { getInitialState, typingReducer } from './use-typing-reducer';

describe('typing punctuation', () => {
  it.each([
    ['That’s', "That's"],
    ["That's", 'That’s'],
    ['‘Hello’', "'Hello'"],
    ['“Hello”', '"Hello"'],
    ['Wait—really…', 'Wait-really...'],
    ['Wait...really?', 'Wait…really?'],
    ['1–2 −3', '1-2 -3'],
    ['Hello，world！（OK？）', 'Hello,world!(OK?)'],
    ['a: [b] {c} <d> / \\ @#$%^&*_+=|~`;', 'a： ［b］ ｛c｝ ＜d＞ ／ ＼ ＠＃＄％＾＆＊＿＋＝｜～｀；'],
    ['.,!?;:()[]{}<>/\\@#$%^&*_+=|~`-', '.,!?;:()[]{}<>/\\@#$%^&*_+=|~`-'],
  ])('accepts equivalent quotes in %s', (text, input) => {
    let state = typingReducer(getInitialState(), { type: 'INIT', text });
    for (const key of input) state = typingReducer(state, { type: 'KEY_PRESS', key });
    expect(state.mode).toBe('finished');
    expect(state.errorCount).toBe(0);
    expect(state.words.join(' ')).toBe(text);
  });

  it('still rejects a genuinely different character', () => {
    const state = typingReducer(getInitialState(), { type: 'INIT', text: 'a' });
    expect(typingReducer(state, { type: 'KEY_PRESS', key: 'b' }).isShaking).toBe(true);
  });
  it('does not finish an ellipsis after a single dot', () => {
    let state = typingReducer(getInitialState(), { type: 'INIT', text: '…' });
    state = typingReducer(state, { type: 'KEY_PRESS', key: '.' });
    expect(state.mode).toBe('typing');
    expect(state.errorCount).toBe(0);
    for (const key of '..') state = typingReducer(state, { type: 'KEY_PRESS', key });
    expect(state.mode).toBe('finished');
    expect(state.accuracy).toBe(100);
  });
  it('does not accept ellipsis for a single period', () => {
    const state = typingReducer(getInitialState(), { type: 'INIT', text: '.' });
    expect(typingReducer(state, { type: 'KEY_PRESS', key: '…' }).isShaking).toBe(true);
  });
});

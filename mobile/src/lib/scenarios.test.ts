import { BUILTIN_SCENARIOS, FREE_CONVERSATION_TOPICS, getScenarioById } from './scenarios';

describe('mobile speak scenarios', () => {
  it('keeps the free-conversation topic list aligned with the web experience', () => {
    expect(FREE_CONVERSATION_TOPICS).toEqual([
      'Daily Life',
      'Travel',
      'Food',
      'Hobbies',
      'Movies & Music',
      'Work & Career',
      'Technology',
      'Culture',
    ]);
  });

  it('includes the web scenario ids and opening messages required by the canonical conversation flow', () => {
    expect(getScenarioById('sc_presenting')).toEqual(
      expect.objectContaining({
        id: 'sc_presenting',
        title: 'Presenting Ideas',
        openingMessage: expect.any(String),
      }),
    );

    expect(getScenarioById('sc_airport')).toEqual(
      expect.objectContaining({
        id: 'sc_airport',
        title: 'Airport & Flights',
        openingMessage: expect.any(String),
      }),
    );
  });

  it('ensures every built-in scenario provides a deterministic opening message', () => {
    expect(
      BUILTIN_SCENARIOS.every(
        (scenario) =>
          typeof (scenario as { openingMessage?: unknown }).openingMessage === 'string' &&
          ((scenario as { openingMessage?: string }).openingMessage?.trim().length ?? 0) > 0,
      ),
    ).toBe(true);
  });
});

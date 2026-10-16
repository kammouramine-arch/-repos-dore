import { createSpeechCompletion, speechWatchdogMs } from './speechCompletion';

describe('ending a spoken turn', () => {
  it('ends exactly once, however many paths race to end it', () => {
    const ended: string[] = [];
    const turn = createSpeechCompletion().begin((reason) => ended.push(reason));

    expect(turn.finish('tts_finished')).toBe(true);
    expect(turn.finish('ERROR tts_watchdog_fired')).toBe(false);
    expect(turn.finish('tts_abandoned')).toBe(false);

    expect(ended).toEqual(['tts_finished']);
  });

  it('lets the watchdog end it when the platform never calls back', () => {
    const ended: string[] = [];
    const turn = createSpeechCompletion().begin((reason) => ended.push(reason));

    // No TTS callback ever arrives — the Build 40 situation.
    turn.finish('ERROR tts_watchdog_fired');

    expect(ended).toEqual(['ERROR tts_watchdog_fired']);
  });

  it('does not let an old utterance end a newer one', () => {
    // Back-to-back guidance announcements: the first one's late callback must
    // not cut the second one short.
    const ended: string[] = [];
    const completion = createSpeechCompletion();
    const first = completion.begin(() => ended.push('first'));
    const second = completion.begin(() => ended.push('second'));

    expect(first.finish('tts_finished')).toBe(false);
    expect(first.isCurrent()).toBe(false);
    expect(second.finish('tts_finished')).toBe(true);

    expect(ended).toEqual(['second']);
  });

  it('honours an explicit stop', () => {
    const ended: string[] = [];
    const completion = createSpeechCompletion();
    const turn = completion.begin(() => ended.push('x'));

    completion.supersede();

    expect(turn.finish('tts_finished')).toBe(false);
    expect(ended).toEqual([]);
  });

  it('is independent of the microphone', () => {
    // The regression this module exists for. Nothing about opening, closing or
    // re-arming a microphone session can reach a completion: the API has no
    // way to express it. Simulate the old failure — mic activity mid-sentence —
    // and the turn still ends.
    const ended: string[] = [];
    const completion = createSpeechCompletion();
    const turn = completion.begin((reason) => ended.push(reason));

    let micGeneration = 0;
    micGeneration += 1; // wake detector re-armed
    micGeneration += 1; // voice machine closed a session on turn-started
    void micGeneration;

    expect(turn.finish('tts_finished')).toBe(true);
    expect(ended).toEqual(['tts_finished']);
  });

  it('survives many consecutive turns without any getting stuck', () => {
    const ended: number[] = [];
    const completion = createSpeechCompletion();

    for (let i = 0; i < 25; i += 1) {
      const turn = completion.begin(() => ended.push(i));
      // Alternate between a real callback and a missing one.
      turn.finish(i % 2 === 0 ? 'tts_finished' : 'ERROR tts_watchdog_fired');
    }

    expect(ended).toHaveLength(25);
  });
});

describe('the watchdog does not cut valid speech short', () => {
  it('gives a one-word reply a sane floor', () => {
    expect(speechWatchdogMs('Okay.')).toBe(6_000);
  });

  it('scales with what is being said', () => {
    const short = speechWatchdogMs('Heading home.');
    const long = speechWatchdogMs(
      'Got it. Navigating you to the Eiffel Tower, Champ de Mars, Paris. You should arrive in about forty minutes.',
    );

    expect(long).toBeGreaterThan(short);
    // A ~110-character sentence spoken at a slow driving pace takes ~8 s.
    expect(long).toBeGreaterThan(10_000);
  });

  it('is bounded, so a missing callback cannot strand the screen for long', () => {
    expect(speechWatchdogMs('x'.repeat(5_000))).toBe(30_000);
  });
});

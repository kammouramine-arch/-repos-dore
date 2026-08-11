import { CONVERSATION } from '@/config';
import { parseCommand } from './commandParser';
import {
  initialWakeTrackerState,
  wakeTrackerReducer,
  type WakeDecision,
  type WakeTrackerEvent,
  type WakeTrackerState,
} from './wakeTracker';

/**
 * These replay what iOS actually delivers: a transcript that grows word by
 * word, with a final result only once the recogniser decides the speaker has
 * stopped. Every test in the suite before this one fed complete sentences,
 * which is exactly why the bug reached a device three builds running.
 */

/** Feeds a stream and returns every decision it produced. */
const replay = (events: WakeTrackerEvent[]) => {
  let state: WakeTrackerState = initialWakeTrackerState;
  const decisions: WakeDecision[] = [];

  for (const event of events) {
    const result = wakeTrackerReducer(state, event);
    state = result.state;
    if (result.decision.type !== 'wait') decisions.push(result.decision);
  }

  return { state, decisions };
};

/** An interim result at time `at`. */
const partial = (text: string, at: number): WakeTrackerEvent => ({
  type: 'transcript',
  text,
  isFinal: false,
  at,
});

const final = (text: string, at: number): WakeTrackerEvent => ({
  type: 'transcript',
  text,
  isFinal: true,
  at,
});

const tick = (at: number): WakeTrackerEvent => ({ type: 'tick', at });

const commands = (decisions: WakeDecision[]) =>
  decisions.filter((d): d is Extract<WakeDecision, { type: 'command' }> => d.type === 'command');

describe('"Hey Avyro take me to Lille", as iOS actually delivers it', () => {
  const stream: WakeTrackerEvent[] = [
    partial('Hey', 100),
    partial('Hey Avyro', 300),
    partial('Hey Avyro take', 600),
    partial('Hey Avyro take me', 800),
    partial('Hey Avyro take me to Lille', 1_100),
    final('Hey Avyro take me to Lille', 1_400),
  ];

  it('never hands a half-finished sentence to the parser', () => {
    // The whole defect: "take", "take me" and "take me to" all reached
    // parseCommand and all returned unknown.
    const { decisions } = replay(stream);
    const spoken = commands(decisions).map((d) => d.transcript);

    expect(spoken).toEqual(['take me to lille']);
  });

  it('produces a command that parses as a destination', () => {
    const { decisions } = replay(stream);
    const [command] = commands(decisions);

    expect(parseCommand(command.transcript)).toEqual({
      kind: 'navigate-to-place',
      query: 'lille',
    });
  });

  it('never yields a command that parses as unknown', () => {
    const { decisions } = replay(stream);

    for (const command of commands(decisions)) {
      expect(parseCommand(command.transcript).kind).not.toBe('unknown');
    }
  });

  it('arms on the interim, so the driver can be shown it was heard', () => {
    // Detecting early is fine and useful. Acting early is what broke it.
    const { decisions } = replay(stream.slice(0, 2));

    expect(decisions).toEqual([{ type: 'armed' }]);
    expect(commands(decisions)).toHaveLength(0);
  });

  it('does not tear down the wake session while the driver is still talking', () => {
    const { decisions } = replay(stream.slice(0, 5));

    expect(decisions.some((d) => d.type === 'listen')).toBe(false);
    expect(commands(decisions)).toHaveLength(0);
  });
});

describe('the wake phrase alone, then a pause', () => {
  it('hands off to a command session once the words stop changing', () => {
    const { decisions } = replay([
      partial('Hey', 0),
      partial('Hey Avyro', 200),
      tick(200 + CONVERSATION.wakeSettleMs),
    ]);

    expect(decisions).toEqual([{ type: 'armed' }, { type: 'listen' }]);
  });

  it('does not hand off before the settle window has passed', () => {
    const { decisions } = replay([
      partial('Hey Avyro', 200),
      tick(200 + CONVERSATION.wakeSettleMs - 50),
    ]);

    expect(decisions.some((d) => d.type === 'listen')).toBe(false);
  });

  it('hands off immediately when the recogniser commits a bare wake phrase', () => {
    const { decisions } = replay([partial('Hey Avyro', 0), final('Hey Avyro', 400)]);

    expect(decisions).toContainEqual({ type: 'listen' });
    expect(commands(decisions)).toHaveLength(0);
  });

  it('reads a command that arrives after a pause, once it settles', () => {
    // The driver hesitates: "Hey Avyro… take me to Lille."
    const { decisions } = replay([
      partial('Hey Avyro', 0),
      partial('Hey Avyro take me to Lille', 2_000),
      tick(2_000 + CONVERSATION.wakeSettleMs),
    ]);

    expect(commands(decisions).map((d) => d.transcript)).toEqual(['take me to lille']);
  });
});

describe('an interim that is later corrected', () => {
  it('waits for the completed sentence rather than the truncated one', () => {
    // "take me to" followed by "take me to Lille" is the exact sequence that
    // produced a geocode for nothing.
    const { decisions } = replay([
      partial('Hey Avyro take me to', 500),
      partial('Hey Avyro take me to Lille', 900),
      final('Hey Avyro take me to Lille', 1_200),
    ]);

    expect(commands(decisions).map((d) => d.transcript)).toEqual(['take me to lille']);
  });

  it('never geocodes a truncated fragment', () => {
    const { decisions } = replay([
      partial('Hey Avyro take me to', 500),
      partial('Hey Avyro take me to Lille', 900),
      final('Hey Avyro take me to Lille', 1_200),
    ]);

    const queries = commands(decisions)
      .map((d) => parseCommand(d.transcript))
      .filter((i) => i.kind === 'navigate-to-place')
      .map((i) => (i as { query: string }).query);

    expect(queries).toEqual(['lille']);
    expect(queries).not.toContain('');
  });
});

describe('speech that never woke Avyro', () => {
  it('is not a command, however complete it looks', () => {
    // A passenger saying "take me to Lille" mid-conversation has not addressed
    // Avyro, and the microphone is not a licence to act on the room.
    const { decisions } = replay([
      partial('Take', 0),
      partial('Take me', 200),
      partial('Take me to', 400),
      partial('Take me to Lille', 700),
      final('Take me to Lille', 1_000),
    ]);

    expect(decisions).toEqual([]);
  });
});

describe('once a decision is out', () => {
  it('ignores the rest of the wake stream, which belongs to the turn', () => {
    const { decisions } = replay([
      final('Hey Avyro take me to Lille', 0),
      partial('Hey Avyro take me to Lille and then', 400),
      final('Hey Avyro take me to Lille and then Paris', 800),
    ]);

    expect(commands(decisions).map((d) => d.transcript)).toEqual(['take me to lille']);
  });
});

describe('every command still reaches the parser intact', () => {
  it.each([
    ['Hey Avyro what is my ETA', 'ask-eta'],
    ['Hey Avyro find me a gas station', 'find-nearby'],
    ['Hey Avyro take me home', 'navigate-saved'],
    ['Hey Avyro cancel navigation', 'cancel-navigation'],
    ['Hey Avyro how far is it', 'ask-remaining-distance'],
    ['Hey Avyro take me to Lille', 'navigate-to-place'],
  ])('%s', (utterance, kind) => {
    const { decisions } = replay([partial(utterance, 0), final(utterance, 500)]);
    const [command] = commands(decisions);

    expect(command).toBeDefined();
    expect(parseCommand(command.transcript).kind).toBe(kind);
  });
});

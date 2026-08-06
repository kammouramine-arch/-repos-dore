import type { ConversationReply } from '@/core/domain/entities/conversation';
import {
  conversationReducer,
  initialConversationState,
  type ConversationEffect,
  type ConversationEvent,
  type ConversationState,
} from './conversationMachine';

const REPLY: ConversationReply = {
  speech: 'Heading home.',
  action: { type: 'none' },
  intent: { kind: 'navigate-saved', slot: 'home' },
  referent: null,
};

/** Drives the machine through a script and returns where it ended up. */
const run = (
  events: ConversationEvent[],
  from: ConversationState = initialConversationState,
) =>
  events.reduce(
    (carried, event) => {
      const { state, effects } = conversationReducer(carried.state, event);
      return { state, effects };
    },
    { state: from, effects: [] as ConversationEffect[] },
  );

const types = (effects: ConversationEffect[]) => effects.map((effect) => effect.type);

describe('a complete turn', () => {
  it('walks idle → listening → thinking → speaking → idle', () => {
    const wake = conversationReducer(initialConversationState, { type: 'wake-detected' });
    expect(wake.state.status).toBe('listening');
    expect(types(wake.effects)).toEqual(['start-listening']);

    const partial = conversationReducer(wake.state, {
      type: 'transcript',
      text: 'take me',
      isFinal: false,
    });
    expect(partial.state.status).toBe('listening');
    expect(partial.state.transcript).toBe('take me');
    expect(partial.effects).toEqual([]);

    const final = conversationReducer(partial.state, {
      type: 'transcript',
      text: 'take me home',
      isFinal: true,
    });
    expect(final.state.status).toBe('thinking');
    expect(types(final.effects)).toEqual(['stop-listening', 'ask-provider']);

    const replied = conversationReducer(final.state, { type: 'reply', reply: REPLY });
    expect(replied.state.status).toBe('speaking');
    // The action runs alongside the answer, not after it.
    expect(types(replied.effects)).toEqual(['run-action', 'speak']);

    const done = conversationReducer(replied.state, { type: 'speech-finished' });
    expect(done.state.status).toBe('idle');
    expect(done.state.reply).toBeNull();
  });

  it('skips listening when the command came with the wake phrase', () => {
    const { state, effects } = conversationReducer(initialConversationState, {
      type: 'wake-detected',
      command: 'cancel navigation',
    });

    expect(state.status).toBe('thinking');
    expect(state.transcript).toBe('cancel navigation');
    expect(effects).toEqual([{ type: 'ask-provider', transcript: 'cancel navigation' }]);
  });

  it('speaks a failure rather than going quiet', () => {
    const thinking = run([{ type: 'wake-detected' }, { type: 'transcript', text: 'x', isFinal: true }]);
    const failed = conversationReducer(thinking.state, {
      type: 'reply-failed',
      reason: 'Sorry, something went wrong.',
    });

    expect(failed.state.status).toBe('speaking');
    expect(types(failed.effects)).toEqual(['speak']);
  });
});

describe('navigation always interrupts', () => {
  const announce: ConversationEvent = {
    type: 'navigation-announcement',
    text: 'In 200 metres, turn right.',
  };

  it('interrupts while listening, and listens again afterwards', () => {
    const listening = conversationReducer(initialConversationState, {
      type: 'wake-detected',
    }).state;

    const interrupted = conversationReducer(listening, announce);
    expect(interrupted.state.status).toBe('navigation-interrupt');
    expect(interrupted.state.resumeTo).toBe('listening');
    // The microphone is released before the maneuver is spoken.
    expect(types(interrupted.effects)).toEqual(['stop-listening', 'speak']);

    const resuming = conversationReducer(interrupted.state, { type: 'speech-finished' });
    expect(resuming.state.status).toBe('resuming');
    expect(types(resuming.effects)).toEqual(['start-listening']);

    const resumed = conversationReducer(resuming.state, { type: 'resumed' });
    expect(resumed.state.status).toBe('listening');
    expect(resumed.state.resumeTo).toBeNull();
  });

  it('interrupts while thinking, and keeps the request in flight', () => {
    const thinking = run([
      { type: 'wake-detected' },
      { type: 'transcript', text: 'how far', isFinal: true },
    ]).state;

    const interrupted = conversationReducer(thinking, announce);
    expect(interrupted.state.resumeTo).toBe('thinking');

    const resuming = conversationReducer(interrupted.state, { type: 'speech-finished' });
    // Nothing to restart: the provider was never cancelled.
    expect(resuming.effects).toEqual([]);

    expect(conversationReducer(resuming.state, { type: 'resumed' }).state.status).toBe(
      'thinking',
    );
  });

  it('cuts off mid-sentence and says the whole answer again', () => {
    const speaking = run([
      { type: 'wake-detected' },
      { type: 'transcript', text: 'take me home', isFinal: true },
      { type: 'reply', reply: REPLY },
    ]).state;

    const interrupted = conversationReducer(speaking, announce);
    expect(interrupted.state.resumeTo).toBe('speaking');
    // Silence the reply first, or the platform queues the maneuver behind it.
    expect(interrupted.effects).toEqual([
      { type: 'stop-speaking' },
      { type: 'speak', text: announce.text },
    ]);

    const resuming = conversationReducer(interrupted.state, { type: 'speech-finished' });
    // Half a heard sentence is not an answer, so it starts over.
    expect(resuming.effects).toEqual([{ type: 'speak', text: REPLY.speech }]);
  });

  it('speaks a maneuver from idle without inventing a conversation to resume', () => {
    const interrupted = conversationReducer(initialConversationState, announce);
    expect(interrupted.state.status).toBe('navigation-interrupt');
    expect(interrupted.state.resumeTo).toBeNull();
    expect(types(interrupted.effects)).toEqual(['speak']);

    const after = conversationReducer(interrupted.state, { type: 'speech-finished' });
    expect(after.state.status).toBe('idle');
  });

  it('lets a second maneuver pre-empt the first without losing the turn', () => {
    const speaking = run([
      { type: 'wake-detected' },
      { type: 'transcript', text: 'take me home', isFinal: true },
      { type: 'reply', reply: REPLY },
    ]).state;

    const first = conversationReducer(speaking, announce);
    const second = conversationReducer(first.state, {
      type: 'navigation-announcement',
      text: 'Then turn left.',
    });

    expect(second.state.status).toBe('navigation-interrupt');
    // The conversation it suspended is still remembered.
    expect(second.state.resumeTo).toBe('speaking');
    expect(second.effects).toEqual([
      { type: 'stop-speaking' },
      { type: 'speak', text: 'Then turn left.' },
    ]);
  });

  it('ends the turn if the resumed answer finishes before the resume lands', () => {
    const speaking = run([
      { type: 'wake-detected' },
      { type: 'transcript', text: 'take me home', isFinal: true },
      { type: 'reply', reply: REPLY },
    ]).state;

    const resuming = run([announce, { type: 'speech-finished' }], speaking).state;
    expect(resuming.status).toBe('resuming');

    const finished = conversationReducer(resuming, { type: 'speech-finished' });
    expect(finished.state.status).toBe('idle');
  });
});

describe('cancelling', () => {
  it('cancels from listening and releases the microphone', () => {
    const listening = conversationReducer(initialConversationState, {
      type: 'wake-detected',
    }).state;

    const { state, effects } = conversationReducer(listening, { type: 'cancel' });
    expect(state.status).toBe('cancelled');
    expect(types(effects)).toEqual(['stop-listening', 'schedule-dismiss']);
  });

  it('cancels from speaking and stops the speaker', () => {
    const speaking = run([
      { type: 'wake-detected' },
      { type: 'transcript', text: 'take me home', isFinal: true },
      { type: 'reply', reply: REPLY },
    ]).state;

    const { effects } = conversationReducer(speaking, { type: 'cancel' });
    expect(types(effects)).toEqual(['stop-speaking', 'schedule-dismiss']);
  });

  it('cancels when the driver says nothing at all', () => {
    const listening = conversationReducer(initialConversationState, {
      type: 'wake-detected',
    }).state;

    const { state } = conversationReducer(listening, { type: 'listen-timeout' });
    expect(state.status).toBe('cancelled');
  });

  it('cancels when the recogniser fails, and remembers why', () => {
    const listening = conversationReducer(initialConversationState, {
      type: 'wake-detected',
    }).state;

    const { state } = conversationReducer(listening, {
      type: 'recognition-failed',
      reason: 'no-speech',
    });
    expect(state.status).toBe('cancelled');
    expect(state.error).toBe('no-speech');
  });

  it('returns to idle when dismissed', () => {
    const cancelled = conversationReducer(initialConversationState, {
      type: 'cancel',
    }).state;

    expect(conversationReducer(cancelled, { type: 'dismiss' }).state).toEqual(
      initialConversationState,
    );
  });

  it('still speaks a maneuver after the conversation was cancelled', () => {
    const cancelled = conversationReducer(initialConversationState, {
      type: 'cancel',
    }).state;

    const { state, effects } = conversationReducer(cancelled, {
      type: 'navigation-announcement',
      text: 'Turn right.',
    });
    expect(state.status).toBe('navigation-interrupt');
    expect(state.resumeTo).toBeNull();
    expect(types(effects)).toEqual(['speak']);
  });

  it('starts a fresh turn if the driver wakes it again', () => {
    const cancelled = conversationReducer(initialConversationState, {
      type: 'cancel',
    }).state;

    expect(conversationReducer(cancelled, { type: 'wake-detected' }).state.status).toBe(
      'listening',
    );
  });
});

describe('events that do not apply', () => {
  it.each([
    ['idle', initialConversationState, { type: 'speech-finished' } as ConversationEvent],
    [
      'idle',
      initialConversationState,
      { type: 'transcript', text: 'hello', isFinal: true } as ConversationEvent,
    ],
    [
      'listening',
      conversationReducer(initialConversationState, { type: 'wake-detected' }).state,
      { type: 'reply', reply: REPLY } as ConversationEvent,
    ],
  ])('are ignored in %s rather than corrupting the state', (_name, state, event) => {
    const result = conversationReducer(state, event);
    expect(result.state).toEqual(state);
    expect(result.effects).toEqual([]);
  });
});

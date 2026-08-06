import type {
  ConversationReply,
  ConversationStatus,
  ResumableActivity,
} from '@/core/domain/entities/conversation';

/**
 * The conversation state machine.
 *
 * A pure reducer: `(state, event) -> { state, effects }`. Nothing here starts a
 * microphone or speaks a word — it decides *what should happen*, and the
 * controller carries it out. That separation is what makes the interaction
 * model testable, and the interaction model is the product.
 *
 * The rule that shapes everything: **navigation always wins**. A maneuver
 * announcement interrupts whatever Avyro was doing, from any state, and the
 * conversation resumes afterwards from where it was cut off.
 */

export interface ConversationState {
  status: ConversationStatus;
  /** What the driver has said so far in this turn. */
  transcript: string;
  /** The last reply, kept so an interrupted one can be spoken again in full. */
  reply: ConversationReply | null;
  /** The activity a navigation interrupt suspended, and will restore. */
  resumeTo: ResumableActivity | null;
  /** What is currently being said, for the UI and for logs. */
  speaking: string | null;
  error: string | null;
}

export const initialConversationState: ConversationState = {
  status: 'idle',
  transcript: '',
  reply: null,
  resumeTo: null,
  speaking: null,
  error: null,
};

export type ConversationEvent =
  /** The wake phrase was heard. `command` carries anything said after it. */
  | { type: 'wake-detected'; command?: string }
  | { type: 'transcript'; text: string; isFinal: boolean }
  | { type: 'listen-timeout' }
  | { type: 'recognition-failed'; reason: string }
  | { type: 'reply'; reply: ConversationReply }
  | { type: 'reply-failed'; reason: string }
  /** The current utterance finished, was cut off, or failed. */
  | { type: 'speech-finished' }
  /** Guidance has something to say. It takes precedence over everything. */
  | { type: 'navigation-announcement'; text: string }
  /** The controller has restored the suspended activity. */
  | { type: 'resumed' }
  | { type: 'cancel' }
  | { type: 'dismiss' };

export type ConversationEffect =
  | { type: 'start-listening' }
  | { type: 'stop-listening' }
  | { type: 'ask-provider'; transcript: string }
  | { type: 'speak'; text: string }
  | { type: 'stop-speaking' }
  | { type: 'run-action'; reply: ConversationReply }
  /** Return to idle after the cancelled state has been seen. */
  | { type: 'schedule-dismiss' };

export interface Transition {
  state: ConversationState;
  effects: ConversationEffect[];
}

const stay = (state: ConversationState): Transition => ({ state, effects: [] });

const speakingEffects = (
  status: ConversationStatus,
  text: string,
): ConversationEffect[] =>
  // An interrupt has to silence the current utterance before starting its own,
  // otherwise the platform queues them and the maneuver arrives after the turn.
  status === 'speaking' || status === 'navigation-interrupt'
    ? [{ type: 'stop-speaking' }, { type: 'speak', text }]
    : [{ type: 'speak', text }];

/** Suspends the current activity for a maneuver announcement. */
const interrupt = (
  state: ConversationState,
  text: string,
): Transition => {
  const resumable: ResumableActivity | null =
    state.status === 'listening' ||
    state.status === 'thinking' ||
    state.status === 'speaking'
      ? state.status
      : state.resumeTo;

  const effects = speakingEffects(state.status, text);

  return {
    state: {
      ...state,
      status: 'navigation-interrupt',
      resumeTo: resumable,
      speaking: text,
    },
    effects:
      state.status === 'listening'
        ? [{ type: 'stop-listening' }, ...effects]
        : effects,
  };
};

/** Restores whatever the interrupt suspended. */
const resume = (state: ConversationState): Transition => {
  if (!state.resumeTo) {
    return { state: { ...initialConversationState }, effects: [] };
  }

  const effects: ConversationEffect[] =
    state.resumeTo === 'listening'
      ? [{ type: 'start-listening' }]
      : state.resumeTo === 'speaking' && state.reply
        ? // Re-speak from the beginning: half a sentence heard before a
          // maneuver is not an answer, and we cannot know where it was cut.
          [{ type: 'speak', text: state.reply.speech }]
        : [];

  return { state: { ...state, status: 'resuming', speaking: null }, effects };
};

const cancelled = (
  state: ConversationState,
  effects: ConversationEffect[] = [],
): Transition => ({
  state: {
    ...initialConversationState,
    status: 'cancelled',
    reply: state.reply,
    // Why the turn ended is worth keeping: it is the difference between "the
    // driver said nothing" and "the microphone failed".
    error: state.error,
  },
  effects: [...effects, { type: 'schedule-dismiss' }],
});

export const conversationReducer = (
  state: ConversationState,
  event: ConversationEvent,
): Transition => {
  // Guidance pre-empts every state, so it is handled before any of them.
  if (event.type === 'navigation-announcement') {
    return interrupt(state, event.text);
  }

  if (event.type === 'cancel') {
    const effects: ConversationEffect[] = [];
    if (state.status === 'listening') effects.push({ type: 'stop-listening' });
    if (state.status === 'speaking') effects.push({ type: 'stop-speaking' });
    return cancelled(state, effects);
  }

  switch (state.status) {
    case 'idle':
    case 'cancelled':
      if (event.type === 'wake-detected') {
        // A command spoken in the same breath skips the listening step.
        return event.command
          ? {
              state: {
                ...initialConversationState,
                status: 'thinking',
                transcript: event.command,
              },
              effects: [{ type: 'ask-provider', transcript: event.command }],
            }
          : {
              state: { ...initialConversationState, status: 'listening' },
              effects: [{ type: 'start-listening' }],
            };
      }
      if (event.type === 'dismiss' && state.status === 'cancelled') {
        return { state: { ...initialConversationState }, effects: [] };
      }
      return stay(state);

    case 'listening':
      if (event.type === 'transcript') {
        if (!event.isFinal) {
          return stay({ ...state, transcript: event.text });
        }
        return {
          state: { ...state, status: 'thinking', transcript: event.text },
          effects: [
            { type: 'stop-listening' },
            { type: 'ask-provider', transcript: event.text },
          ],
        };
      }
      if (event.type === 'listen-timeout') {
        return cancelled(state, [{ type: 'stop-listening' }]);
      }
      if (event.type === 'recognition-failed') {
        return cancelled({ ...state, error: event.reason }, [
          { type: 'stop-listening' },
        ]);
      }
      return stay(state);

    case 'thinking':
      if (event.type === 'reply') {
        return {
          state: { ...state, status: 'speaking', reply: event.reply, speaking: event.reply.speech },
          effects: [
            // The action runs as the reply is spoken, not after it: a driver
            // who asked to go home should see the route while they hear it.
            { type: 'run-action', reply: event.reply },
            { type: 'speak', text: event.reply.speech },
          ],
        };
      }
      if (event.type === 'reply-failed') {
        return {
          state: { ...state, status: 'speaking', error: event.reason, speaking: event.reason },
          effects: [{ type: 'speak', text: event.reason }],
        };
      }
      return stay(state);

    case 'speaking':
      if (event.type === 'speech-finished') {
        return { state: { ...initialConversationState }, effects: [] };
      }
      return stay(state);

    case 'navigation-interrupt':
      if (event.type === 'speech-finished') {
        return resume(state);
      }
      return stay(state);

    case 'resuming':
      if (event.type === 'resumed') {
        const restored = state.resumeTo ?? 'listening';
        return {
          state: {
            ...state,
            status: restored,
            resumeTo: null,
            speaking: restored === 'speaking' ? (state.reply?.speech ?? null) : null,
          },
          effects: [],
        };
      }
      if (event.type === 'speech-finished') {
        // The re-spoken reply can finish before the controller acknowledges the
        // resume. That is the end of the turn, not a state to linger in.
        return state.resumeTo === 'speaking'
          ? { state: { ...initialConversationState }, effects: [] }
          : stay(state);
      }
      return stay(state);

    default:
      return stay(state);
  }
};

import { CONVERSATION } from '@/config';
import { displayWakePhrase } from './wakePhrase';

/**
 * The microphone's lifecycle.
 *
 * A pure reducer, in the same shape as `conversationMachine`:
 * `(state, event) -> { state, effects }`. Nothing here opens a microphone or
 * asks for a permission — it decides *what should happen*, and the controller
 * carries it out.
 *
 * This exists because the previous version of this logic lived inline in a
 * React effect, and the two defects that shipped to TestFlight were both
 * invisible there: the permission was never requested, and a session that
 * ended was never reopened. Neither is expressible as a bug once the lifecycle
 * is a value you can assert on.
 *
 * The rules it enforces:
 *
 * 1. **Ask before listening.** Availability, then permission, then the
 *    microphone. Never the microphone first.
 * 2. **Exactly one session.** Two recognition sessions fight for one device;
 *    every path to opening one goes through {@link openSession}, which refuses
 *    when a session is open or on its way.
 * 3. **A turn owns the microphone.** While the driver is being listened to or
 *    spoken to, the wake listener is closed — that is what stops Avyro from
 *    hearing itself.
 * 4. **Ending is normal; failing may not be.** A recogniser that stops is
 *    reopened after a pause. A recogniser that cannot work is not retried, and
 *    the driver is told why.
 */

export type VoiceSessionStatus =
  /** Voice commands are switched off. */
  | 'off'
  /** Checking what the device can do and asking the driver. */
  | 'preparing'
  /** The wake listener is open, or about to be. */
  | 'listening'
  /** A conversation turn owns the microphone. */
  | 'suspended'
  /** The driver refused, and the platform will ask again. */
  | 'denied'
  /** The driver refused for good — only the system Settings app can undo it. */
  | 'blocked'
  /** This device cannot recognise speech, or not in this language. */
  | 'unsupported'
  /** Repeated unexpected failures. Avyro keeps retrying, quietly. */
  | 'failed';

export interface VoiceSessionState {
  status: VoiceSessionStatus;
  /** A start is in flight. Half of the one-session guard. */
  opening: boolean;
  /** A session is open. The other half. */
  open: boolean;
  /** Consecutive failed starts, driving the backoff. */
  failures: number;
  /** What to tell the driver, or null when there is nothing wrong. */
  message: string | null;
  /** Whether the on-device model is in use. Decided once, during preparation. */
  onDevice: boolean;
  /** True while a conversation turn owns the microphone. */
  turnActive: boolean;
}

export const initialVoiceSessionState: VoiceSessionState = {
  status: 'off',
  opening: false,
  open: false,
  failures: 0,
  message: null,
  onDevice: false,
  turnActive: false,
};

export type VoiceSessionEvent =
  | { type: 'enabled' }
  | { type: 'disabled' }
  | { type: 'availability'; available: boolean; onDevice: boolean }
  | { type: 'permission'; granted: boolean; canAskAgain: boolean }
  /** A session is open and listening. */
  | { type: 'opened' }
  /** A session stopped on its own. */
  | { type: 'ended' }
  | { type: 'failed'; error: { code: string; message: string; fatal: boolean } }
  /** The conversation left idle: the engine wants the microphone. */
  | { type: 'turn-started' }
  /** The conversation returned to idle. */
  | { type: 'turn-ended' }
  /** A scheduled reopen came due. */
  | { type: 'retry' };

export type VoiceSessionEffect =
  | { type: 'check-availability' }
  | { type: 'request-permission'; networkRecognition: boolean }
  | { type: 'open-session'; onDevice: boolean }
  | { type: 'close-session' }
  | { type: 'schedule-retry'; delayMs: number };

export interface VoiceSessionTransition {
  state: VoiceSessionState;
  effects: VoiceSessionEffect[];
}

/** What the driver is told. Short, and always with a way out. */
export const VOICE_MESSAGES = {
  denied: `Avyro needs the microphone to hear “${displayWakePhrase()}”. Allow access to use voice commands.`,
  blocked: `Avyro cannot hear “${displayWakePhrase()}” without microphone access. Turn it on in Settings › Avyro.`,
  unsupported: 'This device cannot recognise speech in your language.',
  failed: 'Voice commands keep stopping. Avyro is still trying.',
} as const;

/** Exponential, capped. A recogniser that will never work costs no battery. */
export const retryDelayMs = (failures: number): number =>
  Math.min(
    CONVERSATION.wakeRetryBaseMs * 2 ** Math.max(0, failures - 1),
    CONVERSATION.wakeRetryMaxMs,
  );

const stay = (state: VoiceSessionState): VoiceSessionTransition => ({
  state,
  effects: [],
});

/** True when the driver wants to be listened to and nothing forbids it. */
const isActive = (status: VoiceSessionStatus): boolean =>
  status === 'listening' || status === 'suspended' || status === 'failed';

/**
 * The only way a session is ever opened.
 *
 * Refuses when one is already open, when one is on its way, and when a
 * conversation turn holds the microphone. Every caller goes through here, so
 * "no duplicate sessions" is a property of the machine rather than a rule
 * somebody has to remember in a hook.
 */
const openSession = (state: VoiceSessionState): VoiceSessionTransition => {
  if (state.turnActive || state.opening || state.open) return stay(state);

  return {
    state: { ...state, status: 'listening', opening: true, message: null },
    effects: [{ type: 'open-session', onDevice: state.onDevice }],
  };
};

/** Releases the microphone, if we are holding it or about to. */
const closeEffects = (state: VoiceSessionState): VoiceSessionEffect[] =>
  state.open || state.opening ? [{ type: 'close-session' }] : [];

const refuse = (
  state: VoiceSessionState,
  status: 'denied' | 'blocked' | 'unsupported',
  message: string,
): VoiceSessionTransition => ({
  state: { ...state, status, opening: false, open: false, message },
  effects: closeEffects(state),
});

export const voiceSessionReducer = (
  state: VoiceSessionState,
  event: VoiceSessionEvent,
): VoiceSessionTransition => {
  // Switching off wins from every state, including mid-handshake. The
  // controller discards a start that lands after this.
  if (event.type === 'disabled') {
    return {
      state: { ...initialVoiceSessionState, turnActive: state.turnActive },
      effects: closeEffects(state),
    };
  }

  switch (event.type) {
    case 'enabled':
      // Already on, or already refused: re-running the handshake would show a
      // driver the same dialog twice.
      if (state.status !== 'off') return stay(state);
      return {
        state: { ...initialVoiceSessionState, status: 'preparing', turnActive: state.turnActive },
        effects: [{ type: 'check-availability' }],
      };

    case 'availability':
      if (state.status !== 'preparing') return stay(state);
      if (!event.available) {
        return refuse(state, 'unsupported', VOICE_MESSAGES.unsupported);
      }
      return {
        state: { ...state, onDevice: event.onDevice },
        effects: [
          { type: 'request-permission', networkRecognition: !event.onDevice },
        ],
      };

    case 'permission':
      if (state.status !== 'preparing') return stay(state);
      if (event.granted) return openSession(state);
      return event.canAskAgain
        ? refuse(state, 'denied', VOICE_MESSAGES.denied)
        : refuse(state, 'blocked', VOICE_MESSAGES.blocked);

    case 'opened':
      // A session that arrives after the driver switched off, or during a
      // turn, is not ours to keep.
      if (state.status === 'off' || state.turnActive) {
        return { state: { ...state, opening: false, open: false }, effects: [{ type: 'close-session' }] };
      }
      return {
        state: {
          ...state,
          status: 'listening',
          opening: false,
          open: true,
          failures: 0,
          message: null,
        },
        effects: [],
      };

    case 'ended': {
      const settled = { ...state, opening: false, open: false };
      // Ending is what a platform recogniser does; only reopen if listening is
      // still what the driver asked for.
      if (state.status !== 'listening' || state.turnActive) return stay(settled);

      return {
        state: settled,
        effects: [
          { type: 'schedule-retry', delayMs: CONVERSATION.wakeRestartDelayMs },
        ],
      };
    }

    case 'failed': {
      if (!isActive(state.status) && state.status !== 'preparing') {
        return stay({ ...state, opening: false, open: false });
      }

      if (event.error.fatal) {
        // Permission and capability are answers, not conditions. Retrying one
        // is how an app burns a battery to be told the same thing.
        return event.error.code === 'language-not-supported'
          ? refuse(state, 'unsupported', VOICE_MESSAGES.unsupported)
          : refuse(state, 'blocked', VOICE_MESSAGES.blocked);
      }

      const failures = state.failures + 1;
      const surfaced = failures >= CONVERSATION.wakeFailuresBeforeSurfacing;

      return {
        state: {
          ...state,
          status: surfaced ? 'failed' : state.status,
          opening: false,
          open: false,
          failures,
          message: surfaced ? VOICE_MESSAGES.failed : state.message,
        },
        effects: state.turnActive
          ? []
          : [{ type: 'schedule-retry', delayMs: retryDelayMs(failures) }],
      };
    }

    case 'retry':
      if (!isActive(state.status)) return stay(state);
      return openSession(state);

    case 'turn-started': {
      const held = { ...state, turnActive: true };
      if (!isActive(state.status)) return stay(held);

      return {
        state: { ...held, status: 'suspended', opening: false, open: false },
        effects: closeEffects(state),
      };
    }

    case 'turn-ended': {
      const released = { ...state, turnActive: false };
      if (released.status !== 'suspended') return stay(released);
      return openSession({ ...released, status: 'listening' });
    }

    default:
      return stay(state);
  }
};

import { CONVERSATION } from '@/config';
import { matchWakePhrase } from './wakePhrase';

/**
 * Turning a stream of partial transcripts into one command.
 *
 * iOS does not hand over a sentence; it streams a guess that grows word by
 * word. "Hey Avyro take me to Lille" arrives as seven transcripts, and the
 * previous implementation acted on the first one containing the wake phrase —
 * so the app reliably parsed "take", "take me" or "take me to" and answered
 * "Sorry, I cannot help with that yet." while the driver was still speaking.
 *
 * The rule this enforces: **the wake phrase may be recognised early, but a
 * command may only be read from a transcript that has stopped growing.** A
 * transcript stops growing in exactly two ways — the recogniser commits a
 * final result, or the words stop changing for long enough that the driver
 * has clearly finished.
 *
 * Pure, and driven by an injected clock, so a realistic interim stream can be
 * replayed in a test. The device-only nature of this bug is precisely why it
 * survived a suite that only ever fed it complete sentences.
 */

export interface WakeTrackerState {
  /** The wake phrase has been heard; we are now waiting for the sentence. */
  armed: boolean;
  /** The most recent transcript seen. */
  text: string;
  /** When {@link text} last actually changed. */
  changedAt: number;
  /** A decision has been handed out; further transcripts belong to the turn. */
  settled: boolean;
}

export const initialWakeTrackerState: WakeTrackerState = {
  armed: false,
  text: '',
  changedAt: 0,
  settled: false,
};

export type WakeTrackerEvent =
  | { type: 'transcript'; text: string; isFinal: boolean; at: number }
  /** The settle timer came due. */
  | { type: 'tick'; at: number };

export type WakeDecision =
  /** Nothing to do. */
  | { type: 'wait' }
  /**
   * The wake phrase was heard in a partial result.
   *
   * Deliberately not an instruction to do anything with the microphone: the
   * driver is mid-sentence, and tearing the session down here is what threw
   * away the rest of it.
   */
  | { type: 'armed' }
  /** A complete command arrived in the same breath as the wake phrase. */
  | { type: 'command'; transcript: string }
  /** The wake phrase stood alone. Hand off to a dedicated command session. */
  | { type: 'listen' };

export interface WakeTransition {
  state: WakeTrackerState;
  decision: WakeDecision;
}

const stay = (state: WakeTrackerState): WakeTransition => ({
  state,
  decision: { type: 'wait' },
});

/** Whether an armed transcript has been quiet long enough to act on. */
const hasSettled = (state: WakeTrackerState, at: number): boolean =>
  at - state.changedAt >= CONVERSATION.wakeSettleMs;

/**
 * Reads a settled transcript.
 *
 * A remainder is the command spoken in the same breath; no remainder means the
 * driver said only the wake phrase and is waiting to be asked.
 */
const decide = (state: WakeTrackerState): WakeTransition => {
  const match = matchWakePhrase(state.text, CONVERSATION.defaultLocale);
  const remainder = match?.remainder.trim() ?? '';

  return {
    state: { ...state, settled: true },
    decision:
      remainder.length > 0
        ? { type: 'command', transcript: remainder }
        : { type: 'listen' },
  };
};

export const wakeTrackerReducer = (
  state: WakeTrackerState,
  event: WakeTrackerEvent,
): WakeTransition => {
  // Once a decision is out, the turn owns the microphone. Late transcripts
  // from the wake stream are not part of it.
  if (state.settled) return stay(state);

  if (event.type === 'tick') {
    if (!state.armed || !hasSettled(state, event.at)) return stay(state);
    return decide(state);
  }

  const grew = event.text !== state.text;
  const next: WakeTrackerState = {
    ...state,
    text: event.text,
    changedAt: grew ? event.at : state.changedAt,
  };

  const match = matchWakePhrase(event.text, CONVERSATION.defaultLocale);
  if (!match) {
    // No wake phrase yet. Nothing here is a command, however complete it
    // looks — an utterance that never woke Avyro was not addressed to it.
    return stay(next);
  }

  // A final result is the recogniser saying the sentence is done. That is the
  // only transcript we are allowed to read a command from without waiting.
  if (event.isFinal) return decide({ ...next, armed: true });

  return {
    state: { ...next, armed: true },
    // Arming is a state change worth reporting and nothing more. The command
    // waits for the sentence to finish.
    decision: state.armed && !grew ? { type: 'wait' } : { type: 'armed' },
  };
};

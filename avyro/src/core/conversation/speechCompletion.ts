/**
 * When is Avyro finished talking?
 *
 * The conversation machine leaves `speaking` (and `navigation-interrupt`) only
 * on `speech-finished`, so whatever delivers that event is load-bearing: miss
 * it once and the reply stays on screen over the map for the rest of the drive.
 * That is exactly what LRWF0930 (0:00–0:42) and EJXG3453 (the whole drive)
 * show.
 *
 * The defect was that completion was keyed to the *microphone* session
 * counter. Any microphone activity while Avyro spoke — the wake detector
 * re-arming, the voice machine closing a session on `turn-started` — made the
 * TTS callback and its watchdog both silently discard themselves. Speech
 * completion now has its own token and depends on nothing else.
 *
 * The only thing allowed to cancel a completion is a newer utterance or an
 * explicit stop, because only those genuinely change what "finished" means.
 */

export type SpeechFinishReason =
  | 'tts_finished'
  | 'tts_abandoned'
  | 'ERROR tts_watchdog_fired';

export interface SpeechTurn {
  /** Ends this utterance. True if this call was the one that ended it. */
  finish(reason: SpeechFinishReason): boolean;
  /** Still the utterance Avyro is meant to be saying. */
  isCurrent(): boolean;
}

export interface SpeechCompletion {
  /** Starts tracking a new utterance; supersedes any previous one. */
  begin(onFinish: (reason: SpeechFinishReason) => void): SpeechTurn;
  /** An explicit stop: whatever was being said no longer owns completion. */
  supersede(): void;
}

export const createSpeechCompletion = (): SpeechCompletion => {
  let current = 0;

  return {
    begin(onFinish) {
      const mine = (current += 1);
      let finished = false;

      return {
        finish(reason) {
          if (finished || mine !== current) return false;
          finished = true;
          onFinish(reason);
          return true;
        },
        isCurrent: () => mine === current && !finished,
      };
    },

    supersede() {
      current += 1;
    },
  };
};

/**
 * How long to wait for a TTS callback before ending the turn anyway.
 *
 * Proportional to what is being said rather than a fixed short timeout: cutting
 * a valid sentence off mid-word is its own failure. Roughly 85 ms a character
 * covers slow, clear driving speech with margin; the floor covers a one-word
 * reply plus audio-session start-up; the ceiling bounds the damage of a
 * callback that never comes.
 */
export const speechWatchdogMs = (text: string): number =>
  Math.min(30_000, Math.max(6_000, 4_000 + text.length * 85));

export interface SpeechOptions {
  /** BCP-47 tag, e.g. `en-US`. Defaults to the device language. */
  language?: string;
  /** 1 is the platform's normal rate; guidance reads slightly slower. */
  rate?: number;
  pitch?: number;
  /**
   * Called once the utterance finishes, is stopped, or fails.
   *
   * The conversation state machine leaves `speaking` on this signal, so it has
   * to fire exactly once per utterance — including when the utterance is cut
   * off by a maneuver announcement.
   */
  onDone?: () => void;
}

/**
 * Text to speech.
 *
 * Every spoken word in Avyro goes through here, and through the conversation
 * engine that owns it: two things talking at once is worse than either.
 */
export interface SpeechEngine {
  speak(text: string, options?: SpeechOptions): Promise<void>;
  stop(): Promise<void>;
}

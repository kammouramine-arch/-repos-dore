export interface TranscriptEvent {
  text: string;
  /** False for a running guess, true for the recogniser's committed answer. */
  isFinal: boolean;
}

export interface SpeechRecognizerEvents {
  onTranscript: (event: TranscriptEvent) => void;
  onError: (reason: string) => void;
  /** The recogniser stopped on its own — silence, timeout or platform limits. */
  onEnd: () => void;
}

export interface SpeechRecognitionOptions {
  /** BCP-47 tag. Drives both the recognition model and the wake phrase set. */
  locale: string;
  /**
   * Emit running guesses as the driver speaks. Wake-phrase detection needs
   * them; a single command does not.
   */
  interimResults?: boolean;
  /** Keep listening after a result, for continuous wake-phrase watching. */
  continuous?: boolean;
}

export interface SpeechRecognitionSession {
  stop(): void;
}

/**
 * Speech to text.
 *
 * Deliberately narrow: start a session, receive transcripts, stop. Anything
 * platform-shaped — permissions dialogs, audio session categories, partial
 * result semantics — belongs to the adapter, not to the conversation engine.
 */
export interface SpeechRecognizer {
  isAvailable(): Promise<boolean>;
  requestPermission(): Promise<boolean>;
  start(
    options: SpeechRecognitionOptions,
    events: SpeechRecognizerEvents,
  ): Promise<SpeechRecognitionSession>;
}

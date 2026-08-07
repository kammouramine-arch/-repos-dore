export interface TranscriptEvent {
  text: string;
  /** False for a running guess, true for the recogniser's committed answer. */
  isFinal: boolean;
}

/**
 * Why a recognition session stopped.
 *
 * The codes are the platform's own, normalised. Only the classification
 * matters above this port: `fatal` separates "this device will never do it"
 * from "conditions were wrong just now".
 */
export type SpeechErrorCode =
  | 'not-allowed'
  | 'service-not-allowed'
  | 'language-not-supported'
  | 'audio-capture'
  | 'no-speech'
  | 'network'
  | 'aborted'
  | 'interrupted'
  | 'busy'
  | 'unknown';

export interface SpeechRecognitionError {
  code: SpeechErrorCode;
  message: string;
  /**
   * True when retrying cannot help.
   *
   * Permission and capability are fatal — the answer will be the same in a
   * second and in an hour. Silence, a dropped network and an interrupting
   * phone call are not: those are conditions, and conditions change.
   */
  fatal: boolean;
}

export interface SpeechPermission {
  granted: boolean;
  /**
   * False when the platform will not prompt again.
   *
   * iOS shows each permission dialog once. After that the only route is the
   * system Settings app, and a driver has to be told that rather than left
   * tapping a switch that does nothing.
   */
  canAskAgain: boolean;
}

export interface SpeechPermissionRequest {
  /**
   * Whether network recognition will be used.
   *
   * On-device recognition needs only the microphone. Asking for the speech
   * authorisation as well would be a second dialog for a capability we have
   * already decided not to use.
   */
  networkRecognition: boolean;
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
  /**
   * Prefer the on-device model.
   *
   * For the wake listener this is the difference between a feature and a
   * liability: network recognition sends every syllable of the drive to a
   * server, needs a connection Avyro cannot assume, and is rate limited by the
   * platform vendor.
   */
  onDevice?: boolean;
}

export interface SpeechRecognitionSession {
  stop(): void;
}

export interface SpeechRecognizerEvents {
  onTranscript: (event: TranscriptEvent) => void;
  onError: (error: SpeechRecognitionError) => void;
  /** The recogniser stopped on its own — silence, timeout or platform limits. */
  onEnd: () => void;
}

/**
 * Speech to text.
 *
 * Deliberately narrow: ask what the device can do, ask the driver for
 * permission, start a session, receive transcripts, stop. Anything
 * platform-shaped — permission dialogs, audio session categories, partial
 * result semantics — belongs to the adapter, not to the conversation engine.
 */
export interface SpeechRecognizer {
  /** Whether this device can recognise speech at all. */
  isAvailable(): Promise<boolean>;
  /** Whether the on-device model can serve a locale. */
  supportsOnDevice(locale: string): Promise<boolean>;
  /** Reads the current permission without prompting. */
  getPermission(request: SpeechPermissionRequest): Promise<SpeechPermission>;
  /** Prompts the driver. The platform shows each dialog at most once. */
  requestPermission(request: SpeechPermissionRequest): Promise<SpeechPermission>;
  start(
    options: SpeechRecognitionOptions,
    events: SpeechRecognizerEvents,
  ): Promise<SpeechRecognitionSession>;
}

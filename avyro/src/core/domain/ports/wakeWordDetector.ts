/**
 * Vendor-neutral, foreground-only wake-word detection.
 *
 * The keyword adapter uses redistributable bundled models. The platform
 * adapter recognizes the phrase with iPhone-owned offline speech models;
 * ambient transcripts never leave the adapter. Neither chooses a destination.
 *
 * A detected phrase must release the microphone before the command recognizer
 * starts. For that reason stop() is intentionally asynchronous.
 */
export type WakeWordFailureKind =
  | 'permission-denied'
  | 'model-unavailable'
  | 'licence-unavailable'
  | 'audio-interrupted'
  | 'runtime-error';

export interface WakeWordFailure {
  kind: WakeWordFailureKind;
  message: string;
  recoverable: boolean;
}

export interface WakeWordAvailability {
  available: boolean;
  reason?: string;
}

export interface WakeWordSession {
  /** Resolves only after the native microphone input has been released. */
  stop(): Promise<void>;
}

export interface WakeWordEvents {
  onDetected(command?: string): void;
  onError(error: WakeWordFailure): void;
}

export interface WakeWordDetector {
  /**
   * Check for permission, bundled models and a usable native implementation.
   * Do not claim availability from a placeholder adapter.
   */
  isAvailable(options?: WakeWordOptions): Promise<WakeWordAvailability>;
  /**
   * Starts listening for the configured phrase while Avyro is foregrounded.
   * An implementation must stop on background, interruption and permission loss.
   */
  start(events: WakeWordEvents, options?: WakeWordOptions): Promise<WakeWordSession>;
}

export interface WakeWordOptions {
  locales?: readonly string[];
  engine?: 'system' | 'keyword';
}

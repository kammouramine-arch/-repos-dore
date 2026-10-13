/**
 * Vendor-neutral, foreground-only wake-word detection.
 *
 * This port is NOT speech-to-text. It produces no partial transcript and never
 * chooses a navigation destination. The adapter must use a real on-device
 * keyword model whose code and weights can legally ship with Avyro.
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
  onDetected(): void;
  onError(error: WakeWordFailure): void;
}

export interface WakeWordDetector {
  /**
   * Check for permission, bundled models and a usable native implementation.
   * Do not claim availability from a placeholder adapter.
   */
  isAvailable(): Promise<WakeWordAvailability>;
  /**
   * Starts listening for the configured phrase while Avyro is foregrounded.
   * An implementation must stop on background, interruption and permission loss.
   */
  start(events: WakeWordEvents): Promise<WakeWordSession>;
}

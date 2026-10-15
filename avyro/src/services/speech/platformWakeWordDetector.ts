import type { SpeechRecognizer } from '@/core/domain/ports/speechRecognizer';
import type { WakeWordDetector } from '@/core/domain/ports/wakeWordDetector';

/** Ambient listening always uses dedicated KWS. Dictation is command-only.
 * Keep the argument for compatibility with existing composition/tests; never
 * substitute continuous Apple recognition when a bundled model is missing.
 */
export const createPlatformWakeWordDetector = (_recognizer: SpeechRecognizer, keyword: WakeWordDetector): WakeWordDetector => ({
  isAvailable: () => keyword.isAvailable(),
  async start(events) {
    const availability = await keyword.isAvailable();
    if (!availability.available) throw new Error(availability.reason ?? 'Hands-free is unavailable. Use tap-to-talk.');
    return keyword.start(events);
  },
});

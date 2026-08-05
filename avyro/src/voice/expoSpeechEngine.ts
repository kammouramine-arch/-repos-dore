import * as Speech from 'expo-speech';

import type { SpeechEngine, SpeechOptions } from '@/core/domain/ports/speechEngine';

/** Slightly under the platform default — clearer over road noise. */
const GUIDANCE_RATE = 0.98;

/**
 * Text-to-speech backed by expo-speech.
 *
 * Guidance is interrupting by design: a new instruction always cancels the
 * previous one, because an out-of-date maneuver read over a current one is
 * worse than silence.
 */
export const createExpoSpeechEngine = (): SpeechEngine => ({
  async speak(text: string, options: SpeechOptions = {}): Promise<void> {
    await Speech.stop();
    Speech.speak(text, {
      language: options.language,
      rate: options.rate ?? GUIDANCE_RATE,
      pitch: options.pitch ?? 1,
    });
  },

  async stop(): Promise<void> {
    await Speech.stop();
  },
});

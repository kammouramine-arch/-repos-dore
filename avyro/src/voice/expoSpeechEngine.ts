import * as Speech from 'expo-speech';

import type { SpeechEngine, SpeechOptions } from '@/core/domain/ports/speechEngine';

/** Slightly under the platform default — clearer over road noise. */
const GUIDANCE_RATE = 0.98;

/**
 * Text-to-speech backed by expo-speech.
 *
 * Guidance is interrupting by design: a new utterance always cancels the
 * previous one, because an out-of-date maneuver read over a current one is
 * worse than silence.
 *
 * `onDone` is guaranteed to fire exactly once per utterance — on completion,
 * on being stopped, or on error. The conversation state machine leaves
 * `speaking` on that signal, so a dropped callback would strand the engine.
 */
export const createExpoSpeechEngine = (): SpeechEngine => {
  let currentUtterance = 0;

  return {
    async speak(text: string, options: SpeechOptions = {}): Promise<void> {
      const utterance = (currentUtterance += 1);
      let settled = false;

      const settle = () => {
        // A stopped utterance is superseded: the newer one owns the callback.
        if (settled || utterance !== currentUtterance) return;
        settled = true;
        options.onDone?.();
      };

      await Speech.stop();

      Speech.speak(text, {
        language: options.language,
        rate: options.rate ?? GUIDANCE_RATE,
        pitch: options.pitch ?? 1,
        onDone: settle,
        onStopped: settle,
        onError: settle,
      });
    },

    async stop(): Promise<void> {
      // Invalidate the in-flight utterance so its callbacks are ignored; the
      // caller stopping speech is not waiting to be told it stopped.
      currentUtterance += 1;
      await Speech.stop();
    },
  };
};

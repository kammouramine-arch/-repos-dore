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
export const createExpoSpeechEngine = (getPreferredVoice?: () => Promise<string | null>): SpeechEngine => {
  let currentUtterance = 0;
  let voices: Promise<Speech.Voice[]> | null = null;

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
      voices ??= Speech.getAvailableVoicesAsync().catch(() => []);
      const language = options.language ?? 'en-US';
      const available = await voices;
      const preferred = await getPreferredVoice?.();
      const voice = available.find(v => v.identifier === preferred && v.language.split('-')[0] === language.split('-')[0])
        ?? available.find((v) => v.language === language && v.quality === Speech.VoiceQuality.Enhanced)
        ?? available.find((v) => v.language.startsWith(language.split('-')[0]) && v.quality === Speech.VoiceQuality.Enhanced);
      if (utterance !== currentUtterance) return;

      Speech.speak(text, {
        language,
        voice: voice?.identifier,
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

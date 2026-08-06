import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionErrorEvent,
  type ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';

import type { Logger } from '@/core/domain/ports/logger';
import type {
  SpeechRecognitionOptions,
  SpeechRecognitionSession,
  SpeechRecognizer,
  SpeechRecognizerEvents,
} from '@/core/domain/ports/speechRecognizer';

/**
 * Speech to text, backed by the platform recogniser.
 *
 * The whole platform surface stops here: permission flows, interim-result
 * semantics and the fact that iOS only commits a final result once recognition
 * has stopped are all this file's problem. Above it, the engine sees
 * transcripts.
 */
export const createExpoSpeechRecognizer = (logger: Logger): SpeechRecognizer => {
  const scoped = logger.scoped('speech.recognizer');

  return {
    async isAvailable() {
      try {
        const { granted, canAskAgain } =
          await ExpoSpeechRecognitionModule.getPermissionsAsync();
        return granted || canAskAgain;
      } catch (error) {
        scoped.warn('availability check failed', { reason: String(error) });
        return false;
      }
    },

    async requestPermission() {
      try {
        const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!granted) scoped.info('microphone permission declined');
        return granted;
      } catch (error) {
        scoped.warn('permission request failed', { reason: String(error) });
        return false;
      }
    },

    async start(
      { locale, interimResults = true, continuous = false }: SpeechRecognitionOptions,
      { onTranscript, onError, onEnd }: SpeechRecognizerEvents,
    ): Promise<SpeechRecognitionSession> {
      const subscriptions = [
        ExpoSpeechRecognitionModule.addListener(
          'result',
          (event: ExpoSpeechRecognitionResultEvent) => {
            const text = event.results[0]?.transcript ?? '';
            if (text.length > 0) onTranscript({ text, isFinal: event.isFinal });
          },
        ),
        ExpoSpeechRecognitionModule.addListener(
          'error',
          (event: ExpoSpeechRecognitionErrorEvent) => {
            scoped.warn('recognition error', { code: event.error });
            onError(event.message || event.error);
          },
        ),
        ExpoSpeechRecognitionModule.addListener('end', () => onEnd()),
      ];

      let stopped = false;
      const release = () => {
        subscriptions.forEach((subscription) => subscription.remove());
      };

      try {
        ExpoSpeechRecognitionModule.start({ lang: locale, interimResults, continuous });
      } catch (error) {
        release();
        throw error;
      }

      return {
        stop() {
          if (stopped) return;
          stopped = true;
          // `stop` asks for a final result; `abort` throws the utterance away.
          // Ending a listening turn should still surrender what was heard.
          try {
            ExpoSpeechRecognitionModule.stop();
          } catch (error) {
            scoped.warn('stop failed', { reason: String(error) });
          }
          release();
        },
      };
    },
  };
};

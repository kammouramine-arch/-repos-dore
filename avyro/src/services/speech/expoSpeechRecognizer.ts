import {
  AVAudioSessionCategory,
  AVAudioSessionCategoryOptions,
  AVAudioSessionMode,
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionErrorEvent,
  type ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';

import type { Logger } from '@/core/domain/ports/logger';
import type {
  SpeechErrorCode,
  SpeechPermission,
  SpeechPermissionRequest,
  SpeechRecognitionError,
  SpeechRecognitionOptions,
  SpeechRecognitionSession,
  SpeechRecognizer,
  SpeechRecognizerEvents,
} from '@/core/domain/ports/speechRecognizer';

/**
 * Speech to text, backed by the platform recogniser.
 *
 * The whole platform surface stops here: permission flows, the iOS audio
 * session, interim-result semantics and the fact that iOS only commits a final
 * result once recognition has stopped are all this file's problem. Above it,
 * the engine sees transcripts.
 */

/**
 * The audio session Avyro records under.
 *
 * The library's default is mode `measurement`, which disables the output
 * processing chain and audibly drops playback level — on a device that is also
 * speaking turn-by-turn guidance, that is the difference between hearing your
 * exit and missing it. `default` mode keeps playback normal while still
 * allowing capture, `defaultToSpeaker` keeps guidance out of the earpiece, and
 * `allowBluetooth` keeps a car kit working.
 */
const AUDIO_SESSION = {
  category: AVAudioSessionCategory.playAndRecord,
  categoryOptions: [
    AVAudioSessionCategoryOptions.defaultToSpeaker,
    AVAudioSessionCategoryOptions.allowBluetooth,
  ],
  mode: AVAudioSessionMode.default,
};

/**
 * Errors that will say the same thing however many times you ask.
 *
 * Everything else — silence, a dropped network, an interrupting call — is a
 * condition, and the engine reopens after those.
 */
const FATAL_CODES: ReadonlySet<string> = new Set([
  'not-allowed',
  'service-not-allowed',
  'language-not-supported',
]);

const KNOWN_CODES: ReadonlySet<string> = new Set<SpeechErrorCode>([
  'not-allowed',
  'service-not-allowed',
  'language-not-supported',
  'audio-capture',
  'no-speech',
  'network',
  'aborted',
  'interrupted',
  'busy',
]);

const toError = (event: ExpoSpeechRecognitionErrorEvent): SpeechRecognitionError => {
  const code = (KNOWN_CODES.has(event.error) ? event.error : 'unknown') as SpeechErrorCode;

  return {
    code,
    message: event.message || event.error,
    fatal: FATAL_CODES.has(event.error),
  };
};

export const createExpoSpeechRecognizer = (logger: Logger): SpeechRecognizer => {
  const scoped = logger.scoped('speech.recognizer');

  return {
    async isAvailable() {
      try {
        return ExpoSpeechRecognitionModule.isRecognitionAvailable();
      } catch (error) {
        // A recogniser that cannot even be asked is not one we can use.
        scoped.warn('availability check failed', { reason: String(error) });
        return false;
      }
    },

    async supportsOnDevice(locale: string) {
      try {
        if (!ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) return false;

        const { installedLocales } =
          await ExpoSpeechRecognitionModule.getSupportedLocales({});
        // An empty list means the platform does not enumerate them (iOS), not
        // that nothing is installed — trust the capability flag in that case.
        if (installedLocales.length === 0) return true;

        const language = locale.toLowerCase().split('-')[0];
        return installedLocales.some(
          (installed) => installed.toLowerCase().split('-')[0] === language,
        );
      } catch (error) {
        scoped.warn('on-device support check failed', { reason: String(error) });
        return false;
      }
    },

    async getPermission({ networkRecognition }: SpeechPermissionRequest) {
      try {
        const result = networkRecognition
          ? await ExpoSpeechRecognitionModule.getPermissionsAsync()
          : await ExpoSpeechRecognitionModule.getMicrophonePermissionsAsync();

        return { granted: result.granted, canAskAgain: result.canAskAgain };
      } catch (error) {
        scoped.error('permission read failed', error);
        return { granted: false, canAskAgain: false } satisfies SpeechPermission;
      }
    },

    async requestPermission({ networkRecognition }: SpeechPermissionRequest) {
      try {
        // On-device recognition needs the microphone only. Requesting the
        // speech authorisation as well would show a driver a second dialog for
        // a capability this build has already decided not to use.
        const result = networkRecognition
          ? await ExpoSpeechRecognitionModule.requestPermissionsAsync()
          : await ExpoSpeechRecognitionModule.requestMicrophonePermissionsAsync();

        if (!result.granted) {
          scoped.warn('speech permission refused', {
            networkRecognition,
            canAskAgain: result.canAskAgain,
          });
        }

        return { granted: result.granted, canAskAgain: result.canAskAgain };
      } catch (error) {
        scoped.error('permission request failed', error);
        return { granted: false, canAskAgain: false } satisfies SpeechPermission;
      }
    },

    async start(
      {
        locale,
        interimResults = true,
        continuous = false,
        onDevice = false,
      }: SpeechRecognitionOptions,
      { onTranscript, onError, onEnd }: SpeechRecognizerEvents,
    ): Promise<SpeechRecognitionSession> {
      let released = false;

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
            const error = toError(event);

            // Warn, not debug: this is the line that explains a dead
            // microphone in a release build, where debug records are dropped.
            if (error.fatal) {
              scoped.error('recognition unavailable', undefined, {
                code: error.code,
                message: error.message,
              });
            } else {
              scoped.warn('recognition error', {
                code: error.code,
                message: error.message,
              });
            }

            onError(error);
          },
        ),
        ExpoSpeechRecognitionModule.addListener('end', () => {
          if (released) return;
          onEnd();
        }),
      ];

      const release = () => {
        released = true;
        subscriptions.forEach((subscription) => subscription.remove());
      };

      try {
        ExpoSpeechRecognitionModule.start({
          lang: locale,
          interimResults,
          continuous,
          requiresOnDeviceRecognition: onDevice,
          iosCategory: AUDIO_SESSION,
        });
      } catch (error) {
        release();
        scoped.error('could not start recognition', error, { locale, onDevice });
        throw error;
      }

      return {
        stop() {
          if (released) return;
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

import { CONVERSATION } from '@/config';
import { matchWakePhrase } from '@/core/conversation/wakePhrase';
import type { SpeechRecognizer } from '@/core/domain/ports/speechRecognizer';
import type { WakeWordDetector } from '@/core/domain/ports/wakeWordDetector';

/** System models stay on the phone. Recognized ambient text is neither stored nor sent. */
export const createPlatformWakeWordDetector = (recognizer: SpeechRecognizer, keyword: WakeWordDetector): WakeWordDetector => ({
  async isAvailable(options) {
    if (options?.engine === 'keyword') return keyword.isAvailable();
    const locales = options?.locales ?? ['fr-FR', 'en-US'];
    const available = (await Promise.all(locales.map(locale => recognizer.supportsOnDevice(locale)))).every(Boolean);
    return { available, reason: available ? undefined : 'On-device speech languages are unavailable. Select one installed language or the keyword detector in Settings.' };
  },
  async start(events, options) {
    if (options?.engine === 'keyword') return keyword.start(events);
    const locales = options?.locales ?? ['fr-FR', 'en-US'];
    if (!(await Promise.all(locales.map(locale => recognizer.supportsOnDevice(locale)))).every(Boolean)) throw Error('Offline speech languages unavailable.');
    let triggered = false, stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const session = await recognizer.start({ locale: locales[0], locales, continuous: true, interimResults: true, onDevice: true }, {
      onTranscript(event) {
        if (triggered || stopped) return;
        const match = matchWakePhrase(event.text, event.locale ?? locales[0]);
        if (timer) clearTimeout(timer);
        if (!match) return;
        const trigger = (command?: string) => { if (!triggered && !stopped) { triggered = true; events.onDetected(command); } };
        // A final same-breath command is preserved. A partial destination never executes.
        if (event.isFinal) trigger(match.remainder || undefined);
        else timer = setTimeout(() => {
          if (!match.remainder) trigger();
          else if (!stopped && !triggered) void session.finish?.();
        }, CONVERSATION.commandSilenceMs);
      },
      onError(error) { if (!stopped && !triggered) events.onError({ kind: 'audio-interrupted', message: error.message, recoverable: !error.fatal }); },
      onEnd() { if (!stopped && !triggered) events.onError({ kind: 'audio-interrupted', message: 'Refreshing on-device listener.', recoverable: true }); },
    });
    return { async stop() { stopped = true; if (timer) clearTimeout(timer); await session.stop(); } };
  },
});

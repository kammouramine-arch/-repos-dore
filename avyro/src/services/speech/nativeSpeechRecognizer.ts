import { requireOptionalNativeModule } from 'expo';
import { CONVERSATION } from '@/config';
import { selectBilingualTranscript } from '@/core/conversation/bilingualTranscript';
import { matchWakePhrase } from '@/core/conversation/wakePhrase';
import type { SpeechRecognizer, TranscriptEvent } from '@/core/domain/ports/speechRecognizer';

export interface NativeSpeech {
  supportsOnDevice(locale: string): Promise<boolean>;
  startSpeech(locales: string[], continuous: boolean, exportAudio: boolean): Promise<void>;
  stop(): Promise<void>;
  finishSpeech(): Promise<void>;
  addListener(event: string, callback: (data: TranscriptEvent & { message?: string }) => void): { remove(): void };
}

/** Native French/English recognizers share one capture; no ambient network fallback. */
export const createNativeSpeechRecognizer = (fallback: SpeechRecognizer, nativeOverride?: NativeSpeech | null, cloud?: { enabled(): Promise<boolean>; transcribe(audio: string, locales: readonly string[], signal: AbortSignal): Promise<TranscriptEvent | null> }): SpeechRecognizer => {
  const native = nativeOverride === undefined ? requireOptionalNativeModule<NativeSpeech>('AvyroWake') : nativeOverride;
  return {
    ...fallback,
    supportsOnDevice: locale => native ? native.supportsOnDevice(locale) : fallback.supportsOnDevice(locale),
    async start(options, events) {
      if (!native || !options.onDevice) return fallback.start(options, events);
      let stopped = false, delivered = false;
      let delivering = false;
      let cloudResult: Promise<TranscriptEvent | null> | null = null;
      const cloudEnabled = !options.continuous && await cloud?.enabled() === true;
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      let endpointTimer: ReturnType<typeof setTimeout> | undefined;
      let lastPartial = '';
      const finals = new Map<string, TranscriptEvent>();
      const deliver = async () => {
        if (stopped || delivered || delivering) return;
        delivering = true;
        let selected = selectBilingualTranscript([...finals.values()]);
        if (cloudResult) selected = await cloudResult ?? selected;
        if (stopped || controller.signal.aborted) return;
        if (selected) {
          delivered = true;
          const wake = options.continuous ? null : matchWakePhrase(selected.text, selected.locale);
          events.onTranscript(wake?.remainder ? { ...selected, text: wake.remainder } : selected);
        }
        else { delivered = true; events.onError({ code: 'no-speech', message: 'I could not confirm that command. Please repeat it.', fatal: false }); }
      };
      const subscriptions = [
        native.addListener('commandAudio', event => { if (!stopped && cloudEnabled && !cloudResult && 'audio' in event && typeof event.audio === 'string' && event.audio.length <= 876000) cloudResult = cloud!.transcribe(event.audio, options.locales ?? [options.locale], controller.signal).catch(() => null); }),
        native.addListener('transcript', event => {
          if (stopped || delivered) return;
          if (!event.isFinal) {
            const displayText = event.text.replace(/^(hey|h[ée]|hi|salut|ok|dis)([,\s]+)(aviro|avero|avyro)\b/iu, '$1$2Avyro');
            events.onTranscript({ ...event, text: displayText });
            if (!options.continuous && event.text !== lastPartial) {
              lastPartial = event.text;
              if (endpointTimer) clearTimeout(endpointTimer);
              endpointTimer = setTimeout(() => { if (!stopped && !delivered) void native.finishSpeech(); }, CONVERSATION.commandSilenceMs);
            }
            return;
          }
          finals.set(event.locale ?? options.locale, event);
          timer ??= setTimeout(() => void deliver(), CONVERSATION.bilingualFinalWaitMs);
          if (finals.size >= (options.locales?.length ?? 1)) void deliver();
        }),
        native.addListener('speechEnd', () => { if (!stopped) void deliver().then(() => { if (!stopped) events.onEnd(); }); }),
        native.addListener('failure', event => {
          if (!stopped) events.onError({ code: 'interrupted', message: event.message ?? 'Microphone interrupted. Listening will resume.', fatal: false });
        }),
      ];
      try { await native.startSpeech([...(options.locales ?? [options.locale])], options.continuous ?? false, cloudEnabled); }
      catch (error) { stopped = true; if (timer) clearTimeout(timer); if (endpointTimer) clearTimeout(endpointTimer); subscriptions.forEach(s => s.remove()); throw error; }
      return { finish: () => native.finishSpeech(), async stop() {
        if (stopped) return;
        stopped = true;
        controller.abort(); cloudResult = null;
        if (timer) clearTimeout(timer);
        if (endpointTimer) clearTimeout(endpointTimer);
        subscriptions.forEach(s => s.remove());
        await native.stop();
      } };
    },
  };
};

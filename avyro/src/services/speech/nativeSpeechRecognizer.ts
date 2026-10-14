import { requireOptionalNativeModule } from 'expo';
import { CONVERSATION } from '@/config';
import { selectBilingualTranscript } from '@/core/conversation/bilingualTranscript';
import type { SpeechRecognizer, TranscriptEvent } from '@/core/domain/ports/speechRecognizer';

export interface NativeSpeech {
  supportsOnDevice(locale: string): Promise<boolean>;
  startSpeech(locales: string[]): Promise<void>;
  stop(): Promise<void>;
  finishSpeech(): Promise<void>;
  addListener(event: string, callback: (data: TranscriptEvent) => void): { remove(): void };
}

/** Native French/English recognizers share one capture; no ambient network fallback. */
export const createNativeSpeechRecognizer = (fallback: SpeechRecognizer, nativeOverride?: NativeSpeech | null): SpeechRecognizer => {
  const native = nativeOverride === undefined ? requireOptionalNativeModule<NativeSpeech>('AvyroWake') : nativeOverride;
  return {
    ...fallback,
    supportsOnDevice: locale => native ? native.supportsOnDevice(locale) : fallback.supportsOnDevice(locale),
    async start(options, events) {
      if (!native || !options.onDevice) return fallback.start(options, events);
      let stopped = false, delivered = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let endpointTimer: ReturnType<typeof setTimeout> | undefined;
      let lastPartial = '';
      const finals = new Map<string, TranscriptEvent>();
      const deliver = () => {
        if (stopped || delivered) return;
        const selected = selectBilingualTranscript([...finals.values()]);
        if (selected) { delivered = true; events.onTranscript(selected); }
      };
      const subscriptions = [
        native.addListener('transcript', event => {
          if (stopped || delivered) return;
          if (!event.isFinal) {
            events.onTranscript(event);
            if (!options.continuous && event.text !== lastPartial) {
              lastPartial = event.text;
              if (endpointTimer) clearTimeout(endpointTimer);
              endpointTimer = setTimeout(() => { if (!stopped && !delivered) void native.finishSpeech(); }, CONVERSATION.commandSilenceMs);
            }
            return;
          }
          finals.set(event.locale ?? options.locale, event);
          timer ??= setTimeout(deliver, CONVERSATION.bilingualFinalWaitMs);
          if (finals.size >= (options.locales?.length ?? 1)) deliver();
        }),
        native.addListener('speechEnd', () => { if (!stopped) { deliver(); events.onEnd(); } }),
        native.addListener('failure', () => {
          if (!stopped) events.onError({ code: 'interrupted', message: 'Microphone interrupted. Listening will resume.', fatal: false });
        }),
      ];
      try { await native.startSpeech([...(options.locales ?? [options.locale])]); }
      catch (error) { stopped = true; if (timer) clearTimeout(timer); if (endpointTimer) clearTimeout(endpointTimer); subscriptions.forEach(s => s.remove()); throw error; }
      return { finish: () => native.finishSpeech(), async stop() {
        if (stopped) return;
        stopped = true;
        if (timer) clearTimeout(timer);
        if (endpointTimer) clearTimeout(endpointTimer);
        subscriptions.forEach(s => s.remove());
        await native.stop();
      } };
    },
  };
};

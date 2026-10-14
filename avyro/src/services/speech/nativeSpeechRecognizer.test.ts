import { createNativeSpeechRecognizer, type NativeSpeech } from './nativeSpeechRecognizer';
import type { SpeechRecognizer, TranscriptEvent } from '@/core/domain/ports/speechRecognizer';

const setup = () => {
  const listeners = new Map<string, ((event: TranscriptEvent) => void)[]>();
  const native: NativeSpeech = {
    supportsOnDevice: jest.fn(async () => true), startSpeech: jest.fn(async () => undefined), finishSpeech: jest.fn(async () => undefined), stop: jest.fn(async () => undefined),
    addListener(event, callback) { const callbacks = listeners.get(event) ?? []; callbacks.push(callback); listeners.set(event, callbacks); return { remove: () => listeners.set(event, callbacks.filter(c => c !== callback)) }; },
  };
  const emit = (name: string, event: TranscriptEvent) => listeners.get(name)?.forEach(callback => callback(event));
  return { native, emit, recognizer: createNativeSpeechRecognizer({} as SpeechRecognizer, native) };
};
afterEach(() => jest.useRealTimers());

test('requests both languages on one native capture, ends audio after a pause and awaits a final result', async () => {
  jest.useFakeTimers(); const { native, emit, recognizer } = setup();
  const onTranscript = jest.fn();
  const session = await recognizer.start({ locale: 'fr-FR', locales: ['fr-FR','en-US'], onDevice: true }, { onTranscript, onError: jest.fn(), onEnd: jest.fn() });
  expect(native.startSpeech).toHaveBeenCalledTimes(1); expect(native.startSpeech).toHaveBeenCalledWith(['fr-FR','en-US']);
  emit('transcript', { text: 'Emmène-moi à la maison', isFinal: false, locale: 'fr-FR' });
  jest.advanceTimersByTime(1400); expect(native.finishSpeech).toHaveBeenCalledTimes(1);
  expect(onTranscript.mock.calls.some(([event]) => event.isFinal)).toBe(false);
  emit('transcript', { text: 'amen memo', isFinal: true, locale: 'en-US', confidence: 0.9 });
  emit('transcript', { text: 'Emmène-moi à la maison', isFinal: true, locale: 'fr-FR', confidence: 0.8 });
  expect(onTranscript).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'Emmène-moi à la maison', isFinal: true }));
  await session.stop(); expect(native.stop).toHaveBeenCalledTimes(1);
});
test('stopping cancels pending endpoint work and every late transcript', async () => {
  jest.useFakeTimers(); const { native, emit, recognizer } = setup(); const onTranscript = jest.fn();
  const session = await recognizer.start({ locale: 'en-US', onDevice: true }, { onTranscript, onError: jest.fn(), onEnd: jest.fn() });
  emit('transcript', { text: 'take me', isFinal: false }); await session.stop();
  jest.runAllTimers(); emit('transcript', { text: 'take me home', isFinal: true });
  expect(native.finishSpeech).not.toHaveBeenCalled(); expect(onTranscript).toHaveBeenCalledTimes(1);
});

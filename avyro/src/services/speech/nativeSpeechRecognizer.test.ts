import { createNativeSpeechRecognizer, type NativeSpeech } from './nativeSpeechRecognizer';
import type { SpeechRecognizer, TranscriptEvent } from '@/core/domain/ports/speechRecognizer';

const setup = (cloud?: Parameters<typeof createNativeSpeechRecognizer>[2]) => {
  const listeners = new Map<string, ((event: TranscriptEvent) => void)[]>();
  const native: NativeSpeech = {
    supportsOnDevice: jest.fn(async () => true), startSpeech: jest.fn(async () => undefined), finishSpeech: jest.fn(async () => undefined), stop: jest.fn(async () => undefined),
    addListener(event, callback) { const callbacks = listeners.get(event) ?? []; callbacks.push(callback); listeners.set(event, callbacks); return { remove: () => listeners.set(event, callbacks.filter(c => c !== callback)) }; },
  };
  const emit = (name: string, event: TranscriptEvent & { audio?: string }) => listeners.get(name)?.forEach(callback => callback(event));
  return { native, emit, recognizer: createNativeSpeechRecognizer({} as SpeechRecognizer, native, cloud) };
};
afterEach(() => jest.useRealTimers());

test('requests both languages on one native capture, ends audio after a pause and awaits a final result', async () => {
  jest.useFakeTimers(); const { native, emit, recognizer } = setup();
  const onTranscript = jest.fn();
  const session = await recognizer.start({ locale: 'fr-FR', locales: ['fr-FR','en-US'], onDevice: true }, { onTranscript, onError: jest.fn(), onEnd: jest.fn() });
  expect(native.startSpeech).toHaveBeenCalledTimes(1); expect(native.startSpeech).toHaveBeenCalledWith(['fr-FR','en-US'], false, false);
  emit('transcript', { text: 'Emmène-moi à la maison', isFinal: false, locale: 'fr-FR' });
  jest.advanceTimersByTime(2200); expect(native.finishSpeech).toHaveBeenCalledTimes(1);
  expect(onTranscript.mock.calls.some(([event]) => event.isFinal)).toBe(false);
  emit('transcript', { text: 'amen memo', isFinal: true, locale: 'en-US', confidence: 0.9 });
  emit('transcript', { text: 'Emmène-moi à la maison', isFinal: true, locale: 'fr-FR', confidence: 0.8 });
  expect(onTranscript).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'Emmène-moi à la maison', isFinal: true }));
  await session.stop(); expect(native.stop).toHaveBeenCalledTimes(1);
});

test('opt-in cloud speech replaces a bad local final from the bounded command recording', async () => {
  const transcribe = jest.fn(async () => ({ text: 'What is the speed limit here?', isFinal: true }));
  const { native, emit, recognizer } = setup({ enabled: async () => true, transcribe });
  const onTranscript = jest.fn();
  const session = await recognizer.start({ locale: 'en-US', onDevice: true }, { onTranscript, onError: jest.fn(), onEnd: jest.fn() });
  expect(native.startSpeech).toHaveBeenCalledWith(['en-US'], false, true);
  emit('commandAudio', { audio: 'bounded-wav', text: '', isFinal: false });
  emit('transcript', { text: 'what sweet lemons hair', isFinal: true });
  await Promise.resolve(); await Promise.resolve();
  expect(onTranscript).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'What is the speed limit here?', isFinal: true }));
  await session.stop();
});

test('cancelling during transcription aborts the cloud request and ignores a late answer', async () => {
  let resolve!: (event: TranscriptEvent) => void;
  let signal!: AbortSignal;
  const { emit, recognizer } = setup({ enabled: async () => true, transcribe: (_audio, _locales, pending) => { signal = pending; return new Promise(done => { resolve = done; }); } });
  const onTranscript = jest.fn();
  const session = await recognizer.start({ locale: 'en-US', onDevice: true }, { onTranscript, onError: jest.fn(), onEnd: jest.fn() });
  emit('commandAudio', { audio: 'bounded-wav', text: '', isFinal: false });
  emit('transcript', { text: 'bad recognition', isFinal: true });
  await session.stop();
  expect(signal.aborted).toBe(true);
  resolve({ text: 'report an accident here', isFinal: true });
  await Promise.resolve(); await Promise.resolve();
  expect(onTranscript).not.toHaveBeenCalled();
});
test('stopping cancels pending endpoint work and every late transcript', async () => {
  jest.useFakeTimers(); const { native, emit, recognizer } = setup(); const onTranscript = jest.fn();
  const session = await recognizer.start({ locale: 'en-US', onDevice: true }, { onTranscript, onError: jest.fn(), onEnd: jest.fn() });
  emit('transcript', { text: 'take me', isFinal: false }); await session.stop();
  jest.runAllTimers(); emit('transcript', { text: 'take me home', isFinal: true });
  expect(native.finishSpeech).not.toHaveBeenCalled(); expect(onTranscript).toHaveBeenCalledTimes(1);
});
test('the handoff delivers only the command after the wake phrase', async () => {
  jest.useFakeTimers(); const { emit, recognizer } = setup(); const onTranscript = jest.fn();
  const session = await recognizer.start({ locale: 'en-US', onDevice: true }, { onTranscript, onError: jest.fn(), onEnd: jest.fn() });
  emit('transcript', { text: 'Hey Avyro, what is the speed limit here?', isFinal: true, locale: 'en-US' });
  expect(onTranscript).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'what is the speed limit here', isFinal: true }));
  await session.stop();
});

test('the live wake-name caption uses the brand spelling while preserving the spoken address', async () => {
  const { emit, recognizer } = setup(); const onTranscript = jest.fn();
  const session = await recognizer.start({ locale: 'fr-FR', onDevice: true }, { onTranscript, onError: jest.fn(), onEnd: jest.fn() });
  emit('transcript', { text: 'Hé Aviro, emmène-moi au 18 rue Blériau', isFinal: false, locale: 'fr-FR' });
  expect(onTranscript).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'Hé Avyro, emmène-moi au 18 rue Blériau' }));
  await session.stop();
});

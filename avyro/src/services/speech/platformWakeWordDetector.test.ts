import type { SpeechRecognizer, SpeechRecognizerEvents } from '@/core/domain/ports/speechRecognizer';
import { createPlatformWakeWordDetector } from './platformWakeWordDetector';

const setup = () => {
  let callbacks: SpeechRecognizerEvents;
  const stop = jest.fn(async () => undefined), finish = jest.fn(async () => undefined);
  const recognizer = { supportsOnDevice: async () => true, start: jest.fn(async (_options, events) => { callbacks = events; return { stop, finish }; }) } as unknown as SpeechRecognizer;
  const detector = createPlatformWakeWordDetector(recognizer, { isAvailable: async () => ({ available: false }), start: async () => { throw Error('Not selected'); } });
  return { detector, recognizer, stop, finish, events: () => callbacks! };
};
afterEach(() => jest.useRealTimers());
test('French same-breath hands-free command survives the wake handoff', async () => {
  const { detector, recognizer, events, stop } = setup();
  const onDetected = jest.fn();
  const session = await detector.start({ onDetected, onError: jest.fn() });
  expect(recognizer.start).toHaveBeenCalledWith(expect.objectContaining({ onDevice: true, locales: ['fr-FR', 'en-US'] }), expect.anything());
  events().onTranscript({ text: 'Hey Aviro, emmène-moi à Lille', isFinal: true, locale: 'fr-FR' });
  expect(onDetected).toHaveBeenCalledWith('emmene moi a lille');
  await session.stop(); expect(stop).toHaveBeenCalledTimes(1);
});
test('a partial command only requests a final result, never navigates', async () => {
  jest.useFakeTimers(); const { detector, events, finish } = setup(); const onDetected = jest.fn();
  const session = await detector.start({ onDetected, onError: jest.fn() });
  events().onTranscript({ text: 'Hey Avyro, take me to', isFinal: false });
  jest.advanceTimersByTime(1600);
  expect(finish).toHaveBeenCalledTimes(1); expect(onDetected).not.toHaveBeenCalled();
  await session.stop();
});
test('disabling cancels the delayed wake and closes microphone capture', async () => {
  jest.useFakeTimers(); const { detector, events, stop } = setup(); const onDetected = jest.fn();
  const session = await detector.start({ onDetected, onError: jest.fn() });
  events().onTranscript({ text: 'Hey Avyro', isFinal: false }); await session.stop();
  jest.runAllTimers(); expect(onDetected).not.toHaveBeenCalled(); expect(stop).toHaveBeenCalledTimes(1);
});
test('never falls back to ambient network recognition for a missing offline language', async () => {
  const start = jest.fn();
  const detector = createPlatformWakeWordDetector({ supportsOnDevice: async () => false, start } as unknown as SpeechRecognizer, { isAvailable: async () => ({ available: true }), start });
  expect((await detector.isAvailable()).available).toBe(false);
  await expect(detector.start({ onDetected: jest.fn(), onError: jest.fn() })).rejects.toThrow();
  expect(start).not.toHaveBeenCalled();
});

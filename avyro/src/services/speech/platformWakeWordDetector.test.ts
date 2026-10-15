import type { SpeechRecognizer } from '@/core/domain/ports/speechRecognizer';
import { createPlatformWakeWordDetector } from './platformWakeWordDetector';

test.each(['system', 'keyword'] as const)('%s preference never substitutes continuous dictation for missing KWS', async engine => {
  const start = jest.fn(); const keywordStart = jest.fn();
  const detector = createPlatformWakeWordDetector({ start } as unknown as SpeechRecognizer, { isAvailable: async () => ({ available: false, reason: 'Model missing' }), start: keywordStart });
  expect((await detector.isAvailable({ engine })).available).toBe(false);
  await expect(detector.start({ onDetected: jest.fn(), onError: jest.fn() }, { engine })).rejects.toThrow('Model missing');
  expect(start).not.toHaveBeenCalled(); expect(keywordStart).not.toHaveBeenCalled();
});
test('dedicated detector owns capture and its awaited release', async () => {
  const start = jest.fn(), stop = jest.fn(async () => undefined);
  const events = { onDetected: jest.fn(), onError: jest.fn() };
  const keywordStart = jest.fn(async () => ({ stop }));
  const detector = createPlatformWakeWordDetector({ start } as unknown as SpeechRecognizer, { isAvailable: async () => ({ available: true }), start: keywordStart });
  const session = await detector.start(events); await session.stop();
  expect(keywordStart).toHaveBeenCalledWith(events); expect(stop).toHaveBeenCalledTimes(1); expect(start).not.toHaveBeenCalled();
});

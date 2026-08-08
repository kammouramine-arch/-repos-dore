import {
  appendVoiceDebug,
  formatVoiceDebug,
  formatVoiceDebugTime,
  VOICE_DEBUG_LIMIT,
  type VoiceDebugEntry,
} from './voiceDebug';

const entry = (event: string, detail?: string): VoiceDebugEntry => ({
  at: 0,
  event,
  detail,
});

describe('keeping a bounded trace', () => {
  it('appends in the order things happened', () => {
    const log = [entry('microphone_started'), entry('partial_transcript')].reduce(
      appendVoiceDebug,
      [] as VoiceDebugEntry[],
    );

    expect(log.map((record) => record.event)).toEqual([
      'microphone_started',
      'partial_transcript',
    ]);
  });

  it('drops the oldest rather than growing without bound', () => {
    // A wake listener stuck in a restart loop would otherwise consume memory
    // for as long as the app is open.
    let log: VoiceDebugEntry[] = [];
    for (let i = 0; i < VOICE_DEBUG_LIMIT + 25; i += 1) {
      log = appendVoiceDebug(log, entry(`event_${i}`));
    }

    expect(log).toHaveLength(VOICE_DEBUG_LIMIT);
    expect(log[0].event).toBe('event_25');
    expect(log[log.length - 1].event).toBe(`event_${VOICE_DEBUG_LIMIT + 24}`);
  });

  it('does not mutate the log it was given', () => {
    const original: VoiceDebugEntry[] = [entry('first')];
    appendVoiceDebug(original, entry('second'));

    expect(original).toHaveLength(1);
  });
});

describe('the line a tester reads', () => {
  it('is greppable and carries the stage name', () => {
    expect(formatVoiceDebug(entry('final_transcript', '"take me home"'))).toBe(
      'VOICE_DEBUG final_transcript: "take me home"',
    );
  });

  it('omits the separator when there is no detail', () => {
    expect(formatVoiceDebug(entry('tts_finished'))).toBe('VOICE_DEBUG tts_finished');
  });

  it('timestamps to the millisecond, so stalls between stages are visible', () => {
    const at = new Date(2026, 0, 1, 9, 5, 3, 40).getTime();
    expect(formatVoiceDebugTime(at)).toBe('09:05:03.040');
  });
});

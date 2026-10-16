import type { VoiceDebugEntry } from './voiceDebug';
import { measureTurn, median, splitTurns, summariseLatency } from './voiceLatency';

const e = (at: number, event: string, detail?: string): VoiceDebugEntry => ({ at, event, detail });

/** A synthetic trace of one wake-to-reply turn, timestamps in ms. */
const TURN = [
  e(0, 'conversation_status', 'listening'),
  e(180, 'command_session_started'),
  e(900, 'partial_transcript'),
  e(2600, 'final_transcript'),
  e(2610, 'conversation_status', 'thinking'),
  e(3400, 'ai_response_received'),
  e(3420, 'conversation_status', 'speaking'),
  e(3450, 'tts_started'),
  e(5900, 'tts_finished'),
  e(5905, 'conversation_status', 'idle'),
];

describe('measuring a spoken turn', () => {
  it('attributes time to each stage', () => {
    expect(measureTurn(TURN)).toEqual({
      toMicrophoneMs: 180,
      speakingMs: 1700,
      understandingMs: 800,
      toSpeechMs: 50,
      responseMs: 850,
      speakingReplyMs: 2450,
    });
  });

  it('counts a watchdog-ended reply as finished', () => {
    const trace = [...TURN.slice(0, 8), e(9000, 'ERROR tts_watchdog_fired')];
    expect(measureTurn(trace).speakingReplyMs).toBe(5550);
  });

  it('leaves missing stages null rather than inventing them', () => {
    const cancelled = [e(0, 'conversation_status', 'listening'), e(150, 'command_session_started'), e(4000, 'conversation_status', 'cancelled')];
    const m = measureTurn(cancelled);
    expect(m.toMicrophoneMs).toBe(150);
    expect(m.responseMs).toBeNull();
    expect(m.understandingMs).toBeNull();
  });
});

describe('several turns', () => {
  it('splits on each new listening turn and reports medians', () => {
    const second = TURN.map((x) => ({ ...x, at: x.at + 10_000 + (x.event === 'ai_response_received' ? 400 : 0) }));
    const summary = summariseLatency([e(-50, 'voice_opened'), ...TURN, ...second]);
    expect(splitTurns([...TURN, ...second])).toHaveLength(2);
    expect(summary.turns).toBe(2);
    expect(summary.median.understandingMs).toBe(1000);
  });

  it('median ignores nulls', () => {
    expect(median([null, 3, 1, null, 2])).toBe(2);
    expect(median([null])).toBeNull();
  });
});

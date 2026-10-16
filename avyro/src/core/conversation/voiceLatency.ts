import type { VoiceDebugEntry } from './voiceDebug';

/**
 * Where the time goes in one spoken turn, measured from the voice trace.
 *
 * Every stage is already logged with a timestamp; this turns those records
 * into durations so latency is measured, not guessed, on the phone itself.
 * Each figure is null when its stage did not happen in that turn (a tap
 * instead of a wake, a command with no spoken reply, a cancelled turn).
 */
export interface TurnLatency {
  /** Turn begins (wake or tap) → command microphone open. */
  toMicrophoneMs: number | null;
  /** First words heard → committed transcript (speaking time + end-pointing). */
  speakingMs: number | null;
  /** Committed transcript → answer ready (parser, assistant, place search). */
  understandingMs: number | null;
  /** Answer ready → first audio requested from the speech engine. */
  toSpeechMs: number | null;
  /** Committed transcript → speech starts: what the driver feels as "lag". */
  responseMs: number | null;
  /** Speech start → speech finished (or the watchdog). */
  speakingReplyMs: number | null;
}

const first = (entries: readonly VoiceDebugEntry[], match: (e: VoiceDebugEntry) => boolean) =>
  entries.find(match)?.at ?? null;

const span = (from: number | null, to: number | null) =>
  from != null && to != null && to >= from ? to - from : null;

/** Splits the trace into turns: each starts when the conversation starts listening. */
export const splitTurns = (entries: readonly VoiceDebugEntry[]): VoiceDebugEntry[][] => {
  const turns: VoiceDebugEntry[][] = [];
  for (const entry of entries) {
    if (entry.event === 'conversation_status' && entry.detail === 'listening') turns.push([entry]);
    else turns.at(-1)?.push(entry);
  }
  return turns;
};

export const measureTurn = (turn: readonly VoiceDebugEntry[]): TurnLatency => {
  const start = turn[0]?.at ?? null;
  const microphone = first(turn, (e) => e.event === 'command_session_started');
  const firstWords = first(turn, (e) => e.event === 'partial_transcript' || e.event === 'final_transcript');
  const committed = first(turn, (e) => e.event === 'final_transcript');
  const answered = first(turn, (e) => e.event === 'ai_response_received');
  const speech = first(turn, (e) => e.event === 'tts_started');
  const finished = first(turn, (e) => e.event === 'tts_finished' || e.event === 'ERROR tts_watchdog_fired' || e.event === 'tts_abandoned');
  return {
    toMicrophoneMs: span(start, microphone),
    speakingMs: span(firstWords, committed),
    understandingMs: span(committed, answered),
    toSpeechMs: span(answered, speech),
    responseMs: span(committed, speech),
    speakingReplyMs: span(speech, finished),
  };
};

/** Median of the non-null values, or null. */
export const median = (values: readonly (number | null)[]): number | null => {
  const sorted = values.filter((v): v is number => v != null).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

export const summariseLatency = (entries: readonly VoiceDebugEntry[]) => {
  const turns = splitTurns(entries).map(measureTurn);
  const keys: (keyof TurnLatency)[] = ['toMicrophoneMs', 'speakingMs', 'understandingMs', 'toSpeechMs', 'responseMs', 'speakingReplyMs'];
  return {
    turns: turns.length,
    last: turns.at(-1) ?? null,
    median: Object.fromEntries(keys.map((k) => [k, median(turns.map((t) => t[k]))])) as Record<keyof TurnLatency, number | null>,
  };
};

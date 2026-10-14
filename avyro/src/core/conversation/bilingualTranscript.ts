import type { TranscriptEvent } from '@/core/domain/ports/speechRecognizer';
import { parseCommand } from './commandParser';
import { drivingSafetyReply } from './drivingSafety';
import { matchWakePhrase } from './wakePhrase';

/** Never promote partial guesses into route changes. Compare committed results only. */
export const selectBilingualTranscript = (candidates: readonly TranscriptEvent[]): TranscriptEvent | null => {
  const finals = candidates.filter(c => c.isFinal && c.text.trim());
  const commandFor = (candidate: TranscriptEvent) => matchWakePhrase(candidate.text, candidate.locale)?.remainder || candidate.text;
  const refusals = finals.filter(candidate => drivingSafetyReply(commandFor(candidate)));
  if (refusals.length) return refusals.reduce((best, candidate) => (candidate.confidence ?? 0) > (best.confidence ?? 0) ? candidate : best);
  const understood = finals.map(candidate => parseCommand(commandFor(candidate))).filter(intent => intent.kind !== 'unknown');
  const keys = new Set(understood.map(intent => JSON.stringify(intent)));
  const changesRoute = understood.some(intent => ['navigate-saved','navigate-to-place','navigate-referent','cancel-navigation','reroute','restore-destination'].includes(intent.kind));
  if (changesRoute && keys.size > 1) return null;
  const rank = (candidate: TranscriptEvent) => {
    const text = commandFor(candidate);
    return (matchWakePhrase(candidate.text, candidate.locale) ? 100 : 0) + (drivingSafetyReply(text) ? 30 : parseCommand(text).kind !== 'unknown' ? 20 : 0) + (candidate.confidence ?? 0);
  };
  return finals.reduce<TranscriptEvent | null>((best, candidate) => !best || rank(candidate) > rank(best) ? candidate : best, null);
};

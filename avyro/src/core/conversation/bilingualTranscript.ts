import type { TranscriptEvent } from '@/core/domain/ports/speechRecognizer';
import { parseCommand } from './commandParser';
import { drivingSafetyReply } from './drivingSafety';
import { matchWakePhrase } from './wakePhrase';

/** Never promote partial guesses into route changes. Compare committed results only. */
export const selectBilingualTranscript = (candidates: readonly TranscriptEvent[]): TranscriptEvent | null => {
  const finals = candidates.filter(c => c.isFinal && c.text.trim());
  const rank = (candidate: TranscriptEvent) => {
    const text = matchWakePhrase(candidate.text, candidate.locale)?.remainder || candidate.text;
    return (matchWakePhrase(candidate.text, candidate.locale) ? 100 : 0) + (drivingSafetyReply(text) ? 30 : parseCommand(text).kind !== 'unknown' ? 20 : 0) + (candidate.confidence ?? 0);
  };
  return finals.reduce<TranscriptEvent | null>((best, candidate) => !best || rank(candidate) > rank(best) ? candidate : best, null);
};

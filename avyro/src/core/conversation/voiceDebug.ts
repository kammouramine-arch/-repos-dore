/**
 * TEMPORARY — voice pipeline diagnostics.
 *
 * Added to find why voice commands do nothing on a real device. Every stage of
 * the pipeline reports here, the records are kept in memory, and Settings shows
 * them so a tester on Windows — who cannot attach Console.app or Xcode to an
 * iPhone — can read the trace on the phone itself.
 *
 * Remove this module, its store slice, its panel and its call sites once the
 * real-device failure is understood. It is not part of the product.
 */

export interface VoiceDebugEntry {
  /** Wall clock, for ordering and for spotting stalls between stages. */
  at: number;
  /** A stable snake_case stage name, e.g. `final_transcript`. */
  event: string;
  detail?: string;
}

/**
 * How many records are kept.
 *
 * A wake listener that restarts in a loop would otherwise grow this without
 * bound; the last hundred entries are what a failure looks like anyway.
 */
export const VOICE_DEBUG_LIMIT = 120;

/** Appends, oldest dropped first. Pure, so the ring behaviour is testable. */
export const appendVoiceDebug = (
  log: readonly VoiceDebugEntry[],
  entry: VoiceDebugEntry,
): VoiceDebugEntry[] => {
  const next = [...log, entry];
  return next.length > VOICE_DEBUG_LIMIT ? next.slice(next.length - VOICE_DEBUG_LIMIT) : next;
};

/** The line as it appears in device logs and in the panel. */
export const formatVoiceDebug = ({ event, detail }: VoiceDebugEntry): string =>
  detail === undefined ? `VOICE_DEBUG ${event}` : `VOICE_DEBUG ${event}: ${detail}`;

/** `12:34:56.789`, so gaps between stages are readable at a glance. */
export const formatVoiceDebugTime = (at: number): string => {
  const time = new Date(at);
  const pad = (value: number, width = 2) => String(value).padStart(width, '0');

  return `${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}.${pad(
    time.getMilliseconds(),
    3,
  )}`;
};

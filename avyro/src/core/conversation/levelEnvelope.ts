/**
 * Turns raw microphone levels into a calm, readable "I hear you" signal.
 *
 * The native capture reports RMS energy about eight times a second, mapped to
 * 0–1. Shown raw it flickers with every engine rumble and stays lit in a
 * noisy car even when nobody speaks. Three stages fix that:
 *
 * 1. **Noise floor.** Tracks the quietest recent level, rising only slowly,
 *    so road and fan noise become the new zero within a few seconds.
 * 2. **Gate.** Only energy clearly above that floor counts as voice.
 * 3. **Envelope.** Rises fast (speech onsets feel immediate) and falls slowly
 *    (no strobe between syllables).
 *
 * Pure: the same input sequence always yields the same output, and every
 * behaviour above is asserted in tests.
 */

export interface LevelEnvelopeState {
  floor: number;
  value: number;
}

export const initialLevelEnvelope: LevelEnvelopeState = { floor: 0.2, value: 0 };

/** How fast the floor may rise toward louder ambient noise, per second. */
const FLOOR_RISE_PER_S = 0.04;
/** Energy must exceed the floor by this much before it counts as voice. */
const GATE = 0.08;
const ATTACK_MS = 70;
const RELEASE_MS = 320;

export const stepLevelEnvelope = (
  state: LevelEnvelopeState,
  rawLevel: number,
  dtMs: number,
): LevelEnvelopeState => {
  const level = Number.isFinite(rawLevel) ? Math.max(0, Math.min(1, rawLevel)) : 0;
  const dt = Math.max(0, Math.min(1000, dtMs));

  // The floor drops instantly to anything quieter and creeps up otherwise.
  const floor = level < state.floor ? level : Math.min(level, state.floor + (FLOOR_RISE_PER_S * dt) / 1000);

  const headroom = Math.max(0.1, 1 - floor - GATE);
  const target = Math.max(0, Math.min(1, (level - floor - GATE) / headroom));

  const tau = target > state.value ? ATTACK_MS : RELEASE_MS;
  const value = state.value + (target - state.value) * (1 - Math.exp(-dt / tau));
  return { floor, value };
};

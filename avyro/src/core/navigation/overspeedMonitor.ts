/**
 * Whether the driver is over the speed limit, and whether to tell them.
 *
 * Pure, so every rule below is asserted by recorded-fixture tests rather than
 * by asking anyone to speed. The previous check compared a single fix against
 * the limit with no margin: GPS jitter of ±1 km/h around 50 flipped the panel
 * red/white every second and re-armed the warning after each dip.
 *
 * Rules:
 * - **Never on an unknown limit.** No limit, no speed, or a poor fix → not over.
 * - **Hysteresis.** Enter above limit + ENTER margin, sustained; leave only
 *   once at or below limit + EXIT margin, sustained. Jitter cannot toggle it.
 * - **Accuracy gate.** Fixes worse than MAX_ACCURACY_M do not count either way;
 *   they neither start nor end an episode.
 * - **Cooldown.** One alert per episode, and episodes closer than COOLDOWN_MS
 *   apart stay silent — unless the limit has dropped, which is new information.
 * - **Units.** Thresholds are applied in the limit's own unit.
 */

export interface SpeedLimitValue {
  value: number;
  unit: 'km/h' | 'mph';
}

export interface OverspeedSample {
  /** Measured speed in m/s, or null when unknown. */
  speed: number | null;
  /** Horizontal accuracy in metres, or null when unknown. */
  accuracy: number | null;
  /** The limit in force, or null when it is not known. */
  limit: SpeedLimitValue | null;
  now: number;
}

export interface OverspeedState {
  over: boolean;
  /** When the current run of samples on the other side of the threshold began. */
  pendingSince: number | null;
  lastAlertAt: number | null;
  /** The limit (km/h) that the last alert was about. */
  lastAlertLimitKmh: number | null;
}

export const initialOverspeedState: OverspeedState = {
  over: false,
  pendingSince: null,
  lastAlertAt: null,
  lastAlertLimitKmh: null,
};

/** Above the limit by this much (in the limit's unit) before it counts. */
export const ENTER_MARGIN = { 'km/h': 3, mph: 2 } as const;
/** At or below limit + this to count as back under. */
export const EXIT_MARGIN = { 'km/h': 1, mph: 1 } as const;
/** How long a condition must hold before the state changes. */
export const SUSTAIN_MS = 2_000;
export const COOLDOWN_MS = 60_000;
export const MAX_ACCURACY_M = 20;

const MS_PER = { 'km/h': 1 / 3.6, mph: 1609.344 / 3600 } as const;

const toKmh = (limit: SpeedLimitValue) =>
  limit.unit === 'mph' ? limit.value * 1.609344 : limit.value;

export interface OverspeedResult {
  state: OverspeedState;
  /** True exactly once, on the sample that should trigger an alert. */
  alert: boolean;
}

export const updateOverspeed = (
  state: OverspeedState,
  { speed, accuracy, limit, now }: OverspeedSample,
): OverspeedResult => {
  // Unknown limit or speed: there is nothing to warn about, and nothing pending.
  if (!limit || speed == null || !Number.isFinite(speed) || speed < 0) {
    return { state: { ...state, over: false, pendingSince: null }, alert: false };
  }
  // A poor fix is not evidence either way. Hold the current state.
  if (accuracy == null || !Number.isFinite(accuracy) || accuracy > MAX_ACCURACY_M) {
    return { state: { ...state, pendingSince: null }, alert: false };
  }

  const perUnit = MS_PER[limit.unit];
  const enter = (limit.value + ENTER_MARGIN[limit.unit]) * perUnit;
  const exit = (limit.value + EXIT_MARGIN[limit.unit]) * perUnit;

  const limitKmh = toKmh(limit);

  // Already over, and the limit has just dropped beneath the one the driver
  // was told about (50 → 30 zone): that is new information, said once.
  if (state.over && state.lastAlertLimitKmh != null && limitKmh < state.lastAlertLimitKmh - 0.5 && speed > enter + 1e-9) {
    return {
      state: { ...state, pendingSince: null, lastAlertAt: now, lastAlertLimitKmh: limitKmh },
      alert: true,
    };
  }

  const wantsChange = state.over ? speed <= exit + 1e-9 : speed > enter + 1e-9;
  if (!wantsChange) return { state: { ...state, pendingSince: null }, alert: false };

  const since = state.pendingSince ?? now;
  if (now - since < SUSTAIN_MS) {
    return { state: { ...state, pendingSince: since }, alert: false };
  }

  if (state.over) {
    return { state: { ...state, over: false, pendingSince: null }, alert: false };
  }

  const coolingDown = state.lastAlertAt != null && now - state.lastAlertAt < COOLDOWN_MS;
  const limitDropped = state.lastAlertLimitKmh != null && limitKmh < state.lastAlertLimitKmh - 0.5;
  const alert = !coolingDown || limitDropped;

  return {
    state: {
      over: true,
      pendingSince: null,
      lastAlertAt: alert ? now : state.lastAlertAt,
      lastAlertLimitKmh: alert ? limitKmh : state.lastAlertLimitKmh,
    },
    alert,
  };
};

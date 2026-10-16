import {
  COOLDOWN_MS,
  initialOverspeedState,
  updateOverspeed,
  type OverspeedSample,
  type OverspeedState,
  type SpeedLimitValue,
} from './overspeedMonitor';

/**
 * Fixture-driven: every trace below is synthetic, one sample a second. Nobody
 * is asked to drive above a limit to produce these.
 */
const kmh = (value: number) => value / 3.6;
const L50: SpeedLimitValue = { value: 50, unit: 'km/h' };
const L30: SpeedLimitValue = { value: 30, unit: 'km/h' };

const replay = (
  speedsKmh: (number | null)[],
  limit: SpeedLimitValue | null | ((i: number) => SpeedLimitValue | null),
  { accuracy = 5, start = 0, state = initialOverspeedState }: { accuracy?: number | ((i: number) => number); start?: number; state?: OverspeedState } = {},
) => {
  const overs: boolean[] = [];
  const alerts: number[] = [];
  let current = state;
  speedsKmh.forEach((value, i) => {
    const sample: OverspeedSample = {
      speed: value == null ? null : kmh(value),
      accuracy: typeof accuracy === 'function' ? accuracy(i) : accuracy,
      limit: typeof limit === 'function' ? limit(i) : limit,
      now: start + i * 1000,
    };
    const result = updateOverspeed(current, sample);
    current = result.state;
    overs.push(current.over);
    if (result.alert) alerts.push(i);
  });
  return { overs, alerts, state: current };
};

describe('never warns without a known limit', () => {
  it('stays silent at any speed when the limit is unknown', () => {
    const { overs, alerts } = replay([90, 95, 100, 110, 120], null);
    expect(overs.every((o) => !o)).toBe(true);
    expect(alerts).toEqual([]);
  });

  it('clears immediately when the limit becomes unknown mid-episode', () => {
    const { overs } = replay([60, 60, 60, 60, 60], (i) => (i < 3 ? L50 : null));
    expect(overs.at(-1)).toBe(false);
  });
});

describe('hysteresis', () => {
  it('ignores jitter around the limit', () => {
    // 49–52 km/h wobble: within the 3 km/h entry margin, never "over".
    const { overs, alerts } = replay([49, 51, 50, 52, 49, 52, 51, 50, 52, 51], L50);
    expect(overs.every((o) => !o)).toBe(true);
    expect(alerts).toEqual([]);
  });

  it('needs the excess to be sustained', () => {
    // A single 58 km/h spike is not an excess.
    const { overs } = replay([48, 58, 48, 48], L50);
    expect(overs.every((o) => !o)).toBe(true);
  });

  it('enters after a sustained excess and alerts exactly once', () => {
    const { overs, alerts } = replay([50, 56, 56, 56, 57, 56, 57, 56], L50);
    expect(overs.indexOf(true)).toBe(3); // 2 s after the first 56
    expect(alerts).toEqual([3]);
  });

  it('does not flap back and forth while hovering just above the limit', () => {
    // Over, then hovering at 51–52: above the exit threshold, stays over, one alert.
    const { overs, alerts } = replay([56, 56, 56, 52, 51, 52, 51, 52], L50);
    expect(overs.slice(2)).toEqual([true, true, true, true, true, true]);
    expect(alerts).toEqual([2]);
  });

  it('leaves once back under for long enough', () => {
    const { overs } = replay([56, 56, 56, 48, 48, 48, 48], L50);
    expect(overs.at(-1)).toBe(false);
  });
});

describe('cooldown', () => {
  it('does not nag on repeated short excesses', () => {
    const trace = [56, 56, 56, 45, 45, 45, 56, 56, 56, 45, 45, 45, 56, 56, 56];
    const { alerts } = replay(trace, L50);
    expect(alerts).toEqual([2]);
  });

  it('warns again after the cooldown', () => {
    const first = replay([56, 56, 56, 45, 45, 45], L50);
    const later = replay([56, 56, 56], L50, { state: first.state, start: COOLDOWN_MS + 10_000 });
    expect(later.alerts).toEqual([2]);
  });

  it('warns immediately when the limit drops, even inside the cooldown', () => {
    // 50 zone then a 30 zone: the lower limit is new information.
    const { alerts } = replay([56, 56, 56, 45, 45, 45, 45, 45, 45], (i) => (i < 4 ? L50 : L30));
    expect(alerts).toEqual([2, 4]); // the sample the 30 limit first applies
  });
});

describe('GPS accuracy', () => {
  it('does not start an episode from poor fixes', () => {
    const { overs } = replay([70, 70, 70, 70], L50, { accuracy: 45 });
    expect(overs.every((o) => !o)).toBe(true);
  });

  it('does not end an episode because of a poor fix either', () => {
    const { overs } = replay([60, 60, 60, 20, 20], L50, { accuracy: (i) => (i >= 3 ? 50 : 5) });
    expect(overs.at(-1)).toBe(true);
  });
});

describe('units', () => {
  it('applies a mph limit in mph', () => {
    const mph30: SpeedLimitValue = { value: 30, unit: 'mph' };
    // 30 mph ≈ 48.3 km/h. 50 km/h ≈ 31.1 mph: inside the 2 mph margin.
    expect(replay([50, 50, 50, 50], mph30).overs.at(-1)).toBe(false);
    // 55 km/h ≈ 34.2 mph: over.
    expect(replay([55, 55, 55, 55], mph30).overs.at(-1)).toBe(true);
  });
});

import type { NavigationProgress } from '@/core/domain/entities/navigation';
import type { RouteStep } from '@/core/domain/entities/route';
import { initialAnnouncerState, nextAnnouncement } from './guidanceAnnouncer';

const step = (overrides: Partial<RouteStep> = {}): RouteStep => ({
  id: 'step-1',
  instruction: 'Turn right onto Rue de Rivoli',
  maneuver: 'turn-right',
  distanceMeters: 2_000,
  durationSeconds: 180,
  location: { latitude: 48.86, longitude: 2.3 },
  ...overrides,
});

const progressAt = (
  distanceToManeuverMeters: number,
  overrides: Partial<NavigationProgress> = {},
): NavigationProgress => ({
  stepIndex: 0,
  currentStep: step(),
  nextStep: null,
  distanceToManeuverMeters,
  remainingDistanceMeters: distanceToManeuverMeters + 500,
  remainingDurationSeconds: 120,
  snappedPosition: { latitude: 48.86, longitude: 2.3 },
  segmentIndex: 0,
  distanceFromRouteMeters: 3,
  courseDegrees: 90,
  hasArrived: false,
  ...overrides,
});

describe('nextAnnouncement', () => {
  it('says nothing while the maneuver is far away', () => {
    const { text } = nextAnnouncement(progressAt(1_800), initialAnnouncerState, 'metric');
    expect(text).toBeNull();
  });

  it('announces each threshold once, in order', () => {
    let state = initialAnnouncerState;

    const first = nextAnnouncement(progressAt(1_400), state, 'metric');
    state = first.state;
    expect(first.text).toBe('In 1.4 kilometers, turn right onto Rue de Rivoli');

    const repeat = nextAnnouncement(progressAt(1_300), state, 'metric');
    state = repeat.state;
    expect(repeat.text).toBeNull();

    const second = nextAnnouncement(progressAt(480), state, 'metric');
    expect(second.text).toBe('In 480 meters, turn right onto Rue de Rivoli');
  });

  it('drops the distance prefix on the final call', () => {
    let state = initialAnnouncerState;
    for (const distance of [1_400, 480, 170]) {
      state = nextAnnouncement(progressAt(distance), state, 'metric').state;
    }

    const { text } = nextAnnouncement(progressAt(40), state, 'metric');
    expect(text).toBe('Turn right onto Rue de Rivoli');
  });

  it('collapses skipped thresholds into one announcement', () => {
    // A slow fix rate can jump straight from 600 m to 60 m. The driver should
    // hear where they actually are, once — not a burst of stale instructions.
    const jumped = nextAnnouncement(progressAt(60), initialAnnouncerState, 'metric');
    expect(jumped.text).toBe('In 60 meters, turn right onto Rue de Rivoli');

    const settled = nextAnnouncement(progressAt(50), jumped.state, 'metric');
    expect(settled.text).toBeNull();

    // The closest threshold is still owed, and arrives without a distance.
    expect(nextAnnouncement(progressAt(30), settled.state, 'metric').text).toBe(
      'Turn right onto Rue de Rivoli',
    );
  });

  it('never offers a threshold longer than the step itself', () => {
    const shortStep = progressAt(150, { currentStep: step({ distanceMeters: 200 }) });
    const { text } = nextAnnouncement(shortStep, initialAnnouncerState, 'metric');

    expect(text).toBe('In 150 meters, turn right onto Rue de Rivoli');
  });

  it('resets its thresholds on a new step', () => {
    const first = nextAnnouncement(progressAt(480), initialAnnouncerState, 'metric');

    const onNextStep = nextAnnouncement(
      progressAt(480, { stepIndex: 1, currentStep: step({ id: 'step-2' }) }),
      first.state,
      'metric',
    );

    expect(onNextStep.text).toBe('In 480 meters, turn right onto Rue de Rivoli');
  });

  it('speaks in feet and miles when the driver asked for them', () => {
    const { text } = nextAnnouncement(progressAt(1_400), initialAnnouncerState, 'imperial');
    expect(text).toBe('In 0.9 miles, turn right onto Rue de Rivoli');
  });

  it('announces arrival exactly once', () => {
    const arrival = progressAt(0, { hasArrived: true });
    const first = nextAnnouncement(arrival, initialAnnouncerState, 'metric');

    expect(first.text).toBe('You have arrived at your destination.');
    expect(nextAnnouncement(arrival, first.state, 'metric').text).toBeNull();
  });
});

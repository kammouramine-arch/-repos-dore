import { RECOMMENDATION } from '@/config';
import type { StopSuggestion } from '@/core/domain/entities/conversation';
import type { Place } from '@/core/domain/entities/place';
import { isHighlyRated, rankStops, scoreStop } from './rankStops';

const place = (id: string, rating?: number): Place => ({
  id,
  name: id,
  address: `${id} street`,
  coordinates: { latitude: 48.86, longitude: 2.3 },
  category: 'place',
  rating,
});

const stop = (
  id: string,
  overrides: Partial<StopSuggestion> & { rating?: number } = {},
): StopSuggestion => ({
  place: place(id, overrides.rating),
  detourSeconds: 180,
  detourMeters: 400,
  isAhead: true,
  directDistanceMeters: 800,
  ...overrides,
});

const names = (stops: StopSuggestion[]) => stops.map((s) => s.place.id);

describe('what the driver is actually paying', () => {
  it('prefers the shorter detour when everything else is equal', () => {
    const ranked = rankStops(
      [stop('slow', { detourSeconds: 480 }), stop('quick', { detourSeconds: 60 })],
      { hasRoute: true },
    );

    expect(names(ranked)).toEqual(['quick', 'slow']);
  });

  it('prefers a stop on the route over one off it', () => {
    // Same detour on paper; being on the way still wins, because a stop off the
    // route means leaving it and rejoining.
    const ranked = rankStops(
      [stop('off', { isAhead: false }), stop('ahead', { isAhead: true })],
      { hasRoute: true },
    );

    expect(names(ranked)).toEqual(['ahead', 'off']);
  });

  it('refuses to offer a detour that is not worth making', () => {
    const ranked = rankStops(
      [
        stop('absurd', { detourSeconds: RECOMMENDATION.maxDetourSeconds + 1 }),
        stop('sensible', { detourSeconds: 120 }),
      ],
      { hasRoute: true },
    );

    // Offering a twenty-minute detour for coffee is a worse answer than none.
    expect(names(ranked)).toEqual(['sensible']);
  });

  it('can come back with nothing rather than something silly', () => {
    expect(rankStops([stop('far', { detourSeconds: 3_600 })], { hasRoute: true })).toEqual(
      [],
    );
  });
});

describe('quality breaks ties, it does not win arguments', () => {
  it('prefers the better-rated of two equal stops', () => {
    const ranked = rankStops(
      [stop('ok', { rating: 3.6 }), stop('great', { rating: 4.8 })],
      { hasRoute: true },
    );

    expect(names(ranked)).toEqual(['great', 'ok']);
  });

  it('does not send the driver far out of their way for half a star', () => {
    const ranked = rankStops(
      [
        stop('great-but-far', { rating: 5, detourSeconds: 480 }),
        stop('fine-and-close', { rating: 4, detourSeconds: 60 }),
      ],
      { hasRoute: true },
    );

    expect(names(ranked)[0]).toBe('fine-and-close');
  });

  it('treats a missing rating as neutral, not as bad', () => {
    // Most open map data has no rating; penalising it would rank every unrated
    // café behind a mediocre reviewed one.
    const unrated = scoreStop(stop('unrated'), true);
    const mediocre = scoreStop(stop('mediocre', { rating: 2.5 }), true);
    const good = scoreStop(stop('good', { rating: 4.5 }), true);

    expect(unrated).toBeGreaterThan(mediocre);
    expect(unrated).toBeLessThan(good);
  });
});

describe('with no trip planned', () => {
  it('falls back to proximity, because there is no detour to measure', () => {
    const ranked = rankStops(
      [
        stop('far', { directDistanceMeters: 4_000 }),
        stop('near', { directDistanceMeters: 300 }),
      ],
      { hasRoute: false },
    );

    expect(names(ranked)).toEqual(['near', 'far']);
  });

  it('keeps every candidate, since the detour filter means nothing', () => {
    const ranked = rankStops([stop('a', { detourSeconds: 9_999 })], {
      hasRoute: false,
    });

    expect(ranked).toHaveLength(1);
  });
});

describe('isHighlyRated', () => {
  it('only says so when it is true', () => {
    expect(isHighlyRated(4.6)).toBe(true);
    expect(isHighlyRated(3.9)).toBe(false);
    expect(isHighlyRated(undefined)).toBe(false);
  });
});

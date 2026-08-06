import { buildRouteContext } from '@/core/conversation/routeContext';
import type { RouteContext } from '@/core/domain/entities/conversation';
import type { NavigationProgress } from '@/core/domain/entities/navigation';
import type { Place } from '@/core/domain/entities/place';
import type { Logger } from '@/core/domain/ports/logger';
import type { PlacesProvider } from '@/core/domain/ports/placesProvider';
import type { SavedPlacesRepository } from '@/core/domain/ports/savedPlacesRepository';
import type { Route } from '@/core/domain/entities/route';
import { createLocalConversationProvider } from './localConversationProvider';

const ORIGIN = { latitude: 48.86, longitude: 2.3 };

const place = (id: string, name: string, longitude: number): Place => ({
  id,
  name,
  address: `${name}, Paris`,
  coordinates: { latitude: 48.86, longitude },
  category: 'place',
});

const HOME = place('home', 'Home', 2.29);
const NEAR = place('near', 'Café Voisin', 2.302);
const FAR = place('far', 'Café Lointain', 2.36);

const ROUTE: Route = {
  id: 'r1',
  distanceMeters: 12_000,
  durationSeconds: 1_500,
  geometry: [ORIGIN, { latitude: 48.85, longitude: 2.37 }],
  summary: 'Quai',
  steps: [
    {
      id: 's1',
      instruction: 'Arrive at your destination',
      maneuver: 'arrive',
      distanceMeters: 12_000,
      durationSeconds: 1_500,
      location: { latitude: 48.85, longitude: 2.37 },
    },
  ],
};

const silentLogger = (): Logger => {
  const logger: Logger = {
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    scoped: () => logger,
  };
  return logger;
};

const savedPlaces = (seed: Partial<Record<'home' | 'work', Place>> = {}) => {
  const saved = { ...seed };
  const repository: SavedPlacesRepository = {
    async get(slot) {
      return saved[slot] ?? null;
    },
    async set(slot, value) {
      saved[slot] = value;
    },
    async clear(slot) {
      delete saved[slot];
    },
  };
  return repository;
};

const places = (results: Place[] | Error): PlacesProvider => ({
  async search() {
    if (results instanceof Error) throw results;
    return results;
  },
});

const build = (options: {
  saved?: Partial<Record<'home' | 'work', Place>>;
  results?: Place[] | Error;
} = {}) =>
  createLocalConversationProvider({
    placesProvider: places(options.results ?? []),
    savedPlaces: savedPlaces(options.saved),
    logger: silentLogger(),
  });

const guiding = (progress?: Partial<NavigationProgress>): RouteContext =>
  buildRouteContext({
    navigationState: 'guiding',
    destination: place('dest', 'Gare de Lyon', 2.37),
    route: ROUTE,
    progress: {
      remainingDistanceMeters: 4_200,
      remainingDurationSeconds: 600,
      ...progress,
    } as NavigationProgress,
    distanceUnit: 'metric',
    now: new Date('2026-01-01T09:00:00Z').getTime(),
  });

const idle = (): RouteContext =>
  buildRouteContext({
    navigationState: 'idle',
    destination: null,
    route: null,
    progress: null,
    distanceUnit: 'metric',
  });

const ask = (
  provider: ReturnType<typeof build>,
  transcript: string,
  context: RouteContext = guiding(),
  origin: typeof ORIGIN | null = ORIGIN,
) => provider.respond({ transcript, context, origin });

describe('questions about the trip', () => {
  it('answers how long is left', async () => {
    const reply = await ask(build(), 'how long until I arrive');

    expect(reply.intent).toEqual({ kind: 'ask-eta' });
    expect(reply.speech).toContain('10 min');
    expect(reply.action).toEqual({ type: 'none' });
  });

  it('answers how far is left, in the driver’s units', async () => {
    const reply = await ask(build(), 'how far is it');

    expect(reply.speech).toContain('4.2 km');
    expect(reply.speech).toContain('Gare de Lyon');
  });

  it('says plainly when there is no trip to report on', async () => {
    const reply = await ask(build(), 'how far is it', idle());

    expect(reply.speech).toBe('No trip is running right now.');
  });
});

describe('control commands', () => {
  it('cancels a running trip', async () => {
    const reply = await ask(build(), 'cancel navigation');

    expect(reply.action).toEqual({ type: 'cancel-navigation' });
    expect(reply.speech).toBe('Navigation cancelled.');
  });

  it('does not pretend to cancel a trip that is not running', async () => {
    const reply = await ask(build(), 'cancel navigation', idle());

    expect(reply.action).toEqual({ type: 'none' });
    expect(reply.speech).toBe('There is no trip to cancel.');
  });

  it('reroutes a running trip', async () => {
    const reply = await ask(build(), 'reroute');
    expect(reply.action).toEqual({ type: 'reroute' });
  });

  it('has nothing to reroute when idle', async () => {
    const reply = await ask(build(), 'reroute', idle());
    expect(reply.action).toEqual({ type: 'none' });
  });
});

describe('saved places', () => {
  it('navigates home when home is known', async () => {
    const reply = await ask(build({ saved: { home: HOME } }), 'take me home');

    expect(reply.speech).toBe('Heading home.');
    expect(reply.action).toEqual({ type: 'navigate-to', place: HOME });
  });

  it('says where to set it when home is not known', async () => {
    const reply = await ask(build(), 'take me home');

    expect(reply.action).toEqual({ type: 'none' });
    expect(reply.speech).toContain('Settings');
  });
});

describe('nearby search', () => {
  it('picks the closest result, not the first one returned', async () => {
    const reply = await ask(build({ results: [FAR, NEAR] }), 'find coffee');

    expect(reply.action).toEqual({ type: 'navigate-to', place: NEAR });
    expect(reply.speech).toContain('Café Voisin');
  });

  it('says so when there is nothing nearby', async () => {
    const reply = await ask(build({ results: [] }), 'find parking');

    expect(reply.action).toEqual({ type: 'none' });
    expect(reply.speech).toBe('I could not find parking nearby.');
  });

  it('needs a position before it can search', async () => {
    const reply = await ask(build({ results: [NEAR] }), 'find fuel', guiding(), null);

    expect(reply.speech).toBe('I need your location before I can search nearby.');
  });

  it('degrades gracefully when the search fails', async () => {
    const reply = await ask(build({ results: new Error('offline') }), 'find restaurants');

    expect(reply.action).toEqual({ type: 'none' });
    expect(reply.speech).toBe('I could not search just now. Try again in a moment.');
  });
});

describe('the limits of the local provider', () => {
  it('admits what it cannot do, rather than guessing', async () => {
    const reply = await ask(build(), 'play some music');

    expect(reply.intent).toEqual({ kind: 'unknown' });
    expect(reply.speech).toBe('Sorry, I cannot help with that yet.');
    expect(reply.action).toEqual({ type: 'none' });
  });

  it('identifies itself, so a swapped provider is visible in logs', () => {
    expect(build().name).toBe('local-commands');
  });
});

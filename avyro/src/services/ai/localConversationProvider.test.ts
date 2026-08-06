import { buildRouteContext } from '@/core/conversation/routeContext';
import type {
  RouteContext,
  StopSuggestion,
} from '@/core/domain/entities/conversation';
import type { NavigationProgress } from '@/core/domain/entities/navigation';
import type { Place } from '@/core/domain/entities/place';
import type { Logger } from '@/core/domain/ports/logger';
import type { RoutingProvider } from '@/core/domain/ports/routingProvider';
import type { StopRecommender } from '@/services/conversation/routeAwareRecommender';
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

const recommender = (results: StopSuggestion[] | Error): StopRecommender => ({
  async suggest() {
    if (results instanceof Error) throw results;
    return results;
  },
});

const suggestion = (
  place: Place,
  overrides: Partial<StopSuggestion> = {},
): StopSuggestion => ({
  place,
  detourSeconds: 180,
  detourMeters: 500,
  isAhead: true,
  directDistanceMeters: 900,
  ...overrides,
});

/** Routing is only reached by the fastest-route check. */
const routing = (routes: Route[] | Error): RoutingProvider => ({
  async getRoutes() {
    if (routes instanceof Error) throw routes;
    return routes;
  },
});

const build = (options: {
  saved?: Partial<Record<'home' | 'work', Place>>;
  results?: StopSuggestion[] | Error;
  routes?: Route[] | Error;
} = {}) =>
  createLocalConversationProvider({
    recommender: recommender(options.results ?? []),
    routingProvider: routing(options.routes ?? []),
    savedPlaces: savedPlaces(options.saved),
    logger: silentLogger(),
  });

const guidingWith = (overrides: Partial<Parameters<typeof buildRouteContext>[0]> = {}) =>
  buildRouteContext({
    navigationState: 'guiding',
    destination: place('dest', 'Gare de Lyon', 2.37),
    route: ROUTE,
    progress: {
      remainingDistanceMeters: 4_200,
      remainingDurationSeconds: 600,
      snappedPosition: ORIGIN,
    } as NavigationProgress,
    distanceUnit: 'metric',
    now: new Date('2026-01-01T09:00:00Z').getTime(),
    ...overrides,
  });

const guiding = (): RouteContext => guidingWith();

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
    const reply = await ask(build({ saved: { home: HOME } }), 'take me home', idle());

    expect(reply.speech).toBe('Heading home.');
    expect(reply.action).toEqual({ type: 'navigate-to', place: HOME });
  });

  it('says where to set it when home is not known', async () => {
    const reply = await ask(build(), 'take me home');

    expect(reply.action).toEqual({ type: 'none' });
    expect(reply.speech).toContain('Settings');
  });
});

describe('suggesting a stop', () => {
  it('offers the best stop and explains the tradeoff', async () => {
    const reply = await ask(
      build({ results: [suggestion({ ...NEAR, rating: 4.7 }, { detourSeconds: 180 })] }),
      'I need coffee',
    );

    expect(reply.speech).toContain('highly rated');
    expect(reply.speech).toContain('ahead on your route');
    expect(reply.speech).toContain('adds only 3 minutes');
    expect(reply.speech).toContain('Café Voisin');
  });

  it('suggests rather than reroutes, and remembers what it named', async () => {
    // Rerouting a moving car on one heard word is presumption, not help. The
    // driver confirms with "take me there" — which is why this is the referent.
    const reply = await ask(build({ results: [suggestion(NEAR)] }), 'find coffee');

    expect(reply.action).toEqual({ type: 'none' });
    expect(reply.referent).toEqual(NEAR);
    expect(reply.speech).toContain('take me there');
  });

  it('does not claim a place is highly rated when it is unrated', async () => {
    const reply = await ask(build({ results: [suggestion(NEAR)] }), 'find coffee');
    expect(reply.speech).not.toContain('highly rated');
  });

  it('says so when there is nothing worth suggesting', async () => {
    const reply = await ask(build({ results: [] }), 'find parking');

    expect(reply.action).toEqual({ type: 'none' });
    expect(reply.speech).toBe('I could not find parking nearby.');
  });

  it('needs a position before it can search', async () => {
    const reply = await ask(build({ results: [suggestion(NEAR)] }), 'find fuel', idle());
    expect(reply.speech).toBe('I need your location before I can search nearby.');
  });

  it('degrades gracefully when the search fails', async () => {
    const reply = await ask(build({ results: new Error('offline') }), "I'm hungry");

    expect(reply.action).toEqual({ type: 'none' });
    expect(reply.speech).toBe('I could not search just now. Try again in a moment.');
  });
});

describe('voice rerouting', () => {
  it('takes the driver to the place it last named', async () => {
    const reply = await ask(build(), 'take me there', guidingWith({ referent: NEAR }));

    expect(reply.action).toEqual({ type: 'navigate-to', place: NEAR });
    expect(reply.speech).toBe('Rerouting to Café Voisin.');
  });

  it('admits when there is nothing "there" refers to', async () => {
    const reply = await ask(build(), 'take me there');

    expect(reply.action).toEqual({ type: 'none' });
    expect(reply.speech).toContain('not suggested anywhere yet');
  });

  it('calls a mid-trip change a change, so it can be undone', async () => {
    const reply = await ask(build({ saved: { home: HOME } }), 'actually take me home');

    expect(reply.action).toEqual({ type: 'navigate-to', place: HOME });
    expect(reply.speech).toBe('Changing destination to Home.');
  });

  it('goes back to the destination a change replaced', async () => {
    const reply = await ask(
      build(),
      'go back to my original destination',
      guidingWith({ previousDestination: FAR }),
    );

    expect(reply.action).toEqual({ type: 'navigate-to', place: FAR });
    expect(reply.speech).toBe('Going back to Café Lointain.');
  });

  it('admits when there is no earlier destination', async () => {
    const reply = await ask(build(), 'go back to my original destination');
    expect(reply.action).toEqual({ type: 'none' });
  });
});

describe('route quality questions', () => {
  it('confirms the route when nothing better exists', async () => {
    const reply = await ask(
      build({ routes: [{ ...ROUTE, durationSeconds: 1_490 }] }),
      'am I on the fastest route',
    );

    expect(reply.speech).toBe('You are on the fastest route I can find.');
    expect(reply.action).toEqual({ type: 'none' });
  });

  it('offers a faster route when the saving is worth mentioning', async () => {
    const faster = { ...ROUTE, id: 'r2', durationSeconds: 200 };
    const reply = await ask(build({ routes: [faster] }), 'is there a quicker way');

    expect(reply.speech).toContain('faster');
    expect(reply.action).toEqual({ type: 'switch-route', route: faster });
  });

  it('does not pretend to know about traffic it cannot see', async () => {
    // A driver told "traffic is clear" will believe it. Better to say nothing
    // than to invent road conditions.
    const reply = await ask(build(), 'how much traffic is ahead');

    expect(reply.speech).toContain('cannot see live traffic');
    expect(reply.action).toEqual({ type: 'none' });
  });

  it('says there is no trip when asked about one that is not running', async () => {
    const reply = await ask(build(), 'am I on the fastest route', idle());
    expect(reply.speech).toBe('No trip is running right now.');
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

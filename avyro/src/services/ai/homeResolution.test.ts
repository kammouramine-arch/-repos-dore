import { buildRouteContext } from '@/core/conversation/routeContext';
import { parseCommand } from '@/core/conversation/commandParser';
import { savedPlaceAlias } from '@/core/conversation/savedPlaceAlias';
import type { Place } from '@/core/domain/entities/place';
import type { Logger } from '@/core/domain/ports/logger';
import type { PlacesProvider } from '@/core/domain/ports/placesProvider';
import type { SavedPlacesRepository } from '@/core/domain/ports/savedPlacesRepository';
import { createLocalSavedPlacesRepository } from '@/database/repositories/localSavedPlacesRepository';
import type { SecureStorage } from '@/database/secureStore';
import { createLocalConversationProvider } from './localConversationProvider';

/**
 * LRWF0930, 1:02: the recogniser heard "Take me to home", and at 1:06 the car
 * was routed to "Home For Childminders Lille". These tests make that outcome
 * structurally impossible: whatever phrasing, whatever producer, "home" is the
 * saved slot or a request to set one — never a search.
 *
 * Fixtures use invented coordinates and addresses. No real address appears.
 */

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

const place = (id: string, name: string, address: string): Place => ({
  id,
  name,
  address,
  coordinates: { latitude: 10.5, longitude: 20.5 },
  category: 'place',
});

const SAVED_HOME = place('saved-home', 'Home', '1 Test Street, Testville');
const SAVED_WORK = place('saved-work', 'Work', '2 Test Avenue, Testville');

/** The poison: what a geocoder genuinely returns for the word "home". */
const DECOY = place('decoy', 'Home For Childminders', '9 Decoy Road, Testville');

/** A geocoder that records every query it was asked. */
const spyGeocoder = (results: Place[] | Error = [DECOY]) => {
  const queries: string[] = [];
  const provider: PlacesProvider = {
    async search(query) {
      queries.push(query);
      if (results instanceof Error) throw results;
      return results;
    },
  };
  return { provider, queries };
};

const memoryRepository = (seed: Partial<Record<'home' | 'work', Place>>): SavedPlacesRepository => {
  const saved = { ...seed };
  return {
    async get(slot) { return saved[slot] ?? null; },
    async set(slot, value) { saved[slot] = value; },
    async clear(slot) { delete saved[slot]; },
  };
};

const build = (saved: Partial<Record<'home' | 'work', Place>>, geocoder = spyGeocoder()) => ({
  geocoder,
  provider: createLocalConversationProvider({
    recommender: { async suggest() { return []; } },
    routingProvider: { async getRoutes() { return []; } },
    placesProvider: geocoder.provider,
    savedPlaces: memoryRepository(saved),
    logger: silentLogger(),
  }),
});

const idle = () =>
  buildRouteContext({
    navigationState: 'idle',
    destination: null,
    route: null,
    progress: null,
    distanceUnit: 'metric',
  });

const ask = (provider: ReturnType<typeof build>['provider'], transcript: string) =>
  provider.respond({ transcript, context: idle(), origin: { latitude: 10, longitude: 20 } });

const HOME_PHRASES = [
  'Take me to home', // the exact transcript from LRWF0930 1:02
  'take me home',
  'Navigate home',
  'navigate to home',
  'take me to my home',
  'drive me back home',
  'go home',
  'home please',
  'take me to my house',
  'Hey meepmeep take me to home',
  'emmène-moi à la maison',
  'ramène-moi à la maison',
  'rentre à la maison',
  'je rentre chez moi',
  'emmène-moi chez moi',
  'va au domicile',
  'direction maison',
  'on rentre',
];

describe('every way of saying home parses as the saved slot', () => {
  it.each(HOME_PHRASES.filter((p) => !p.startsWith('Hey')))('"%s"', (phrase) => {
    expect(parseCommand(phrase)).toEqual({ kind: 'navigate-saved', slot: 'home' });
  });

  it.each(['take me to work', 'navigate to the office', 'emmène-moi au bureau', 'va au travail'])(
    '"%s" is the work slot',
    (phrase) => {
      expect(parseCommand(phrase)).toEqual({ kind: 'navigate-saved', slot: 'work' });
    },
  );

  it('still lets real places with the word in their name be searched', () => {
    expect(parseCommand('take me to the Home Depot')).toEqual({
      kind: 'navigate-to-place',
      query: 'home depot',
    });
    expect(parseCommand('emmène-moi à la maison de la radio')).toEqual({
      kind: 'navigate-to-place',
      query: 'la maison de la radio',
    });
  });
});

describe('the alias table', () => {
  it.each(['home', 'my home', 'the house', 'maison', 'la maison', 'chez moi', 'domicile', 'home please'])(
    '"%s" is home',
    (word) => expect(savedPlaceAlias(word)).toBe('home'),
  );

  it.each(['home depot', 'homes', 'maison blanche', 'domicile lille', 'lille'])(
    '"%s" is a place, not an alias',
    (word) => expect(savedPlaceAlias(word)).toBeNull(),
  );
});

describe('with Home saved, the geocoder is never consulted', () => {
  it.each(HOME_PHRASES)('"%s" routes to the saved Home', async (phrase) => {
    const { provider, geocoder } = build({ home: SAVED_HOME });
    const reply = await ask(provider, phrase.replace(/^Hey meepmeep /, ''));

    expect(reply.action).toEqual({ type: 'navigate-to', place: SAVED_HOME });
    expect(geocoder.queries).toEqual([]);
  });

  it('ignores a geocoder that would have returned a decoy', async () => {
    // The decoy is primed and ready. It must not be reachable.
    const { provider, geocoder } = build({ home: SAVED_HOME }, spyGeocoder([DECOY, DECOY]));
    const reply = await ask(provider, 'Take me to home');

    expect(reply.action).not.toEqual({ type: 'navigate-to', place: DECOY });
    expect(geocoder.queries).toHaveLength(0);
  });

  it('works even with the network down, because nothing is fetched', async () => {
    const { provider } = build({ home: SAVED_HOME }, spyGeocoder(new Error('offline')));
    const reply = await ask(provider, 'navigate to home');

    expect(reply.action).toEqual({ type: 'navigate-to', place: SAVED_HOME });
  });
});

describe('a destination from the hosted classifier', () => {
  it('is redirected to the saved slot when it is really "home"', async () => {
    // The cloud model's only check is that the query is a substring of the
    // words spoken, so it can legitimately return {query:"home"}. The resolver
    // is where every producer converges, so the guard lives there too.
    const { provider, geocoder } = build({ home: SAVED_HOME });
    const reply = await provider.resolve(
      { kind: 'navigate-to-place', query: 'home' },
      { transcript: 'take me to home', context: idle(), origin: null },
    );

    expect(reply.action).toEqual({ type: 'navigate-to', place: SAVED_HOME });
    expect(geocoder.queries).toEqual([]);
  });

  it('is redirected for "maison" and "work" too', async () => {
    const { provider, geocoder } = build({ home: SAVED_HOME, work: SAVED_WORK });
    const request = { transcript: '', context: idle(), origin: null };

    expect((await provider.resolve({ kind: 'navigate-to-place', query: 'la maison' }, request)).action)
      .toEqual({ type: 'navigate-to', place: SAVED_HOME });
    expect((await provider.resolve({ kind: 'navigate-to-place', query: 'the office' }, request)).action)
      .toEqual({ type: 'navigate-to', place: SAVED_WORK });
    expect(geocoder.queries).toEqual([]);
  });
});

describe('with no Home saved', () => {
  it('asks to set one, and never invents or searches for one', async () => {
    const { provider, geocoder } = build({});
    const reply = await ask(provider, 'Take me to home');

    expect(reply.action).toEqual({ type: 'none' });
    expect(geocoder.queries).toEqual([]);
    expect(reply.speech.length).toBeGreaterThan(0);
  });
});

describe('Home persists across restarts, changes and deletion', () => {
  /** Device storage that outlives a single repository instance. */
  const deviceStorage = (): SecureStorage => {
    const disk = new Map<string, string>();
    return {
      async readJson(key, fallback) {
        const raw = disk.get(key);
        return raw === undefined ? fallback : JSON.parse(raw);
      },
      async writeJson(key, value) { disk.set(key, JSON.stringify(value)); },
      async remove(key) { disk.delete(key); },
    };
  };

  it('survives an app restart', async () => {
    const disk = deviceStorage();
    await createLocalSavedPlacesRepository(disk).set('home', SAVED_HOME);

    // A fresh instance over the same storage is what a relaunch looks like.
    const relaunched = createLocalSavedPlacesRepository(disk);
    expect(await relaunched.get('home')).toEqual(SAVED_HOME);
  });

  it('follows a change of Home', async () => {
    const disk = deviceStorage();
    const repo = createLocalSavedPlacesRepository(disk);
    const moved = place('moved', 'Home', '3 New Street, Testville');

    await repo.set('home', SAVED_HOME);
    await repo.set('home', moved);

    expect(await createLocalSavedPlacesRepository(disk).get('home')).toEqual(moved);
  });

  it('forgets a deleted Home, and voice then asks rather than searching', async () => {
    const disk = deviceStorage();
    const repo = createLocalSavedPlacesRepository(disk);
    await repo.set('home', SAVED_HOME);
    await repo.clear('home');

    expect(await repo.get('home')).toBeNull();

    const geocoder = spyGeocoder();
    const provider = createLocalConversationProvider({
      recommender: { async suggest() { return []; } },
      routingProvider: { async getRoutes() { return []; } },
      placesProvider: geocoder.provider,
      savedPlaces: repo,
      logger: silentLogger(),
    });
    const reply = await ask(provider, 'take me home');

    expect(reply.action).toEqual({ type: 'none' });
    expect(geocoder.queries).toEqual([]);
  });

  it('keeps Home and Work independent when both are saved at once', async () => {
    const disk = deviceStorage();
    const repo = createLocalSavedPlacesRepository(disk);
    await Promise.all([repo.set('home', SAVED_HOME), repo.set('work', SAVED_WORK)]);

    expect(await repo.get('home')).toEqual(SAVED_HOME);
    expect(await repo.get('work')).toEqual(SAVED_WORK);
  });
});

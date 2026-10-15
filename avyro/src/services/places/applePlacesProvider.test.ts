import { createApplePlacesProvider, type AppleSearch } from './applePlacesProvider';
const native = (houseNumber: string): AppleSearch => ({ searchPlaces: jest.fn(async () => [{ name: 'Rue Exemple', address: `${houseNumber} Rue Exemple, Paris`, houseNumber, latitude: 48.85, longitude: 2.35 }]) });
test('a numbered query cannot silently resolve to a street or a different house', async () => {
  expect(await createApplePlacesProvider(native(''))!.search('18 Rue Exemple')).toEqual([]);
  expect(await createApplePlacesProvider(native('20'))!.search('18 Rue Exemple')).toEqual([]);
  const [place] = await createApplePlacesProvider(native('18'))!.search('18 Rue Exemple');
  expect(place.name).toBe('18 Rue Exemple');
  expect(place.address).toContain('18 Rue Exemple');
});
test('a superseded search never publishes a destination', async () => {
  const controller = new AbortController();
  const provider = createApplePlacesProvider({ async searchPlaces() { controller.abort(); return []; } })!;
  await expect(provider.search('King Walk', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
});
test('a named place keeps its name instead of becoming its numbered postal street', async () => {
  const provider = createApplePlacesProvider({ searchPlaces: async () => [{ name: 'Eiffel Tower', address: '5 Avenue Anatole France, Paris', houseNumber: '5', latitude: 48.85, longitude: 2.35 }] })!;
  expect((await provider.search('Eiffel Tower Paris France'))[0].name).toBe('Eiffel Tower');
});
test('number suffixes and comma-separated addresses retain the confirmed house', async () => {
  expect((await createApplePlacesProvider(native('18bis'))!.search('18 bis Rue Exemple'))[0].name).toContain('18bis');
  expect((await createApplePlacesProvider(native('18'))!.search('18, Rue Exemple'))[0].name).toBe('18 Rue Exemple');
});
test('native autocomplete suggestions acquire coordinates only after explicit selection', async () => {
  const resolve = jest.fn(async () => [{ name: 'King Walk', address: 'King Walk, Example City', houseNumber: '', latitude: 48.85, longitude: 2.35 }]);
  const provider = createApplePlacesProvider({ ...native(''), suggestPlaces: async () => [{ id: 'completion-1', name: 'King Walk', address: 'Example City' }], resolvePlaceSuggestion: resolve })!;
  const [suggestion] = await provider.suggest!('King');
  expect(suggestion).not.toHaveProperty('coordinates');
  expect(resolve).not.toHaveBeenCalled();
  expect((await provider.resolveSuggestion!(suggestion))?.coordinates).toEqual({ latitude: 48.85, longitude: 2.35 });
  expect(resolve).toHaveBeenCalledWith('completion-1');
});


test('nearby category uses local POI search and sorts before truncating', async () => {
  const item = (name: string, longitude: number) => ({ name, address: name, houseNumber: '', latitude: 50.6, longitude });
  const searchPlaces = jest.fn(async () => []);
  const searchNearbyPlaces = jest.fn(async () => [item('Cora', 3.02), item('Carrefour', 3.001), item('Far', 3.2)]);
  const provider = createApplePlacesProvider({ searchPlaces, searchNearbyPlaces })!;
  const places = await provider.nearby!('fuel', { near: { latitude: 50.6, longitude: 3 }, limit: 1 });
  expect(searchNearbyPlaces).toHaveBeenCalledWith('fuel', 50.6, 3);
  expect(searchPlaces).not.toHaveBeenCalled();
  expect(places.map(p => p.name)).toEqual(['Carrefour']);
});

test('named branch search prefers a genuine nearby La Poste before the broad geocoder', async () => {
  const searchPlaces = jest.fn(async () => []);
  const searchNearbyNamedPlaces = jest.fn(async () => [{ name: 'La Poste', address: 'Nearby branch', houseNumber: '', latitude: 50.6, longitude: 3.001 }]);
  const provider = createApplePlacesProvider({ searchPlaces, searchNearbyNamedPlaces })!;
  expect((await provider.search('La Poste', { near: { latitude: 50.6, longitude: 3 } }))[0].address).toBe('Nearby branch');
  expect(searchPlaces).not.toHaveBeenCalled();
  await provider.search('18 Rue Exemple', { near: { latitude: 50.6, longitude: 3 } });
  expect(searchNearbyNamedPlaces).toHaveBeenCalledTimes(1);
  expect(searchPlaces).toHaveBeenCalledTimes(1);
});

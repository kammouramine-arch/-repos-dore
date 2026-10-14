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
test('native autocomplete suggestions acquire coordinates only after explicit selection', async () => {
  const resolve = jest.fn(async () => [{ name: 'King Walk', address: 'King Walk, Example City', houseNumber: '', latitude: 48.85, longitude: 2.35 }]);
  const provider = createApplePlacesProvider({ ...native(''), suggestPlaces: async () => [{ id: 'completion-1', name: 'King Walk', address: 'Example City' }], resolvePlaceSuggestion: resolve })!;
  const [suggestion] = await provider.suggest!('King');
  expect(suggestion).not.toHaveProperty('coordinates');
  expect(resolve).not.toHaveBeenCalled();
  expect((await provider.resolveSuggestion!(suggestion))?.coordinates).toEqual({ latitude: 48.85, longitude: 2.35 });
  expect(resolve).toHaveBeenCalledWith('completion-1');
});

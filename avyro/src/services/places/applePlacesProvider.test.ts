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

import type { Place } from '@/core/domain/entities/place';
import { describeDestination, isConfidentMatch, rankDestinationCandidates } from './destinationMatch';

const place = (name: string, address = ''): Place => ({
  id: name,
  name,
  address,
  coordinates: { latitude: 0, longitude: 0 },
  category: 'place',
});

describe('deciding whether to actually drive there', () => {
  it('is confident when the geocoder returned exactly one place', () => {
    expect(isConfidentMatch('lille', [place('Lille')])).toBe(true);
  });

  it('is confident when the name is what was asked for', () => {
    expect(
      isConfidentMatch('lille', [place('Lille', 'Hauts-de-France'), place('Lille, US')]),
    ).toBe(true);
  });

  it('is confident when the official name merely contains the words', () => {
    // "take me to the airport" → Charles de Gaulle Airport.
    expect(
      isConfidentMatch('airport', [
        place('Charles de Gaulle Airport'),
        place('Orly Airport'),
      ]),
    ).toBe(true);
  });

  it('is confident when the driver said more than the official name', () => {
    expect(
      isConfidentMatch('lille france', [place('Lille'), place('Lille, Belgium')]),
    ).toBe(true);
  });

  it('ignores case, accents and punctuation on both sides', () => {
    expect(isConfidentMatch('eiffel tower', [place('Eiffel Tower!'), place('Other')])).toBe(
      true,
    );
    expect(isConfidentMatch('creteil', [place('Créteil'), place('Other')])).toBe(true);
  });

  it('is not confident when the words only appear inside a longer word', () => {
    // "nice" must not validate "Nicefield" — a two-letter fragment cannot be
    // allowed to send a car 200 km.
    expect(isConfidentMatch('nice', [place('Nicefield Park'), place('Nice')])).toBe(false);
  });

  it('is not confident when the top result is unrelated to what was said', () => {
    expect(
      isConfidentMatch('rue de la paix', [place('Paix Hotel'), place('Somewhere else')]),
    ).toBe(false);
  });

  it('is never confident with nothing to be confident about', () => {
    expect(isConfidentMatch('lille', [])).toBe(false);
    expect(isConfidentMatch('', [place('A'), place('B')])).toBe(false);
  });
});

describe('naming a destination out loud', () => {
  it('uses the name alone when it is distinctive', () => {
    expect(describeDestination(place('Lille', 'Lille, Hauts-de-France'))).toBe('Lille');
  });

  it('adds the locality when the name alone would tell a driver nothing', () => {
    expect(describeDestination(place('Central', 'Rue Nationale, Lille'))).toBe(
      'Central, Rue Nationale',
    );
  });

  it('falls back to the address when there is no name', () => {
    expect(describeDestination(place('', '12 Rue de Rivoli, Paris'))).toBe(
      '12 Rue de Rivoli, Paris',
    );
  });

  it('does not repeat itself', () => {
    expect(describeDestination(place('Lille', 'Lille'))).toBe('Lille');
  });
});


describe('nearest matching branch selection', () => {
  const origin = { latitude: 50.6, longitude: 3.0 };
  const branch = (id: string, name: string, longitude: number): Place => ({ ...place(name), id, coordinates: { latitude: 50.6, longitude } });
  it('chooses a nearby La Poste branch even when the provider lists the distant branch first', () => {
    const far = branch('far', 'La Poste', 3.2), near = branch('near', 'La Poste', 3.002);
    expect(rankDestinationCandidates('La Poste', [far, near], origin).map(p => p.id)).toEqual(['near', 'far']);
  });
  it('keeps an exact address or locality-qualified query in relevance order', () => {
    const far = branch('far', 'La Poste Lille', 3.2), near = branch('near', 'La Poste', 3.002);
    expect(rankDestinationCandidates('La Poste Lille', [far, near], origin)[0]).toBe(far);
    expect(rankDestinationCandidates('18 Rue Exemple', [far, near], origin)[0]).toBe(far);
  });
  it('does not promote an unrelated close business over matching branches', () => {
    const far = branch('far', 'La Poste', 3.2), near = branch('near', 'La Poste Agence', 3.002), other = branch('other', 'Restaurant', 3.0001);
    expect(rankDestinationCandidates('La Poste', [far, other, near], origin)[0]).toBe(near);
  });
});

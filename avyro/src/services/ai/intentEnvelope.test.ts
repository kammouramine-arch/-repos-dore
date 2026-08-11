import { decodeIntentEnvelope } from './intentEnvelope';

/**
 * This is the boundary that makes consulting a model safe. Everything it can
 * invent has to die here.
 */
describe('what a model is allowed to return', () => {
  it('accepts a plain intent', () => {
    expect(decodeIntentEnvelope({ intent: { kind: 'ask-eta' }, speech: null })).toEqual({
      intent: { kind: 'ask-eta' },
      speech: null,
    });
  });

  it('accepts an intent with the argument it requires', () => {
    expect(
      decodeIntentEnvelope({ intent: { kind: 'navigate-saved', slot: 'work' } }),
    ).toEqual({ intent: { kind: 'navigate-saved', slot: 'work' }, speech: null });

    expect(
      decodeIntentEnvelope({ intent: { kind: 'find-nearby', category: 'fuel' } }),
    ).toEqual({ intent: { kind: 'find-nearby', category: 'fuel' }, speech: null });
  });

  it('accepts a sentence with no intent', () => {
    expect(decodeIntentEnvelope({ intent: null, speech: 'I cannot do that.' })).toEqual({
      intent: null,
      speech: 'I cannot do that.',
    });
  });
});

describe('what it is not allowed to return', () => {
  it('rejects a capability Avyro does not have', () => {
    expect(decodeIntentEnvelope({ intent: { kind: 'play-music' } })).toBeNull();
    expect(decodeIntentEnvelope({ intent: { kind: 'call-my-wife' } })).toBeNull();
  });

  it('rejects an intent missing the argument that gives it meaning', () => {
    expect(decodeIntentEnvelope({ intent: { kind: 'navigate-saved' } })).toBeNull();
    expect(decodeIntentEnvelope({ intent: { kind: 'find-nearby' } })).toBeNull();
  });

  it('rejects an argument outside the vocabulary', () => {
    // A model that decides "pharmacy" is a category does not get to search for
    // one — the app has no such capability, so this is not an answer.
    expect(
      decodeIntentEnvelope({ intent: { kind: 'find-nearby', category: 'pharmacy' } }),
    ).toBeNull();
    expect(
      decodeIntentEnvelope({ intent: { kind: 'navigate-saved', slot: 'gym' } }),
    ).toBeNull();
  });

  it('rejects an envelope that says nothing at all', () => {
    expect(decodeIntentEnvelope({})).toBeNull();
    expect(decodeIntentEnvelope({ intent: null, speech: '   ' })).toBeNull();
    expect(decodeIntentEnvelope(null)).toBeNull();
    expect(decodeIntentEnvelope('take me home')).toBeNull();
    expect(decodeIntentEnvelope([{ kind: 'ask-eta' }])).toBeNull();
  });

  it('keeps a usable sentence even when the intent was nonsense', () => {
    expect(
      decodeIntentEnvelope({ intent: { kind: 'launch-rocket' }, speech: 'No.' }),
    ).toEqual({ intent: null, speech: 'No.' });
  });
});

describe('a destination named by a model', () => {
  it('accepts a query string, because a place name has no vocabulary', () => {
    expect(
      decodeIntentEnvelope({ intent: { kind: 'navigate-to-place', query: 'Lille' } }),
    ).toEqual({ intent: { kind: 'navigate-to-place', query: 'Lille' }, speech: null });
  });

  it('trims it, so whitespace never reaches the geocoder', () => {
    expect(
      decodeIntentEnvelope({ intent: { kind: 'navigate-to-place', query: '  Lille ' } }),
    ).toEqual({ intent: { kind: 'navigate-to-place', query: 'Lille' }, speech: null });
  });

  it('rejects an empty destination rather than searching for nothing', () => {
    expect(
      decodeIntentEnvelope({ intent: { kind: 'navigate-to-place', query: '   ' } }),
    ).toBeNull();
    expect(decodeIntentEnvelope({ intent: { kind: 'navigate-to-place' } })).toBeNull();
    expect(
      decodeIntentEnvelope({ intent: { kind: 'navigate-to-place', query: 42 } }),
    ).toBeNull();
  });

  it('still cannot invent coordinates — only a string to look up', () => {
    // The boundary holds: a model may name a place, never place the car.
    const decoded = decodeIntentEnvelope({
      intent: { kind: 'navigate-to-place', query: 'Lille', latitude: 50.6, longitude: 3.06 },
    });

    expect(decoded).toEqual({
      intent: { kind: 'navigate-to-place', query: 'Lille' },
      speech: null,
    });
  });
});

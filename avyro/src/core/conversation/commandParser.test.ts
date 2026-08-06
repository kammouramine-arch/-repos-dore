import { parseCommand } from './commandParser';

/** Every command in Avyro's vocabulary, with the phrasings a driver would use. */
describe('the ten commands', () => {
  it.each([
    ['take me home', { kind: 'navigate-saved', slot: 'home' }],
    ['Take me home.', { kind: 'navigate-saved', slot: 'home' }],
    ['drive me home', { kind: 'navigate-saved', slot: 'home' }],
    ['go home', { kind: 'navigate-saved', slot: 'home' }],
    ['navigate home', { kind: 'navigate-saved', slot: 'home' }],
    ['take me back home', { kind: 'navigate-saved', slot: 'home' }],
    ['home', { kind: 'navigate-saved', slot: 'home' }],

    ['take me to work', { kind: 'navigate-saved', slot: 'work' }],
    ['drive me to the office', { kind: 'navigate-saved', slot: 'work' }],
    ['go to work', { kind: 'navigate-saved', slot: 'work' }],

    ['how long until I arrive?', { kind: 'ask-eta' }],
    ['how long', { kind: 'ask-eta' }],
    ['how much longer', { kind: 'ask-eta' }],
    ['when will I get there', { kind: 'ask-eta' }],
    ["what's my ETA", { kind: 'ask-eta' }],
    ['are we there yet', { kind: 'ask-eta' }],

    ['how far is it?', { kind: 'ask-remaining-distance' }],
    ['how far', { kind: 'ask-remaining-distance' }],
    ['how many miles', { kind: 'ask-remaining-distance' }],
    ['how many km', { kind: 'ask-remaining-distance' }],

    ['cancel navigation', { kind: 'cancel-navigation' }],
    ['stop navigation', { kind: 'cancel-navigation' }],
    ['end the trip', { kind: 'cancel-navigation' }],
    ['cancel the route', { kind: 'cancel-navigation' }],
    ['stop navigating', { kind: 'cancel-navigation' }],

    ['find restaurants', { kind: 'find-nearby', category: 'restaurants' }],
    ['restaurants nearby', { kind: 'find-nearby', category: 'restaurants' }],
    ['somewhere to eat', { kind: 'find-nearby', category: 'restaurants' }],

    ['find coffee', { kind: 'find-nearby', category: 'coffee' }],
    ['find a coffee shop', { kind: 'find-nearby', category: 'coffee' }],
    ['find a cafe', { kind: 'find-nearby', category: 'coffee' }],

    ['find fuel', { kind: 'find-nearby', category: 'fuel' }],
    ['find a gas station', { kind: 'find-nearby', category: 'fuel' }],
    ['find petrol', { kind: 'find-nearby', category: 'fuel' }],
    ['find a charging point', { kind: 'find-nearby', category: 'fuel' }],

    ['find parking', { kind: 'find-nearby', category: 'parking' }],
    ['somewhere to park', { kind: 'find-nearby', category: 'parking' }],
    ['find a car park', { kind: 'find-nearby', category: 'parking' }],

    ['reroute', { kind: 'reroute' }],
    ['recalculate', { kind: 'reroute' }],
    ['find me another route', { kind: 'reroute' }],
    ['give me a different route', { kind: 'reroute' }],
  ])('understands "%s"', (utterance, expected) => {
    expect(parseCommand(utterance)).toEqual(expected);
  });
});

describe('normalisation', () => {
  it('ignores case, punctuation and stray whitespace', () => {
    expect(parseCommand('  CANCEL   NAVIGATION!!  ')).toEqual({
      kind: 'cancel-navigation',
    });
  });

  it('ignores accents, which recognisers add and drop freely', () => {
    expect(parseCommand('find a café')).toEqual({
      kind: 'find-nearby',
      category: 'coffee',
    });
  });
});

describe('precedence', () => {
  it('treats a control command as a control command, not a search', () => {
    // "stop" and "parking" in one sentence: the driver is cancelling.
    expect(parseCommand('cancel navigation')).toEqual({ kind: 'cancel-navigation' });
  });

  it('reads a question about the trip as a question, not a search', () => {
    expect(parseCommand('how far is the coffee')).toEqual({
      kind: 'ask-remaining-distance',
    });
  });

  it('separates distance from duration', () => {
    expect(parseCommand('how long')).toEqual({ kind: 'ask-eta' });
    expect(parseCommand('how far')).toEqual({ kind: 'ask-remaining-distance' });
  });
});

describe('anything else', () => {
  it.each([
    '',
    '   ',
    'what is the meaning of life',
    'play some music',
    'call my brother',
  ])('does not pretend to understand "%s"', (utterance) => {
    expect(parseCommand(utterance)).toEqual({ kind: 'unknown' });
  });

  it('leaves unknown utterances for the provider rather than guessing', () => {
    // The parser's job is to be certain or silent. A wrong guess at speed is
    // worse than handing the sentence on.
    expect(parseCommand('take me somewhere nice').kind).toBe('unknown');
  });
});

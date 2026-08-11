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

describe('how a driver actually says it', () => {
  it.each([
    ["I'm hungry", { kind: 'find-nearby', category: 'restaurants' }],
    ['I am hungry', { kind: 'find-nearby', category: 'restaurants' }],
    ['I need to eat', { kind: 'find-nearby', category: 'restaurants' }],
    ['I need lunch', { kind: 'find-nearby', category: 'restaurants' }],
    ['I need coffee', { kind: 'find-nearby', category: 'coffee' }],
    ['I need caffeine', { kind: 'find-nearby', category: 'coffee' }],
    ['I need fuel', { kind: 'find-nearby', category: 'fuel' }],
    ['I need gas', { kind: 'find-nearby', category: 'fuel' }],
    ["I'm running low on fuel", { kind: 'find-nearby', category: 'fuel' }],
    ['I need to fill up', { kind: 'find-nearby', category: 'fuel' }],
    ['find parking', { kind: 'find-nearby', category: 'parking' }],
  ])('reads a need as a request: "%s"', (utterance, expected) => {
    expect(parseCommand(utterance)).toEqual(expected);
  });
});

describe('trip quality questions', () => {
  it.each([
    ['am I on the fastest route', { kind: 'ask-fastest-route' }],
    ['are we on the quickest way', { kind: 'ask-fastest-route' }],
    ['is there a faster route', { kind: 'ask-fastest-route' }],
    ['how much traffic is ahead', { kind: 'ask-traffic' }],
    ['is there traffic', { kind: 'ask-traffic' }],
  ])('understands "%s"', (utterance, expected) => {
    expect(parseCommand(utterance)).toEqual(expected);
  });

  it('separates a route question from a traffic question', () => {
    expect(parseCommand('am I on the fastest route')).toEqual({
      kind: 'ask-fastest-route',
    });
    expect(parseCommand('how is the traffic')).toEqual({ kind: 'ask-traffic' });
  });
});

describe('voice rerouting', () => {
  it.each([
    ['take me there', { kind: 'navigate-referent' }],
    ['take us there', { kind: 'navigate-referent' }],
    ['go there', { kind: 'navigate-referent' }],
    ["let's go there", { kind: 'navigate-referent' }],
    ['navigate there', { kind: 'navigate-referent' }],
    ['yes, take me there', { kind: 'navigate-referent' }],

    ['actually take me home', { kind: 'navigate-saved', slot: 'home' }],
    ['actually take me to work', { kind: 'navigate-saved', slot: 'work' }],

    ['go back to my original destination', { kind: 'restore-destination' }],
    ['take me back to my original destination', { kind: 'restore-destination' }],
    ['back to my previous destination', { kind: 'restore-destination' }],
    ['resume my original trip', { kind: 'restore-destination' }],
  ])('understands "%s"', (utterance, expected) => {
    expect(parseCommand(utterance)).toEqual(expected);
  });

  it('does not mistake going back for going home', () => {
    // "go back to my original destination" contains "go back"; precedence has
    // to put the restore rule first or this becomes a trip home.
    expect(parseCommand('go back to my original destination').kind).toBe(
      'restore-destination',
    );
  });

  it('still treats a plain cancel as a cancel', () => {
    expect(parseCommand('cancel navigation')).toEqual({ kind: 'cancel-navigation' });
  });
});

describe('destinations named in words', () => {
  it.each([
    ['take me to Lille', 'lille'],
    ['Take me to Lille.', 'lille'],
    ['navigate to Paris', 'paris'],
    ['drive me to the Eiffel Tower', 'eiffel tower'],
    ['take me to 12 Rue de Rivoli', '12 rue de rivoli'],
    ['can you take me to the airport?', 'airport'],
    ['go to Bordeaux', 'bordeaux'],
    ['directions to Lyon', 'lyon'],
    ['I want to go to Marseille', 'marseille'],
    ['take me to Lille please', 'lille'],
    ['get me to Saint-Denis', 'saint denis'],
  ])('reads "%s" as a destination', (utterance, query) => {
    expect(parseCommand(utterance)).toEqual({ kind: 'navigate-to-place', query });
  });

  it('does not steal the commands that already worked', () => {
    // Every one of these is a more specific reading of "take me to X", and
    // each must still win over the free-text rule that sits below them.
    expect(parseCommand('take me home')).toEqual({
      kind: 'navigate-saved',
      slot: 'home',
    });
    expect(parseCommand('take me to work')).toEqual({
      kind: 'navigate-saved',
      slot: 'work',
    });
    expect(parseCommand('take me to the office')).toEqual({
      kind: 'navigate-saved',
      slot: 'work',
    });
    expect(parseCommand('take me there')).toEqual({ kind: 'navigate-referent' });
    expect(parseCommand('take me to the nearest gas station')).toEqual({
      kind: 'find-nearby',
      category: 'fuel',
    });
    expect(parseCommand('find me a coffee')).toEqual({
      kind: 'find-nearby',
      category: 'coffee',
    });
    expect(parseCommand('go back to my original destination')).toEqual({
      kind: 'restore-destination',
    });
  });

  it('does not hand the geocoder an empty string', () => {
    // "take me to" with nothing after it is not a destination; the rule
    // declines and the utterance falls through.
    expect(parseCommand('take me to').kind).toBe('unknown');
    expect(parseCommand('navigate to the').kind).toBe('unknown');
  });
});

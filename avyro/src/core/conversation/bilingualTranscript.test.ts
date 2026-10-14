import { selectBilingualTranscript } from './bilingualTranscript';
import { parseCommand } from './commandParser';
import { drivingSafetyReply } from './drivingSafety';

test('never executes a partial destination, even with high confidence', () => {
  expect(selectBilingualTranscript([{ text: 'take me to', isFinal: false, confidence: 1 }])).toBeNull();
});
test('selects a grounded French command over an English misrecognition', () => {
  const chosen = selectBilingualTranscript([{ text: 'amen memo home', isFinal: true, locale: 'en-US', confidence: 0.9 }, { text: 'Emmène-moi à la maison', isFinal: true, locale: 'fr-FR', confidence: 0.6 }]);
  expect(parseCommand(chosen!.text)).toEqual({ kind: 'navigate-saved', slot: 'home' });
});
test('a negation wins over a conflicting route-changing interpretation', () => {
  const chosen = selectBilingualTranscript([{ text: 'annule la navigation', isFinal: true, confidence: 1 }, { text: 'N’annule pas la navigation', isFinal: true, confidence: 0.8 }]);
  expect(drivingSafetyReply(chosen!.text)).not.toBeNull();
  expect(parseCommand(chosen!.text)).toEqual({ kind: 'unknown' });
});
test('disagreeing committed route actions require a repeat rather than guessing', () => {
  expect(selectBilingualTranscript([{ text: 'take me home', isFinal: true, confidence: 0.9 }, { text: 'emmène-moi au travail', isFinal: true, confidence: 0.8 }])).toBeNull();
  expect(selectBilingualTranscript([{ text: 'take me home', isFinal: true, confidence: 0.9 }, { text: 'combien de temps reste-t-il', isFinal: true, confidence: 0.8 }])).toBeNull();
});
test.each([
  ['Emmène-moi à la maison', { kind: 'navigate-saved', slot: 'home' }],
  ['Va au travail', { kind: 'navigate-saved', slot: 'work' }],
  ['Emmène-moi à Lille', { kind: 'navigate-to-place', query: 'lille' }],
  ['Annule la navigation', { kind: 'cancel-navigation' }],
  ['Combien de temps reste-t-il ?', { kind: 'ask-eta' }],
  ['Quelle distance reste-t-il ?', { kind: 'ask-remaining-distance' }],
  ['Trouve une station-service', { kind: 'find-nearby', category: 'fuel' }],
  ['Emmène-moi là-bas', { kind: 'navigate-referent' }],
])('French command: %s', (text, intent) => expect(parseCommand(text)).toEqual(intent));

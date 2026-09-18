import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { appendDictation, displayedDescription, submittedDescription } from '../../mobile/src/features/description-input';

/** Simule un champ contrôlé : chaque frappe renvoie la valeur affichée précédente + le caractère. */
function type(text: string) {
  let value = '';
  for (const ch of text) {
    const next = value + ch;                       // onChangeText
    value = displayedDescription(next, '', false); // valeur re-rendue
  }
  return value;
}

describe('description input keeps whitespace while typing', () => {
  it('keeps every space of « Le client a refait toute la salle de bain »', () => {
    const phrase = 'Le client a refait toute la salle de bain';
    expect(type(phrase)).toBe(phrase);
    expect(type(phrase).split(' ')).toHaveLength(9);
  });
  it.each([
    'Réfection complète : évier, siphon, joints… environ 2 h sur place.',
    'L’artisan a dit « c’est réparable » — devis à préparer.',
    'Ligne 1\nLigne 2\n\nLigne 4 après un saut.',
    'Fuite sous l\'évier, à droite ; vérifier les raccords (PVC) !',
    'The client wants a new bathroom, about 12 m², white tiles.',
  ])('preserves accents, apostrophes, line breaks and punctuation: %s', (phrase) => {
    expect(type(phrase)).toBe(phrase);
  });
  it('keeps trailing and double spaces while editing, including deletions around spaces', () => {
    expect(displayedDescription('Le client ', '', false)).toBe('Le client ');
    expect(displayedDescription('Le  client', '', false)).toBe('Le  client');
    // Autocorrect replaces a word and re-inserts the space after it.
    expect(displayedDescription('Le clien', '', false)).toBe('Le clien');
    expect(displayedDescription('Le client ', '', false)).toBe('Le client ');
    // Backspace over a space then retype it.
    expect(displayedDescription('Le client', '', false)).toBe('Le client');
    expect(displayedDescription('Le client a', '', false)).toBe('Le client a');
  });
  it('normalises only at submission', () => {
    expect(submittedDescription('  Le client a refait toute la salle de bain  ')).toBe('Le client a refait toute la salle de bain');
    expect(submittedDescription('Le client', 'a refait')).toBe('Le client a refait');
  });
  it('shows the dictation fragment only while listening and appends results with a single space', () => {
    expect(displayedDescription('Le client', 'a refait', true)).toBe('Le client a refait');
    expect(displayedDescription('Le client ', 'a refait', true)).toBe('Le client a refait');
    expect(displayedDescription('Le client', 'a refait', false)).toBe('Le client');
    expect(appendDictation('Le client ', 'a refait la salle de bain')).toBe('Le client a refait la salle de bain');
    expect(appendDictation('', 'Bonjour')).toBe('Bonjour');
  });
  it('the screen binds the field to the displayed value, never to the trimmed submission value', () => {
    const screen = readFileSync('mobile/app/devis/nouveau.tsx', 'utf8');
    expect(screen).toContain('value={displayedDescription(description, dictation.partial, listening)}');
    expect(screen).not.toContain('value={composed}');
  });
});

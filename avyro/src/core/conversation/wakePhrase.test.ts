import {
  displayWakePhrase,
  matchWakePhrase,
  normaliseUtterance,
  wakePhrasesFor,
} from './wakePhrase';

describe('normaliseUtterance', () => {
  it('flattens case, punctuation, accents and spacing', () => {
    expect(normaliseUtterance('  Hey, AVYRO!  ')).toBe('hey avyro');
    expect(normaliseUtterance('Café — Déjà vu')).toBe('cafe deja vu');
  });
});

describe('matchWakePhrase', () => {
  it('hears the wake phrase', () => {
    expect(matchWakePhrase('Hey Avyro')?.phrase).toBe('hey avyro');
  });

  it('tolerates how a recogniser mishears the name', () => {
    // "Avyro" is not in any dictionary; refusing near-misses makes it feel deaf.
    expect(matchWakePhrase('hey aviro')).not.toBeNull();
    expect(matchWakePhrase('hey avero')).not.toBeNull();
  });

  it('returns the command said in the same breath', () => {
    expect(matchWakePhrase('Hey Avyro, take me home')?.remainder).toBe('take me home');
  });

  it('returns an empty remainder when the driver only woke it', () => {
    expect(matchWakePhrase('hey avyro')?.remainder).toBe('');
  });

  it('finds the phrase mid-utterance, since recognition returns a buffer', () => {
    expect(matchWakePhrase('so anyway hey avyro how far is it')?.remainder).toBe(
      'how far is it',
    );
  });

  it('stays silent for anything else', () => {
    expect(matchWakePhrase('hey there')).toBeNull();
    expect(matchWakePhrase('')).toBeNull();
    expect(matchWakePhrase('avyro')).toBeNull();
  });
});

describe('localisation', () => {
  it('serves the phrases for a locale', () => {
    expect(wakePhrasesFor('fr-FR')).toContain('dis avyro');
  });

  it('falls back to the language when the region is unknown', () => {
    expect(wakePhrasesFor('en-AU')).toEqual(wakePhrasesFor('en-US'));
  });

  it('falls back to the default locale for a language it does not have', () => {
    expect(wakePhrasesFor('ja-JP')).toEqual(wakePhrasesFor('en-US'));
  });

  it('matches using the locale it was given', () => {
    expect(matchWakePhrase('dis avyro, va au travail', 'fr-FR')?.remainder).toBe(
      'va au travail',
    );
  });

  it('advertises only the canonical phrase, never the misheard spellings', () => {
    expect(displayWakePhrase('en-US')).toBe('Hey Avyro');
    expect(displayWakePhrase('fr-FR')).toBe('Dis Avyro');
  });
});

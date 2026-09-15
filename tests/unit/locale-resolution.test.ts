import { describe, expect, it } from 'vitest';
import { accountLocaleNeedsSync, localeFromLanguageTags, resolveMobileLocale } from '../../mobile/src/lib/locale-resolution';

const FRENCH_IPHONE = ['fr-FR', 'en-US'];
const ENGLISH_IPHONE = ['en-GB', 'fr-FR'];
const GERMAN_IPHONE = ['de-DE', 'it-IT'];

describe('mobile locale resolution', () => {
  it('reads the first supported device language, ignoring region and casing', () => {
    expect(localeFromLanguageTags(['fr-CA'])).toBe('fr');
    expect(localeFromLanguageTags(['EN_us'])).toBe('en');
    expect(localeFromLanguageTags(['de-DE', 'en-US'])).toBe('en');
    expect(localeFromLanguageTags(['de-DE'])).toBeNull();
    expect(localeFromLanguageTags([null, '', undefined])).toBeNull();
  });

  it('launches a fresh install in the device language, French by default', () => {
    expect(resolveMobileLocale({ choice: null, account: null, deviceLanguages: FRENCH_IPHONE })).toEqual({ locale: 'fr', source: 'device' });
    expect(resolveMobileLocale({ choice: null, account: null, deviceLanguages: ENGLISH_IPHONE })).toEqual({ locale: 'en', source: 'device' });
    expect(resolveMobileLocale({ choice: null, account: null, deviceLanguages: GERMAN_IPHONE })).toEqual({ locale: 'fr', source: 'fallback' });
    expect(resolveMobileLocale({ choice: null, account: null, deviceLanguages: [] })).toEqual({ locale: 'fr', source: 'fallback' });
  });

  it('never lets an inferred account value override a French iPhone', () => {
    const accidental = { locale: 'en' as const, localeChosenAt: null };
    expect(resolveMobileLocale({ choice: null, account: accidental, deviceLanguages: FRENCH_IPHONE })).toEqual({ locale: 'fr', source: 'device' });
    // Older cached sessions carry no choice date at all: same rule.
    expect(resolveMobileLocale({ choice: null, account: { locale: 'en' }, deviceLanguages: FRENCH_IPHONE })).toEqual({ locale: 'fr', source: 'device' });
    expect(accountLocaleNeedsSync(accidental, 'fr')).toBe(true);
  });

  it('honours an explicit choice over the device language', () => {
    const chosenEnglish = { locale: 'en' as const, at: '2026-09-10T10:00:00.000Z' };
    expect(resolveMobileLocale({ choice: chosenEnglish, account: null, deviceLanguages: FRENCH_IPHONE })).toEqual({ locale: 'en', source: 'choice' });
    const accountChoice = { locale: 'en' as const, localeChosenAt: '2026-09-10T10:00:00.000Z' };
    expect(resolveMobileLocale({ choice: null, account: accountChoice, deviceLanguages: FRENCH_IPHONE })).toEqual({ locale: 'en', source: 'account' });
    expect(accountLocaleNeedsSync(accountChoice, 'fr')).toBe(false);
  });

  it('keeps the most recent of two explicit choices', () => {
    const older = { locale: 'en' as const, at: '2026-09-01T10:00:00.000Z' };
    const newerAccount = { locale: 'fr' as const, localeChosenAt: '2026-09-12T10:00:00.000Z' };
    expect(resolveMobileLocale({ choice: older, account: newerAccount, deviceLanguages: ENGLISH_IPHONE })).toEqual({ locale: 'fr', source: 'account' });
    const newerLocal = { locale: 'en' as const, at: '2026-09-14T10:00:00.000Z' };
    expect(resolveMobileLocale({ choice: newerLocal, account: newerAccount, deviceLanguages: FRENCH_IPHONE })).toEqual({ locale: 'en', source: 'choice' });
  });

  it('ignores corrupted stored values', () => {
    expect(resolveMobileLocale({ choice: { locale: 'de' as never, at: 'x' }, account: { locale: 'de' as never, localeChosenAt: '2026-09-01T00:00:00.000Z' }, deviceLanguages: FRENCH_IPHONE }))
      .toEqual({ locale: 'fr', source: 'device' });
  });

  it('does not ask the server to sync when the account already matches or was chosen', () => {
    expect(accountLocaleNeedsSync({ locale: 'fr', localeChosenAt: null }, 'fr')).toBe(false);
    expect(accountLocaleNeedsSync(null, 'fr')).toBe(false);
    expect(accountLocaleNeedsSync({ locale: 'fr', localeChosenAt: '2026-09-01T00:00:00.000Z' }, 'en')).toBe(false);
  });
});

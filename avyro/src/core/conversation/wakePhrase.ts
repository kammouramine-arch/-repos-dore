import { CONVERSATION } from '@/config';

/**
 * Wake-phrase detection over a speech-to-text stream.
 *
 * Pure and locale-driven. A dedicated wake-word engine (Porcupine and friends)
 * would be cheaper on battery and would work with the microphone closed; this
 * matches on the transcript instead, which needs no extra native dependency and
 * keeps the behaviour testable. Swapping in an engine later means implementing
 * the same two functions — nothing above this file knows how the wake was
 * spotted.
 */

/**
 * Strips diacritics, punctuation and repeated spaces.
 *
 * Recognisers disagree about "Hey, Avyro!" versus "hey avyro", and a French
 * recogniser will happily return "hé avyro". Comparing normalised forms is the
 * difference between a wake phrase that works and one that works in the demo.
 */
export const normaliseUtterance = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** The phrases that wake Avyro in a locale, falling back to the default one. */
export const wakePhrasesFor = (locale: string): readonly string[] =>
  CONVERSATION.wakePhrases[locale] ??
  CONVERSATION.wakePhrases[locale.split('-')[0]] ??
  CONVERSATION.wakePhrases[CONVERSATION.defaultLocale] ??
  [];

export interface WakeMatch {
  /** The phrase that matched, normalised. */
  phrase: string;
  /**
   * Anything the driver said after the wake phrase in the same breath.
   *
   * "Hey Avyro, take me home" is one utterance, not two. Returning the tail
   * lets the engine skip straight to the command instead of asking a driver to
   * repeat themselves.
   */
  remainder: string;
}

/**
 * Finds a wake phrase anywhere in an utterance.
 *
 * Anywhere rather than only at the start: continuous recognition returns a
 * growing buffer, so by the time the phrase is committed it is often preceded
 * by whatever was said before it.
 */
export const matchWakePhrase = (
  utterance: string,
  locale: string = CONVERSATION.defaultLocale,
): WakeMatch | null => {
  const normalised = normaliseUtterance(utterance);
  if (normalised.length === 0) return null;

  for (const phrase of wakePhrasesFor(locale)) {
    const target = normaliseUtterance(phrase);
    const at = normalised.indexOf(target);
    if (at === -1) continue;

    return {
      phrase: target,
      remainder: normalised.slice(at + target.length).trim(),
    };
  }

  return null;
};

/**
 * The wake phrase to show the driver, capitalised for display.
 *
 * The first phrase of the locale is the canonical one; the rest exist only to
 * absorb how recognisers mishear it, and should never be advertised.
 */
export const displayWakePhrase = (
  locale: string = CONVERSATION.defaultLocale,
): string => {
  const [primary] = wakePhrasesFor(locale);
  if (!primary) return '';

  return primary
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

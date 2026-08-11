import type { Place } from '@/core/domain/entities/place';
import { normaliseUtterance } from './wakePhrase';

/**
 * Deciding whether a geocoder's answer is good enough to drive to.
 *
 * A geocoder always returns *something*. Silently routing a driver 200 km to
 * the best of several bad guesses is the worst failure this feature has, so
 * the question is not "did we get a result" but "did we get the one they
 * meant". When the answer is no, Avyro names its best guess and asks — it
 * never picks quietly.
 *
 * The rule is deliberately conservative and deliberately dumb: no scores, no
 * heuristics that drift. Either the driver's words are in the name of the
 * place, or Avyro asks.
 */

/** How a result's name and the spoken query are compared. */
const matchable = (value: string): string => normaliseUtterance(value);

/**
 * True when the top result plainly answers what was asked.
 *
 * Three ways to be confident, in descending strength:
 *
 * 1. It was the only result — there is nothing to be ambiguous with.
 * 2. The name equals the query: "Lille" → *Lille*.
 * 3. The name contains the query as whole words: "the airport" →
 *    *Charles de Gaulle Airport*, "12 rue de rivoli" → *12, Rue de Rivoli*.
 *
 * Substring matching is on word boundaries so "nice" does not match
 * "Nice-sur-Loire" by accident and, more importantly, so a two-letter
 * fragment cannot validate a whole city.
 */
export const isConfidentMatch = (
  query: string,
  results: readonly Place[],
): boolean => {
  const [top] = results;
  if (!top) return false;
  if (results.length === 1) return true;

  const wanted = matchable(query);
  if (wanted.length === 0) return false;

  const name = matchable(top.name);
  if (name === wanted) return true;

  // Whole-word containment, in either direction: the query may be shorter than
  // the official name ("airport") or longer than it ("lille france" → "lille").
  return containsWords(name, wanted) || containsWords(wanted, name);
};

const containsWords = (haystack: string, needle: string): boolean => {
  if (needle.length === 0) return false;
  const index = haystack.indexOf(needle);
  if (index === -1) return false;

  const before = index === 0 ? ' ' : haystack[index - 1];
  const afterIndex = index + needle.length;
  const after = afterIndex >= haystack.length ? ' ' : haystack[afterIndex];

  return before === ' ' && after === ' ';
};

/**
 * How a place should be named out loud.
 *
 * The name alone when it is distinctive, name and street when it is not — a
 * driver told "navigating to Central" learns nothing, and told the full
 * postal address learns too much to hold at speed.
 */
export const describeDestination = (place: Place): string => {
  const name = place.name.trim();
  if (name.length === 0) return place.address.trim();

  const address = place.address.trim();
  if (address.length === 0 || matchable(address).startsWith(matchable(name))) {
    return name;
  }

  // The first address line is the useful part; the country is not.
  const [locality] = address.split(',').map((part) => part.trim());
  return locality && matchable(locality) !== matchable(name)
    ? `${name}, ${locality}`
    : name;
};

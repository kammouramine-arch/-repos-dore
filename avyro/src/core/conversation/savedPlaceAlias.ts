import type { SavedPlaceSlot } from '@/core/domain/entities/conversation';
import { normaliseUtterance } from './wakePhrase';

/**
 * The words that mean a saved place, and never a place to search for.
 *
 * "Take me to home" — exactly what iOS transcribed in the LRWF0930 recording —
 * used to reach the geocoder as the query `home`, and the geocoder did what a
 * geocoder does: it returned the nearest business with "Home" in its name, and
 * the car was routed to a childminders' association. A driver who says "home"
 * means one place, the one they saved. That meaning has to be settled before
 * anything is searched, and it has to be settled in one place, because three
 * different producers can hand the app a destination string: the on-device
 * parser, the French parser and the hosted classifier.
 *
 * Exact matches only. "Home Depot" and "Maison de la Radio" are real places and
 * must still be searchable; only the alias on its own — after articles,
 * possessives and politeness are stripped — is a saved slot.
 */

const HOME = [
  'home', 'house', 'my place', 'back home', 'home sweet home',
  'maison', 'chez moi', 'domicile', 'a la maison', 'la maison', 'mon domicile', 'notre maison',
];

const WORK = [
  'work', 'office', 'workplace', 'job',
  'travail', 'bureau', 'boulot', 'taf', 'au travail', 'au bureau',
];

/** Words that carry no destination around an alias: articles, possessives, politeness. */
const NOISE = /^(?:the|my|our|a|an|to|le|la|les|l|mon|ma|mes|notre|au|a)\s+|\s+(?:please|now|thanks|s il te plait|s il vous plait|stp|svp)$/;

const strip = (value: string): string => {
  let text = normaliseUtterance(value);
  let previous = '';
  while (text !== previous) {
    previous = text;
    text = text.replace(NOISE, '').trim();
  }
  return text;
};

const HOME_SET = new Set(HOME.map(strip));
const WORK_SET = new Set(WORK.map(strip));

/**
 * The saved slot a spoken destination refers to, or null when it is a real
 * place name that should go to the geocoder.
 */
export const savedPlaceAlias = (query: string): SavedPlaceSlot | null => {
  const text = strip(query);
  if (text.length === 0) return null;
  if (HOME_SET.has(text)) return 'home';
  if (WORK_SET.has(text)) return 'work';
  return null;
};

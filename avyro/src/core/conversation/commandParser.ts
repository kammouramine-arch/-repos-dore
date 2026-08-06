import type { VoiceIntent } from '@/core/domain/entities/conversation';
import { normaliseUtterance } from './wakePhrase';

/**
 * Avyro's command vocabulary, matched on-device.
 *
 * Deterministic by design. A driver saying "cancel navigation" at 110 km/h is
 * not asking a language model to consider the request — the answer has to be
 * instant, offline, and identical every time. Anything outside this vocabulary
 * falls through to the conversation provider, which is where a model belongs.
 *
 * Rules are ordered, and order carries meaning: control commands beat
 * questions, questions beat searches. "How far is the coffee" is a question
 * about the trip, not a request for a café.
 */

interface Rule {
  intent: VoiceIntent;
  patterns: RegExp[];
}

const MOTION = '(?:take|drive|get|bring|navigate|route|guide)';
const GO = '(?:go|head|navigate|drive|take|get|bring|route)';

const RULES: Rule[] = [
  {
    intent: { kind: 'cancel-navigation' },
    patterns: [
      /\b(?:cancel|stop|end|abort|clear)\b[\s\w]*\b(?:navigation|navigating|route|trip|guidance|directions|journey)\b/,
      /\bstop\s+(?:navigating|guiding|the\s+trip)\b/,
      /\bforget\s+(?:it|the\s+(?:route|trip))\b/,
    ],
  },
  {
    intent: { kind: 'reroute' },
    patterns: [
      /\breroute\b/,
      /\bre\s?calculate\b/,
      /\b(?:find|give|take|show)\s+me\s+(?:another|a\s+different|a\s+new)\s+(?:route|way)\b/,
      /\b(?:another|different|new)\s+route\b/,
    ],
  },
  {
    intent: { kind: 'navigate-saved', slot: 'home' },
    patterns: [
      new RegExp(`\\b${MOTION}\\s+me\\s+(?:back\\s+)?home\\b`),
      new RegExp(`\\b${GO}\\s+(?:me\\s+)?home\\b`),
      /^home$/,
      /\bhead\s+home\b/,
    ],
  },
  {
    intent: { kind: 'navigate-saved', slot: 'work' },
    patterns: [
      new RegExp(`\\b${MOTION}\\s+me\\s+to\\s+(?:the\\s+)?(?:work|office)\\b`),
      new RegExp(`\\b${GO}\\s+to\\s+(?:the\\s+)?(?:work|office)\\b`),
      /^(?:work|the office)$/,
    ],
  },
  {
    intent: { kind: 'ask-eta' },
    patterns: [
      /\bhow\s+long\b/,
      /\bhow\s+much\s+longer\b/,
      /\bwhen\s+(?:will|do|am)\s+(?:i|we)\s+(?:arrive|get\s+there|be\s+there)\b/,
      /\b(?:what(?:'?s| is)\s+(?:my|the)\s+)?eta\b/,
      /\btime\s+(?:of|to)\s+arrival\b/,
      /\bare\s+we\s+there\s+yet\b/,
    ],
  },
  {
    intent: { kind: 'ask-remaining-distance' },
    patterns: [
      /\bhow\s+far\b/,
      /\bhow\s+many\s+(?:miles|kilometres|kilometers|kms?)\b/,
      /\bdistance\b[\s\w]*\b(?:left|remaining|to\s+go)\b/,
      /\bhow\s+much\s+(?:distance|further|farther)\b/,
    ],
  },
  {
    intent: { kind: 'find-nearby', category: 'restaurants' },
    patterns: [
      /\brestaurants?\b/,
      /\b(?:somewhere|a\s+place)\s+to\s+eat\b/,
      /\bfind\s+(?:me\s+)?(?:some\s+)?food\b/,
      /\bi(?:'?m)?\s+hungry\b/,
    ],
  },
  {
    intent: { kind: 'find-nearby', category: 'coffee' },
    patterns: [/\bcoffee\b/, /\bcafes?\b/, /\bespresso\b/, /\bcoffee\s+shop\b/],
  },
  {
    intent: { kind: 'find-nearby', category: 'fuel' },
    patterns: [
      /\bfuel\b/,
      /\bpetrol\b/,
      /\bgas\s+station\b/,
      /\bfind\s+(?:me\s+)?(?:some\s+)?gas\b/,
      /\b(?:ev\s+)?charg(?:er|ing)\b/,
      /\bfill\s+up\b/,
    ],
  },
  {
    intent: { kind: 'find-nearby', category: 'parking' },
    patterns: [
      /\bparking\b/,
      /\bcar\s+park\b/,
      /\b(?:somewhere|a\s+place)\s+to\s+park\b/,
      /\bpark\s+the\s+car\b/,
    ],
  },
];

/**
 * Understands an utterance, or admits that it does not.
 *
 * The transcript is normalised first, so casing, punctuation and accents never
 * decide whether a command is recognised.
 */
export const parseCommand = (transcript: string): VoiceIntent => {
  const utterance = normaliseUtterance(transcript);
  if (utterance.length === 0) return { kind: 'unknown' };

  for (const rule of RULES) {
    if (rule.patterns.some((pattern) => pattern.test(utterance))) {
      return rule.intent;
    }
  }

  return { kind: 'unknown' };
};

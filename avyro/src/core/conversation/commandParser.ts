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
    // Before everything: "go back to my original destination" contains "go
    // back", which would otherwise read as a plain navigation command.
    intent: { kind: 'restore-destination' },
    patterns: [
      /\b(?:go|take\s+me|head)\s+back\s+to\s+(?:my\s+)?(?:original|previous|old|first)\s+destination\b/,
      /\b(?:back|return)\s+to\s+(?:my\s+)?(?:original|previous|old|first)\s+(?:destination|route|trip)\b/,
      /\bresume\s+(?:my\s+)?(?:original|previous)\s+(?:trip|route|destination)\b/,
    ],
  },
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
    intent: { kind: 'ask-fastest-route' },
    patterns: [
      /\b(?:am|are)\s+(?:i|we)\s+on\s+the\s+(?:fastest|quickest|best)\s+(?:route|way)\b/,
      /\bis\s+(?:this|there)\s+(?:the\s+)?(?:fastest|quickest|a\s+faster|a\s+quicker)\s+(?:route|way)\b/,
      /\bfastest\s+route\b/,
    ],
  },
  {
    intent: { kind: 'ask-traffic' },
    patterns: [
      /\btraffic\b/,
      /\b(?:is\s+it|are\s+we)\s+(?:backed\s+up|congested)\b/,
      /\bhold\s?ups?\s+ahead\b/,
    ],
  },
  {
    // "Take me there" points at whatever Avyro last suggested.
    intent: { kind: 'navigate-referent' },
    patterns: [
      /\b(?:take|get|bring|drive)\s+(?:me|us)\s+(?:there|to\s+(?:it|that\s+one))\b/,
      /\b(?:let(?:'?s)?\s+)?go\s+there\b/,
      /\b(?:yes|yeah|sure|ok(?:ay)?)[, ]+(?:take\s+me\s+there|go\s+there)\b/,
      /\bnavigate\s+there\b/,
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
      /\b(?:find|get|need|want)\s+(?:me\s+)?(?:some\s+)?(?:food|lunch|dinner|breakfast)\b/,
      /\bi(?:\s?a?m|'?m)?\s+hungry\b/,
      /\bi\s+need\s+(?:to\s+eat|food)\b/,
    ],
  },
  {
    intent: { kind: 'find-nearby', category: 'coffee' },
    patterns: [
      /\bcoffee\b/,
      /\bcafes?\b/,
      /\bespresso\b/,
      /\bi\s+need\s+caffeine\b/,
    ],
  },
  {
    intent: { kind: 'find-nearby', category: 'fuel' },
    patterns: [
      /\bfuel\b/,
      /\bpetrol\b/,
      /\bi\s+need\s+(?:gas|fuel|petrol|to\s+fill\s+up)\b/,
      /\b(?:low|running\s+low)\s+on\s+(?:gas|fuel|petrol)\b/,
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

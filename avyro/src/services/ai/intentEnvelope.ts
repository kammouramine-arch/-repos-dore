import type { VoiceIntent } from '@/core/domain/entities/conversation';

/**
 * Validates the JSON a model returns, against what Avyro can actually do.
 *
 * This is the boundary that makes a model safe to consult. Anything it invents
 * — a kind that does not exist, a category the app cannot search, a slot that
 * is not home or work — fails here and becomes nothing. There is no path from
 * a model's imagination to an action.
 *
 * Returns `null` when the envelope is unusable, which the caller treats as "the
 * model did not answer".
 */

const CATEGORIES = ['restaurants', 'coffee', 'fuel', 'parking'] as const;
const SLOTS = ['home', 'work'] as const;

const PLAIN_KINDS = [
  'ask-eta',
  'ask-remaining-distance',
  'ask-fastest-route',
  'ask-traffic',
  'cancel-navigation',
  'reroute',
  'navigate-referent',
  'restore-destination',
  'unknown',
] as const;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const toIntent = (value: unknown): VoiceIntent | null => {
  const record = asRecord(value);
  const kind = record?.kind;
  if (typeof kind !== 'string') return null;

  if (kind === 'navigate-saved') {
    const slot = record?.slot;
    return SLOTS.includes(slot as (typeof SLOTS)[number])
      ? { kind, slot: slot as (typeof SLOTS)[number] }
      : null;
  }

  if (kind === 'find-nearby') {
    const category = record?.category;
    return CATEGORIES.includes(category as (typeof CATEGORIES)[number])
      ? { kind, category: category as (typeof CATEGORIES)[number] }
      : null;
  }

  return PLAIN_KINDS.includes(kind as (typeof PLAIN_KINDS)[number])
    ? ({ kind } as VoiceIntent)
    : null;
};

export interface IntentEnvelope {
  intent: VoiceIntent | null;
  speech: string | null;
}

export const decodeIntentEnvelope = (value: unknown): IntentEnvelope | null => {
  const record = asRecord(value);
  if (!record) return null;

  const speech = typeof record.speech === 'string' && record.speech.trim().length > 0
    ? record.speech.trim()
    : null;

  const intent = record.intent === undefined || record.intent === null
    ? null
    : toIntent(record.intent);

  // An envelope with neither a usable intent nor anything to say is no answer.
  if (!intent && !speech) return null;

  return { intent, speech };
};

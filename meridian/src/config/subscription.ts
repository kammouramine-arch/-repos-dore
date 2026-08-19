/**
 * Monetisation configuration. Pricing and limits are declared once here so they can be
 * changed (or fetched remotely later) without touching screens.
 * Product identifiers must match the ones created in App Store Connect / Play Console.
 */
import { FREE_LIMITS } from '@shared/limits';

export type Tier = 'free' | 'pro';

// Limits live next to the edge function that enforces them, so the number shown in
// the app can never drift from the number the server applies.
export { FREE_LIMITS };

export const PRO_FEATURES = [
  { key: 'ai', title: 'Unlimited conversations', detail: 'Talk as much as your life needs.' },
  { key: 'ninety', title: '90-day life plans', detail: 'Month, week and day level roadmaps.' },
  { key: 'weekly', title: 'AI weekly planning', detail: 'Realistic weeks with conflict detection.' },
  { key: 'replan', title: 'Intelligent replanning', detail: 'One sentence rebuilds your day.' },
  { key: 'memory', title: 'Advanced memory', detail: 'Deeper context, fewer repeated questions.' },
  { key: 'voice', title: 'Voice capture', detail: 'Speak instead of typing.' },
  { key: 'insights', title: 'Progress insights', detail: 'See what actually moves your life.' },
] as const;

/** Feature gates checked by `useEntitlement`. */
export const PRO_ONLY = [
  'ninety_day_plan',
  'weekly_ai_plan',
  'life_reset',
  'voice',
  'advanced_memory',
  'insights',
] as const;
export type ProFeature = (typeof PRO_ONLY)[number];

export const PLANS = [
  {
    id: 'monthly',
    productId: 'meridian.pro.monthly',
    label: 'Monthly',
    price: '€9.99',
    period: 'per month',
    note: null as string | null,
  },
  {
    id: 'annual',
    productId: 'meridian.pro.annual',
    label: 'Annual',
    price: '€59.99',
    period: 'per year',
    note: 'Save 50%',
  },
] as const;

export type PlanId = (typeof PLANS)[number]['id'];

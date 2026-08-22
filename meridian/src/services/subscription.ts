import { supabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import {
  DEFAULT_CATALOGUE,
  currentPeriod,
  mergeCatalogue,
  resolveEntitlement,
  type Catalogue,
  type Meter,
  type SubscriptionRecord,
} from '@/config/subscription';
import type { Subscription } from '@/types/database';

/**
 * Subscription and usage reads. The app never decides entitlement on its own — it
 * resolves the same catalogue the server uses, from the same stored subscription row,
 * so what the UI promises and what the server allows cannot drift apart.
 */

export async function fetchCatalogue(): Promise<Catalogue> {
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'plans')
    .maybeSingle();

  // A missing or unreadable override is not an error: the compiled catalogue is a
  // complete, working default.
  if (error || !data?.value) return DEFAULT_CATALOGUE;
  return mergeCatalogue(DEFAULT_CATALOGUE, data.value as never);
}

export async function fetchSubscription(): Promise<Subscription | null> {
  const { data, error } = await supabase.from('subscriptions').select('*').maybeSingle();
  if (error) throw toAppError(error);
  return data;
}

export type UsageSummary = {
  period: { start: string; end: string };
  used: Partial<Record<Meter, number>>;
};

export async function fetchUsage(subscription: SubscriptionRecord | null): Promise<UsageSummary> {
  const period = currentPeriod(subscription);
  const { data, error } = await supabase.rpc('get_usage_summary', { p_period_start: period.start });
  if (error) throw toAppError(error);

  const used: Partial<Record<Meter, number>> = {};
  for (const row of (data ?? []) as { meter: string; used: number }[]) {
    used[row.meter as Meter] = Number(row.used);
  }
  return { period, used };
}

/** Recent metered activity, for the "where did it go?" list on the usage screen. */
export async function fetchUsageHistory(limit = 20) {
  const { data, error } = await supabase
    .from('usage_events')
    .select('id, meter, amount, operation, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw toAppError(error);
  return data ?? [];
}

export { resolveEntitlement };

import { useMemo } from 'react';
import {
  DEFAULT_CATALOGUE,
  METER_LABELS,
  checkOperation,
  describeQuota,
  objectAllowance,
  planFor,
  planForMoreObjects,
  planForMoreOf,
  resolveEntitlement,
  type Catalogue,
  type Entitlement,
  type EntitlementKey,
  type Meter,
  type ObjectKind,
  type Operation,
  type Plan,
  type QuotaCheck,
  type SubscriptionRecord,
} from '@/config/subscription';
import { fetchCatalogue, fetchSubscription, fetchUsage } from '@/services/subscription';
import { useCachedQuery } from './useCachedQuery';

/**
 * The single place the app asks "can they do this, and how much is left?".
 *
 * No screen checks a plan name and no screen holds a limit. They ask for a capability
 * or a meter, and this hook answers from the same catalogue the server enforces.
 */

export type QuotaView = {
  meter: Meter;
  label: string;
  unit: string;
  limit: number;
  used: number;
  remaining: number;
  /** 0–100, how much of the allowance is left. */
  percentRemaining: number;
  /** Described as generous rather than counted down. */
  fairUse: boolean;
  included: boolean;
  description: string;
};

export function useEntitlements() {
  const catalogueQuery = useCachedQuery(['catalogue'], 'catalogue', fetchCatalogue, {
    staleTime: 5 * 60_000,
  });
  const subscriptionQuery = useCachedQuery(['subscription'], 'subscription', fetchSubscription);

  const catalogue: Catalogue = catalogueQuery.data ?? DEFAULT_CATALOGUE;
  const subscription = (subscriptionQuery.data ?? null) as SubscriptionRecord | null;

  const usageQuery = useCachedQuery(
    ['usage', subscription?.current_period_start ?? 'month'],
    'usage',
    () => fetchUsage(subscription),
    { staleTime: 20_000 },
  );

  const entitlement: Entitlement = useMemo(
    () => resolveEntitlement(catalogue, subscription),
    [catalogue, subscription],
  );

  const used = usageQuery.data?.used ?? {};
  const period = usageQuery.data?.period ?? null;

  const quota = useMemo(
    () =>
      (meter: Meter): QuotaView => {
        const limit = entitlement.quotas[meter] ?? 0;
        const spent = used[meter] ?? 0;
        const remaining = Math.max(0, limit - spent);
        return {
          meter,
          label: METER_LABELS[meter].label,
          unit: METER_LABELS[meter].unit,
          limit,
          used: spent,
          remaining,
          percentRemaining: limit > 0 ? Math.round((remaining / limit) * 100) : 0,
          fairUse: entitlement.plan.fairUse.includes(meter),
          included: limit > 0,
          description: describeQuota(entitlement.plan, meter),
        };
      },
    [entitlement, used],
  );

  return {
    /** Resolved state: which tier actually applies right now. */
    entitlement,
    catalogue,
    plan: entitlement.plan,
    tier: entitlement.tier,
    status: entitlement.status,
    isPaid: entitlement.isPaid,
    isTrial: entitlement.isTrial,
    accessUntil: entitlement.accessUntil,
    subscription: subscriptionQuery.data ?? null,

    /** Capability check. Screens ask for this, never for a plan name. */
    can: (key: EntitlementKey) => entitlement.entitlements.has(key),

    quota,
    usage: used,
    period,
    /** When the current allowance resets. */
    resetsAt: period?.end ?? null,

    /** Pre-flight check so the UI can warn before a request is even sent. */
    canRun: (operation: Operation, multiplier = 1): QuotaCheck =>
      checkOperation(catalogue, entitlement, operation, used, multiplier),

    /**
     * How many goals, habits or projects this plan holds, and whether they are at the
     * cap. Existing items are never hidden — only creating a new one is limited.
     */
    objects: (kind: ObjectKind, current: number) => ({
      ...objectAllowance(entitlement.plan, kind, current),
      upgradeTo: planForMoreObjects(catalogue, kind, entitlement.plan.objectLimits[kind] ?? 0),
    }),

    /** The plan to offer when something is out of reach. */
    upgradeForCapability: (key: EntitlementKey): Plan | null => planFor(catalogue, key),
    upgradeForMeter: (meter: Meter): Plan | null =>
      planForMoreOf(catalogue, meter, entitlement.quotas[meter] ?? 0),
    /** The next plan up from the current one, if there is one on sale. */
    nextPlan: (): Plan | null => {
      const index = catalogue.order.indexOf(entitlement.tier);
      for (const tier of catalogue.order.slice(index + 1)) {
        const plan = catalogue.plans[tier];
        if (plan?.available) return plan;
      }
      return null;
    },

    isLoading: catalogueQuery.isLoading || subscriptionQuery.isLoading,
    refetch: () => {
      void subscriptionQuery.refetch();
      void usageQuery.refetch();
      void catalogueQuery.refetch();
    },
  };
}

export type Entitlements = ReturnType<typeof useEntitlements>;

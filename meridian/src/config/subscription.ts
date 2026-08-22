/**
 * Client-side view of the subscription catalogue.
 *
 * Everything real lives in the shared catalogue that the edge functions enforce; this
 * module only re-exports it and adds the loader that pulls the runtime override from
 * `app_config`, so prices and limits shown in the app always match what the server
 * applies, and can be changed without shipping a build.
 */
export {
  DEFAULT_CATALOGUE,
  METERS,
  METER_LABELS,
  OPERATIONS,
  checkOperation,
  currentPeriod,
  describeQuota,
  formatPrice,
  hasEntitlement,
  mergeCatalogue,
  objectAllowance,
  planFor,
  planForMoreObjects,
  planForMoreOf,
  resolveEntitlement,
  routeModel,
  yearlySaving,
} from '@shared/plans';

export type {
  Catalogue,
  ObjectKind,
  Entitlement,
  EntitlementKey,
  Meter,
  Operation,
  Plan,
  Price,
  QuotaCheck,
  SubscriptionRecord,
  SubscriptionStatus,
  Tier,
  UsageState,
} from '@shared/plans';

/** Where "manage subscription" sends people, per platform. */
export const MANAGE_SUBSCRIPTION_URL = {
  ios: 'https://apps.apple.com/account/subscriptions',
  android: 'https://play.google.com/store/account/subscriptions',
} as const;

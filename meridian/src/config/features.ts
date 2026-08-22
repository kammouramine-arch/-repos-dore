/**
 * Integration switches. A flag is only `true` when the integration is genuinely
 * implemented end to end — the UI reads these so we never present a fake integration.
 */
export const features = {
  appleCalendar: false,
  googleCalendar: false,
  outlookCalendar: false,
  appleHealth: false,
  googleHealthConnect: false,
  appleSignIn: false,
  googleSignIn: false,
  /** Voice needs a transcription provider configured on the server (see docs/AI.md). */
  voiceCapture: true,
  pushNotifications: true,
  /**
   * Store purchases are implemented against StoreKit 2 and Play Billing. Whether they
   * are usable depends on the build: `purchasesAvailable()` answers that at runtime,
   * and the paywall reads it. This flag stays for a deliberate kill switch.
   */
  inAppPurchases: true,
} as const;

export type FeatureKey = keyof typeof features;

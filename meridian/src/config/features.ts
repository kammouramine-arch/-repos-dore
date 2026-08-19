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
  /** Store purchases need an IAP library plus products configured — see docs/BILLING.md. */
  inAppPurchases: false,
} as const;

export type FeatureKey = keyof typeof features;

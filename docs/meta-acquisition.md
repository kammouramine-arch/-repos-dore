# DEVISERA Meta acquisition — prepared, disabled, not deployed

App: DEVISERA · iOS `fr.devisia.app` · App Store `6806865251`.
Base: `claude/devisia-saas-build-4wthv7` at `9644bd4`.

## What this change does

One sender: the iOS Meta SDK. Automatic logging and automatic initialization are off.
The optional French/English consent control appears on registration/social entry and
in account settings. Both explicit app consent and current iOS ATT authorization are
required. Refusal does not restrict the app. No events are queued awaiting consent.
The Expo native SDK subscriber is patched to respect disabled auto-initialization;
keep patch-package enabled when installing dependencies. Android linking is excluded.

Events:

| Event | Source | Value | Duplicate key |
|---|---|---|---|
| CompleteRegistration | authenticated account creation timestamp, at most 10 minutes old | none | account-specific HMAC |
| StartTrial | Apple-verified production seven-day free trial | none | transaction-specific HMAC |
| Purchase | Apple-verified production subscription charge | signed price / 1000 and signed currency | transaction-specific HMAC |

Purchase is the single revenue event; do not also emit Subscribe for the same charge.
No email, phone, customer/job details, quote text, recording, receipt, raw account ID,
or raw Apple transaction ID is passed to Meta. SDK advertising/device metadata is
available only after consent/ATT. Signed prices are advertising conversion values,
not an accounting or net-proceeds ledger.

Sandbox, zero-price charges, refunds, upgraded receipts, expired/future receipts,
pending downgrades, historical receipts older than 24 hours and non-seven-day trials
are excluded. Existing logins older than ten minutes do not become registrations.

The database's unique HMAC claim prevents duplicate native handoffs across devices
and concurrent requests. SecureStore adds local duplicate protection. This is an
**at-most-once handoff**, not guaranteed exactly-once delivery: a crash/network loss
after the database claim can lose the event. No server/CAPI sender exists. Renewals
are measured only if a consenting iOS app reconciles a fresh verified transaction
within 24 hours; background renewals while the app stays closed are not sent.
Changing the HMAC secret would reset duplicate identity; keep it stable.

## Activation sequence (not executed)

1. Finish the Meta app creation legal acceptance. Selected use case:
   **Create & manage app ads with Meta Ads Manager**. Draft name DEVISERA;
   account-provided contact email retained. No portfolio is connected.
2. Associate iOS bundle `fr.devisia.app`, iPhone store ID `6806865251`.
   Confirm the contact email, privacy/deletion URLs and actual business identity.
3. Complete the Ads Manager policy acknowledgement. Existing account observed:
   `1444325244262951`. Confirm its owner, currency, timezone, Page/Instagram identity
   and business portfolio before configuring campaign assets.
4. Apply `20260922120000_meta_event_claim` to the intended database. Configure server
   `META_APP_EVENTS_ENABLED=true` and a fresh random `META_EVENT_KEY_SECRET` with
   at least 32 characters. Never put the HMAC key in Expo/public environment variables.
5. Configure the mobile build with `EXPO_PUBLIC_META_EVENTS_ENABLED=true`,
   `EXPO_PUBLIC_META_APP_ID` and `EXPO_PUBLIC_META_CLIENT_TOKEN` from the real Meta app.
   The client token is embedded in the app by design; never use the Meta app secret.
   Missing real IDs fail the enabled build. The default remains disabled.
6. Review/update the published privacy notice and App Store privacy declarations
   against the final native binary and SDK behavior before distributing it.
7. Build the iOS native binary on macOS/EAS after approval for any build charges.
   A JavaScript export is not an Xcode build. Check the patched subscriber in the
   generated native project and inspect device network traffic for no pre-consent
   SDK traffic, refusal, withdrawal, and ATT revoked in Settings.
8. In Meta Test Events verify registration, trial, purchase values and duplicate
   restore behavior. This implementation excludes Sandbox from production reporting;
   use mocks for free-trial/revenue logic and a separately designed test-only sink
   if a native sandbox rehearsal is needed. Do not weaken the production filter.
9. Verify installation attribution and iOS measurement in Events Manager. The Expo
   plugin adds Meta's two SKAdNetwork IDs; that alone does not prove attribution is
   active. Automatic events remain off; app-install measurement and the conversion
   schema require a real-device/Meta validation before any campaign launch.
10. Obtain explicit budget and publishing approval. No ads, app release, production
    migration or deployment was performed by this task.

## Campaign draft specification

- Name: `DEVISERA | FR | iOS | Installations | Test 01`
- Objective: App promotion; app: DEVISERA iOS; destination:
  https://apps.apple.com/fr/app/devisera/id6806865251
- Initial performance goal: app installs, only once attribution is verified.
- One initial ad set: `FR | iPhone | Large | 18+`. France only, iOS/iPhone only,
  all genders, no custom/lookalike audience upload. Keep language unrestricted
  within France; the creative is French. Confirm Meta's final geography controls.
- Initial creative: French portrait image; Facebook/Instagram feed placements.
  Prepare a separate 9:16 adaptation before enabling Stories/Reels to avoid clipping.
- CTA: install/download, using the available app-install CTA in Ads Manager.
- Budget, start/end dates and billing method: deliberately unset pending approval.
- Status: specification only; no campaign object created because onboarding is blocked.

Primary text:

Artisans, préparez vos devis depuis votre iPhone. Décrivez vos travaux à voix haute,
vérifiez les détails, ajustez vos tarifs et exportez votre devis en PDF avec DEVISERA.

Headline: **Vos devis commencent par votre voix.**

Description: **Dictez. Vérifiez. Exportez en PDF.**

No price or unconditional free-trial claim is used. If the trial is mentioned in a
future variation, include Apple eligibility and the verified renewal conditions.

## Sources

- [React Native FBSDK Next documentation](https://github.com/thebergamo/react-native-fbsdk-next)
- [Apple signed transaction fields and milliunit prices](https://developer.apple.com/documentation/appstoreserverapi/jwstransactiondecodedpayload)
- [Meta app-install use case](https://developers.facebook.com/docs/development/create-an-app/app_install_ads_use_case/)

## Validation

See the pull request / saved task status for actual command results. Native SDK
network behavior, Meta Test Events, App Store disclosure review and a native Xcode
build remain release requirements, not claims of completed verification.

# StoreKit diagnostic build

EAS audit on 2026-09-09: latest finished iOS build is 29,
f100a0c9-259d-44b0-9d73-0e905e3bb55f, production profile,
source 019b6ab6a2d3acf777378d0c054a241427f554c1.
That source has a conditional paywall support button and a Mon compte support
component. This is source provenance, not proof the control is accessible on the
installed phone. Do not ask the tester to find it again.

## Next diagnostic binary only

Build from mobile with `eas build --platform ios --profile testflight-diagnostics`.
No build was created during this implementation pass.
Only that named EAS profile enables the hidden view. Normal production builds
set the flag false, including if unrelated environment variables request it.
This is a developer-build gate, not runtime TestFlight detection. **Never promote
this diagnostic binary to public App Store release.** Build with production for
customers. No receipt or Apple credential is read for gating.

On the diagnostic build: open Abonnement, scroll to the top, hold the DEVISERA
logo for 1.8 seconds. Choose “Charger les produits Apple actuels”, wait for the
bounded fetch, then “Copier le rapport de diagnostic”. Paste into support chat.
The same hidden logo entry exists in Mon compte's existing diagnostic location.

The report includes version/build, timestamps, storefront, requested/returned and
missing product IDs, counts, native displayPrice/currency, subscription periods,
intro metadata/eligibility, error codes/categories, durations and application
in-flight reuse policy. INTRO_ELIGIBILITY_UNKNOWN means the conservative false
value is not a proven Apple ineligibility result. Native internal caching cannot
be observed: the report explicitly labels it unknown, rather than claiming that
all stale native state was eliminated.

The clipboard report is an explicit product-event allowlist. It excludes purchase
events, transaction references, receipts, account identifiers, passwords and tokens.
Copy requires an explicit tap; nothing is uploaded automatically. No prices or
entitlements were changed by this diagnostic feature. Physical TestFlight validation
and the USD root cause remain outstanding until the report is collected.

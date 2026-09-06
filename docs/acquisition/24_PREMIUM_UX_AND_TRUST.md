# DEVISERA — Premium UX and trust pass

Date: 2026-09-06

## Implemented

- The mobile bottom bar uses direct five-slot navigation: Accueil, Clients,
  central Créer, Activité, and Mon espace. The previous parent drag recognizer
  was removed because it could compete with short taps on a real iPhone.
- The central creation action is visually elevated and opens the existing AI
  quote flow without changing its route or data model.
- Mon espace now presents the artisan and business identity first, then groups
  account, business, subscription, catalogue, and activity controls.
- A successful quote is counted locally. After the second successful quote, a
  dismissible review request may appear; it is throttled to once every 90 days
  and never appears on first launch.
- New mobile signups request a six-digit email confirmation code. The mobile
  root gate keeps unverified users on the verification/account surfaces, and
  server permissions reject quote, AI, client, file, dashboard, and follow-up
  operations until the address is verified.
- The Apple paywall shows the DEVISERA mark and will not start a purchase when
  StoreKit returns a non-EUR product. This prevents an accidental dollar-priced
  purchase.

## External limitations

- The Apple purchase confirmation sheet is rendered by StoreKit. Its icon and
  merchant presentation are controlled by App Store Connect and Apple’s
  storefront configuration; React Native cannot inject a logo into that sheet.
- The native `expo-store-review` module is not present in the locked dependency
  set and network access was unavailable to add it. The current flow is a
  throttled, explicit store-review link. Add the native module in a future
  build if an App Store in-app review prompt is required.

## Real-device QA checklist

1. Cold start with a verified account; confirm the first meaningful screen is
   visible without a blank interval.
2. Tap each bottom item once. Confirm Accueil, Clients, Créer, Activité, and Mon
   espace each respond on the first tap; repeat rapidly five times.
3. Tap Créer once from every tab; confirm the AI quote surface appears without
   force-closing.
4. Tap a client row (not the call icon); confirm the complete profile opens.
5. Create two quotes; confirm the review request appears only after the second
   success and can be dismissed.
6. Create an account with a real inbox, enter the six-digit code, then confirm
   quotes and AI are available. Repeat with an invalid address and confirm the
   verification gate remains.
7. In a French Apple sandbox storefront, confirm all products return EUR and
   the purchase button is enabled. In a non-EUR storefront, confirm purchase is
   blocked with a clear reload/configuration message.
8. Background and resume the app, then repeat steps 2–3 on poor network.

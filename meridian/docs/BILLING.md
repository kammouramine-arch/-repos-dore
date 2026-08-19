# Subscriptions

## Model

| | Free | Pro |
|---|---|---|
| Conversations | 15 a day | Unlimited |
| Active goals | 3 | Unlimited |
| Habits | 3 | Unlimited |
| Projects | 1 | Unlimited |
| Daily planning | Yes | Yes |
| Weekly AI planning | — | Yes |
| 90-day plans | — | Yes |
| Life Reset | — | Yes |
| Week-wide replanning | — | Yes |
| Voice capture | — | Yes |

The free tier is a working planner, not a demo. Limits are about depth of planning,
not about hiding basic features.

Prices and product ids live in `src/config/subscription.ts`. Limits live in
`supabase/functions/_shared/limits.ts` — shared by the app (which displays them) and
the edge function (which enforces them), so the two cannot disagree.

## What is implemented

* `subscriptions` table with tier, status, platform, product id and period end.
* Server-side enforcement of the conversation limit (`ai_usage` + `increment_ai_usage`).
* Server-side gating of Pro-only tools, which return `requires_pro`.
* Client-side gating through `useEntitlement()`, plus the paywall screen.
* Read-only subscription policy: a device cannot promote itself to Pro.

## What is not implemented

Store purchases. `features.inAppPurchases` is `false` and the paywall says so plainly
instead of showing a button that does nothing.

To enable purchases:

1. Create the products in App Store Connect and Google Play using the ids in
   `src/config/subscription.ts` (`meridian.pro.monthly`, `meridian.pro.annual`).
2. Add a purchase library — `expo-in-app-purchases` or `react-native-iap` — and wire the
   buy button in `app/paywall.tsx`.
3. Verify the receipt **server-side** in a new edge function and update
   `subscriptions` with the service role. Never trust a client-reported purchase; the
   RLS policy already prevents the client from writing the tier itself.
4. Handle the store's renewal and cancellation notifications in the same function.
5. Set `features.inAppPurchases = true`.

## Granting Pro manually

For testing, or for a promo:

```sql
update public.subscriptions
   set tier = 'pro', status = 'active', platform = 'promo'
 where user_id = '<uuid>';
```

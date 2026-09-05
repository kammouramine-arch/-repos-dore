# TestFlight billing and quote-generation pass — September 2026

## Release gates

- `APPLE_ALLOW_SANDBOX=true` was explicitly approved for TestFlight on September 5. It accepts Apple-signed sandbox transactions, which can unlock live resources without payment. **Set it to false and redeploy before public launch.** Production transactions remain signature-, bundle-, product-, and account-verified.
- Never finish a StoreKit transaction before the server verifies and stores it.
- Apply the additive Apple subscription migration before shipping the native purchase build. Vercel's build runs `prisma migrate deploy`; the migration adds nullable columns and a unique index, without deleting user data.
- Configure both Apple server-notification environments to `/api/webhooks/apple` on the stable production host, using version 2 notifications.
- Verify all three monthly products and one-week introductory offers on an actual iPhone. One introductory offer per eligible Apple account/subscription group, not a fresh trial for every plan switch.
- Verify purchase, restore, cancellation, renewal, refund, and expiry; never claim those device scenarios passed based only on unit tests.
- Confirm a real email delivery provider before public launch; console delivery does not send customer email.

## Checks

- 167 unit tests passed, including transport timeout, cache isolation, forged Apple receipt rejection, account binding, ordering, and refund persistence.
- Full database integration tests are pending: the local PostgreSQL test database was unavailable.
- Dependency audit reports a high-severity recursive-object merge advisory in Prisma's configuration tooling (`deepmerge-ts`). No forced downgrade was applied; review separately before public launch.
- Smoothness improvements require real-device validation; web previews cannot prove iPhone frame timing.

## Quote fix

The AI quote route exceeded the mobile client's general 20-second deadline. Native aborts were shown as generic connection errors. Quote generation now has a dedicated client deadline, bounded server model attempts, lower reasoning overhead, and malformed-JSON fallback. The approved preferred quote model is `gemini-3.5-flash`.

## Delivery status

- Production deployed successfully: `dpl_7V7zfiNHyNGibjd53fchEkp5gXhK`, stable host `https://devisia-bice.vercel.app`.
- Migration applied successfully through the same project's Supabase session pooler; the direct IPv6 endpoint was unreachable from the builder. Reference: https://supabase.com/docs/guides/database/prisma
- Live site returns HTTP 200; unsigned webhook payload correctly returns HTTP 422.
- Apple group `22361541`: Entreprise `6808981897` (level 1), Pro `6808991416` (level 2), Essentiel `6808994981` (level 3). France prices €149/€79/€39, monthly, each with a free first week. French product and group localizations saved.
- Production and sandbox notification URLs both saved to the stable host's `/api/webhooks/apple`. Current Apple UI offered no notification-version selector; signed version-2 delivery still needs end-to-end verification.
- Apple agreement, bank and tax statuses are active. App-level DSA text says non-trader; owner must review that declaration before commercial launch.
- Native iOS build 8 succeeded: `8b1ea0f2-165b-4442-b3a6-3be41f9261ad`; auto-submission `96713e37-960a-4a30-b3aa-6fbb7b6bab5c` delivered. Apple upload is Complete, build `ac17bb1d-ac93-487c-9c27-2a06918bb47e`, attached to DEVISIA Internal (1 tester). Real-device purchase/AI verification remains outstanding.

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

- 161 unit tests passed, including transport timeout, cache isolation, and forged Apple receipt rejection.
- Full database integration tests are pending: the local PostgreSQL test database was unavailable.
- Dependency audit reports a high-severity recursive-object merge advisory in Prisma's configuration tooling (`deepmerge-ts`). No forced downgrade was applied; review separately before public launch.
- Smoothness improvements require real-device validation; web previews cannot prove iPhone frame timing.

## Quote fix

The AI quote route exceeded the mobile client's general 20-second deadline. Native aborts were shown as generic connection errors. Quote generation now has a dedicated client deadline, bounded server model attempts, lower reasoning overhead, and malformed-JSON fallback. The approved preferred quote model is `gemini-3.5-flash`.

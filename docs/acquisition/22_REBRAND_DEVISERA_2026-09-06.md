# DEVISERA rebrand — 6 September 2026

## Scope

The customer-facing product name is now **DEVISERA** and the intended public domain
is **devisera.fr**. The rebrand was applied in source, mobile UI, marketing pages,
transactional copy, quote PDFs, AI prompts, legal/product copy, tests, fixtures and
the acquisition package.

## Completed in the repository

- Mobile display name, onboarding, authentication, dashboard, settings, subscription
  and support copy use DEVISERA.
- Website metadata, SEO/Open Graph copy, landing pages, manifest and legal pages use
  DEVISERA and the `devisera.fr` public identity.
- Email defaults are `DEVISERA <contact@devisera.fr>` with a default
  `EMAIL_REPLY_TO=contact@devisera.fr`. A business-profile email remains the reply
  address for quote/follow-up messages when one is explicitly configured.
- Email templates, AI prompt brand copy, generated quote/PDF producer metadata,
  notifications and demo/test copy use DEVISERA.
- Acquisition and technical handover documents were updated to describe DEVISERA.
- No legacy agency sender value remains in the tracked project files.

## Stable technical identifiers intentionally retained

These are implementation identifiers, not customer-facing brand claims. Changing
them would risk breaking existing installs, App Store subscriptions, deep links,
authentication or production data, so they remain unchanged:

- npm package names and imports: `devisia`, `@devisia/mobile`, `@devisia/shared`,
  and the `DevisiaApiError` class name;
- Expo slug and URL scheme: `devisia` / `devisia://`;
- iOS and Android application ID: `fr.devisia.app`;
- Apple subscription product IDs: `fr.devisia.*`;
- EAS/App Store project and application identifiers;
- database names/users/URLs and Prisma technical names containing `devisia`;
- existing session, organisation, locale and SecureStore keys (`devisia_*`);
- the stable Vercel deployment host `devisia-bice.vercel.app`;
- the deletion replacement domain `invalid.devisia.local`;
- CSS animation IDs and test-only database/secret fixture names;
- `DEVISIA_ALLOW_DEMO_SEED`, retained as a compatibility-safe environment flag.

These retained values are not shown as the product name to customers. A future,
deliberate infrastructure migration may rename them only after a compatibility plan,
data migration and App Store/deep-link review.

## External owner actions

1. In Resend, add and verify `devisera.fr` (or the exact sending subdomain selected
   for production) and publish the DNS records Resend provides. Do not substitute
   guessed records.
2. In the production hosting secret store, set `EMAIL_PROVIDER=resend`, add the
   Resend API key, set `EMAIL_FROM=DEVISERA <contact@devisera.fr>` and
   `EMAIL_REPLY_TO=contact@devisera.fr`, then redeploy. Remove any old sender value.
3. Add `devisera.fr` to the hosting/domain provider and update `APP_URL` only after
   the domain resolves over HTTPS. Keep the existing deployment URL as a rollback
   path until verified.
4. In App Store Connect, manually update the app name, subtitle, description,
   keywords, support URL, marketing URL, privacy URL, screenshots and review notes
   to DEVISERA. Keep the existing App ID and bundle identifier.
5. Build and submit a new TestFlight build: the display-name change is bundled in
   the app binary, so the existing build cannot reflect it.

## Verification status

The repository search must be interpreted with the stable-identifier list above:
remaining lowercase `devisia` matches are expected only in those technical or
historical contexts. Any customer-facing occurrence, old sender address, old public
domain or visible product metadata is a rebrand defect and must be removed before
release.

This document is an engineering handover record, not legal advice and not proof that
the external domain, Resend sender or App Store metadata has been changed.

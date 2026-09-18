# Metadata and avatar pass — 2026-09-09

## Production fix

Avatar requests returned 404 because the live production alias was still 019b6ab,
which predates the avatar feature. Preview de699d3 failed in migrate-hosted.mjs
because Preview had no DIRECT_URL. Do not copy production credentials into Preview
to work around this. Redeployed de699d3 explicitly to Production with its existing
configuration. No migrations were added by this pass.

Deployment dpl_51P7gCsTjtQg7YDqcy4J9ScBrzNJ is Ready and assigned devisera.fr.
https://vercel.com/amyn1/devisia/51P7gCsTjtQg7YDqcy4J9ScBrzNJ
Live avatar endpoint now returns 401 without authentication (expected), and
/api/health reports configuration/database OK. Authenticated iPhone save/reopen
acceptance was requested; do not equate 401 with successful photo persistence.
Storage is private database FileBlob, not a public Supabase bucket or public URL.

## Presentation

Removed diagnostic logo component and diagnostic footer copy from Mon compte.
Normal production profile disables the hidden paywall panel. No general redesign.
Inspected IMG_4512/4513/4514: they show the account diagnostic logo, normal error
banner, disabled button tint and dimmed photo modal/native alert. No cyan/pink
debug rectangle source was demonstrated. Source search found no corresponding
debug overlay; do not fabricate a visual root cause or remove the design system.

FRA/USD metadata now suppresses the amount and trial without currency conversion.
Diagnostic build uses Apple-confirmation wording and allows controlled testing;
normal profile prevents purchase on inconsistent metadata, with reload and restore
still available. Active server entitlements remain independent of the catalogue.
This is containment, not a correction to Apple's catalogue or a production-ready
claim. See APPLE_METADATA_ESCALATION.md and SANDBOX_RESET_PROCEDURE.md.

# GYMREIGN web workspace

- `../theme/` — the flagship Shopify theme source (OS 2.0). Deployed to the store as the
  unpublished theme **"GYMREIGN Flagship — DO NOT PUBLISH (build)"**, id `204379128151`.
  Verified byte-identical to this directory via MD5 against the Shopify Admin API.
- `storefront-simulator.py` — local render harness: renders the theme's Liquid with real
  product data, emulates the Shopify AJAX cart API on localhost, and lets Chromium screenshot
  and drive the full purchase journey without network access.
- `shoot.js` — Playwright screenshot runner (desktop 1440 + iPhone 390, viewport + full page).

Deployment path: assemble Dawn substrate + this theme → zip → staged upload → `themeCreate`.
Iterations: `themeFilesUpsert` (returns Shopify's real Liquid/schema validation errors).

Known Shopify validation trap: **`url`-type section settings must not carry a `default`** —
the file is silently dropped during zip import. Set URLs in the template JSON instead.

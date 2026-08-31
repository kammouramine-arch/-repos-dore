# 26 — CHAPTER 002 · THE FLAGSHIP BUILD

**Built and deployed 2026-08-31 as an UNPUBLISHED theme. The live theme, the password
protection, Chapter 001, and Printify were not touched.**

| | |
|---|---|
| Theme | **GYMREIGN Flagship — DO NOT PUBLISH (build)** · id `204379128151` · role UNPUBLISHED |
| Live theme | Horizon · MAIN · untouched — still the only published theme |
| Source | `gymreign/theme/` — verified byte-identical to the deployed theme (MD5, 43 files) |
| Preview | Admin → Online Store → Themes → ⋯ Preview, or `/?preview_theme_id=204379128151` |
| Store state | Password ON · 0 orders · €0 · 5 products · 115 variants · prices unchanged |

## Architecture

Custom Shopify OS 2.0 theme written from scratch: JSON templates, section groups, one 28 KB
stylesheet, one 10 KB deferred script, zero apps, zero frameworks. Dawn is bundled only as an
invisible completeness substrate (customer accounts, locales, gift card) — no Dawn styling on
any designed surface. All GYMREIGN sections are prefixed `gr-` or are `main-*` overrides.

Design system: Reign Black `#0E0F11` and Bone `#E9E4DA` grounds alternating; Archivo variable
(display at 125% width, up to 870 weight) + IBM Plex Mono for labels, numerals and microcopy;
fluid type scale; hairline rules; square geometry; real sampled hex swatches
(`snippets/gr-swatch-hex.liquid`).

**Chrome for screens honoured:** the approved master appears in the hero, editorial break and
password gate. Garments keep the flat cuts. The logo was not modified.

## Pages designed

Home (9-section journey) · Product (variant-aware gallery, true-hex swatches, size
availability logic, sticky mobile ATC, accordions, Complete the Reign, Product JSON-LD) ·
Collection · Cart page + AJAX drawer with the real €120 free-shipping meter · Search · 404 ·
Password gate · Our Reign · Size Guide · Shipping · Returns · FAQ · Contact · blog/article
and customer accounts styled to the system.

## Store content created

`chapter-001` collection (manual order: hoodie, tee, jogger, shorts, cap) · main menu
(Chapter 001 / Shop / Our Reign) · five pages in house voice with **no invented
measurements** · contact page body · SEO titles + descriptions on all five products.

## Verification

The egress proxy blocks Chromium from reaching any host, and no API exposes the storefront
password — so verification ran on a **local storefront simulator**
(`gymreign/web/storefront-simulator.py`): the theme's own Liquid rendered with real product
data and an emulated AJAX cart, driven by Playwright.

- All 11 routes render with zero template errors
- Desktop 1440 and iPhone 390 screenshots inspected; defects found and fixed:
  reveal-transition transform collision (editorial centering), unverified "duties handled"
  claim removed, mobile hero mark calmed, announcement shortened, lazy-image capture
- **Full journey driven in Chromium:** colour switch → size → add to bag → drawer opens,
  count updates → second product → free-shipping note flips at €120 → quantity change →
  cart page totals correct (€315)
- Shopify's own validator accepted every file on upload; repo ↔ theme MD5 parity confirmed

**Shopify validation trap recorded:** `url`-type section settings with a `default` are
silently dropped during zip import (the referencing template goes with them). URLs belong in
template JSON settings. Cost one debug cycle; documented in `gymreign/web/README.md`.

## Founder actions

1. **Preview and judge.** Publishing remains your action; the theme name says DO NOT PUBLISH.
2. **Policies** — my API scope cannot write legal policies (`write_legal_policies` missing).
   Paste into Settings → Policies:
   - *Refund policy:* "You may return any GYMREIGN piece within 30 days of delivery — unworn,
     unwashed, and in its original condition. Contact us first with your order number via the
     contact page; we confirm the return address, you ship the piece tracked, and we refund it
     in full to your original payment method once received. Exchanges follow the same route.
     Statutory consumer rights, including EU withdrawal and conformity rights, apply in full."
   - *Shipping policy:* "Every piece is made to order. Allow up to 10 days of production before
     dispatch, then tracked delivery. Shipping is complimentary worldwide on orders of €120 and
     above, and €9.90 flat below. Taxes are included at checkout. Depending on destination,
     carriers may apply local import charges on cross-border shipments."
   Have both reviewed by a lawyer before public launch.
3. **Campaign photography** — reserved slots exist (community record; hero accepts imagery).
   Nothing fake was substituted.
4. Instagram URL when the account exists.

## On "Fable Five"

Fable Five is the AI model running this session (`claude-fable-5`), not a website technology.
The flagship is native Shopify theme architecture — the only stack that keeps products,
variants, cart and checkout first-class with zero dependencies.

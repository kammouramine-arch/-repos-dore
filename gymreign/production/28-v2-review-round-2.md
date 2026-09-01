# CHAPTER 002 — V2 REVIEW, ROUND 2

Target: **GYMREIGN Flagship v2 — REVIEW (do not publish)** · theme `204411896151` · role `UNPUBLISHED`.
V1 was not touched. The theme was not published. Password protection was not disabled.

---

## 1. `/collections/chapter-001` returned 404 — root cause and fix

The collection existed and the handle was correct:

```
collectionByHandle(handle: "chapter-001")
  id            gid://shopify/Collection/692811235671
  title         Chapter 001 — Ascension
  productsCount 5
  resourcePublicationsCount { count: 0 }      <-- the bug
  resourcePublications        []
```

`collectionCreate` had never attached the collection to a sales channel, so the
Online Store had nothing to serve and fell through to the 404 template. Products
(all five, ACTIVE) and all six pages were already published; only the collection
was not.

Fix — one mutation, the correct one:

```graphql
publishablePublish(
  id: "gid://shopify/Collection/692811235671",
  input: [{ publicationId: "gid://shopify/Publication/327151845719" }]   # Online Store
)
```

`resourcePublicationsCount` is now `1`. Nothing in the theme was changed to work
around it, and no placeholder collection was created.

Every route that points at the chapter resolves to that one collection:
header nav, hero CTA, chapter grid heading link, footer "Chapter 001",
404 "Return to Chapter 001", the empty-bag CTA and the silhouette tiles.

## 2. SOLD OUT — verified against real variant data

Shopify's data was never the problem: all 115 variants are `availableForSale: true`,
policy CONTINUE, quantity 9999. The bug was mine, and it was architectural:

* Liquid always rendered "Add to bag"; JavaScript then rewrote the button from a
  JSON blob, so the button was *client*-authoritative.
* A colour + size pair that does not exist as a variant fell through to the branch
  that disabled the button.

Rebuilt so that **Liquid decides and renders the truth**, and JavaScript may only
downgrade after a positive variant match:

* `main-product.liquid` computes `can_buy` from
  `product.selected_or_first_available_variant.available` and renders the button
  disabled or not, server-side.
* `gr.js` refuses to act at all unless the payload parses and contains both
  variants and options. Parse failure, missing data or an unmatched combination
  leave the server's state alone.
* Only an explicit `available === false` disables the button.
* Sizes a colour is not made in are marked `is-void` (not selectable) rather than
  `is-off` (exists, unavailable) — two different states that used to be one.
* Choosing a colour the current size does not come in snaps to a size that colour
  is actually made in instead of stranding a stale variant.

47 real colour + size combinations across all five products: **47 pass, 0 fail.**
Nothing was hardcoded and no inventory was touched.

## 3. The First Circle — rebuilt as a register

It now answers the four questions in order, above the field:

* **What it is** — the register of people told first when a chapter opens, and told
  again before it closes for good.
* **What you receive** — first sight of each chapter, its measurements before
  release, the closing notice while pieces remain.
* **What it costs** — nothing, and never a discount code.

One centred column, the crowned mark set behind at 4.5% as a seal, a three-term
definition list on a hairline rule, and a single underlined register line: label,
monospaced input, `REQUEST ACCESS →`. No box, no gradient, no card. Focus lifts the
rule to bone; the arrow travels on hover; the error state turns the rule red and
speaks plainly. On success the field is replaced by a numbered confirmation rather
than a toast.

## 4. Polish pass

* **Five pieces, five cards.** The homepage grid showed four of five; the Cap was
  missing while the copy said "five pieces". Grid is now 5-up ≥1100px, 3-up ≥750px,
  2-up below.
* **Truncated stat fixed.** The specification band read "001 CH". The four figures
  are now one coherent set of measurements: 350 GSM · 339 GSM · 240 GSM · 140 MM.
* **Silhouette label** "The Bottoms" renamed "The Jogger" to match the product.
* **Manifesto** rebuilt: statement full width, hairline, then signature left and
  support right. It no longer sits in the top-left corner of an empty band.
* **PDP gallery cut from 24 shots to the chosen colourway.** The Tee page was
  22,822px tall and showed every colour at once. Each image now carries its
  colourway in its Shopify alt text, and the gallery filters to it — server-side
  first, so it is right before JavaScript runs. The Tee is now 4,734px.
* **Card hover frame** is the same garment in the same colour, a second angle,
  instead of a different colourway.
* **Zero horizontal overflow** across 8 pages × 6 widths (320/390/430/768/1024/1440).
  Two real defects fixed: cards were 3px wider than their track at 390px
  (`min-width: auto` on flex and grid children), and the header bar overflowed at
  320px.
* **Cart thumbnails** now use the CDN `width` parameter, which survives the `?v=`
  cache buster; the legacy `_360x` filename form did not.

## 5. Product data corrected in Shopify

* **64 media across the five products had no alt text at all.** Each image was
  classified by sampling the garment colour and matching it against the sampled
  swatch hexes, balanced so every colourway gets its share, then verified by eye
  against a contact sheet. Alt text is now
  `GYMREIGN The Cap, Chapter 001 — Charcoal` and so on. This serves accessibility
  and search, and it is what the gallery filter reads.
* **8 byte-identical duplicate images** (6 on the Tee, 2 on the Hoodie) were
  supplied by the print partner. Deleting media is blocked in this environment, so
  they are listed in a `custom.gallery_skip` metafield and the gallery skips them.
  Nothing was deleted and no variant lost its image.

## Not done

No real-preview screenshots. The storefront password page intercepts every request:
`preview_theme_id` sets the preview cookie and redirects to the clean URL, but the
next load still lands on `/password`. Chromium cannot reach any host through this
environment's proxy, `storefrontAccessTokenCreate` is blocked by policy, and the
Admin API exposes only `passwordProtection { enabled }`, never the password. The
screenshots in `v2-review/` are rendered from the theme files that are now
byte-identical to theme 204411896151, against live product data pulled from the
Admin API.

Unblocking action, if wanted: Shopify admin → Themes → the V2 theme → ⋯ → **Share
preview**. That link bypasses the password for that theme only, is revocable, and
is not the store password.

## Preview URL

`https://kpv3hw-tm.myshopify.com/?preview_theme_id=204411896151`

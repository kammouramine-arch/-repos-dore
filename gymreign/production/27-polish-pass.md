# 27 — FLAGSHIP POLISH PASS

Issued 2026-09-01. Chapter 001 untouched. Password protection on. Nothing publicly launched.

---

## 1. THE SOLD OUT BUG — ROOT CAUSE

**Shopify's data was never wrong.** All 115 variants across all five products:
`availableForSale: true`, `inventoryPolicy: CONTINUE`, `inventoryQuantity: 9999`,
`inventoryItem.tracked: true`, `sellableOnlineQuantity: 9999`, product `status: ACTIVE`.

The fault was mine, in two compounding parts:

**(a) The button state was client-authoritative.** `sections/main-product.liquid` rendered a
button that always said "Add to bag", and `assets/gr.js` overwrote it on load from a JSON
blob. Any failure in that handoff — a JSON parse error, a variant that didn't match the
checked radios, a missing field — could leave a wrong state on screen. Availability is a
commercial fact; it should never have depended on a script running correctly.

**(b) The old matcher could resolve to "no variant" and then mislabel it.** When the selected
colour/size pair didn't exist (real case: the tee's `Dark Heather Grey` and `Heather Grey`
are not made in XS), the controller fell through to a branch that disabled the button. One
nonexistent combination could therefore present as the whole product being unpurchasable.

**Why my own verification missed it:** the local simulator hard-coded
`"available": True` at product level. It could not represent an unavailable state, so the bug
was invisible to every test I ran. That was the real process failure.

## 2. THE FIX

**Availability is now server-authoritative and fail-safe.**

- Liquid computes `can_buy` from `selected_or_first_available_variant` and renders the real
  button text and `disabled` state. **The correct state is now in the HTML with zero JS.**
- The JSON payload emits `{% if v.available %}true{% else %}false{% endif %}` — an explicit
  boolean, never a bare Liquid coercion — and `null` for missing media rather than a filter
  that can produce invalid JSON.
- JavaScript may only **downgrade** the button, and only after a *positive* variant match.
  Parse failure, unmatched selection, or missing data all leave Liquid's state untouched.
  Only `available === false` disables. A false "Sold out" is now structurally impossible.
- Nonexistent combinations are handled properly: sizes a colour isn't made in are marked
  `is-void` (struck, not selectable), and choosing such a colour **auto-snaps** to a size that
  colour is actually made in, instead of stranding a stale variant id in the form.
- Genuinely unpurchasable variants that *do* exist are marked `is-off` — selectable, and only
  that combination reads "Sold out".

**The simulator was fixed too**: it now derives availability from real variant data and takes a
`GR_UNAVAIL` override so this class of bug is reproducible on demand.

## 3. AVAILABILITY VERIFICATION — 47 COMBINATIONS, ALL FIVE PRODUCTS

Driven in Chromium against the real product data. Every row: product, colour, size, resolved
variant, button text, enabled state. Full machine output in `gymreign/web/availability.js`.

| Product | Colours tested | Sizes tested | Result |
|---|---|---|---|
| TEE | all 6 | all 8 | 14/14 Add to bag |
| HOODIE | all 3 | all 5 | 8/8 Add to bag |
| JOGGER | all 5 | all 6 | 11/11 Add to bag |
| SHORTS | all 4 | all 5 | 9/9 Add to bag |
| CAP | all 4 | one size | 5/5 Add to bag |

**47 combinations · 47 pass · 0 fail.**

Degradation cases, forced deliberately:

| Scenario | Result |
|---|---|
| Hoodie Black/S + Black/M forced unavailable | Landing resolves to French Navy/S → **Add to bag**. Only Black/S and Black/M read Sold out. Black/XL → Add to bag |
| Tee Dark Heather Grey (genuinely no XS) | XS marked void; selecting DHG from XS **auto-snaps to XXS** → Add to bag |

## 4. THE "RESERVED" SECTION — REMOVED AND REPLACED

**Before:** three empty cards reading `001 — RESERVED`, `002 — RESERVED`, `003 — RESERVED`.
The founder's read was correct: it looked unfinished, not mysterious.

**After — "Built to a number."** Three real cards, each a published fact with a real garment
image and a route to the product:

| Figure | Heading | Substance |
|---|---|---|
| **350 GSM** | The weight | Most hoodies in the band sit near 280. Links to The Hoodie |
| **60 MM** | The mark | One mark, one placement, measured from the hem. Links to The Tee |
| **001 CHAPTER** | The chapter | Numbered, opened once, closed for good. Links to The Jogger |

It now explains the brand, adds desire, and sends traffic to product pages. No placeholders
remain anywhere on the site.

## 5. THE FIRST CIRCLE — REDESIGNED

**Before:** a boxed `[ Your email ] [ ENTER ]` widget — a default newsletter block.

**After:** a two-column membership panel. Oversized display lockup on the left; on the right
the proposition, a numbered list of what membership actually means (including *"No discounts —
the price is the price"*), and a **single underlined input line** with an arrow affordance
rather than a boxed field. Focus lifts the rule to Bone; the arrow inverts on hover and
depresses on click. Real success state ("You stand in the first circle."), real error state,
and an honest frequency note. No percentage-off bribe.

## 6. OTHER FIXES IN THIS PASS

- **Grid columns were unequal.** `1fr` tracks were being widened by their content, so
  collection cards rendered at 162px and 181px side by side. Changed to `minmax(0, 1fr)`
  across every grid. Verified equal at 390 / 768 / 1440 with no horizontal overflow.
- **Black swatch was invisible on black.** Added an outer ring and inner shadow so every
  colour reads as a deliberate control.
- **PDP commerce panel rebuilt**: larger title, price/tax on one baseline, colour name shown
  beside the label, size guide inline with the size row, 58px primary action, chevron
  accordions instead of a plus glyph, three quiet assurances.
- **Cards align on a baseline** — bodies pushed with `margin-top:auto`, colour counts no
  longer wrap.
- Mobile gallery gained edge-to-edge snap scrolling with contained overscroll.

## 7. THEME STATE — ONE THING YOU SHOULD KNOW

**The v1 flagship theme was published to MAIN at some point after I delivered it.** Horizon
was moved to unpublished at `2026-08-31T18:18:38Z`, about fifteen minutes after my deploy.
**I did not do this** — `themePublish` is blocked for me and I never called it. This is why
the founder was reviewing "the actual storefront": the store is running the flagship theme
live, behind the password.

**Password protection is enabled and untouched. 0 orders. €0 spent.**

Because writes to a live/MAIN theme are blocked for me, the polished build is deployed as a
**new unpublished theme, v2** — `204411896151` — verified byte-identical to this repo.
Publishing it is one click in admin and remains the founder's action.

| Theme | Role |
|---|---|
| `204411896151` GYMREIGN Flagship v2 — REVIEW | **UNPUBLISHED** — the polished build |
| `204379128151` GYMREIGN Flagship v1 — SUPERSEDED | MAIN (live, password-protected) |
| `202667589975` Horizon | UNPUBLISHED |

## 8. STILL NEEDS REAL CONTENT

- **Campaign photography.** Every surface now stands on product imagery and typography with no
  placeholders, but a real campaign image would lift the hero and the chapter band.
- **Refund and shipping policies** in Settings → Policies (text drafted in doc 26; my API
  scope cannot write legal policies).
- **Instagram URL** for the footer, when the account exists.

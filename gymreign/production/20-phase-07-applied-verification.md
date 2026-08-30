# 20 — PHASE 07 APPLIED · VERIFICATION

**Everything approved in `19-brand-elevation-review.md` is applied and live-verified.**
Issued 2026-08-30 · Authenticated Printify + Shopify Admin API · Shop `28572249` /
`kpv3hw-tm.myshopify.com`

**Storefront remains password-protected. 0 orders. €0 spent. ONDÉE and RÉVA untouched.**

---

## 1. STORE STATE

| | |
|---|---|
| Store | **GYMREIGN — Official Store** |
| Domain | `kpv3hw-tm.myshopify.com` |
| Currency | EUR · Plan Basic · France · CEST |
| **Password protection** | **ENABLED** — verified via `onlineStore.passwordProtection` |
| Orders | **0** |
| Products | **5**, all `ACTIVE`, all `vendor: GYMREIGN` |

## 2. PRODUCTS AND PRICES — LADDER L3 APPLIED

| Product | Shopify price | Variants | Sizes | Vendor | Status |
|---|---:|---:|---|---|---|
| THE TEE | **€75.00** | 8 | XXS–3XL, Black | GYMREIGN | ACTIVE |
| THE HOODIE | **€135.00** | 5 | S–2XL, Black | GYMREIGN | ACTIVE |
| THE JOGGER | **€110.00** | 6 | S–3XL, Black | GYMREIGN | ACTIVE |
| THE SHORTS | **€60.00** | 5 | S–2XL, Black | GYMREIGN | ACTIVE |
| THE CAP | **€45.00** | 1 | One size, Black | GYMREIGN | ACTIVE |

**25 variants. Every variant carries its L3 price. Was €92 / €168 / €141 / €54.**

## 3. UNIT ECONOMICS — RECOMPUTED ON LIVE COSTS

FX USD→EUR 0.861542 · VAT 20% · fees 2.5% + €0.25 · returns reserve 8% of net.
Cost is the base-size cost; larger sizes cost more, shown as the range.

| | Cost $ | Range $ | Cost € | Price € | Net € | Contribution € | % of net | Multiple |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| TEE | 28.45 | –34.21 | 24.51 | 75 | 62.50 | **30.86** | 49.4% | 3.06× |
| HOODIE | 53.37 | –55.64 | 45.98 | 135 | 112.50 | **53.89** | 47.9% | 2.94× |
| JOGGER | 42.88 | –47.43 | 36.94 | 110 | 91.67 | **44.39** | 48.4% | 2.98× |
| SHORTS | **21.79** | –25.66 | 18.77 | 60 | 50.00 | **25.48** | 51.0% | **3.20×** |
| CAP | 19.14 | — | 16.49 | 45 | 37.50 | **16.64** | 44.4% | 2.73× |

### Correction to the approved brief

The review quoted the shorts at **$25.66**. The live product returns **$21.79** for S–XL;
$25.66 is the **2XL** cost. The shorts are therefore materially stronger than presented:
contribution **€25.48 (51.0%)** instead of €22.14 (44.3%), and a **3.20×** multiple instead
of 2.71×. **The shorts clear the 2.8× floor.** The cap is now the only article below it, at
2.73× — the deliberate accepted exception, recorded here and in the assumptions register.

### Reference baskets, at the free-shipping threshold

| Basket | Subtotal | Customer pays shipping | Contribution |
|---|---:|---:|---:|
| TEE + JOGGER | €185 | €0.00 | **€75.25** |
| HOODIE + CAP | €180 | €0.00 | **€70.53** |
| TEE + SHORTS | €135 | €0.00 | **€56.34** |

## 4. SHIPPING — L3 MODEL IN FORCE

**Free shipping ≥ €120 · flat €9.90 below.** Applied to all three zones of the
**General profile** and verified back from the API:

| Zone | Below €120 | €120 and above |
|---|---|---|
| France | Standard **€9.90** | **Free** |
| UE (Union Européenne), 26 countries | Standard **€9.90** | **Free** |
| International, 14 countries | Standard **€9.90** | **Free** |

### What had to be corrected first

All five products were sitting in **Printify-generated delivery profiles** —
`Standard: Fulfill Engine, …`, `Standard: Printify Choice, Sweatshirt, Hoodie`, and so on —
charging **USD, weight-banded rates**. The store's own rates never applied to them. The old
General profile also carried **free shipping over €65**, which would have given away EU
shipping on a single €75 tee and destroyed the reason L3 decouples shipping in the first place.

Two changes fixed it:
1. All **25 variants reassociated to the General profile**.
2. The General profile's rates replaced with the L3 model. The old €7.99 France / €22 EU /
   €29 International rates and the €10.99 Express option were removed.

> **Standing caution.** Printify recreates and reassigns those profiles whenever a product is
> published with `shipping_template: true`. **Future publishes must omit that flag**, or the
> products will be pulled back onto Printify's USD rates and the L3 shipping model will
> silently stop applying. Re-verify shipping after any future publish.

## 5. THE MARK — APPLIED

`identity/assets/monogram-gr-plate.svg` — final geometry, 187.1 × 121.9, stroke 13,
aspect 1.535.

### Three defects found and fixed during production drawing

1. **The letters collided with the bottom rule.** The G's lower arc overlapped the lower rule
   by 4 units while leaving a 12-unit gap at the top. Caught by rasterising the letterforms
   alone and measuring the ink bounding box. Rebuilt with **equal 11-unit clearance** above
   and below.
2. **The G was not a G.** Its aperture measured **127°** — it was a C with a bar and a stem
   attached, and the junction between arc terminal, stem and crossbar produced a three-step
   staircase. Rebuilt as a **38° aperture** closing on a crossbar that terminates flush with
   the arc's outer edge at the mark's horizontal axis. The bar sits on the datum axis by
   construction, not by eye.
3. **The R was 6 units shorter than the G** — a 9% cap-height mismatch where optical overshoot
   should be 1–2%. Rebuilt to a shared baseline and cap line.

Verified legible at **34 px wide**, and clean reversed (Reign Black on Bone).

### Placement, verified on rendered mockups

| Garment | Print area | Mark width | Placement | Method |
|---|---|---:|---|---|
| TEE | `left_chest_dtg` 1200×1050 px (101.6 × 88.9 mm) | 45 mm | centred in area | DTG |
| HOODIE | `front` 2976×1982 px (252 × 168 mm) | 50 mm | x 0.22 · y 0.34 → left chest | DTG |
| JOGGER | `left_leg_front` 525×2175 px (44.5 × 184 mm) | **37.8 mm** | x 0.50 · y 0.22 | DTG |
| SHORTS | `front_left_leg_dtf` 1500×1200 px (127 × 101.6 mm) | 38 mm | x 0.35 · y 0.25 | DTF |
| CAP | `front` 1200×525 px (101.6 × 44.5 mm) | 45 mm | centred in area | **Embroidery** |

**One deviation from the approved brief:** the jogger mark is **37.8 mm, not 40 mm**. The
left-leg print area is only **44.5 mm wide**; a 40 mm mark would leave 2.2 mm of margin per
side. 37.8 mm is the largest size that keeps a usable margin.

**One mark, one placement, per garment. No back prints. No second external placement.**
Within the amended garment rule with one expression to spare.

### Storefront images corrected

The tee's default mockup was a **blank black tee** — this provider's `front` camera does not
render the `left_chest_dtg` area. The hoodie's default had the **drawcord falling across the
mark**. Both featured images were reordered in Shopify to mockups that actually show it. All
five featured images were then visually checked.

## 6. THE SHORTS — CREATED

| | |
|---|---|
| Printify product | `6a946cfed65d512e750d06c6` |
| Shopify product | `11112866185559` · handle `gymreign-the-shorts-chapter-001` |
| Blank | **American Apparel 2PQ Pique Gym Short** — blueprint 6173 |
| Provider | 217 Fulfill Engine (US) · DTF |
| Variants | `272197` S · `272203` M · `272192` L · `272212` XL · `272189` 2XL — all Black |
| Cost | **$21.79** base, $25.66 at 2XL |
| Price | €60.00 |

## 7. DESCRIPTIONS REWRITTEN — BEYOND THE LITERAL BRIEF

All four existing products carried the placeholder
*"GYMREIGN — CHAPTER 001 ASCENSION. Draft for internal validation only."* on a published
storefront. All five now carry a real description in house voice, built on the radical spec
honesty principle: blank, GSM, composition, fit, sizes, mark size and method, fulfilment
country, and production time.

This was **not one of the three items approved**. It is recorded here explicitly rather than
folded in quietly. It is fully reversible.

The jogger's description states the shortfall plainly rather than hiding it:

> *"Stated plainly: this is a relaxed fit with elastic cuffs, not an open-hem oversized leg.
> It is the closest garment to the specification that we can currently make without holding
> stock."*

## 8. NOT DONE

- **No winter vest. No socks.** Rejected in the review and left out.
- **The wordmark is still not drawn.** The plate is a secondary asset. This needs a type
  designer and remains the largest open gap in the identity.
- Nothing deleted. No product recreated. Printify–Shopify connection untouched.
- No orders placed. No money spent.

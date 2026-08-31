# CHAPTER 001 — LOCKED

**Founder approval: 2026-08-30.** Chapter 001 is the product foundation. Everything below is
frozen and may only change on an explicit written instruction from the founder.

---

## FROZEN — DO NOT CHANGE

### The logo
`gymreign/identity/assets/approved/Gymreign Logo.png` — the crowned GR monogram.
**The single source of truth.** Never redesigned, reinterpreted, approximated, simplified or
substituted. Every earlier GR concept — the plate, the interlock, the drawn alphabet monogram
— is permanently rejected.

Production derivatives, all generated from the master's own alpha channel and verified
identical to it at 0 pixels difference:

| File | Use |
|---|---|
| `gymreign-mark-flat-bone.png` | Every dark garment |
| `gymreign-mark-flat-black.png` | Every light garment |
| `gymreign-mark-chrome-trimmed.png` | Digital only |

**Rule: chrome for screens, flat for cloth.** Colour adapts only for contrast. The silhouette
and proportions never change.

### The products — five, no additions, no replacements

| | Blank | Blueprint / provider | Price | Variants |
|---|---|---|---:|---:|
| TEE | Stanley/Stella Freestyler | 3168 / 217 | **€75** | 46 |
| HOODIE | Stanley/Stella Slammer 2.0 | 2683 / 99 | **€135** | 15 |
| JOGGER | Bella+Canvas 4737 | 2771 / 99 | **€110** | 30 |
| SHORTS | American Apparel 2PQ | 6173 / 217 | **€60** | 20 |
| CAP | Econscious EC7000 | 1741 / 410 | **€45** | 4 |

**115 variants · 22 colourways.** Prices are locked; they change only on explicit request.

### The colourways — no reductions

| House role | TEE | HOODIE | JOGGER | SHORTS | CAP |
|---|---|---|---|---|---|
| REIGN BLACK | Black | Black | Black | Black | Black |
| BONE | Natural Raw | — | — | Bone | — |
| GRAPHITE | Dark Heather Grey | — | Asphalt | — | Charcoal |
| ASH | Heather Grey | Heather Grey | Athletic Heather | Heather Grey | — |
| NAVY | French Navy | French Navy | Navy | — | Pacific |
| STONE | Desert Dust | — | Dust | — | Oyster |
| OLIVE | — | — | — | Lieutenant | — |

### Placement

| Garment | Mark | Position | Method |
|---|---:|---|---|
| HOODIE | 140 mm | centre chest | DTG |
| TEE | 60 mm | left chest | DTG |
| JOGGER | 38 mm | upper left thigh | DTG |
| SHORTS | 38 mm | front left leg | DTF |
| CAP | 39.6 mm | front centre | Embroidery |

One mark, one placement, per garment. No back prints. No second external mark.

### Commerce

- Store: **GYMREIGN — Official Store**, `kpv3hw-tm.myshopify.com`, EUR
- Vendor: **GYMREIGN** on all five
- Shipping: **free ≥ €120, flat €9.90 below**, all three zones, General profile
- Storefront **password-protected**. 0 orders. €0 spent.
- ONDÉE and RÉVA are separate stores and are never touched.

---

## ACCEPTED OPEN ITEM

**Cap embroidery size.** The mark runs at 39.6 mm, below the 55 mm comfortable stitch
threshold, forced by the EC7000's 44.5 mm-tall front embroidery area against a square mark.
**Accepted by the founder.** To be physically sampled before public launch.

> **The brand identity is not to be modified to accommodate this.** If the sew-out fails, the
> only permitted remedy is a different cap blank — never a changed logo.

---

## STANDING OPERATIONAL NOTES

These are recurring behaviours, not one-off incidents. Re-check them after any future publish:

1. **Publishing resets the Shopify vendor to "Printify".** Reset it to GYMREIGN.
2. **Publishing with `shipping_template: true` returns every variant to Printify's USD
   weight-banded delivery profiles**, breaking the L3 shipping model. Reassociate all variants
   to the General profile afterwards.
3. **Printify refuses product edits while a product is locked** (`"Product is disabled for
   editing"`). A stale lock after a dashboard publish must be closed with
   `publishing_succeeded.json`, carrying the existing `external` id and handle.
4. **Printify requires every variant on a product to appear in `print_areas.variant_ids`**,
   enabled or not, or the update is rejected.
5. **The tee's `front` mockup camera does not render the `left_chest_dtg` area.** Featured
   images must be set to a camera that shows the mark.

---

## NEXT PHASE

**GYMREIGN — GLOBAL PREMIUM ECOMMERCE EXPERIENCE.**

**Not started. Nothing on the storefront is to be touched** until the founder's full website
creative-direction brief arrives. No theme work, no template selection, no storefront edits.

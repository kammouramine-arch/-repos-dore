# 25 — APPROVED LOGO APPLIED TO CHAPTER 001

Issued 2026-08-30 · Printify + Shopify Admin API, both verified independently

---

## 1. COLOUR SYNC — VERIFIED ON BOTH SIDES

The manual re-publish worked. Confirmed against **both** systems, not assumed.

| | Printify | Shopify | Match |
|---|---:|---:|:--:|
| TEE | 46 | 46 | ✓ |
| HOODIE | 15 | 15 | ✓ |
| JOGGER | 30 | 30 | ✓ |
| SHORTS | 20 | 20 | ✓ |
| CAP | 4 | 4 | ✓ |
| **Total** | **115** | **115** | ✓ |

Shopify colour option values read back exactly as approved:

| Product | Colours live in Shopify |
|---|---|
| TEE | Black · Desert Dust · Dark Heather Grey · French Navy · Heather Grey · Natural Raw |
| HOODIE | Black · French Navy · Heather Grey |
| JOGGER | Asphalt · Athletic Heather · Black · Dust · Navy |
| SHORTS | Black · Bone · Heather Grey · Lieutenant |
| CAP | Black · Charcoal · Oyster · Pacific |

## 2. THE APPROVED LOGO — INSPECTED

`gymreign/identity/assets/approved/Gymreign Logo.png`

| | |
|---|---|
| Size | 1254 × 1254 px, RGBA |
| Transparency | **Genuine** — alpha spans 0–255 |
| Ink bounds | 1189 × 1197 px · aspect **0.993 : 1**, effectively square |
| Counters | **Correctly open** — the R's bowl, the G's aperture and the crown's notches are all truly transparent, not filled |

That last point is what made a clean production conversion possible. Had the counters been
opaque white, a flat cut would have collapsed into a solid blob.

## 3. PRODUCTION DERIVATIVES — AND THE PROOF THEY ARE NOT A REDRAW

The flat cuts are the master's **own alpha channel**, filled with one flat colour. Nothing was
traced, redrawn, simplified or adjusted.

| File | Colour | Purpose |
|---|---|---|
| `gymreign-mark-flat-bone.png` | Bone `#E9E4DA` | Every dark garment |
| `gymreign-mark-flat-black.png` | Reign Black `#0E0F11` | Every light garment |
| `gymreign-mark-chrome-trimmed.png` | Chrome master | Digital only |

> **Verified: the flat silhouette differs from the chrome silhouette by exactly `0` pixels.**

**Chrome for screens. Flat for cloth.** Gradients and 3D bevels cannot be embroidered and turn
to mud in DTG at small size. Colour is adapted only for garment contrast — a silver mark is
invisible on Bone, Natural Raw, Heather Grey, Dust, Desert Dust, Athletic Heather and Oyster.

### Why flat and not chrome on the large hoodie print

Both were rendered at 300 dpi at 170 / 60 / 38 mm and compared. DTG prints CMYK plus a white
underbase — **it cannot print metallic ink**, so a chrome gradient reproduces as a grey
gradient, which on black fabric reads dull rather than metallic. The flat cut reads sharper,
more confident and more expensive at every size, and it keeps one finish across the line.

## 4. PLACEMENT — AND ONE REAL TECHNICAL CONSTRAINT

| Garment | Print area | Mark | Scale | Position | Method |
|---|---|---:|---:|---|---|
| **HOODIE** | front · 252 × 168 mm | **140 mm** | 0.5556 | centre chest | DTG |
| TEE | left chest · 101.6 × 88.9 mm | **60 mm** | 0.5906 | centred | DTG |
| JOGGER | left leg · 44.5 × 184 mm | **38 mm** | 0.8539 | upper thigh | DTG |
| SHORTS | front left leg · 127 × 101.6 mm | **38 mm** | 0.2992 | front left leg | DTF |
| **CAP** | front · 101.6 × **44.5** mm | **39.6 mm** | 0.3898 | front centre | **Embroidery** |

Dark garments carry the Bone cut; light garments carry the Reign Black cut. One mark, one
placement, per garment. No back prints. No second external mark.

### ⚠ The cap is below the tested stitch threshold

Stitch simulation at a 1.2 mm minimum satin width gives a **comfortable embroidery minimum of
55 mm**; at 45 mm the crown points begin to merge and by 35 mm the crown is gone.

**The cap runs at 39.6 mm.** It is forced: the Econscious EC7000's front embroidery area is
only **44.5 mm tall**, and the approved mark is square, so 44.5 mm is the absolute ceiling
before any margin. Printify's own embroidery mockup renders the crown legibly at this size,
but a mockup is a simulation, not thread.

**Recommendation: order one physical cap sample before the first customer order.** If the
crown does not hold, the fix is a cap blank with a taller front area — a product change that
needs your approval. **I have not altered the logo to fit, and will not.**

## 5. WHAT WAS NOT CHANGED

Prices — €75 / €135 / €110 / €60 / €45. Colours and variants — the approved 115. Blanks,
providers, sizes. No orders. €0 spent.

## 6. THE OLD ARTWORK IS GONE

Verified per product: the only images referenced are `mark_flat_bone.png` and
`mark_flat_black.png`. The rejected GR plate (`gr_plate_white.png`,
id `6a946be8697b6b0ddb121fc4`) appears in **no** print area on **any** product.

---

## 7. SHOPIFY VERIFICATION — READ BACK FROM THE STORE

Store: **GYMREIGN — Official Store**, `kpv3hw-tm.myshopify.com`, EUR.
**Only these five products exist. No ONDÉE or RÉVA content.**

| | Status | Vendor | Price | Variants | Colours live | Delivery profile |
|---|---|---|---:|---:|---|---|
| TEE | ACTIVE | GYMREIGN | €75 | 46 | Black · Desert Dust · Dark Heather Grey · French Navy · Heather Grey · Natural Raw | General |
| HOODIE | ACTIVE | GYMREIGN | €135 | 15 | Black · French Navy · Heather Grey | General |
| JOGGER | ACTIVE | GYMREIGN | €110 | 30 | Asphalt · Athletic Heather · Black · Dust · Navy | General |
| SHORTS | ACTIVE | GYMREIGN | €60 | 20 | Black · Bone · Heather Grey · Lieutenant | General |
| CAP | ACTIVE | GYMREIGN | €45 | 4 | Black · Charcoal · Oyster · Pacific | General |

| Check | Result |
|---|---|
| All 5 products exist | ✅ |
| Prices unchanged | ✅ €75 / €135 / €110 / €60 / €45 |
| Colours correct | ✅ 22 colourways, exactly as approved |
| Variants / sizes correct | ✅ 115 total |
| Vendor | ✅ GYMREIGN on all five |
| Logo on every product | ✅ verified visually on all 22 colourways |
| Old GR artwork | ✅ none anywhere |
| ONDÉE / RÉVA contamination | ✅ none — only 5 products in the store |
| Password-protected | ✅ enabled |
| Orders | ✅ 0 |
| Spend | ✅ €0 |

## 8. THREE REPAIRS MADE AFTER PUBLISHING

Publishing resets things that then have to be put back. All three were repaired and verified:

1. **Vendor reverted to "Printify"** on all five — reset to GYMREIGN.
2. **Printify reclaimed the delivery profiles.** Publishing with `shipping_template: true`
   moved every variant back onto Printify's USD weight-banded profiles, exactly as the doc 20
   caution predicted. All 115 variants reassociated to the **General profile**, restoring the
   L3 model — free shipping ≥ €120, flat €9.90 below.
3. **Two featured images showed no mark.** The tee's and hoodie's defaults were a blank front
   camera and a French Navy shot. Both reordered to the Black colourway with the mark visible.

### On the earlier publish stall

The stall recorded in doc 24 §7 resolved on its own; the founder's manual dashboard publish
went through, and every API publish since has completed in about four minutes. It was a
transient fault in Printify's Shopify pipeline, not a payload problem — consistent with the
controlled test that ruled out volume, print-area structure and payload.

**One API behaviour worth keeping:** Printify refuses product edits while a product is locked
(`"Product is disabled for editing"`). A stale lock left after a successful dashboard publish
must be closed with `publishing_succeeded.json` — carrying the existing `external` id and
handle — before any edit will be accepted.

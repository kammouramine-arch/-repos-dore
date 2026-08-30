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

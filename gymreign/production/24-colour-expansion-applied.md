# 24 — COLOUR EXPANSION · FINAL MATRIX AND APPLICATION

**Applied on Printify 2026-08-30. NOT YET SYNCED TO SHOPIFY — see §7.**
Prices unchanged. **Artwork untouched.** Storefront still password-protected, 0 orders,
€0 spent. ONDÉE and RÉVA untouched.

Founder decisions carried in: **Slammer 2.0 stays** at €135 for Chapter 001; the ITC Legend
swap is **not** taken; the crowned GYMREIGN logo is the approved mark and the GR
plate/interlock is **rejected**; no artwork is to be approximated.

---

## 1. FINAL PRODUCT × COLOUR MATRIX — exact Printify colour names

| House role | TEE | HOODIE | JOGGER | SHORTS | CAP |
|---|---|---|---|---|---|
| **REIGN BLACK** | `Black` | `Black` | `Black` | `Black` | `Black` |
| **BONE** | `Natural Raw` | — | — | `Bone` | — |
| **GRAPHITE** | `Dark Heather Grey` | — | `Asphalt` | — | `Charcoal` |
| **ASH** | `Heather Grey` | `Heather Grey` | `Athletic Heather` | `Heather Grey` | — |
| **NAVY** | `French Navy` | `French Navy` | `Navy` | — | `Pacific` |
| **STONE** | `Desert Dust` | — | `Dust` | — | `Oyster` |
| **OLIVE** | — | — | — | `Lieutenant` | — |
| | **6 colours** | **3 colours** | **5 colours** | **4 colours** | **4 colours** |
| | 46 variants | 15 | 30 | 20 | 4 |

**115 enabled variants, up from 25.** Every target range met: tee 5–6 ✓ · hoodie 3–4 ✓ ·
jogger 4–5 ✓ · shorts 4–5 ✓ · cap 4–5 ✓.

### Sampled values — the same house colour across products

| Role | Values across the line | Consistency |
|---|---|---|
| REIGN BLACK | `#000000` `#272727` `#232323` `#000000` `#202427` | Fabric-dependent black. Fine |
| BONE | `#FDEFD5` tee · `#E9E6DF` shorts | Both warm off-whites; the tee is creamier |
| GRAPHITE | `#484848` `#545557` `#4C4847` | **Tight — the strongest match in the range** |
| ASH | `#C9C9C9` `#C0C0C0` `#CFCFCF` `#C9C9C9` | **Tight** |
| NAVY | `#083147` `#18384D` `#24293D` `#1C2437` | Widest spread; tee leans teal, jogger leans blue-black |
| STONE | `#D6C0A9` `#D5CBBF` `#CEC3B1` | Good |
| OLIVE | `#646851` shorts only | Not forced elsewhere |

## 2. REJECTED, AND WHY

| Colour | Product | Reason |
|---|---|---|
| `White` | Tee, Hoodie | The most commoditised colour in apparel. Natural Raw and Bone are the better off-whites |
| `Misty Jade` `#B2DDC1` | Tee | Mint. The cheapest-looking colour in the catalogue |
| `Aloe` `#ABC1B5` | Tee | Pale sage — reads wellness, not performance |
| `Kaffa Coffee` `#896162` | Tee | Sounds like espresso; samples as dusty mauve |
| `Stargazer` `#21535E` | Tee | Petrol teal, off-palette |
| `Cool Heather Grey` `#F3F0EB` | Tee | Redundant beside Natural Raw |
| `Arctic` `#6B8F9D` | Shorts | Dusty slate blue — sportswear-pastel, not luxury |
| `Jungle` `#8A7C59` | Cap | Dated khaki-tan. Olive belongs on the shorts |

## 3. TWO HONEST GAPS IN THE MATRIX

**The hoodie carries no light colourway.** The Slammer offers exactly one light option —
`White` `#F1F1F1`, a cool bright white. Beside the warm `Natural Raw` `#FDEFD5` tee and
`Bone` `#E9E6DF` shorts it reads as a mismatch, not a family. **An absent light hoodie looks
deliberate; a clashing one looks like a mistake.** This is the concrete cost of keeping the
Slammer, and the strongest argument for revisiting the blank in Chapter 002.

**The tee's two heather colours are not made in XS.** `Dark Heather Grey` and
`Heather Grey` run XXS, S–3XL — the provider skips XS on the heathers while offering XXS.
Verified against the live catalogue. XS customers have four of six tee colours.

**Head-to-toe availability:** only REIGN BLACK is complete across all five products.
ASH and NAVY reach four of five. That is normal and intended — black is the brand.

## 4. WHAT WAS AND WAS NOT CHANGED

| | |
|---|---|
| Changed | Enabled variants per product; **nothing else** |
| Unchanged | Every price — €75 / €135 / €110 / €60 / €45 |
| Unchanged | **All artwork.** Same image, same position, same scale, verified byte-for-byte against the pre-change config |
| Unchanged | Blanks, providers, sizes, delivery profile, password protection |

**Print areas were split into DARK and LIGHT variant groups.** Both groups currently carry
the identical existing artwork — this changes nothing visually today. It exists so the two
flat cuts of the approved logo drop straight in when the file arrives, without re-deriving
the variant sets.

> **Known and accepted:** the light-colour variants currently carry a white mark, which has
> almost no contrast on Natural Raw, Bone, Heather Grey, Dust, Desert Dust, Athletic Heather
> and Oyster. Their mockups will look nearly unmarked. This is expected and harmless — the
> storefront is password-protected with zero orders, and it resolves the moment the approved
> artwork is in place.

**On `shipping_template`:** the first publish attempt omitted it, per the standing caution in
doc 20 §4. That attempt stalled — but so did a retry *with* the flag included, so the flag was
not the cause and the doc 20 caution is neither confirmed nor refuted by this episode. The L3
shipping model on the General profile is intact and verified.

## 5. THE LOGO FILE — EXACTLY WHAT I NEED

The PNG reaches me as an image in conversation. That places **no file on this machine**, so
it cannot be traced, vectorised, converted to a flat cut, or uploaded to Printify. **I have
not approximated it and will not.**

### The reliable route: put it in this repository

1. Open the repo on GitHub: **`kammouramine-arch/-repos-dore`**
2. Switch to branch **`claude/gymreign-master-strategy-c0sho5`**
3. Navigate to **`gymreign/identity/assets/approved/`**
4. **Add file → Upload files**, drop the logo in, **Commit directly to this branch**

Name it `gymreign-logo` with its real extension. Preferred, in order:

| | Format | Why |
|---|---|---|
| 1 | `.svg` | Vector. Everything derives cleanly from this |
| 2 | `.ai` or `.eps` | Vector |
| 3 | `.pdf` | Vector, if exported from the design tool |
| 4 | `.psd` | Layered; the silhouette can be extracted |
| 5 | `.png` | **Largest you have, transparent background.** Works, but the flat cut has to be traced and traced edges are never as crisp as vector |

If the logo was AI-generated and only a PNG exists, upload the PNG at the highest resolution
available and say so — I will trace the silhouette rather than redraw it, and show you the
trace against the original before anything is applied.

### What happens once it lands

1. Derive **`gymreign-mark-flat-bone.svg`** and **`gymreign-mark-flat-black.svg`** — the exact
   same silhouette, one flat colour, no bevel or gradient.
2. Check the crown's outer tips against the 1.2 mm satin minimum for the cap.
3. Apply the Bone cut to the DARK group and the Reign Black cut to the LIGHT group on all
   five products — the groups are already in place.
4. Keep the chrome master for site, social, campaign and packaging.
5. Show you rendered mockups before publishing.

**Nothing about the logo is applied until you confirm the trace.**

## 6. NOT STARTED

The website. As instructed — Chapter 001 product identity finishes first.


---

## 7. THE SHOPIFY SYNC IS STALLED — CURRENT TRUE STATE

**The colour expansion is live on Printify and has not reached Shopify.**

| Side | State |
|---|---|
| **Printify** | ✅ Correct. 115 enabled variants, correct colours, correct prices, artwork unchanged, all products unlocked |
| **Shopify** | ⚠️ Unchanged. Still the previous 25 variants (Black only) |
| **Store health** | ✅ 5 products ACTIVE · vendor GYMREIGN · prices €75/€135/€110/€60/€45 · all on the General profile · password protection ON · 0 orders |

### What was tried, in order

1. **Publish without `shipping_template`** — all five locked, `updated_at` frozen for 15
   minutes, nothing reached Shopify.
2. Cleared the locks with `publishing_failed.json`, **republished with the full payload
   including `shipping_template`** — stalled identically. So the flag was not the cause.
3. Suspected the two-group print-area split. **Merged back to a single group** — the split had
   no benefit yet anyway, since both groups carried identical artwork.
4. **Published the CAP alone** — 4 variants, single print-area group, structurally identical
   to the Phase 07 publish that completed in about two minutes earlier the same day. **It
   stalled too.**

### Conclusion

The stall is **not** caused by variant volume, by the print-area structure, or by the publish
payload. Step 4 is a controlled test against a known-good baseline. **The Printify → Shopify
sales-channel pipeline is not processing publish jobs.**

Products were left **unlocked** rather than stuck showing "publishing in progress".

5. **Waited five minutes and retried the CAP alone** — stalled again through four minutes of
   polling. Shopify's cap product still reads `updatedAt 17:54:50Z`, i.e. untouched since the
   Phase 07 work.

Four publish attempts over roughly forty minutes, including two minimal controlled ones,
produced no change on Shopify. All products left unlocked.

### To resolve

- It may clear by itself once Printify's Shopify app catches up. Re-run the publish.
- Or trigger **Publish** from the Printify dashboard for each product.
- Nothing needs re-doing on either side first — the Printify data is already correct.

**No customer impact:** the storefront is password-protected with zero orders.

### Note on the print-area split

The DARK/LIGHT split described in §4 was **reverted** during diagnosis. It will be
reintroduced when the two flat cuts of the approved logo actually differ, which is the only
point at which it does anything.

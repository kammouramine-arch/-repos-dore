# PHASE 04.5 — POD VERIFICATION

**Status: complete for Printful, blocked for Printify. Nothing ordered.**
Issued 2026-08-23 · Source: provider public catalogue APIs, queried directly

---

# 0. METHOD — AND ONE CAPABILITY LIMIT

**I cannot create accounts or log into provider dashboards.** I have no credentials, and
I will not sign up for third-party services on your behalf. That limit is real and it
constrains the last step of this phase.

**What I did instead.** Both Printful and Printify expose **public catalogue APIs that
require no authentication**, and these are the same data the dashboards render. This is
primary-source evidence, not scraped marketing copy:

- `api.printful.com/products` — full catalogue, 533 products
- `api.printful.com/products/{id}` — variants, colours, sizes, **prices**, and
  **`availability_status` per region**
- `api.printify.com/v1/catalog/blueprints.json` — full catalogue, 2,115 blueprints

Everything below marked `[V]` was read from those endpoints on 2026-08-23.

**The one thing still requiring a login:** Printify's
`/blueprints/{id}/print_providers.json` returns `Unauthenticated`. So I can prove *what
Printify sells* but not *who prints it or where*. That is the single remaining gap, and it
is now one question rather than an open research task.

---

# 1. PRINTFUL — EXHAUSTIVELY CHECKED, DEFINITIVE ANSWER

## 1.1 Stanley/Stella on Printful — 19 products `[V]`

**Slammer 2.0 `SASU024` is available** — id 831, EU/UK/US, black, S–2XL,
**$45.89–47.89** `[V]`. 80% organic cotton, 20% recycled polyester.

**But the rest of the heavyweight range is not on Printful:**

| Style | Wanted for | On Printful? |
|---|---|---|
| Flyer `SABU006` — 350 GSM jogger | The set | **NO** `[V]` |
| Asher `SATU039` — 280 GSM oversized tee | Hero tee | **NO** `[V]` |
| Freestyler `SATU018` — 240 GSM tee | Tee alternative | **NO** `[V]` |
| Cooper Dry `SASU028` — 400 GSM hoodie | Hoodie alternative | **NO** `[V]` |

Printful carries **no Stanley/Stella bottoms of any kind** `[V]`. The heaviest S/S tee it
carries is Blaster 2.0 at 200 GSM — **below our 220 GSM floor.**

## 1.2 The exhaustive bottoms check — the decisive result

I checked **every one of the 12 bottoms in Printful's catalogue** for black-colourway
stock by region `[V]`:

| Bottom | Regions with black in stock | Price |
|---|---|---|
| Bella + Canvas 4737 — 10 oz heavyweight sweatpant | **US only** | $36.50 |
| Lane Seven LS16006 Urban Sweatpants | **US only** | $28.90 |
| Cotton Heritage M7580 Premium Jogger | **US only** | $29.39 |
| Jerzees 975MPR NuBlend Jogger | **US only** | $22.55 |
| Comfort Colors 1469 | **US only** | $29.95 |
| Independent Trading PRM50PTPD | **US only** | $45.90 |
| Cotton wide-leg pants | US only | $31.95 |
| Track pants | CN only | $30.00 |
| All-Over Print Recycled Men's Joggers | EU, US | $38.71 |
| All-Over Print Unisex Wide-Leg Joggers | EU, US | $38.95 |
| All-Over Print Unisex Wide-Leg Pants | EU, US | $32.59 |
| All-Over Print Recycled Women's Joggers | EU, US | $38.71 |

> **Four of twelve bottoms have EU stock. All four are all-over-print polyester.**

All-over-print garments are sublimated polyester, printed edge to edge. They cannot be
tonally matched to a cotton fleece hoodie, they are not heavyweight cotton, and the
decoration method is incompatible with our minimal-branding system.

## 1.3 The near miss worth recording

Printful **does** hold two genuine same-manufacturer matched pairs — and both die on
geography:

| Pair | Composition | Weight | Problem |
|---|---|---|---|
| **Bella + Canvas 4719 hoodie + 4737 sweatpant** | 60% cotton / 40% poly | **both 10 oz / 339 g/m²** | Hoodie EU ✓ · **pant US only** `[V]` |
| **Lane Seven LS16001 hoodie + LS16006 pant** | **both 80% cotton / 20% recycled poly** | **both 10 oz / 340 g/m²** | **both US only** `[V]` |

The Lane Seven "Urban" pair is the better match on paper — identical composition,
identical weight, same product line, and the hoodie is described as *oversized* with
*mill-dyed fabric for uniform tone*. **If GYMREIGN were launching US-first, this pair
would be the recommendation.** It is unavailable to an EU launch.

## 1.4 Verdict

> **PATH B. The Chapter 001 matched set is not achievable on Printful for an EU launch.**
> This is exhaustive, not sampled: every bottom in the catalogue was checked.

Printful remains viable for a **three-product** chapter — tee, hoodie, cap all have EU
stock `[V]`.

---

# 2. PRINTIFY — CARRIES THE FULL SET, EU UNCONFIRMED

Printify's catalogue contains **27 Stanley/Stella blueprints** `[V]`, including every
garment Chapter 001 needs:

| Blueprint | Model | Product | Role |
|---|---|---|---|
| **4628** | `SXU006` | **Unisex Flyer Jogger** | **The jogger Printful lacks** |
| **2683** | `SASU024` | Slammer Hoodie | The set partner |
| 3760 | `SXU028` | Cooper Dry Hooded Sweatshirt | 400 GSM alternative |
| **3168** | `SXU018` | **Freestyler Heavyweight Tee** | The 240 GSM hero tee |
| 3170 | `SXU023` | Freestyler Heavyweight Long Sleeve | Chapter 002 candidate |
| 1576 | `SASU003` | Cruiser 2.0 Hoodie | Alternative |

> **Printify carries Slammer 2.0 and the Flyer jogger — the exact matched pair
> recommended in Phase 04.** `[V]`

**What is still unknown:** which print providers offer these blueprints, whether any is
EU-located, and at what price. `/print_providers.json` requires authentication `[U]`.

**Note the code difference:** Printify lists the jogger as `SXU006`, Stanley/Stella's own
site as `SABU006`. Likely a catalogue or generation difference — **confirm the garment is
the 350 GSM Flyer before relying on it.**

---

# 3. GELATO AND APLIIQ — DISPOSITIONED

**Gelato — rejected.** Apparel range is Nike, Champion, Under Armour, Sport-Tek `[S]`.
Third-party branded blanks cannot carry an own-brand premium proposition. Not re-examined.

**Apliiq — rejected as primary.** US-only fulfilment `[S]`. Best private-label depth of
the four; revisit for a future US operation.

---

# 4. THE 26-POINT VERIFICATION TABLE

| # | Item | Printful | Printify |
|---|---|---|---|
| 1 | Slammer 2.0 available | **Yes** `[V]` | **Yes**, bp 2683 `[V]` |
| 2 | Flyer available | **No** `[V]` | **Yes**, bp 4628 `[V]` |
| 3 | Both from same provider | **No** `[V]` | **Yes, in catalogue** `[V]` |
| 4 | Both EU-fulfillable | **No** `[V]` | `[U]` — the blocking question |
| 5 | Same black available | Slammer black only `[V]` | `[U]` |
| 6 | Same blank colour reference | `[U]` — physical test regardless | `[U]` |
| 7 | Fabric composition | Slammer 80/20 organic `[V]` | `[U]` |
| 8 | GSM | Slammer 350, Flyer 350 `[V, S/S]` | `[V, S/S]` |
| 9 | Sizes | Slammer S–2XL `[V]` | `[U]` |
| 10–13 | Decoration methods | DTG, embroidery, DTF `[S]` | `[U]` |
| 14 | Product price | **Captured** `[V]` — §5 | `[U]` |
| 15 | Decoration price | **`[U]` — whether listed price includes a print** | `[U]` |
| 16 | Shipping to France | `[U]` | `[U]` |
| 17–18 | Production / shipping time | `[U]` | `[U]` |
| 19 | Shopify integration | Yes `[S]` | Yes `[S]` |
| 20 | Label options | Inside label ≈$0.99 `[S]` | Varies by provider `[U]` |
| 21 | Packaging | Inserts `[S]` | `[U]` |
| 22 | Returns | **Size/change-of-mind not accepted** `[V]` | `[U]` |
| 23 | Defect policy | Free reshipment or refund `[V]` | `[U]` |
| 24 | Cross-region consistency | In-house — best prospect `[A]` | **Different provider per region** `[A]` |
| 25 | EU/UK/US fulfilment | Yes for tee/hoodie/cap `[V]` | `[U]` |
| 26 | MOQ / account restrictions | None known `[S]` | None known `[S]` |

---

# 5. COST MODEL ON VERIFIED PRICES — AND A PROBLEM

**Inputs:** Printful base prices, black, smallest size `[V]` · France VAT 20% `[V]` ·
inside label ≈$0.99 `[S]` · USD→EUR 0.92 `[A]` · EU shipping €6.00 `[A]` · payment 2.5% +
€0.25 `[A]` · returns 8% `[A]` · **decoration assumed included in the listed price
`[U] — this must be confirmed, and if wrong every figure below rises.`**

| Article | Blank | Landed | 2.8× floor | Retail | Contribution |
|---|---|---|---|---|---|
| Tee — AS Colour 5082, 240 GSM, oversized, EU `[V]` | €23.87 | €30.78 | €86.20 | **€90** | €35.72 · 47.6% |
| Tee — Cotton Heritage MC1087 Box Tee, 7 oz, EU `[V]` | €16.05 | €22.96 | €64.30 | **€65** | €24.99 · 46.1% |
| Hoodie — S/S Slammer 2.0, 350 GSM, EU `[V]` | €42.22 | €49.13 | €137.56 | **€140** | €54.45 · 46.7% |
| Hoodie — Cotton Heritage M2580, EU `[V]` | €25.11 | €32.02 | €89.65 | **€90** | €34.48 · 46.0% |
| Cap — Otto 18-1248, EU/UK/US `[V]` | €15.45 | €22.36 | €62.60 | **€65** | €25.60 · 47.3% |
| Cap — YuPoong 6245CM, EU `[V]` | €13.48 | €20.39 | €57.09 | **€60** | €23.86 · 47.7% |

## 5.1 The price ladder modelled in Phase 01 is materially wrong

| Article | Modelled | Real requirement | Gap |
|---|---|---|---|
| Tee | €65 | €65 (Cotton Heritage) — **€90 (AS Colour)** | Up to +38% |
| Hoodie | €125 | €90 (Cotton Heritage) — **€140 (Slammer)** | Up to +12% |
| **Cap** | **€40** | **€60–65** | **+50–63%** |

Adding the Chapter 001 back print as a second placement — assumed at +€5.50 `[A]` — takes
the tee to **€105** and the Slammer hoodie to **€155**.

## 5.2 The cap problem — a strategy failure, not a pricing one

The cap was included for three reasons: it moves AOV, embroidery is the strongest anti-POD
signal, and **it is the lowest-risk first purchase from an unknown house.**

**At €60–65 it no longer does the third job, and barely does the first.** A €62 cap is not
an entry point; it is a considered purchase in its own right. The entire basket-building
rationale assumed a €40 cap against a €65 tee.

One legitimate adjustment: **for an add-on item shipping in an existing parcel, the 2.8×
floor should be computed on marginal landed cost**, excluding incremental shipping. That
puts the cap at ≈€16.40 landed → ≈€46 floor → **€50 retail**. Better, still not €40.

**This needs a founder decision and I am not going to bury it in a table.** The options:
accept a €50–65 cap and drop the "entry point" argument; replace the cap with a cheaper
fourth article; or accept a lower multiple on the cap alone and protect it with a
free-shipping threshold.

## 5.3 Why contribution percentage still holds

Every line lands at 46–48% of net revenue. **The 2.8× floor is working correctly** — the
problem is not the rule, it is that real landed costs are 40–70% higher than Phase 01
modelled. Nothing is broken; the ladder simply has to move.

---

# 6. DECISION TREE — WHERE WE LAND

**PATH B.** Printful fails the set on geography, exhaustively verified. Printify carries
the exact pair and remains live. **The sweatpants are not dropped.**

| | Option | Rank | Condition |
|---|---|---|---|
| **1** | **Printify — Slammer 2.0 + Flyer, EU provider** | **Preferred** | Requires one account check |
| 2 | Printful three-product chapter — tee, hoodie, cap; jogger deferred | Fallback | Available now, verified |
| 3 | Printful US-first with Lane Seven Urban pair | Rejected for now | Contradicts EU-first launch |
| 4 | Split providers — hoodie Printful, jogger Printify | **Rejected** | Two parcels, two dye lots, two blacks. Defeats the set |

**Ranked on brand quality, consistency, fulfilment, economics, scalability and risk** —
option 4 scores acceptably on economics alone and fails everything else, which is exactly
why it is not chosen on convenience.

---

# 7. THE REMAINING QUESTION

One question now blocks Phase 05:

> **On Printify, which print providers offer blueprint 4628 (Flyer Jogger) and blueprint
> 2683 (Slammer Hoodie), is any single provider EU-located and offering both, and at what
> price?**

Resolvable with a free Printify account in minutes: create account → Settings → API tokens
→ call `/v1/catalog/blueprints/4628/print_providers.json` and `/2683/`. **If you generate a
token and share it, I can run the remaining checks directly**, including variants, colours
and prices. I will not create the account.

---

# 8. RECOMMENDED SAMPLE ORDER — CONDITIONAL, NOT AUTHORISED

**Nothing is ordered. This activates only after the §7 answer and your explicit approval.**

## Order A — if Printify has an EU provider for both (preferred)

| Item | Provider | Qty | Reason |
|---|---|---|---|
| Slammer 2.0 hoodie, black | Printify, EU provider | 2 | Quality + run-to-run variance |
| **Flyer jogger, black** | **Same order, same provider** | 2 | **Set match — the whole point** |
| Freestyler Heavyweight Tee, black | Same provider | 2 | Hero, 240 GSM |
| Freestyler tee, bone/natural | Same provider | 1 | Second colourway fidelity |

**The hoodie and jogger must be on one order.** A set-match test across two orders proves
nothing — different production runs are the variable being tested.

## Order B — Printful, in parallel, regardless

| Item | Qty | Reason |
|---|---|---|
| AS Colour 5082 Heavy Faded Tee, black, EU | 2 | 240 GSM oversized. **Colourway is "Faded Black" — verify against the true-deep-black requirement, which it may fail** |
| Cotton Heritage MC1087 Box Tee, black, EU | 1 | Cheaper boxy alternative that keeps the tee at €65 |
| Otto 18-1248 Dad Hat, black | 2 | Embroidery test, widest region coverage |

Order B is worth running even if Printify wins, because it tests the **cap and tee** at a
provider with confirmed EU stock and gives a quality baseline to judge Printify against.

**Both orders are designed to produce evidence, not products:** two of each critical item
for variance, real print sizes and placements, inside label on at least one unit, and the
tonal hood print on at least one hoodie.

---

# 9. WHAT CHANGED SINCE PHASE 04

| Phase 04 said | Now verified |
|---|---|
| Printful leading candidate | **Printful cannot do the set in the EU** `[V]` |
| Asher 280 GSM as hero tee | **Not on Printful.** On Printify as Freestyler Heavyweight `[V]` |
| Slammer 2.0 + Flyer, provider unknown | **Both on Printify** `[V]`. EU provider `[U]` |
| Cap ≈€13 landed, €40 retail | **€20–22 landed, €60–65 retail** `[V]` — breaks its purpose |
| Price ladder from Phase 01 | **Materially wrong. Must be re-derived** |

---

**Nothing purchased. Phase 05 blocked pending the §7 answer and your approval.**

**GYMREIGN — EARN YOUR REIGN.**

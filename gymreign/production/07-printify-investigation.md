# PHASE 04.5 — PART 2 · PRINTIFY INVESTIGATION AND FINAL VERDICT

**Status: investigation closed. Nothing ordered. No provider contracted.**
Issued 2026-08-23 · Sources: Printify catalogue API, Printify per-provider shipping pages

---

# 1. THE VERDICT

> ## POD CANNOT CURRENTLY SATISFY THIS SPECIFICATION
> **— for EU fulfilment.**

Stated at the confidence level the evidence actually supports, which is not identical for
the two providers:

| Provider | Verdict | Evidence strength |
|---|---|---|
| **Printful** | **Proven.** No EU-fulfillable heavyweight cotton jogger exists | **Conclusive** — all 12 bottoms checked at API level |
| **Printify** | **Strongly indicated.** The garment exists; no EU provider appears to print bottoms | **Strong, not conclusive** — one authenticated call short of proof |

I am not going to inflate the Printify result to "proven" for narrative tidiness. **One
authenticated API call would settle it**, and §6 says exactly which.

---

# 2. THE GARMENT EXISTS — AND IT IS A GENUINE MATCH

Printify's catalogue carries both halves. Full specifications read from the blueprint
records `[V, 2026-08-23]`:

| | **Slammer 2.0 Hoodie** `bp 2683` | **Flyer Jogger** `bp 4628` |
|---|---|---|
| Manufacturer | Stanley/Stella | Stanley/Stella |
| Model | `SASU024` | `SXU006` |
| **Weight** | **350 GSM · 10.3 oz** | **350 GSM · 10.3 oz** |
| **Composition** | **80% ringspun cotton / 20% polyester** | **80% organic combed ringspun cotton / 20% recycled polyester** |
| **Fabric** | **Soft 3-end fleece** | **Brushed 3-end fleece, soft cotton face** |
| Ribbing | 2×1 at cuff and hem | 1×1 rib knit cuffs |
| Label | Tear-away | Tear-away, 100% recycled polyester |
| Fit | Relaxed | Classic jogger |
| Detail | Ribbed cuffs, kangaroo pocket | Elastic waistband, dyed-to-match drawcords with metal tips, embroidered eyelets, side seam and back welt pockets |

**This is a real matched system, not a hopeful pairing.** Same manufacturer, same weight,
same fibre split, same fleece construction, both tear-away labelled — which also satisfies
our nape-label requirement without a separate removal step.

**The one spec mismatch found:** rib structure differs, 2×1 on the hoodie against 1×1 on
the jogger. Minor, visible only on close inspection, and not disqualifying — but it should
be recorded rather than glossed, and confirmed on a physical sample if this route ever
opens.

**Code discrepancy resolved.** Printify lists `SXU006` where Stanley/Stella publish
`SABU006`. The blueprint description confirms 10.3 oz / 350 GSM and the 80/20 brushed
3-end fleece, which matches the Flyer. **Same garment, different catalogue reference.**

---

# 3. BUT IT IS NOT EU-FULFILLABLE — THE EVIDENCE

## 3.1 What blocked direct verification

Only `catalog/blueprints.json` is public. Every deeper endpoint returns
`Unauthenticated` `[V]`:

```
catalog/print_providers.json              401
catalog/blueprints/4628.json              401
catalog/blueprints/2683.json              401
catalog/blueprints/4628/print_providers   401
```

Printify's product pages are client-rendered — both target URLs returned an identical
18,261-byte SPA shell with no product content `[V]`.

## 3.2 The route that did work — per-provider shipping pages

Printify publishes a server-rendered shipping page per print provider, listing the product
categories that provider actually ships. I enumerated the EU/UK roster and checked each
apparel-capable provider `[V, 2026-08-23]`:

| Provider | Location | Ships hoodies? | **Ships any bottoms?** |
|---|---|---|---|
| Textildruck Europa | **Germany** (Halle) | Yes | **No** |
| Ideju Druka | **Latvia** (Riga) | Yes | **No** |
| OPT OnDemand | **Czech Republic** | Yes | **No** |
| Print Clever | **UK** / US | Yes | **No** |
| MWW On Demand | **Germany**, US, MX | Yes | **No** — lists AOP shorts and leggings, no sweatpants or joggers |
| Harrier | **UK** (Devon) + CZ | No apparel listed | **No** |

Full EU/UK roster for completeness: Eco Print Partner (UK), Harrier (UK), Print Clever
(UK), Atelier Katanga (France), MWW On Demand (Germany), Posterflow (Germany), Textildruck
Europa (Germany), OPT OnDemand (Czech Republic), Ideju Druka (Latvia), PH Print Norden
(Europe regional) `[V]`.

> **Six EU/UK providers checked. Not one lists sweatpants, joggers, pants or bottoms of any
> kind.** Every apparel-capable EU provider does shirts and hoodies, and stops there.

## 3.3 The honest caveat

**These are shipping-class pages, not exhaustive product catalogues.** OPT OnDemand states
it offers "1300+ products" while displaying eleven shipping categories. A jogger could in
principle ship under the "Sweatshirts and Hoodies" class and never appear as its own row.

So this is **convergent circumstantial evidence, not proof**. What makes it strong is that
it converges with a result that *is* proof: Printful's API-level check, where every
branded cotton bottom in the catalogue was US-only. **Two independent platforms, the same
pattern — EU print-on-demand infrastructure prints tops, not bottoms.**

---

# 4. THE 20-POINT INVESTIGATION TABLE

| # | Item | Finding |
|---|---|---|
| 1 | Heavyweight hoodie candidates | Slammer 2.0 350 GSM `bp 2683`; Cooper Dry 400 GSM `bp 3760`; Cruiser 2.0 `bp 1576` `[V]` |
| 2 | Heavyweight jogger candidates | **Flyer Jogger 350 GSM `bp 4628`** — the only premium candidate `[V]` |
| 3 | Manufacturer | Stanley/Stella, both `[V]` |
| 4 | Weight | **Both 350 GSM / 10.3 oz** `[V]` |
| 5 | Composition | **Both 80/20 cotton–polyester, 3-end fleece** `[V]` |
| 6 | Same manufacturer | **Yes** `[V]` |
| 7 | Same product family | **Yes — heavyweight collection** `[V]` |
| 8 | Black availability | `[U]` — variant data is auth-gated |
| 9 | Exact black colour reference | `[U]` — not exposed publicly |
| 10 | **EU production/fulfilment** | **No EU provider appears to print bottoms** `[V, circumstantial]` |
| 11 | UK availability | Same finding — UK providers list no bottoms `[V, circumstantial]` |
| 12 | US availability | Likely, via US providers `[A]` |
| 13 | Decoration methods | `[U]` — provider-dependent |
| 14 | Print/embroidery placement | `[U]` — provider-dependent |
| 15 | Product cost | `[U]` — auth-gated |
| 16 | Shipping cost | EU providers ship Europe from ≈$4.79 first item `[V, Textildruck]` |
| 17 | Shopify integration | Yes `[S]` |
| 18 | Branding options | Tear-away labels on both garments `[V]`; provider label options `[U]` |
| 19 | Returns | `[U]` for Printify. Printful: size/change-of-mind not accepted `[V]` |
| 20 | Cross-region SKU consistency | **Structurally weak** — different provider per region `[A]` |

**PRODUCT EXISTS: yes, verified.**
**PRODUCT IS POD-FULFILLABLE FOR OUR TARGET MARKET: no, on the evidence available.**

---

# 5. RANKED FINAL TABLE

## 1 — Best viable POD matched set
**Printify · Slammer 2.0 `bp 2683` + Flyer Jogger `bp 4628`**

Specification-perfect: same manufacturer, 350 GSM both, 80/20 both, 3-end fleece both.
**Status: blocked on EU fulfilment.** If only US providers carry the Flyer, this becomes a
US-region set and cannot serve a European launch.

*Trade-off:* the only option that delivers Chapter 001 exactly as designed. Also the only
one whose availability we cannot currently confirm.

## 2 — Second-best viable POD matched set
**Printful · Lane Seven LS16001 Urban Hoodie + LS16006 Urban Sweatpants — US only**

Both 80% cotton / 20% recycled polyester, both 10 oz / 340 g/m², same "Urban" product
line, hoodie is oversized, and the fabric is described as mill-dyed for uniform tone —
which is a direct claim on the exact risk our set gate exists to catch. $33.95 + $28.90 —
**materially cheaper than the Stanley/Stella pair.**

*Trade-off:* on paper this is the best-matched pair found anywhere in the investigation.
It is **US-fulfilment only**, so it contradicts the EU-first launch. It becomes the obvious
answer the day a US region opens.

*Runner-up in this tier:* Bella + Canvas 4719 + 4737, both 339 g/m², 60/40 — hoodie is
EU-available, pant is US-only.

## 3 — Best near-match
**None acceptable.**

The only EU-available bottoms on either platform are all-over-print sublimated polyester.
They fail on material (polyester, not heavyweight cotton), on colour (cannot be tonally
matched to a cotton fleece hoodie), and on decoration (edge-to-edge print is incompatible
with the minimal-branding system).

**Ranking them as a near-match would be exactly the silent specification lowering that was
ruled out.** They are listed here to be explicitly rejected, not considered.

## 4 — Best three-product alternative
**Printful EU · tee + hoodie + cap — all EU-verified and available today**

| Article | Blank | Status |
|---|---|---|
| Hoodie | **Slammer 2.0** — 350 GSM, EU/UK/US, $45.89 `[V]` | The hero garment survives intact |
| Tee | **AS Colour 5082** — 240 GSM oversized, EU/UK/US, $25.95 `[V]` | ⚠ only black is **"Faded Black"** — may fail the true-deep-black requirement |
| Tee alt | **Cotton Heritage MC1087 Box Tee** — 7 oz, EU, $17.45 `[V]` | Keeps the tee at €65 |
| Cap | **Otto 18-1248** — CA/EU/UK/US, $16.79 `[V]` | Widest region coverage found |

*Trade-off:* deliverable now, with verified EU stock and known prices. Loses the set — the
highest-AOV basket and the CAC headroom that justified the four-product architecture.
**The hoodie remains excellent**, so the chapter does not lose its statement piece.

## 5 — Best future non-POD route
**Stanley/Stella trade account + European decorator**

Buy Slammer 2.0 and Flyer as wholesale stock, decorate with a European printer or
embroiderer. This delivers the exact matched set, at materially better unit cost, with full
control over placement and colour matching.

*Trade-off:* it is no longer print-on-demand. It requires inventory capital, a trade
account, a decorator relationship, and storage — and it reintroduces every risk POD was
chosen to avoid. **This is the Phase 01 bulk-transition path pulled forward for one product
family**, before any demand evidence exists. MOQ and trade-account terms are `[U]`.

---

# 6. THE ONE CALL THAT WOULD SETTLE IT

```
GET https://api.printify.com/v1/catalog/blueprints/4628/print_providers.json
GET https://api.printify.com/v1/catalog/blueprints/2683/print_providers.json
Authorization: Bearer <token>
```

A free Printify account issues a token in Settings → API tokens. **If you generate one and
share it, I will run these and the variant/pricing calls immediately** and convert every
`[U]` in §4 to a verified value. I will not create the account.

Outcomes:
- **An EU provider offers both** → option 1 is live, Chapter 001 proceeds as designed
- **Only US providers** → the set is a future US-region product; the founder decision is open
- **No provider offers the Flyer** → the catalogue entry is not orderable and option 1 dies

---

# 7. THE DECISION IS YOURS

The evidence supports the options you defined. **I am not choosing between them.**

| | Option | What the evidence says |
|---|---|---|
| **A** | Launch three products | Fully available today, EU-verified, known prices |
| **B** | Change the product specification | Only if it does not mean an AOP polyester jogger — that fails on merit |
| **C** | Another POD / white-label infrastructure | Not yet searched beyond the four providers; a fifth may exist |
| **D** | Delay sweatpants to a later chapter | Costs nothing now; the chapter architecture already supports retirement and addition |
| **E** | Reconsider the manufacturing model | Real, but it is a different business model, not a sourcing tweak |

**One observation, offered as input rather than a decision:** option D and option A are the
same action taken with different framing — one treats it as a deferral, the other as the
final shape of Chapter 001. The practical difference is what you tell customers, and that
is a brand judgement rather than a sourcing one.

---

**Nothing ordered. No provider contracted. No pricing finalised. Phase 05 not started.**

**GYMREIGN — EARN YOUR REIGN.**

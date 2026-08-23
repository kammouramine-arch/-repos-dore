# GYMREIGN — ASSUMPTIONS & VERIFICATION REGISTER

Companion to [`01-master-brand-strategy.md`](./01-master-brand-strategy.md).

Operating rule 58 of the brief forbids inventing provider capabilities, prices, legal
requirements or availability. This register is how that rule is enforced: every factual
claim in the strategy has a row here, and **no row may be closed by memory — only by a
primary source checked on a stated date.**

| Marker | Meaning |
|---|---|
| `[V]` | Verified against a primary/authoritative source, date recorded |
| `[S]` | Search-level — secondary sources only, not yet confirmed at source |
| `[A]` | Assumption / modelling input chosen by Claude, must be replaced with real data |

---

## A. VERIFIED `[V]`

| # | Claim | Source & method | Date | Notes |
|---|---|---|---|---|
| V1 | `gymreign.com` is not registered | Verisign authoritative RDAP (`rdap.verisign.com/com/v1/domain/gymreign.com`) returned HTTP 404 | 2026-08-23 | 404 from the authoritative registry = no registration. **Availability can change at any time — re-verify at the registrar before relying on it.** Register early |
| V2 | No DNS records resolve for gymreign.com/.co/.eu/.store/.shop or wearegymreign.com | Direct DNS lookup | 2026-08-23 | Suggestive, not proof of availability — a registered domain can have no DNS. Only V1 is authoritative |
| V3 | `gymreign.eu` and `gymreign.io` returned RDAP 404 | rdap.org bootstrap | 2026-08-23 | Weaker than V1; other TLD lookups failed to connect. Confirm all TLDs at a registrar |
| V4 | Live apparel trademarks exist for REIGN (Class 25), REIGN SPORT (Class 25) and REIGN APPAREL | Trademark database listings via search | 2026-08-23 | US records. **EUIPO not yet searched.** Presence of similar marks in the same class is a likelihood-of-confusion risk. Not legal advice |
| V5 | No apparent brand or registration for "GYMREIGN" as one word | Search across trademark databases and the open web | 2026-08-23 | Absence of search evidence is not clearance |
| V6 | At least six active gym/athletic apparel brands trade on Ascension/Ascend | Live storefronts and social profiles observed: Ascension Apparel, Ascension Clothing, Gym Ascension Apparel, Ascension Athletics, Ascend Athletic, Ascend | 2026-08-23 | Drives the §11.2 recommendation |

---

## B. SEARCH-LEVEL `[S]` — must be confirmed at source in Phase 04

| # | Claim | Reported by | Date | How to close |
|---|---|---|---|---|
| S1 | Printful inside label ≈ $0.99/garment | Printful-adjacent pages via search | 2026-08-23 | Confirm in the Printful dashboard for the exact blank, in EUR, with EU fulfilment |
| S2 | Printful outside/sleeve label ≈ $2.49/garment | Same | 2026-08-23 | As above |
| S3 | Gelato inserts and branded labels from ≈ $0.49 each on a paid tier | Gelato help centre via search | 2026-08-23 | Confirm apparel-specific pricing and whether a paid tier is required |
| S4 | Gelato inner and outer labels cannot be printed together | Gelato help centre via search | 2026-08-23 | Material design constraint — confirm before Phase 03 label design |
| S5 | Gelato insert/label availability is limited by product and destination country | Gelato help centre via search | 2026-08-23 | **Confirm specifically for apparel into our target EU countries** — sources referenced posters |
| S6 | Gelato produces a high share of orders locally with short EU delivery windows | Comparison articles | 2026-08-23 | Confirm real production and delivery times per country from the dashboard |
| S7 | Printful is the more consistent on quality and deepest on branding options | Comparison articles | 2026-08-23 | Only closable by physically sampling both (§14.4) |
| S8 | Printify has the widest catalogue via third-party providers | Comparison articles | 2026-08-23 | Confirm which specific EU providers serve our articles, and their individual quality |
| S9 | Heavyweight blanks with boxy/dropped-shoulder blocks exist in POD catalogues (Stanley/Stella, Bella+Canvas 3010, Shaka Wear ranges) | Provider blog content | 2026-08-23 | Confirm exact model, GSM, size run, colour fidelity and EU stock in the live catalogue |

**None of the above may be quoted to a customer or used in a final cost model until closed.**

---

## C. ASSUMPTIONS `[A]` — modelling inputs, replace in Phase 04

### C1. Unit economics (§15)

| Input | Assumed | How to close |
|---|---|---|
| Tee fulfilment cost (blank + DTG + label) | €17.00 | Live dashboard price for the chosen blank, EU facility, in EUR |
| Tee shipping to EU customer | €6.00 | Provider shipping table per country |
| Hoodie fulfilment cost | €34.00 | As above |
| Cap fulfilment cost incl. embroidery | ~€13 landed | As above |
| Payment processing | 2.5% + €0.25 | Actual gateway pricing for the chosen platform and country |
| Returns & replacement allowance | 8% of net revenue | Replace with observed rate after ~100 orders. Apparel returns commonly run higher; 8% may prove optimistic |
| VAT rate | 21% | Depends on country of establishment and OSS status — **open question 6 at approval** |
| Platform + tooling fixed cost | €80–130/month | Actual plan prices at signup |
| CAC ceiling for viability | <€16 single-unit / €28–32 at €120 AOV | Derived from the above; recompute once costs are real |
| Free shipping threshold | €90 | Set from the final price ladder |

### C2. Product specification (§13.5)

| Input | Assumed | How to close |
|---|---|---|
| 220 GSM minimum for tees | Chosen quality floor | Confirm a boxy EU-fulfilled blank exists at ≥220 GSM |
| 320 GSM minimum for hoodies | Chosen quality floor | As above |
| Full XS–3XL size run available | Assumed | Per-blank size availability |
| True deep black and non-yellow bone available | Assumed | **Only closable by physical sample** |
| Single provider can supply all four articles | Assumed | Catalogue check, then samples |

### C3. Market and customer (§4, §8)

| Input | Status |
|---|---|
| Entire customer profile — demographics, income, wardrobe, media habits | **Constructed from general market knowledge, not from research.** Not yet validated by a single customer interview. Highest-value cheap validation available: 10 conversations with people who fit the profile |
| All competitor characterisations in §8 | Structural and qualitative only. **No competitor pricing is stated anywhere in the strategy because none was verified.** Closed by the §8.3 teardown |
| Target market countries | Assumed EU-wide, English-first with later localisation. Confirm against founder location and shipping economics |

### C4. Bulk-transition triggers (§14.5)

All seven thresholds — 150 units/month, 30% variance, 3% defect, 8% returns, 60% cost
ratio — are **judgement calls, not benchmarks.** Revisit against real data before any
are used to authorise spending.

---

## D. LEGAL — FLAGGED, NOT ADVISED

Nothing in this section is legal advice. Each item requires a qualified professional.

| # | Item | Risk | Action |
|---|---|---|---|
| L1 | GYMREIGN trademark clearance, EUIPO Class 25 | **Very high if discovered late** | Professional clearance search **before Phase 02 finalises any logo** |
| L2 | EU 14-day right of withdrawal vs. the customised-goods exemption for POD | High | Confirm with a lawyer whether standard-size catalogue garments with a printed design qualify for the exemption. **The strategy assumes they do not and prices returns in accordingly** |
| L3 | VAT registration, OSS, and the €10,000 distance-selling threshold | High | Accountant. Depends on country of establishment |
| L4 | EU textile labelling — fibre composition and care labelling obligations | Medium | Confirm what the POD provider's labels already satisfy and what we must add |
| L5 | GDPR — waitlist, email marketing, cookie consent | Medium | Standard compliance work at Phase 07 |
| L6 | Business registration and consumer-rights disclosures | Medium | Country-dependent |
| L7 | Product safety and general product compliance for apparel | Low–Medium | Confirm provider responsibility vs. merchant responsibility |
| L8 | Advertising claims — no unsubstantiated performance or quality claims | Low | Structurally mitigated: §6.1 bans unverifiable claims, §7.2 requires published specs |

---

## E. HOW TO CLOSE A ROW

1. Check the **primary** source — provider dashboard, official pricing page, registry,
   or a qualified professional. Not a blog post, not a comparison article, not memory.
2. Record the figure, the exact source, and the date.
3. Move the row to section A with a `[V]` marker.
4. If it feeds §15, re-run the unit economics and re-derive the price ladder — the
   **2.8× floor rule** is what decides whether a product still launches.

**Any product whose real landed cost breaks the 2.8× floor does not launch.** That rule
exists precisely so that bad news discovered in Phase 04 changes the plan instead of
being absorbed by wishful pricing.

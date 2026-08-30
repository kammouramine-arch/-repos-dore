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
| V7 | **French standard VAT rate is 20%** | economie.gouv.fr and impots.gouv.fr | 2026-08-23 | Replaces the 21% placeholder. Entire §15 re-derived |
| V8 | **French textile EPR is mandatory.** Anyone first placing clothing, household linen or footwear on the French market must register with Refashion, obtain an ADEME-issued unique identifier (IDU) and pay an annual eco-contribution | refashion.fr — in force 1 Jan 2022, Law 2020-105, art. L541-10-9 Code de l'environnement | 2026-08-23 | Confirm scope and current contribution scale directly with Refashion. Launch-readiness condition |
| V9 | **French 14-day withdrawal right** on distance contracts (art. L221-18), with an exception at art. L221-28 for goods made to consumer specifications or clearly personalised | Légifrance | 2026-08-23 | The text is verified. **Whether the exception covers POD is not** — see A-L2 |
| V10 | Where a withdrawal right does not apply, French pre-contractual information rules require the customer to be informed before the contract is concluded; sellers must also inform consumers of the consumer-mediation route | Légifrance / economie.gouv.fr | 2026-08-23 | Both are launch-readiness items |

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
| S10 | **Franchise en base de TVA thresholds for goods: €85,000 (prior year) / €93,500 (current year).** A 2025 reform to lower the threshold was suspended and subsequent legislation maintained the thresholds | Reported from official French sources via search | 2026-08-23 | **Confirm with an accountant — this has moved recently and may move again.** Drives the §15.3 two-regime model |

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

### C2b. France, jurisdiction and the global mandate (§0, §15, §16)

| Input | Assumed | How to close |
|---|---|---|
| Legal entity actually established in France | Founder-stated, conditional on it being true | Confirm at registration |
| Which VAT regime applies at launch | Franchise en base assumed likely; both regimes modelled | Accountant |
| Landed cost treatment — VAT-exclusive in Régime B, grossed up 20% in Régime A | A modelling convention, not an accounting rule | **Accountant. This convention drives the price ladder** |
| Whether the POD provider charges VAT to a French merchant, and at what rate under each regime | Unmodelled | Provider VAT policy + accountant |
| **How the franchise regime interacts with sales outside France** | **Unresolved — flagged, not modelled** | Accountant, before any second market opens |
| Non-French EPR/textile regimes in target markets | **Not researched at all.** Assumed to exist and to differ | Research per market, before opening it — never after |
| US sales tax nexus, UK VAT and import thresholds, Swiss/other import rules | **Not researched.** Named only as a known compliance surface | Per market, at the point of opening |

**A-L2 — the open legal question that most affects the numbers.** Whether art. L221-28's
customised-goods exception applies to print-on-demand apparel sold from a standard
catalogue in standard sizes. The strategy assumes **it does not** and prices returns at
8% accordingly. If a lawyer concludes otherwise, returns cost falls and contribution
rises — but the conservative assumption is the correct one to build on, and the founder
has instructed that POD is not assumed to remove withdrawal rights.

### C3. Market and customer (§4, §8)

| Input | Status |
|---|---|
| Entire customer profile — demographics, income, wardrobe, media habits | **Constructed from general market knowledge, not from research.** Not yet validated by a single customer interview. Highest-value cheap validation available: 10 conversations with people who fit the profile |
| All competitor characterisations in §8 | Structural and qualitative only. **No competitor pricing is stated anywhere in the strategy because none was verified.** Closed by the §8.3 teardown |
| Target market | **Brand market is global (locked, §0); controlled initial market is the EU.** English-first. The customer profile is a person-type assumed to exist across markets in similar form — **unvalidated outside Europe** |

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

## Phase 07 — pricing and identity (2026-08-30)

| Ref | Statement | Class |
|---|---|---|
| P07-1 | Ladder L3 applied live: TEE €75 · HOODIE €135 · JOGGER €110 · SHORTS €60 · CAP €45 | `[V]` verified against the Shopify Admin API |
| P07-2 | The 2.8× floor is applied to **product cost only**, not landed cost. Shipping is charged separately or absorbed above a €120 threshold | `[A]` founder decision, approved 2026-08-30 |
| P07-3 | **THE CAP sits below the 2.8× floor at 2.73×.** Deliberate accepted exception — a basket-builder at 44.4% contribution | `[A]` accepted exception |
| P07-4 | THE SHORTS base cost is **$21.79**, not the $25.66 quoted at approval; $25.66 is the 2XL. Multiple 3.20×, contribution 51.0% | `[V]` live Printify product payload |
| P07-5 | Shipping: free ≥ €120, flat €9.90 below, all three zones | `[V]` verified back from the delivery profile |
| P07-6 | Printify recreates and reassigns delivery profiles when a product is published with `shipping_template: true`. Future publishes must omit that flag or L3 shipping stops applying | `[V]` observed — all five products were on Printify USD profiles before correction |
| P07-7 | The jogger mark is 37.8 mm, not the 40 mm approved. The left-leg print area is 44.5 mm wide | `[V]` blueprint placeholder dimensions |
| P07-8 | No premium winter vest and no premium socks exist on Printify. Both excluded from Chapter 001 | `[V]` full catalogue sweep |
| P07-9 | The GYMREIGN wordmark still does not exist as drawn artwork | `[V]` |

## Phase 08 — identity Rev 3 (2026-08-30, proposal)

| Ref | Statement | Class |
|---|---|---|
| P08-1 | The GYMREIGN alphabet is drawn, not licensed: 8 glyphs, stroke 20 on cap 100, one diagonal angle of 0.52 run per rise, datum band y=42–62 | `[V]` constructed and rendered |
| P08-2 | Symbol = G and R interlocked, the R's stem occupying the G's aperture. 1.84:1, stroke 22 | `[V]` |
| P08-3 | Embroidery minimums, from simulation at 1.2 mm satin: symbol **20 mm**, wordmark **45 mm**. Symbol fails at 14 mm, wordmark at 32 mm | `[V]` rendered and measured |
| P08-4 | Print minimums: symbol 16 mm, wordmark 40 mm. Set by legibility, not by ink — counters stay open below this | `[V]` |
| P08-5 | 24 symbol concepts built, 23 rejected. Heavy abstract geometry lands on an existing icon nearly every time | `[V]` rejection record in doc 21 §13 |
| P08-6 | Placement rule: wordmark on tee/hoodie/cap, symbol on jogger/shorts. The jogger and shorts panels (44.5 mm, 127 mm) are too narrow for a legible wordmark | `[V]` blueprint dimensions |
| P08-7 | No premium athletic vest on Printify — 18 vest hits across 2,252 blueprints, all corporate merch, workwear or ANSI safety | `[V]` full catalogue sweep |
| P08-8 | No premium sock on Printify — all 8 blueprints are printed sublimation socks; best cotton content is 25% (bp 496) | `[V]` all compositions read |
| P08-9 | L3 prices unchanged. Shorts base cost $21.79 gives 3.20x and 51.0%; cap remains the only sub-floor article at 2.73x | `[V]` |
| P08-10 | The symbol has not been physically stitched; the 20 mm minimum is simulated | `[A]` needs a sew-out before the first cap order |

## Phase 09 — approved logo and colour (2026-08-30, proposal)

| Ref | Statement | Class |
|---|---|---|
| P09-1 | The founder-approved mark is a crowned GR monogram in brushed chrome with 3D bevels. It supersedes the Rev 3 GR interlock, which is withdrawn | `[A]` founder decision |
| P09-2 | **The logo file is not in the repository.** It was supplied as a conversation image, which places no file on disk. All derivative work is blocked on it | `[V]` |
| P09-3 | Chrome gradients cannot be embroidered and lose all bevel detail in DTG below ~60 mm. Garment application requires a flat single-colour cut of the same silhouette | `[V]` production constraint |
| P09-4 | A silver mark has near-zero contrast on Bone, Stone and Ash garments. Light garments need a Reign Black flat cut | `[V]` |
| P09-5 | Colour scarcity was never a supply constraint. Tee 12 colours, jogger 5, shorts 5, cap 5 were all available; only Black was enabled | `[V]` live catalogue |
| P09-6 | All colour hex values were sampled from rendered Printify mockups, not inferred from colour names. "Kaffa Coffee" samples as #896162, a dusty mauve | `[V]` |
| P09-7 | House palette of six: Reign Black, Bone, Graphite, Ash, Navy, Stone, plus Olive as seasonal | `[A]` proposed |
| P09-8 | **The hoodie is capped at 4 colours** and blueprint 2683 has exactly one print provider, so it cannot be fixed by switching provider | `[V]` |
| P09-9 | ITC Legend bp 6998: 458 GSM, 70/30, antique silver eyelets, 13 colours, XS-3XL, cost $62.01. At EUR 135 it runs 2.53x, below the floor; EUR 150 restores 2.81x | `[V]` live probe |
| P09-10 | Cotton Heritage Box Hoodie bp 5335: 339 GSM but **60/40 cotton**, cost $35.18. Rejected on composition despite the cost advantage | `[V]` live probe |
| P09-11 | Recommended lineup is 144 variants against 25 today. Hoodie and cap carry the mark boldly; tee, jogger and shorts carry it subtly | `[A]` proposed |

## Phase 10 — colour expansion applied (2026-08-30)

| Ref | Statement | Class |
|---|---|---|
| P10-1 | Hoodie stays on the Stanley/Stella Slammer 2.0 at EUR 135. The ITC Legend swap was declined | `[A]` founder decision |
| P10-2 | 115 variants enabled across 5 products, up from 25. Tee 6 colours, hoodie 3, jogger 5, shorts 4, cap 4 | `[V]` |
| P10-3 | No price changed. No artwork changed - same image, position and scale as before the update | `[V]` |
| P10-4 | **The hoodie has no light colourway.** Its only light option is White #F1F1F1, a cool white that clashes with the warm Natural Raw #FDEFD5 and Bone #E9E6DF used elsewhere | `[V]` sampled |
| P10-5 | Tee heathers are not made in XS: Dark Heather Grey and Heather Grey run XXS, S-3XL. Provider gap, not a data error | `[V]` |
| P10-6 | Print areas are split into DARK and LIGHT variant groups, both currently carrying the identical existing artwork, so the two flat cuts drop in without re-deriving variant sets | `[V]` |
| P10-7 | Light variants currently carry a white mark with near-zero contrast. Accepted: storefront is password-protected with 0 orders | `[A]` |
| P10-8 | Printify rejects a product update unless every variant on the product appears in print_areas.variant_ids, enabled or not | `[V]` API behaviour |
| P10-9 | The tee product carries 5 variants (181546, 181550, 181551, 181554, 181556) that the live catalogue no longer lists. They remain disabled | `[V]` |
| P10-10 | shipping_template omitted from the publish call; the L3 shipping model on the General profile is preserved | `[V]` |
| P10-11 | The approved logo file is still not in the repository. No artwork has been approximated | `[V]` |

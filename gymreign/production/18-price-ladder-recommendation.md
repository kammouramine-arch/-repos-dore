# PRICE LADDER — RECOMMENDATION FOR APPROVAL

**Vendor fix APPLIED. Prices UNCHANGED, awaiting approval.**
Issued 2026-08-30 · FX verified live · Nothing else touched

---

# 1. DONE — VENDOR

All four products on `kpv3hw-tm.myshopify.com` now read **`vendor: GYMREIGN`** (was
"Printify"). Titles, handles, status, variants and prices untouched.

> **Watch this:** Printify may overwrite `vendor` on its next sync of these products. If it
> reverts, it has to be re-applied after each Printify-side edit.

---

# 2. A CORRECTION I OWE YOU

I said the published prices were **"~8–9% above"** the intended ladder. **That was wrong.**
I used a stale mental FX rate of about 1.09.

**The live rate is `USD→EUR = 0.861542`** (30 Aug 2026, verified). At that rate the published
prices are **~16% above** a straight conversion, not 8–9%.

| | USD target | × 0.861542 | Published | Overshoot |
|---|---|---|---|---|
| THE TEE | $92 | **€79.26** | €92 | +€12.74 |
| THE HOODIE | $168 | **€144.74** | €168 | +€23.26 |
| THE JOGGER | $141 | **€121.48** | €141 | +€19.52 |
| THE CAP | $54 | **€46.52** | €54 | +€7.48 |

---

# 3. THE FINDING THAT CHANGES THE RECOMMENDATION

**Converting back to the USD targets would break the 2.8× floor locked in Phase 01.**

Landed cost to a French customer — Printify cost + EU shipping, converted at the live rate:

| | Cost | Ship FR | **Landed €** | **2.8× floor** |
|---|---|---|---|---|
| THE TEE | $28.45 | $13.49 | **€36.13** | **€101** |
| THE HOODIE | $53.37 | $15.00 | **€58.90** | **€165** |
| THE JOGGER | $42.88 | $15.00 | **€49.87** | **€140** |
| THE CAP | $19.14 | $4.79 | **€20.62** | **€58** |

> **The accidental EUR prices landed much closer to the floor than the intended USD ones
> would have.** €168 vs a €165 floor. €141 vs €140. The mix-up was, economically, closer to
> correct than the "fix" would be.

The USD targets were set before real Printify costs existed. **Real costs came in higher**,
so those targets no longer clear the floor.

---

# 4. THREE OPTIONS

Contribution = net of 20% VAT, landed cost, payment fees (2.5% + €0.25), 8% returns
allowance. Phase 01 target was ~46%.

## Option A — straight FX conversion €80 / €145 / €120 / €45

| | Price | Contribution | % | Multiple |
|---|---|---|---|---|
| TEE | €80 | €22.95 | **34.4%** | 2.21× ❌ |
| HOODIE | €145 | €48.39 | **40.0%** | 2.46× ❌ |
| JOGGER | €120 | €38.88 | **38.9%** | 2.41× ❌ |
| CAP | €45 | €12.51 | **33.4%** | 2.18× ❌ |

**Every article breaks the floor. Basket contribution €122.73.** This is what "restoring the
intended ladder" actually costs — it is the worst of the three.

## Option B — 2.8× floor €100 / €165 / €140 / €60 ← **RECOMMENDED**

| | Price | Contribution | % | Multiple |
|---|---|---|---|---|
| TEE | €100 | €37.78 | **45.3%** | 2.77× |
| HOODIE | €165 | €63.22 | **46.0%** | 2.80× ✅ |
| JOGGER | €140 | €53.72 | **46.0%** | 2.81× ✅ |
| CAP | €60 | €23.63 | **47.3%** | 2.91× ✅ |

**Basket contribution €178.36 — the highest of the three.** Hits the ~46% Phase 01 target on
every article. The tee at €100 is a rounding hair under 2.8× (2.77×); €105 would clear it
outright if you want it strict.

## Option C — leave as published €92 / €168 / €141 / €54

| | Price | Contribution | % | Multiple |
|---|---|---|---|---|
| TEE | €92 | €31.85 | 41.5% | 2.55× ❌ |
| HOODIE | €168 | €65.45 | 46.7% | 2.85× ✅ |
| JOGGER | €141 | €54.46 | 46.3% | 2.83× ✅ |
| CAP | €54 | €19.18 | 42.6% | 2.62× ❌ |

**Basket contribution €170.94.** Hoodie and jogger already correct; **only the tee and cap
are under.** A two-product fix — €92→€100 and €54→€60 — converts this into Option B.

---

# 5. RECOMMENDATION

> **Option B: €100 · €165 · €140 · €60.**

**Three reasons.** It is the only option where every article clears the economics locked in
Phase 01. It produces the **highest basket contribution** of the three. And it is the
**smallest actual change** — the hoodie and jogger move by €3 and €1, so in practice this is
a two-product edit to the tee and the cap.

**Do not restore the USD-converted ladder.** Those numbers were modelled before real costs
were known, and real costs came in higher. Reverting to them would lock in sub-floor margins
across the entire collection.

**A note on the tee.** €100 for a 240 GSM tee is high against the category, and it is the
article most exposed to price resistance. It is also the entry product. If it needs to sit
lower for positioning, the honest route is a **cheaper blank**, not a thinner margin — the
floor exists precisely to stop that trade being made quietly.

---

# 6. NOT DONE — AWAITING APPROVAL

**No price has been changed.** Nothing unpublished, deleted, duplicated or recreated. The
four products remain `ACTIVE` at €92 / €168 / €141 / €54 with the storefront still
password-protected.

**On approval I will update prices via Printify** (the source of truth for these products) so
the change survives the next sync, rather than editing Shopify directly where Printify would
overwrite it.

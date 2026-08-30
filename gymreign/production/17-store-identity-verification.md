# STORE IDENTITY VERIFICATION

**RESOLVED 2026-08-23. Correct store confirmed: `kpv3hw-tm.myshopify.com`.**
Nothing published. Read-only verification throughout.

---

# 0. RESOLUTION — ALL FOUR CHECKS PASS

| # | Check | Result |
|---|---|---|
| 1 | `shop.myshopifyDomain` | ✅ **`kpv3hw-tm.myshopify.com`** — `primaryDomain.host` matches |
| 2 | `shop.name` | ✅ **"GYMREIGN — Official Store"** |
| 3 | **Printify installed** | ✅ **"Printify: Print on Demand" · developer Printify** |
| 4 | Products | ✅ **`productsCount = 0`** — no ONDÉE, no RÉVA products |

Currency **EUR**, country **France** — consistent with the tax model.

**Closing the chain on the Printify side:** the Printify app is installed on
`kpv3hw-tm.myshopify.com`, and the account holds **exactly one** Printify shop with
`sales_channel: "shopify"` — `28572249`. **Therefore shop `28572249` resolves to
GYMREIGN — Official Store.**

Printify's API still exposes no domain (`title` empty, `/shops/{id}.json` 404,
`/shops/{id}/connection.json` 403 on scope), so this inference — app installed + exactly one
shop — is how the binding is established. It is sound, but it is an inference rather than a
field read, and that distinction is recorded honestly.

**Publication is no longer blocked by store identity. It remains gated on founder approval.**

---

# ARCHIVE — THE ORIGINAL BLOCK (krjwiu-zv)

The section below records the earlier mismatch that stopped publication. Retained because it
is the reason the gate worked.

---

# 1. THE FINDING

> ## `krjwiu-zv.myshopify.com` is **ONDÉE** — a live shower-filter store.

| Evidence | Result |
|---|---|
| `shop.name` | **"Ondee"** — not "GYMREIGN — Official Store" |
| `myshopifyDomain` | `krjwiu-zv.myshopify.com` |
| **Products** | **3 ACTIVE**, vendor **ONDÉE**: *Filtre de douche* · *Cartouche filtrante C90* · *Bandelettes de test au chlore* |
| Created | 2026-08-28 |
| **Installed apps** | **Messaging** · **Shopify Claude Connector App** — **NO Printify** |
| **Sales channels** | Online Store · Point of Sale · Shop — **NO Printify channel** |

**This is a third business, separate from both GYMREIGN and RÉVA.** It sells shower
filtration, it is live, and it has three active products.

---

# 2. WHY THE CONNECTION CANNOT BE CONFIRMED

**Printify shop `28572249` is not connected to this store.** Two independent checks agree:

1. **No Printify app is installed** on `krjwiu-zv.myshopify.com`. If Printify were connected,
   it would appear in `appInstallations`
2. **No Printify sales channel exists** in `publications`

Printify's own API cannot help resolve this — it exposes only `id`, `title` and
`sales_channel`, `title` is empty, `/shops/{id}.json` returns **404**, and
`/shops/{id}/connection.json` returns **403 Invalid scope(s)**.

**Therefore Printify shop `28572249` is connected to some other Shopify store — identity
unknown. Possibly RÉVA.**

---

# 3. WHAT WOULD HAVE HAPPENED

Publishing on the confirmation given would have pushed four GYMREIGN gymwear products into a
**live shower-filter storefront** — or, if the Printify shop resolves to RÉVA, into the
store that must never be modified.

**This is the exact outcome the publication gate exists to prevent.**

---

# 4. WHAT TO CHECK

1. **In Shopify admin, switch stores** — the account has at least three: RÉVA
   (`maisonreva.fr`), ONDÉE (`krjwiu-zv.myshopify.com`), and whichever store was renamed
   "GYMREIGN — Official Store"
2. **Open the GYMREIGN store → Settings → Store details** and read its
   **`.myshopify.com` domain**. That domain is the only reliable identifier — names are not
3. **In Printify → My Stores**, read the store name and domain shown against shop `28572249`
4. **Confirm the Printify app is installed on the GYMREIGN store** — Shopify admin → Apps

**Two things must both be true before publishing:** the Printify shop must resolve to the
GYMREIGN domain, **and** the Claude Shopify connector must point at that same domain.
Right now the connector points at ONDÉE.

---

# 5. SAFETY STATE

| | |
|---|---|
| Products published | **0** — `external_id = None`, `handle = None` on all four drafts |
| ONDÉE store | **Untouched.** Read-only queries only. No product, collection or setting changed |
| RÉVA store | **Untouched** |
| Printify connections | **None created, changed or removed** |
| Orders | **0** · Money spent **€0.00** |

**The four Chapter 001 drafts remain safe and unpublished in Printify shop `28572249`.**

---

**GYMREIGN — EARN YOUR REIGN.**
